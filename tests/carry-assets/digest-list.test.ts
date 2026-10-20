import { describe, expect, it } from "vitest";
import { digestListOf } from "../../scripts/carry-assets/digest-list.mjs";
import { CSS, CSS_NAME, HEADER, sha256 } from "./deploy-fixtures.js";

/**
 * The digest list's format, as plain calls: the list a build writes and the
 * reading the next deploy holds it to. What the carry does with a list it
 * reads — what it carries, refuses and says — is the flow's, in the carry's
 * own test files.
 */
describe("the digest list's format", () => {
  it("lists the plain names without reading the bytes of a name it leaves out", () => {
    // A file in `_astro/` whose name the list would refuse is left out, so its
    // bytes are never needed: one that cannot be read must not cost the next
    // deploy the whole list.
    const unreadable = {
      name: "not plain.css",
      get bytes(): Buffer { throw new Error("EPERM: operation not permitted, open 'not plain.css'"); },
    };
    const list = digestListOf([{ name: CSS_NAME, bytes: CSS }, unreadable]);
    expect(list.count).toBe(1);
    expect(list.text).toBe(`${HEADER}\n${sha256(CSS)}  ${CSS_NAME}\n`);
  });
});
