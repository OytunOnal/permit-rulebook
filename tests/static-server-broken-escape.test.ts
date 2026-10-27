import { describe, expect, it } from "vitest";
import { ask, servedFolder } from "./served-folder.js";

/**
 * A path whose escapes cannot be decoded, in a file of its own: on a server
 * that throws on it, the harness's exit hook ends the worker, and every case
 * in the same file would end with it, unreported.
 */

const server = servedFolder();

describe("the test server serves only what is inside its folder (#245)", () => {
  it("a path that cannot be decoded is a bad request, and the server goes on serving", async () => {
    expect((await ask(server.port, "/%E0%A4%A")).status).toBe(400);
    expect((await ask(server.port, "/index.html")).status).toBe(200);
  });
});
