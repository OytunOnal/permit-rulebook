import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { carryAssets } from "../../scripts/carry-assets/carry.mjs";
import { bodyWithin, liveAnswerOverHttp } from "../../scripts/carry-assets/live-site-over-http.mjs";
import { entryRunAsChildProcess } from "./carry-runs.js";
import {
  CSS, CSS_NAME, DIGESTS, astroFilesIn, distHolding, expectRefusedOver, liveDeployAnswers, sha256, sweepTemporary,
} from "./deploy-fixtures.js";
import type { Answer } from "./live-site-in-memory.js";

/**
 * The live site read over HTTP, on a real local server: what only an HTTP
 * exchange can show. A redirect is an error, the request asks for `identity`
 * and an answer that declares another encoding is refused, a declared length
 * is held to the ceiling and to what arrived, bytes are counted as bytes, and
 * the timeout holds. Why each of these is so is written in
 * `scripts/carry-assets/live-site-over-http.mjs`.
 *
 * Most cases drive the real entry as a child process (`entryRunAsChildProcess`)
 * against a local stand-in for the live origin — the deploy's own command,
 * with the reader it passes — so the exit code is an assertion. The two that
 * reach `bodyWithin` hand it chunks directly, and the one that holds a budget
 * it is handed calls the flow with this reader. What the carry decides about
 * each answer is the flow's, in the two `carry-*.test.ts` files, against an
 * in-memory live site.
 */

/** What the live host answers for one path, over HTTP. */
type HttpAnswer = Answer & {
  /** Answer a redirect instead, to this address. */
  redirectTo?: string;
  /**
   * Write this many bytes of the body, promise more, then drop the socket —
   * once those bytes are actually on the wire. Dropped in the same tick as the
   * write, they go with it and the client never gets a usable response at all,
   * so the case named for a body that stops halfway would never reach a body.
   * Queued on the write's flush, the client reads `its body terminated (other
   * side closed)`.
   */
  dropAfter?: number;
  /** Answer only after this long — a host that has stopped answering. */
  delayMs?: number;
  /** Answer gzip-encoded, the way a CDN answers a request it decides to compress. */
  gzip?: boolean;
  /**
   * Frame the answer by hand — exactly these headers, exactly these bytes, then
   * close. `res.writeHead` will not send a wrong `content-length` or leave one
   * out, and those are the shapes an origin uses to make HTTP attest to a file
   * it is not sending.
   */
  raw?: { headers: string[]; body: Buffer };
};

/**
 * A local stand-in for the live origin: it answers exactly what a case tells it
 * to and records every path asked for — and what it was asked to encode it as —
 * so "it fetched only what was missing", "it never fetched that at all" and
 * "it asked for the bytes it would write" are measurements rather than
 * inferences.
 */
async function origin(answers: Record<string, HttpAnswer>): Promise<{
  url: string; asked: string[]; acceptEncoding: string[]; close: () => void;
}> {
  const asked: string[] = [];
  const acceptEncoding: string[] = [];
  const timers = new Set<NodeJS.Timeout>();
  const server: Server = createServer((req, res) => {
    const path = new URL(req.url ?? "/", "http://x").pathname;
    asked.push(path);
    acceptEncoding.push(String(req.headers["accept-encoding"] ?? ""));
    const answer = answers[path];
    const send = (): void => {
      try {
        if (!answer) { res.writeHead(404, { "content-type": "text/html" }); res.end("not found"); return; }
        if (answer.redirectTo) { res.writeHead(302, { location: answer.redirectTo }); res.end(); return; }
        const body = answer.body ?? Buffer.alloc(0);
        if (answer.raw) {
          // Straight onto the socket: this is the one answer Node must not
          // frame for us. `connection: close` so a body with no declared
          // length ends where the socket does.
          const head = `HTTP/1.1 ${answer.status ?? 200} OK\r\n${[...answer.raw.headers, "connection: close"].join("\r\n")}\r\n\r\n`;
          res.socket?.write(head);
          // `end(body)` rather than a write and an end: a body past the socket
          // buffer is still queued when the FIN goes out, and the server drops
          // what it has not flushed — which reads as a client timeout and has
          // nothing to do with the case.
          res.socket?.end(answer.raw.body);
          return;
        }
        if (answer.dropAfter !== undefined) {
          // A promise of more than arrives: the shape of a CDN edge that dies
          // mid-response.
          res.writeHead(200, { "content-type": answer.type ?? "text/css", "content-length": String(body.length + 1000) });
          // The drop is queued on the write's own flush, so the headers and
          // these bytes are on the wire before the socket goes: that is what
          // makes this a body that stops halfway rather than a response that
          // never arrives. See `dropAfter`.
          res.write(body.subarray(0, answer.dropAfter), () => res.socket?.destroy());
          return;
        }
        if (answer.gzip) {
          // Node writes the compressed length as `content-length`, which is the
          // whole point of the case: the declaration describes the transfer and
          // not the file.
          res.writeHead(answer.status ?? 200, { "content-type": answer.type ?? "text/css", "content-encoding": "gzip" });
          res.end(gzipSync(body));
          return;
        }
        res.writeHead(answer.status ?? 200, { "content-type": answer.type ?? "application/octet-stream" });
        res.end(body);
      } catch { /* the client gave up first; that is the case's point */ }
    };
    if (answer?.delayMs) timers.add(setTimeout(send, answer.delayMs));
    else send();
  });
  const port = await new Promise<number>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve((server.address() as { port: number }).port));
  });
  return {
    url: `http://127.0.0.1:${port}`,
    asked,
    acceptEncoding,
    close: () => {
      for (const timer of timers) clearTimeout(timer);
      server.closeAllConnections?.();
      server.close();
    },
  };
}

