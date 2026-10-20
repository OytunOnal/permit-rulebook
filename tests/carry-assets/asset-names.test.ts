import { describe, expect, it } from "vitest";
import { readAssetNames } from "../../scripts/carry-assets/asset-names.mjs";
import { pageOf, pageOfSize } from "./live-page.js";

/**
 * Which references in a live page are this deploy's assets, as plain calls on
 * `readAssetNames`. What the running step does with each answer — what it
 * fetches, prints and annotates — is `tests/s33.test.ts`'s.
 */
describe("which references in a live page are this deploy's assets", () => {
  it("keeps only the names under our own origin, and hands back every reference it refused", () => {
    // The parsing rule itself, where the three foreign shapes can be read one
    // beside the other. What the running step does with them is
    // `tests/s33.test.ts`'s case on another host, another scheme or no host.
    const refs = [
      "https://evil.example/_astro/absolute.js",
      // A protocol-relative reference inherits the page's scheme, so only the
      // host makes this one foreign — and the host is enough.
      "//evil.example/_astro/relative.js",
      // Same host, plaintext: the scheme is part of the origin, and an https
      // site whose page names an http asset is a page to distrust.
      "http://example.test/_astro/plaintext.js",
      "/_astro/index.HHHHHHHH.css",
    ];
    const { names, refused, unserved } = readAssetNames(pageOf(refs).toString("utf8"), "https://example.test/");
    expect(names).toEqual(["index.HHHHHHHH.css"]);
    // Refused by name: every reference that did not become a name is handed
    // back, so the caller can print it and nothing is dropped in silence. All
    // three name a host that is not ours, which is the bucket that predicts no
    // request to our origin and therefore no annotation — where they resolve
    // is what decides that, so a case about the three foreign shapes is also
    // the case that says `unserved` stays empty for them.
    //
    // These three are short enough to come back whole, and that is deliberate:
    // the bound on a printed reference is `short`'s and is spelled there, once.
    // Where it is MEASURED is on the running step, in `tests/s33.test.ts`,
    // against a 430-character reference that takes the same refusal branch as
    // these.
    expect(refused.map(({ ref }) => ref)).toEqual(refs.slice(0, 3));
    expect(unserved).toEqual([]);
  });

  it("reads a quoted `/_astro/` path wherever the page holds it, not only in an attribute", () => {
    // The boundary as the code draws it. The pattern is a quoted string with
    // no whitespace in it and `/_astro/` inside; it knows nothing about
    // attributes, so a name a page holds in a comment or in an inline script
    // is read exactly as a `href` is, while an unquoted one is not read at
    // all. What each direction of that error costs the carry is
    // `readAssetNames`'s "What shapes this reads, and what it does not".
    const { names, unserved, refused } = readAssetNames(
      "<!DOCTYPE html><html><head>"
      + "<!-- <link rel=\"stylesheet\" href=\"/_astro/ghost.css\"> -->"
      + "<script>const u = \"/_astro/inscript.js\";</script>"
      + "<link rel=\"stylesheet\" href=\"/_astro/real.css\">"
      + "</head><body>an unquoted /_astro/bare.css</body></html>",
      "https://example.test/",
    );
    expect(names, "the reader saw an attribute and not the page").toEqual(["ghost.css", "inscript.js", "real.css"]);
    // Nothing is said about any of them: the two the page did not mean to
    // serve are indistinguishable here from the one it did.
    expect(unserved).toEqual([]);
    expect(refused).toEqual([]);
  });

  it("reads a page at its ceiling in time that grows with the page, not with its square", () => {
    // Reading the names out of a page runs after the body is in hand, and the
    // run's budget sizes only request timeouts, so nothing can interrupt it:
    // it has to be linear in the page. Why is written in `readAssetNames`;
    // this asserts the SHAPE, which is the part only a running clock shows.
    //
    // A clock is the instrument because there is no other one here: the cost is
    // CPU inside a pure function, and nothing it returns differs when it is
    // slow. So the margin carries the honesty instead. Four times the page is
    // about four times the work when the cost is linear and sixteen times when
    // it is quadratic, and the bound sits between them, at eight. Each page is
    // read three times and the fastest read is the measurement — a loaded
    // runner can only add time to a run, never take it away — and the
    // hundred-millisecond floor keeps timer noise from deciding a case about a
    // shape. On these two exact pages a quadratic reading takes about 96 ms and
    // 1,684 ms and a linear one 4 ms and 17 ms, so a quadratic reading fails
    // this bound, at 1,684 ms against 768 ms.
    const quarter = pageOfSize(128 * 1024);
    const whole = pageOfSize(512 * 1024);
    const fastestOf = (html: string): { ms: number; names: number } => {
      let ms = Number.POSITIVE_INFINITY;
      let names = 0;
      for (let run = 0; run < 3; run += 1) {
        const began = Date.now();
        names = readAssetNames(html, "https://example.test/").names.length;
        ms = Math.min(ms, Date.now() - began);
      }
      return { ms, names };
    };
    const small = fastestOf(quarter).ms;
    const large = fastestOf(whole);
    // The cost is per distinct name kept, so this is only measuring a shape if
    // the page holds thousands of them.
    expect(large.names, `a ${whole.length}-byte page held ${large.names} names`).toBeGreaterThan(9_000);
    expect(large.ms, `${whole.length} bytes took ${large.ms} ms; ${quarter.length} bytes took ${small} ms`)
      .toBeLessThan(Math.max(small * 8, 100));
  });
});
