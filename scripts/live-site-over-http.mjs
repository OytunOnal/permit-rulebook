// @level infrastructure
/**
 * The live site, read over HTTP: one answer per URL, and only what HTTP itself
 * decides about it. Which statuses and content types the carry takes, and
 * whether the bytes are the right file, are the carry's; this says what came
 * back, or why nothing usable did.
 *
 * A redirect is an error rather than a hop: following one would walk off the
 * origin the carry is allowed to read. The request asks for `identity`,
 * because the carry writes what arrives: what to do with an answer that
 * ignores that is `bodyWithin`'s, and what to do with one that lies about it
 * is the digest's.
 */
import { sentenceOfError } from "./log-wording.mjs";

/** @typedef {import("./carry-assets/carry.mjs").LiveAnswer} LiveAnswer */

/**
 * What the live site answers for `url` within `timeoutMs`, or the reason there
 * is no answer. The body is read only when the caller asks for it, up to
 * `byteCeiling` bytes and inside the same timeout, so an answer refused on its
 * status or its type costs no body. Every failure is a sentence rather than a
 * stack; it throws nothing.
 *
 * @param {string} url
 * @param {{ byteCeiling: number, timeoutMs: number }} limits
 * @returns {Promise<LiveAnswer>}
 */
export async function fetchLiveAnswerOverHttp(url, { byteCeiling, timeoutMs }) {
  let response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "error",
      headers: { "accept-encoding": "identity" },
    });
  } catch (e) {
    return { ok: false, why: sentenceOfError(e) };
  }
  return {
    ok: true,
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    readBody: () => bodyWithin(response, byteCeiling),
  };
}

/**
 * The body, or the reason there isn't one — read in chunks and abandoned the
 * moment it passes the ceiling, so an endless response is the origin's problem
 * and not the build's. A body that stops mid-stream throws here and nowhere
 * else.
 *
 * An answer that declares an encoding is refused unread: the request asked for
 * `identity`, and fetch decompresses anything that comes back anyway, so what
 * would be written is an unpacking of the file rather than the file — and the
 * length beside it describes the transfer, not the file. Measured, against an
 * origin that answered `content-encoding: gzip`: a 104,000-byte asset came
 * back declaring 14,192 bytes, and the same asset declared at 40 bytes decoded
 * to 14,192 with no error at all. An answer that LIES about its encoding
 * declares nothing to refuse it by, and is caught by the digest.
 *
 * The declared length is checked against what was read: a backstop behind
 * undici's own enforcement, which throws first. It stays because it costs a
 * comparison, and the day undici's behaviour changes it is the line that
 * notices. Nothing here decides that a body is the right file — only its
 * digest does.
 *
 * Exported for a test. This function's correctness is the carry's own threat:
 * it is handed a length it counted itself and calls
 * `Buffer.concat(chunks, total)` with it, where too small truncates the file
 * and too large pads it with zeroes, either way a file of the wrong bytes on
 * disk under a name the deploy swears by. Proving the reassembly through a
 * socket needs a body in more than one chunk and a client waiting idle on a
 * server on the test worker's own event loop, which a loaded runner can push
 * past the timeout; handing the chunks over directly has no clock in it. And
 * a string chunk, whose characters and bytes count differently, reaches this
 * only through the export.
 */
export async function bodyWithin(response, limit) {
  const encoding = (response.headers.get("content-encoding") ?? "").trim().toLowerCase();
  if (encoding && encoding !== "identity") return { ok: false, why: `arrived ${encoding}-encoded, which is not the bytes the page asks for` };

  const header = response.headers.get("content-length");
  const declared = header === null ? Number.NaN : Number(header);
  const promised = Number.isFinite(declared) && declared >= 0;
  if (promised && declared > limit) return { ok: false, why: `declares ${declared} bytes, over the ${limit}-byte ceiling` };

  const chunks = [];
  let total = 0;
  try {
    // A response with no body has no chunks to read.
    for await (const chunk of response.body ?? []) {
      // Converted first and counted after, so `total` is the length of what
      // `Buffer.concat` is handed rather than the length of what arrived: a
      // string chunk `üü` is 2 characters and 4 bytes, and counting the
      // characters would truncate it and let it past the ceiling.
      const bytes = Buffer.from(chunk);
      total += bytes.length;
      if (total > limit) return { ok: false, why: `is over the ${limit}-byte ceiling` };
      chunks.push(bytes);
    }
  } catch (e) {
    return { ok: false, why: sentenceOfError(e) };
  }
  if (promised && total !== declared) return { ok: false, why: `is ${total} bytes, not the ${declared} it declared` };
  return { ok: true, bytes: Buffer.concat(chunks, total) };
}
