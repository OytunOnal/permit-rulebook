import { afterEach, beforeEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * What the test server's test files share: a temporary folder served for each
 * case, with a file beside it, and a request that reaches the server as written.
 */

const { serve } = await import("../scripts/static-server.mjs");

export interface Answer { status: number; body: string }

/** `path` sent as written, with nothing between it and the server to fold its dots. */
export const ask = (port: number, path: string): Promise<Answer> => new Promise((resolve, reject) => {
  const req = request({ host: "127.0.0.1", port, path }, (res) => {
    let body = "";
    res.setEncoding("utf8");
    res.on("data", (chunk: string) => { body += chunk; });
    res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
  });
  req.on("error", reject);
  req.end();
});

/** What the file beside the served folder holds, so an answer that carries it is a leak. */
export const OUTSIDE = "a file next to the served folder";

/** The running case's server: the port it listens on. */
export interface Served { port: number }

/** Serves a fresh temporary folder before each case and removes it after; what it returns holds the running case's server. */
export function servedFolder(): Served {
  const served: Served = { port: 0 };
  let root = "";
  let server: { port: number; close: () => void };

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), "permit-rulebook-static-server-"));
    const site = join(root, "site");
    mkdirSync(site);
    writeFileSync(join(site, "index.html"), "the site");
    writeFileSync(join(site, "..notes.txt"), "a name that starts with two dots");
    writeFileSync(join(root, "outside.txt"), OUTSIDE);
    server = await serve(site, { base: "" });
    served.port = server.port;
  });

  afterEach(() => {
    server.close();
    rmSync(root, { recursive: true, force: true });
  });

  return served;
}
