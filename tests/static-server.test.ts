import { describe, expect, it } from "vitest";
import { ask, OUTSIDE, servedFolder } from "./served-folder.js";

/**
 * The test server (`scripts/static-server.mjs`) serves only what is inside
 * the folder it was given (#245). A page under test asks it for paths, and a
 * path is outside text: an escaped `../` or `..\` once read files of the
 * checkout, and a broken escape once killed the whole run.
 */

const server = servedFolder();

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
});
