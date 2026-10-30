import { describe, expect, it } from "vitest";
import { skipReason, withSite } from "./browser-walk.js";
import { FALLBACK_STACK } from "./fallback-stack.js";
import { SEED_FINISHED_RECORD } from "./seed-finished-record.js";

const notMeasured = skipReason();

// The title these cases have always sat under; every block below repeats it, so each case keeps its id.
const NO_SIDEWAYS_SCROLL = "no page scrolls sideways at 390 px, whatever the fonts";

/**
 * What sticks out, if anything, named well enough to find: its class if it
 * has one, otherwise the words it holds. The element that pushed CI sideways
 * was a `span` with no class, which a tag name alone does not locate.
 */
const OVERFLOW = 'JSON.stringify((() => {'
  + ' const w = document.documentElement.clientWidth;'
  + ' const worst = [];'
  + ' for (const el of document.querySelectorAll("body *")) {'
  + '   const r = el.getBoundingClientRect();'
  + '   if (r.width === 0 || r.right <= w + 0.5) continue;'
  + '   const cls = (el.className || "").toString().trim();'
  + '   const said = (el.textContent || "").split(/\\s+/).join(" ").trim().slice(0, 40);'
  + '   worst.push(`${el.tagName.toLowerCase()}${cls ? "." + cls.slice(0, 24) : ` "${said}"`}`'
  + '     + ` ${Math.round(r.width)} px wide, right edge ${Math.round(r.right)} of ${w}`);'
  + ' }'
  + ' return { overflow: document.documentElement.scrollWidth - w, worst: worst.slice(0, 4) };'
  + '})())';

/**
 * A font drawn wider than any installed here, standing in as extra tracking
 * on the body — the same trick the stamp is sized by. The runner's fonts are
 * wider than this machine's emulated fallback, so the widened measurement is
 * the truth and the plain one is the optimistic case.
 */
const WIDER = (extra: string): string => '(() => { const s = document.createElement("style");'
  + ` s.textContent = "body{letter-spacing:${extra}em}";`
  + ' document.head.appendChild(s); return 1; })()';

// The page's sideways scroll, and the stamp's height, width and bound on its width.
const STAMP_BOX = 'JSON.stringify({ overflow: document.documentElement.scrollWidth'
  + ' - document.documentElement.clientWidth,'
  + ' height: document.querySelector(".stamps .stamp").offsetHeight,'
  + ' width: document.querySelector(".stamps .stamp").offsetWidth,'
  + ' bound: Math.round(parseFloat(getComputedStyle('
  + '   document.querySelector(".stamps .stamp")).maxWidth)) })';

/** The stamp's label tracked `extra` em wider, standing in for a family drawn wider than any here. */
const WIDER_STAMP = (extra: string): string => '(() => { const s = document.createElement("style");'
  + ` s.textContent = ".stamps .stamp{letter-spacing:calc(var(--stamp-tracking) + ${extra}em)}";`
  + ' document.head.appendChild(s); return 1; })()';

/**
 * And nothing anywhere pushes a phone sideways.
 *
 * The pair's stamp was centred under the mark with no bound on its width, so
 * its right edge was a function of how wide the font draws "RECORD GENERATED".
 * With ubuntu's fallback the results screen scrolled 17 px at 390 px (CI,
 * 2026-09-08) — the same family of defect as the header's wrapped nav, and the
 * same fix: measure with the fonts this machine does not have.
 */
describe.skipIf(notMeasured !== null)(NO_SIDEWAYS_SCROLL, () => {
  it("the interview, the results, a route page, a country page and the data page", async () => {
    const seen = await withSite(async ({ page, url }) => {
      const at: Record<string, unknown> = {};
      for (const [name, path] of [
        ["interview", "/"], ["results", "/"], ["route", "/germany/eu-blue-card-general/"],
        ["country", "/germany/"], ["data", "/data/"],
      ] as const) {
        await page.goto(url(path));
        if (name === "results") {
          // The screen the stamp is widest on: "Record generated" is longer
          // than "Rules read".
          await page.evaluate(SEED_FINISHED_RECORD);
          await page.goto(url(path));
        }
        await page.evaluate(FALLBACK_STACK);
        await page.waitUntilAtRest();
        at[name] = JSON.parse(await page.evaluate(OVERFLOW));
        // And again as a wider family would draw it.
        for (const extra of ["0.055", "0.11"]) {
          await page.evaluate(WIDER(extra));
          await page.waitUntilAtRest();
          at[`${name} at +${extra}em`] = JSON.parse(await page.evaluate(OVERFLOW));
        }
      }
      return at;
    }, { viewport: { width: 390, height: 1000 }, mobile: true }) as Record<string, {
      overflow: number; worst: string[];
    }>;

    for (const [name, page] of Object.entries(seen))
      expect(page.overflow, `${name} scrolls sideways by ${page.overflow} px — ${
        page.worst.join("; ") || "no element found past the edge"}`).toBeLessThanOrEqual(0);
  }, 180000);
});

/**
 * The stamp is ONE line of label, on any font (human ruling, 2026-09-08). It
 * is sized for its longest label — "RECORD GENERATED", which the results
 * screen carries — with room for a font drawn wider than the runner's: the
 * margin below is about twice the step from Consolas to DejaVu Sans Mono.
 * Beyond that margin the bound still holds the page, which is the safety net
 * rather than the design.
 */
describe.skipIf(notMeasured !== null)(NO_SIDEWAYS_SCROLL, () => {
  it("keeps its longest label on one line under a font wider than the runner's", async () => {
    const seen = await withSite(async ({ page, url }) => {
      await page.goto(url("/"));
      await page.evaluate(SEED_FINISHED_RECORD);
      await page.goto(url("/"));
      await page.evaluate(FALLBACK_STACK);
      await page.waitUntilAtRest();
      const at: Record<string, unknown> = { own: JSON.parse(await page.evaluate(STAMP_BOX)) };
      // Extra tracking stands in for a family drawn wider than any here.
      for (const extra of [".055", ".11", ".22"]) {
        await page.evaluate(WIDER_STAMP(extra));
        await page.waitUntilAtRest();
        at[extra] = JSON.parse(await page.evaluate(STAMP_BOX));
      }
      return at;
    }, { viewport: { width: 390, height: 1000 }, mobile: true }) as Record<string, {
      overflow: number; height: number; width: number; bound: number;
    }>;

    // Never a sideways scroll, at any width of glyph.
    for (const [where, box] of Object.entries(seen))
      expect(box.overflow, `at +${where}em the page scrolls ${box.overflow} px`).toBeLessThanOrEqual(0);
    // And up to twice the widening a real fallback costs, the label is still
    // one line: the box is the height it is with our own fonts.
    const own = seen.own!;
    for (const margin of [".055", ".11"]) {
      expect(seen[margin]!.height, `at +${margin}em the label wrapped`).toBe(own.height);
      expect(seen[margin]!.width, `at +${margin}em the stamp outgrew its bound`)
        .toBeLessThanOrEqual(own.bound);
    }
  }, 180000);
});
