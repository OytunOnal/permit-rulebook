import { describe, expect, it } from "vitest";
import { digestListOf, readAssetDigests } from "../../scripts/carry-assets/digest-list.mjs";
import { CSS, CSS_NAME, HEADER, JS, JS_NAME, sha256 } from "./deploy-fixtures.js";

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

  it("keeps only the plain names, sorted, so one line can never cost the next deploy the whole list", () => {
    const list = digestListOf([
      { name: JS_NAME, bytes: JS },
      { name: "..", bytes: CSS },
      { name: "with space.css", bytes: CSS },
      { name: CSS_NAME, bytes: CSS },
    ]);
    expect(list.count).toBe(2);
    expect(list.text).toBe(`${HEADER}\n${sha256(CSS)}  ${CSS_NAME}\n${sha256(JS)}  ${JS_NAME}\n`);
  });

  it("reads back the list a build writes", () => {
    // The control for the refusals below: a whole list, as written, is read.
    const listAsRead = readAssetDigests(digestListOf([{ name: CSS_NAME, bytes: CSS }, { name: JS_NAME, bytes: JS }]).text);
    expect(listAsRead.ok, JSON.stringify(listAsRead)).toBe(true);
    expect(listAsRead.digests).toEqual(new Map([[CSS_NAME, sha256(CSS)], [JS_NAME, sha256(JS)]]));
  });

  it("refuses a list whose first line is not the header, so an error page is never read as one", () => {
    const body = `<!DOCTYPE html><html><body>not found</body></html>\n${sha256(CSS)}  ${CSS_NAME}\n`;
    expect(readAssetDigests(body).ok).toBe(false);
  });

  it("refuses the whole list over one line that is not a sha256 and a name", () => {
    // Cut mid-line, as a truncated transfer leaves it: the run is refused
    // rather than shrunk.
    const cut = `${HEADER}\n${sha256(CSS)}  ${CSS_NAME}\n${sha256(JS).slice(0, 20)}\n`;
    expect(readAssetDigests(cut).ok).toBe(false);
  });

  it("refuses a list that names one file twice", () => {
    const twice = `${HEADER}\n${sha256(CSS)}  ${CSS_NAME}\n${sha256(JS)}  ${CSS_NAME}\n`;
    expect(readAssetDigests(twice).ok).toBe(false);
  });
});
