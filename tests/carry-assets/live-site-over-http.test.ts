import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { bodyWithin } from "../../scripts/live-site-over-http.mjs";
import { entryRunAsChildProcess } from "./carry-runs.js";
import {
  CSS, CSS_NAME, astroFilesIn, distHolding, expectRefusedOver, liveDeployAnswers, sha256, sweepTemporary,
} from "./deploy-fixtures.js";
import { standInOrigin, type HttpAnswer } from "./stand-in-origin.js";

/**
 * The live site read over HTTP, on a real local server: what only an HTTP
 * exchange can show about the bytes. The request asks for `identity` and an
 * answer that declares another encoding is refused, a declared length is
 * held to what arrived, and bytes are counted as bytes. Why each of these is
 * so is written in `scripts/live-site-over-http.mjs`.
 *
 * Most cases drive the real entry as a child process (`entryRunAsChildProcess`)
 * against a local stand-in for the live origin (`stand-in-origin.ts`) — the
 * deploy's own command, with the reader it passes — so the exit code is an
 * assertion. The two that reach `bodyWithin` hand it chunks directly. The
 * bounds an answer over HTTP is held to — the one origin, the ceiling, the
 * budget — are `live-site-over-http-bounds.test.ts`'s. What the carry decides
 * about each answer is the flow's, in the `carry-*.test.ts` files, against an
 * in-memory live site.
 */

afterEach(sweepTemporary);

