import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset } from "permit-rulebook-data";
import { notFoundPage } from "../src/lib/not-found.js";
import { countryLinks } from "../src/lib/country-page.js";
import { PAGE_CSS } from "../src/lib/route-page.js";
import { url } from "../src/lib/site.js";

/**
 * B4 — a wrong URL landed the visitor on GitHub's own error page.
 *
 * The isolated critique of 2026-09-08 requested `/nope-not-here` from the live
 * host and got a body titled "Page not found · GitHub Pages": another company's
 * branding, no masthead, no way back, nothing. A mistyped link, a shared link
 * that lost a character, a route slug that changed — every one of them ended
 * there. GitHub Pages serves `/404.html` for an unknown path if the site
 * carries one, so the fix is a page in this product's own design.
 *
 * Two halves, as with the browser checks: the page as it is generated, which
 * this suite can read without a build, and the file the build actually emits,
 * which is the thing GitHub serves. A run that could not read the second says
 * so out loud, and CI may not skip it.
 */

const ds = dataset as unknown as Dataset;
const page = notFoundPage(ds);
const built = fileURLToPath(new URL("../dist/404.html", import.meta.url));
const missing = existsSync(built) ? null : "no dist/404.html — run npm run build first";

if (missing)
  process.stderr.write([
    "",
    `  !! THE BUILT ERROR PAGE WAS NOT READ: ${missing}.`,
    "     Nothing in this run checked what GitHub Pages will actually serve.",
    "     Run: npm run build && npm test",
    "",
    "",
  ].join("\n"));

describe("B4 — a wrong URL lands on a page of this product's own", () => {
  it("never lets a pipeline skip the built file", () => {
    if (missing) expect(process.env.CI, `CI cannot skip: ${missing}`).toBeFalsy();
    else expect(missing).toBeNull();
  });

  it("carries the masthead with the identity pair, from the one shared rule", () => {
    // The pair is drawn by identity.css, which the page inlines through the
    // route page's stylesheet — never by a second copy of the geometry.
    expect(page.html).toContain('<header class="masthead masthead-with-stamps">');
    expect(page.html).toContain('<div class="stamps">');
    expect(page.html).toContain('class="mark"');
    expect(page.html).toContain(`<style>${PAGE_CSS}</style>`);
    // The geometry comes from that stylesheet and from nowhere else. Read off
    // what ships: the page's own <style> is the shared sheet, and the pair's
    // rules appear in it exactly as often as they appear there (Standards
    // review, 2026-09-08 — this used to grep the module's source).
    const own = page.html.slice(page.html.indexOf("<style>"), page.html.indexOf("</style>"));
    for (const selector of [".stamps {", ".stamps .mark {", ".stamps .stamp {"]) {
      expect(own, selector).toContain(selector);
      expect(own.split(selector).length - 1, `${selector} is declared twice`)
        .toBe(PAGE_CSS.split(selector).length - 1);
    }
    // And it says the product's name where the mark stands.
    expect(page.html).toContain('title="Permit Rulebook"');
  });

  it("says in one sentence that the page does not exist", () => {
    const text = page.html.replace(/<style>[\s\S]*?<\/style>/g, " ")
      .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(text).toContain("This page does not exist.");
    expect(page.title).toContain("Permit Rulebook");
    // A crawler is told not to index it, and it is not in the sitemap either
    // (`tests/site-index.test.ts`).
    expect(page.html).toContain('<meta name="robots" content="noindex">');
  });

  it("offers the interview and all four country pages", () => {
    const hrefs = [...page.html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    expect(hrefs).toContain(url("/"));
    for (const link of countryLinks(ds))
      expect(hrefs, `no way to ${link.name}`).toContain(url(link.path));
    // Every control reaches the tap floor, by the same two classes every
    // generated page uses.
    for (const m of page.html.matchAll(/<(?:a|button)\b([^>]*)>/g)) {
      const classes = (/class="([^"]*)"/.exec(m[1])?.[1] ?? "").split(/\s+/).filter(Boolean);
      expect(classes.filter((c) => c === "tap" || c === "tap-min").length, m[0]).toBe(1);
    }
  });

  it.skipIf(missing !== null)("and the build emits that page as 404.html, which is the file GitHub serves", () => {
    const html = readFileSync(built, "utf8").split("\r\n").join("\n");
    expect(html).toContain('<header class="masthead masthead-with-stamps">');
    expect(html).toContain('<div class="stamps">');
    expect(html).toContain("This page does not exist.");
    expect(html).toContain(`href="${url("/")}"`);
    for (const link of countryLinks(ds))
      expect(html, `the built error page does not link ${link.path}`)
        .toContain(`href="${url(link.path)}"`);
  });
});