afterEach(sweepTemporary);

describe("the live site's answers, read over HTTP", () => {
  it("asks the origin for the bytes it is going to write, not a transfer of them", async () => {
    // What the live host answers each way, and why that matters, is the
    // reading in `scripts/carry-assets/live-site-over-http.mjs`, at
    // `bodyWithin`. It is not what makes a carried byte trustworthy — the
    // digest list is — but it is what makes the file on disk the file rather
    // than an archive of it.
    const live = await origin(liveDeployAnswers({ [CSS_NAME]: CSS }));
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
    const live = await origin(answers);
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

  it("takes the origin from the environment, and nothing on the command line can move it", async () => {
    // The step passes no argv, and this is why: the flag reader takes any
    // `--name value` — the entry header's "Where the address comes from". The
    // address is a value, read from the environment, and a command line that
    // spells an origin is inert: this case hands it one, pointing at a host
    // that would answer, and measures that not a packet reached it.
    const live = await origin(liveDeployAnswers({ [CSS_NAME]: CSS }));
    const decoy = await origin(liveDeployAnswers({ "index.DECOYAAA.css": CSS }));
    const out = distHolding();
    try {
      const run = await entryRunAsChildProcess(live.url, ["--dist", out, "--origin", decoy.url]);
      expect(run.status, run.out).toBe(0);
      expect(decoy.asked, "the command line moved the origin").toEqual([]);
      expect(live.asked).toEqual(["/", `/${DIGESTS}`, `/_astro/${CSS_NAME}`]);
      expect(astroFilesIn(out)).toEqual([CSS_NAME]);
    } finally { live.close(); decoy.close(); }
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
    const live = await origin(answers);
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
    const live = await origin(answers);
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
    const live = await origin(answers);
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
    const live = await origin(answers);
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

  it("refuses to follow a redirect off the host, rather than fetching where it points", async () => {
    // A same-origin name, so nothing above refuses it, answering a redirect to
    // a host we can watch — and that host serves a perfectly good stylesheet,
    // so the only reason it goes uncarried is that the redirect was refused.
    const moved = "index.GGGGGGGG.css";
    const elsewhere = await origin({ "/pwn.css": { type: "text/css; charset=utf-8", body: CSS } });
    const answers: Record<string, HttpAnswer> = liveDeployAnswers({ [moved]: CSS });
    answers[`/_astro/${moved}`] = { redirectTo: `${elsewhere.url}/pwn.css` };
    const live = await origin(answers);
    const out = distHolding();
    try {
      const run = await entryRunAsChildProcess(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(elsewhere.asked, "the carrier followed the redirect off the host").toEqual([]);
      expect(astroFilesIn(out)).toEqual([]);
      expect(run.out).toContain(moved);
      // On the redirect, and not on the clock: a starved origin can leave all
      // three assertions above holding while the step never saw a `location:`
      // header at all. The mark is the concept rather than the sentence,
      // because the words belong to undici — today `fetch failed (unexpected
      // redirect)` — and a dependency's wording is not this step's decision.
      // See `expectRefusedOver`.
      expectRefusedOver(run.out, "redirect", "refusing the redirect instead of following it");
    } finally { live.close(); elsewhere.close(); }
  });

  it("survives a body that stops halfway", async () => {
    const answers: Record<string, HttpAnswer> = liveDeployAnswers({ [CSS_NAME]: CSS });
    answers[`/_astro/${CSS_NAME}`] = { type: "text/css; charset=utf-8", body: CSS, dropAfter: 4 };
    const live = await origin(answers);
    const out = distHolding();
    try {
      const run = await entryRunAsChildProcess(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      // Not a truncated stylesheet on disk: nothing at all.
      expect(astroFilesIn(out)).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
      // The mark is `<name>: its body`, and every word of it is this step's
      // own: that prefix is written where an answer's headers were read, a
      // body was begun, and the body is what failed. The cause after it
      // belongs to undici — `terminated (other side closed)` today — and is
      // not asserted, because a dependency's wording is not this step's
      // decision.
      //
      // TWO MARKS, and not one, because the three shapes a starved runner
      // reaches are not covered by either alone: the budget spent before the
      // request prints `anything: asset-digests.txt: The operation was aborted
      // due to timeout`, the fetch giving up before any body prints
      // `index.…css: fetch failed (other side closed)`, and a clock firing
      // mid-body prints `index.…css: its body The operation was aborted due to
      // timeout`. The first two carry no `its body` at all, so the positive
      // mark goes RED on them. The third carries `its body` and passes it, and
      // is caught by the absence instead. Disjoint shapes, so dropping either
      // leaves one of the three green for the wrong reason.
      //
      // They fail differently on purpose. The mark is the step's own wording
      // and is allowed to go red the day this step changes it. The absence is
      // a dependency's — Node's `The operation was aborted due to timeout` —
      // and an absence can only ever weaken if that wording moves, never turn
      // a deploy red over it.
      //
      // What shrinks the clock's window rather than asserting it away is the
      // origin above, which queues its drop on the flush of the very bytes the
      // client is reading. See `expectRefusedOver`.
      expectRefusedOver(run.out, `${CSS_NAME}: its body`, "reading the body far enough to find it ended early");
      expect(run.out, "the socket died on the step's own clock, not on the origin's silence")
        .not.toContain("aborted due to timeout");
    } finally { live.close(); }
  });

  it("survives a body larger than the ceiling, without holding it in memory to find out", async () => {
    // Chunked, so there is no content-length to refuse it by: the ceiling has
    // to hold while the bytes are arriving.
    const big = Buffer.alloc(5 * 1024 * 1024, 0x61);
    const answers = liveDeployAnswers({ [CSS_NAME]: big });
    const live = await origin(answers);
    const out = distHolding();
    try {
      const run = await entryRunAsChildProcess(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(astroFilesIn(out)).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
      // This is the largest drain here — measured, 4 MB of the 5 reach the
      // child before the ceiling trips — and it is safe because the client
      // never waits: it aborts the moment the count passes. Asserting the
      // ceiling is what says so. See `expectRefusedOver`.
      expectRefusedOver(run.out, String(4 * 1024 * 1024), "counting the body past the asset ceiling");
    } finally { live.close(); }
  });

  it("gives up when the run's time budget is spent, without waiting out a silent host", async () => {
    // The budget is a ceiling the flow sets, not a knob: there is no
    // `--budget-ms`, and the deploy passes no argv at all, so nothing
    // reachable from `pages.yml` can shrink it to 1 and turn the step into a
    // silent no-op. It is the exported flow that takes it, with the reader the
    // entry passes, and that is what this case drives.
    //
    // What it bounds is waiting on the network, which is what this case
    // measures: a host that has stopped answering. It does not bound the
    // step's own work — the ceiling on that is the ceiling on the page.
    const answers: Record<string, HttpAnswer> = liveDeployAnswers({ [CSS_NAME]: CSS });
    answers[`/_astro/${CSS_NAME}`] = { type: "text/css; charset=utf-8", body: CSS, delayMs: 5_000 };
    const live = await origin(answers);
    const out = distHolding();
    try {
      const began = Date.now();
      const result = await carryAssets({ origin: live.url, dist: out, liveAnswerFor: liveAnswerOverHttp, budgetMs: 500 });
      const took = Date.now() - began;
      expect(result.carried).toEqual([]);
      expect(astroFilesIn(out)).toEqual([]);
      // A line NAMING what it could not carry, so a lone unrelated problem
      // cannot satisfy it.
      expect(result.problems).toEqual([expect.stringContaining(CSS_NAME)]);
      // It gave up on its own clock rather than the host's.
      expect(took, `the run took ${took} ms`).toBeLessThan(4_000);
    } finally { live.close(); }
  });
});