describe("the live site's answers, read over HTTP", () => {
  it("asks the origin for the bytes it is going to write, not a transfer of them", async () => {
    // What the live host answers each way, and why that matters, is the
    // reading in `scripts/live-site-over-http.mjs`, at
    // `bodyWithin`. It is not what makes a carried byte trustworthy — the
    // digest list is — but it is what makes the file on disk the file rather
    // than an archive of it.
    const live = await standInOrigin(liveDeployAnswers({ [CSS_NAME]: CSS }));
    const out = distHolding();
    try {
      const run = await entryRunAsChildProcess(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(astroFilesIn(out)).toEqual([CSS_NAME]);
      expect(live.acceptEncoding).toEqual(["identity", "identity", "identity"]);
    } finally { live.close(); }
  });

  it("carries nothing when the answer arrives encoded, whatever length it declared", async () => {
    // The refusal the `identity` reading argues for, on the asset it was
    // measured with.
    const asset = Buffer.alloc(104_000, 0x61);
    const answers: Record<string, HttpAnswer> = liveDeployAnswers({ [CSS_NAME]: asset });
    answers[`/_astro/${CSS_NAME}`] = { type: "text/css; charset=utf-8", body: asset, gzip: true };
    const live = await standInOrigin(answers);
    const out = distHolding();
    try {
      const run = await entryRunAsChildProcess(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(astroFilesIn(out)).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
      // Refused unread, on the encoding it declared — 104,000 bytes of 'a'
      // compress to 342 on the wire, so this case holds the attack's size
      // without ever draining it. See `expectRefusedOver`.
      expectRefusedOver(run.out, "gzip-encoded", "reading the encoding it declared");
    } finally { live.close(); }
  });

  it("carries a hand-framed answer that is whole, so the refusals below are about the bytes", async () => {
    // The control for the refusals after it: the same raw socket, the same
    // hand-written headers, a body that IS the file — carried. Whatever those
    // refuse, it is not the framing.
    //
    // The body's SIZE is no part of that decision, so this is the same small
    // stylesheet every other honest case uses. A body in more than one stream
    // chunk would make this the one case whose client waits idle for an
    // origin on the test worker's own event loop, which a loaded runner can
    // push past the step's 10 s clock. The multi-chunk reassembly is proved
    // where no clock can reach it, by chunks handed straight to `bodyWithin`.
    const answers: Record<string, HttpAnswer> = liveDeployAnswers({ [CSS_NAME]: CSS });
    answers[`/_astro/${CSS_NAME}`] = {
      raw: { headers: ["content-type: text/css", `content-length: ${CSS.length}`], body: CSS },
    };
    const live = await standInOrigin(answers);
    const out = distHolding();
    try {
      const run = await entryRunAsChildProcess(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      // With the step's own reason, because the only interesting way for a
      // hand-framed answer to fail is one the step will have printed.
      expect(astroFilesIn(out), run.out).toEqual([CSS_NAME]);
      expect(readFileSync(join(out, "_astro", CSS_NAME)).equals(CSS), run.out).toBe(true);
    } finally { live.close(); }
  });

  it("refuses a body the digest list does not describe, when nothing declares a length", async () => {
    // With no `content-length` there is no length to check, so 5,000 bytes of
    // a 104,000-byte stylesheet arrive looking whole; the digest is what
    // refuses them.
    const asset = Buffer.alloc(104_000, 0x61);
    const answers: Record<string, HttpAnswer> = liveDeployAnswers({ [CSS_NAME]: asset });
    answers[`/_astro/${CSS_NAME}`] = { raw: { headers: ["content-type: text/css"], body: asset.subarray(0, 5_000) } };
    const live = await standInOrigin(answers);
    const out = distHolding();
    try {
      const run = await entryRunAsChildProcess(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(astroFilesIn(out)).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
      // The 104,000 bytes this case is named for live in the digest, not on the
      // wire: 5,000 of them are sent, and the step's verdict is that they are
      // not what the build recorded. See `expectRefusedOver`.
      expectRefusedOver(run.out, `sha256:${sha256(asset)}`, "checking the digest the build recorded");
    } finally { live.close(); }
  });

  it("refuses a body whose declared length lies low", async () => {
    // undici stops reading at the declaration, so the bytes counted equal the
    // bytes declared for a file that is 5,000 bytes of 104,000; the digest is
    // what refuses it.
    const asset = Buffer.alloc(104_000, 0x61);
    const answers: Record<string, HttpAnswer> = liveDeployAnswers({ [CSS_NAME]: asset });
    answers[`/_astro/${CSS_NAME}`] = { raw: { headers: ["content-type: text/css", "content-length: 5000"], body: asset } };
    const live = await standInOrigin(answers);
    const out = distHolding();
    try {
      const run = await entryRunAsChildProcess(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(astroFilesIn(out)).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
      // The origin writes all 104,000; the client stops at the 5,000 it was
      // promised and never waits on the rest, which is why this case can hold
      // the attack's size and the control above cannot. See `expectRefusedOver`.
      expectRefusedOver(run.out, `sha256:${sha256(asset)}`, "checking the digest the build recorded");
    } finally { live.close(); }
  });

  it("puts a body that arrives in several chunks back together byte for byte", async () => {
    // `Buffer.concat(chunks, total)` is handed a length the reader counted
    // itself, and a wrong one is not an error: too small truncates the file,
    // too large pads it with zeroes — either way a file of the wrong bytes on
    // disk under a name the deploy swears by.
    //
    // So the chunks are handed over directly: no server on this worker's event
    // loop, no socket, no clock, nothing a loaded runner can slow down. Three
    // of them, of three different lengths and three different fills, so a
    // reassembly that dropped one, reordered them or mis-counted the total
    // fails on the bytes rather than on the length alone.
    const chunks = [Buffer.alloc(65_536, 0x61), Buffer.alloc(38_463, 0x62), Buffer.from("ü\r\n", "utf8")];
    const whole = Buffer.concat(chunks);
    const body = await bodyWithin(
      {
        headers: { get: (name: string) => (name.toLowerCase() === "content-length" ? String(whole.length) : null) },
        body: (async function* stream() { for (const chunk of chunks) yield chunk; })(),
      },
      4 * 1024 * 1024,
    );
    expect(body.ok, JSON.stringify(body)).toBe(true);
    expect(body.bytes!.length).toBe(whole.length);
    expect(body.bytes!.equals(whole), "the reassembled body is not the bytes that arrived").toBe(true);
  });

  it("counts the bytes it concatenates, not the characters the chunk was written as", async () => {
    // The same `total`, and the other way it can be wrong: a string chunk
    // counted in characters is short of the bytes it becomes, so a
    // two-character `üü` would count 2, concatenate 4, and come back half the
    // value with `ok: true`.
    //
    // Not reachable over HTTP: undici yields `Uint8Array`, where the two
    // counts agree. So this case is about what the export promises its caller,
    // which only the export reaches.
    const whole = Buffer.from("üü", "utf8");
    const body = await bodyWithin(
      { headers: { get: () => null }, body: (async function* stream() { yield "ü"; yield "ü"; })() },
      4 * 1024 * 1024,
    );
    expect(body.ok, JSON.stringify(body)).toBe(true);
    expect(body.bytes!.equals(whole), "the value came back short of the bytes it was made of").toBe(true);
    // And the ceiling is that same count, so a miscount would let a body walk
    // past it as well: six characters of twelve bytes under an eight-byte
    // ceiling.
    const over = await bodyWithin(
      { headers: { get: () => null }, body: (async function* stream() { yield "ü".repeat(6); })() },
      8,
    );
    expect(over.ok, "twelve bytes came back ok under an eight-byte ceiling").toBe(false);
  });

  it("refuses gzip bytes that call themselves identity", async () => {
    // The header says what the origin chose to say; the bytes are gzip. Nothing
    // in the exchange can tell them apart — the digest can.
    const answers: Record<string, HttpAnswer> = liveDeployAnswers({ [CSS_NAME]: CSS });
    answers[`/_astro/${CSS_NAME}`] = {
      raw: { headers: ["content-type: text/css", "content-encoding: identity"], body: gzipSync(CSS) },
    };
    const live = await standInOrigin(answers);
    const out = distHolding();
    try {
      const run = await entryRunAsChildProcess(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(astroFilesIn(out)).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
      // By the digest — the point of the case is that nothing else could have
      // caught it, so the digest is the verdict to assert. See `expectRefusedOver`.
      expectRefusedOver(run.out, `sha256:${sha256(CSS)}`, "checking the digest the build recorded");
    } finally { live.close(); }
  });
});
