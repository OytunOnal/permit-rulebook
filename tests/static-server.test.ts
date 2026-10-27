import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * The test server (`scripts/static-server.mjs`) serves only what is inside
 * the folder it was given (#245). A page under test asks it for paths, and a
 * path is outside text: an escaped `../` or `..\` once read files of the
 * checkout, and a broken escape once killed the whole run.
 */

const { serve } = await import("../scripts/static-server.mjs");

interface Answer { status: number; body: string }

/** `path` sent as written, with nothing between it and the server to fold its dots. */
const ask = (port: number, path: string): Promise<Answer> => new Promise((resolve, reject) => {
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
const OUTSIDE = "a file next to the served folder";

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
});

afterEach(() => {
  server.close();
  rmSync(root, { recursive: true, force: true });
});

describe("the test server serves only what is inside its folder (#245)", () => {
  it("a file inside the folder is served, a name starting with two dots included", async () => {
    expect(await ask(server.port, "/index.html")).toEqual({ status: 200, body: "the site" });
    expect(await ask(server.port, "/..notes.txt")).toEqual({ status: 200, body: "a name that starts with two dots" });
  });

  it.each([
    "/%2e%2e%2foutside.txt",
    "/..%2foutside.txt",
    "/..%5coutside.txt",
    "/../outside.txt",
  ])("%s, a way out of the folder, is not found", async (path) => {
    const answer = await ask(server.port, path);
    expect(answer.body).not.toContain(OUTSIDE);
    expect(answer.status).toBe(404);
  });

  it("a path that cannot be decoded is a bad request, and the server goes on serving", async () => {
    expect((await ask(server.port, "/%E0%A4%A")).status).toBe(400);
    expect((await ask(server.port, "/index.html")).status).toBe(200);
  });
});
