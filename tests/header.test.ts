import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { BrowserPage } from "../scripts/browser/browser.mjs";

/**
 * The site's header is one object, drawn by identity.css on every page, and
 * it holds on a machine with none of our fonts.
 */

const dist = fileURLToPath(new URL("../dist", import.meta.url));

/**
 * The interview painted the shared header a second way: three page-local rules
 * (`header`, `.wordmark`, `.wordmark .seal`) with their own sizes, so the same
 * header was a different object on the two halves of the product (Standards
 * review, 2026-09-08). identity.css owns it; this measures that it does.
 */
const { chromePath: chromeAt } = await import("../scripts/browser/browser.mjs");
const { serve: serveDir, withBrowser: withChrome } = await import("../scripts/browser/browser.mjs");

function whyNotMeasured(): string | null {
  try { chromeAt(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}
const notMeasured = whyNotMeasured();

const HEADER_BOX = 'JSON.stringify((() => {'
  + ' const head = document.querySelector(".site-head");'
  + ' const mark = document.querySelector(".site-head .wordmark");'
  + ' const seal = document.querySelector(".site-head .seal");'
  + ' const box = (el) => { const r = el.getBoundingClientRect();'
  + '   return { height: Math.round(r.height), width: Math.round(r.width) }; };'
  + ' const font = getComputedStyle(mark);'
  + ' return { head: box(head), mark: box(mark), seal: box(seal),'
  + '   family: font.fontFamily, size: font.fontSize, weight: font.fontWeight,'
  + '   rule: getComputedStyle(head).borderBottomWidth };'
  + '})())';

describe.skipIf(notMeasured !== null)("the header is one object, measured", () => {
  it("the same box, wordmark and seal on the interview and on a route page", async () => {
    const server = await serveDir(dist);
    try {
      const seen = await withChrome(async (page: BrowserPage) => {
        const at: Record<string, unknown> = {};
        for (const [name, path] of [
          ["interview", "/"], ["route", "/germany/eu-blue-card-general/"],
          ["country", "/germany/"], ["data", "/data/"],
        ] as const) {
          await page.goto(server.url(path));
          at[name] = JSON.parse(await page.evaluate(HEADER_BOX));
        }
        return at;
      }, { viewport: { width: 1100, height: 900 }, mobile: false }) as Record<string, unknown>;

      // Everything identity.css owns. The header's own WIDTH is the page
      // container's business — the interview keeps a wider gutter than the
      // generated pages — so it is measured out of this comparison and the
      // height, the wordmark, the seal, the type and the rule are not.
      const owned = (box: unknown) => {
        const b = box as { head: { height: number }; mark: unknown; seal: unknown;
          family: string; size: string; weight: string; rule: string };
        return JSON.stringify({ height: b.head.height, mark: b.mark, seal: b.seal,
          family: b.family, size: b.size, weight: b.weight, rule: b.rule });
      };
      const reference = owned(seen.route);
      for (const [name, box] of Object.entries(seen))
        expect(owned(box), `${name}'s header is not the route page's header`).toBe(reference);
      // And it is a real header, not four identically-missing ones.
      const route = seen.route as { head: { height: number }; seal: { height: number } };
      expect(route.head.height).toBeGreaterThan(40);
      expect(route.seal.height).toBeGreaterThan(14);
    } finally {
      server.close();
    }
  }, 180000);
});

/**
 * And it has to hold with fonts this machine has never seen.
 *
 * CI runs on ubuntu, where there is no Segoe UI and no Cambria: the fallback
 * stack is wider, the nav row wrapped onto a second line on the narrower
 * generated pages, and the header measured 59 px on the interview against
 * 123 px on a route page (2026-09-08). The design had about 6% of slack, which
 * is not slack. This forces the generic stack — whatever this machine falls
 * back to — and asks for room to spare on the narrowest page the site builds.
 */
describe.skipIf(notMeasured !== null)("the header holds on a machine with none of our fonts", () => {
  /** Drop the named families: what is left is the generic fallback. */
  const FALLBACK = '(() => { const s = document.createElement("style");'
    + ' s.textContent = ":root{--font-serif:serif;--font-sans:sans-serif;--font-mono:monospace}";'
    + ' document.head.appendChild(s); return "forced"; })()';

  /**
   * The row's own items. Since s13 the four countries sit INSIDE a closed
   * disclosure and are not on the row at all — a hidden link's box is at 0,0,
   * which read as a second row the first time this probe met one — so what is
   * counted is the disclosure's word and the links beside it.
   */
  const ROW = 'JSON.stringify((() => {'
    + ' const head = document.querySelector(".site-head");'
    + ' const mark = document.querySelector(".site-head .wordmark");'
    + ' const nav = document.querySelector(".site-head .nav");'
    + ' return { height: Math.round(head.getBoundingClientRect().height),'
    + '   have: Math.round(head.getBoundingClientRect().width),'
    + '   need: Math.round(mark.getBoundingClientRect().width + nav.getBoundingClientRect().width),'
    + '   rows: new Set([...nav.querySelectorAll(":scope > a, :scope > details > summary")]'
    + '     .map((a) => Math.round(a.getBoundingClientRect().top))).size }; })())';

  it("one row at 1100 px, with room to spare, on every page", async () => {
    const server = await serveDir(dist);
    try {
      const seen = await withChrome(async (page: BrowserPage) => {
        const at: Record<string, unknown> = {};
        for (const [name, path] of [
          ["interview", "/"], ["route", "/germany/eu-blue-card-general/"],
          ["country", "/germany/"], ["data", "/data/"], ["feedback", "/feedback/"], ["error", "/404.html"],
        ] as const) {
          await page.goto(server.url(path));
          await page.evaluate(FALLBACK);
          await page.waitUntilAtRest();
          at[name] = JSON.parse(await page.evaluate(ROW));
        }
        return at;
      }, { viewport: { width: 1100, height: 900 }, mobile: false }) as Record<string, {
        height: number; have: number; need: number; rows: number;
      }>;

      const heights = new Set(Object.values(seen).map((v) => v.height));
      expect(heights.size, `header heights: ${[...heights].join(", ")}`).toBe(1);
      for (const [name, box] of Object.entries(seen)) {
        // Every nav item on the same line: a wrapped row is the defect itself.
        expect(box.rows, `${name}: the nav wrapped onto ${box.rows} rows`).toBe(1);
        // And room for a stack wider still than this machine's fallback.
        const headroom = (box.have - box.need) / box.have;
        expect(headroom, `${name}: ${box.need} px of row in ${box.have} px — ${
          Math.round(headroom * 100)}% spare`).toBeGreaterThan(0.12);
      }
    } finally {
      server.close();
    }
  }, 180000);
});
