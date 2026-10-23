import { createServer, type Server, type ServerResponse } from "node:http";
import { gzipSync } from "node:zlib";
import type { Answer } from "./live-site-in-memory.js";

/**
 * A local stand-in for the live origin over HTTP, for the suites of the live
 * site's HTTP adapter: it answers exactly what a case tells it to, framed the
 * ways an origin can frame an answer.
 */

/** What the live host answers for one path, over HTTP. */
export type HttpAnswer = Answer & {
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

/** The stand-in's address, every path it was asked for and the encoding each asked for, and its off switch. */
export type StandInOrigin = { url: string; asked: string[]; acceptEncoding: string[]; close: () => void };

/** The one answer Node must not frame for us, straight onto the socket. */
function answerFramedByHand(res: ServerResponse, raw: { headers: string[]; body: Buffer }, status = 200): void {
  // `connection: close` so a body with no declared length ends where the
  // socket does.
  const head = `HTTP/1.1 ${status} OK\r\n${[...raw.headers, "connection: close"].join("\r\n")}\r\n\r\n`;
  res.socket?.write(head);
  // `end(body)` rather than a write and an end: a body past the socket buffer
  // is still queued when the FIN goes out, and the server drops what it has
  // not flushed — which reads as a client timeout and has nothing to do with
  // the case.
  res.socket?.end(raw.body);
}

/** A promise of more than arrives: the shape of a CDN edge that dies mid-response. */
function answerStoppingHalfway(res: ServerResponse, answer: HttpAnswer, body: Buffer): void {
  res.writeHead(200, { "content-type": answer.type ?? "text/css", "content-length": String(body.length + 1000) });
  // The drop is queued on the write's own flush, so the headers and these
  // bytes are on the wire before the socket goes: that is what makes this a
  // body that stops halfway rather than a response that never arrives. See
  // `dropAfter`.
  res.write(body.subarray(0, answer.dropAfter), () => res.socket?.destroy());
}

/**
 * Node writes the compressed length as `content-length`, which is the whole
 * point of the gzip cases: the declaration describes the transfer and not the
 * file.
 */
function answerGzipped(res: ServerResponse, answer: HttpAnswer, body: Buffer): void {
  res.writeHead(answer.status ?? 200, { "content-type": answer.type ?? "text/css", "content-encoding": "gzip" });
  res.end(gzipSync(body));
}

/** Sends `answer`, or a 404 when the case gave none for the path. */
function send(res: ServerResponse, answer: HttpAnswer | undefined): void {
  try {
    if (!answer) { res.writeHead(404, { "content-type": "text/html" }); res.end("not found"); return; }
    if (answer.redirectTo) { res.writeHead(302, { location: answer.redirectTo }); res.end(); return; }
    const body = answer.body ?? Buffer.alloc(0);
    if (answer.raw) { answerFramedByHand(res, answer.raw, answer.status); return; }
    if (answer.dropAfter !== undefined) { answerStoppingHalfway(res, answer, body); return; }
    if (answer.gzip) { answerGzipped(res, answer, body); return; }
    res.writeHead(answer.status ?? 200, { "content-type": answer.type ?? "application/octet-stream" });
    res.end(body);
  } catch { /* the client gave up first; that is the case's point */ }
}

/**
 * The stand-in, answering `answers` and recording every path asked for — and
 * what it was asked to encode it as — so "it fetched only what was missing",
 * "it never fetched that at all" and "it asked for the bytes it would write"
 * are measurements rather than inferences.
 */
export async function standInOrigin(answers: Record<string, HttpAnswer>): Promise<StandInOrigin> {
  const asked: string[] = [];
  const acceptEncoding: string[] = [];
  const timers = new Set<NodeJS.Timeout>();
  const server: Server = createServer((req, res) => {
    const path = new URL(req.url ?? "/", "http://x").pathname;
    asked.push(path);
    acceptEncoding.push(String(req.headers["accept-encoding"] ?? ""));
    const answer = answers[path];
    if (answer?.delayMs) timers.add(setTimeout(() => send(res, answer), answer.delayMs));
    else send(res, answer);
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
