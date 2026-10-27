import { describe, expect, it } from "vitest";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ask, OUTSIDE, servedFolder } from "./served-folder.js";

/**
 * The test server (`serve`, from `scripts/browser.mjs`) serves only what is
 * inside the folder it was given (#245). A page under test asks it for paths,
 * and a path is outside text: no escaped `../` or `..\` in it, and no link
 * inside the folder, may reach a file beside the folder.
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

  it("a file reached through a link inside the folder to a folder outside it is not found", async () => {
    const beside = join(server.root, "beside");
    mkdirSync(beside);
    writeFileSync(join(beside, "outside.txt"), OUTSIDE);
    symlinkSync(beside, join(server.site, "link"), "junction");
    const answer = await ask(server.port, "/link/outside.txt");
    expect(answer.body).not.toContain(OUTSIDE);
    expect(answer.status).toBe(404);
  });
});
