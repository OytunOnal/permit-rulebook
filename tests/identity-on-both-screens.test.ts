import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import { datasetMeta, type Dataset } from "permit-rulebook-data";
import type { BrowserPage } from "../scripts/browser/browser.mjs";
import { answerWith, openAtRest, skipReason, withSite } from "./browser-walk.js";
import { FALLBACK_STACK } from "./fallback-stack.js";
import { SEED_FINISHED_RECORD } from "./seed-finished-record.js";

/**
 * And the drawing lands in the same place on both screens. A shared stylesheet
 * is not a shared result: a page can override it, and the promise the human
 * made is geometric — the corner meets the middle of the top edge.
 */
const skipped = skipReason();
if (skipped)
  process.stderr.write([
    "",
    `  !! THE IDENTITY PAIR WAS NOT MEASURED: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join("\n"));

// The title these cases have always sat under; every block below repeats it, so each case keeps its id.
const LANDS_IDENTICALLY = "the identity pair lands identically on both screens";

// The results screen once a record is seeded, whose stamp reads "Record generated".
const RESULTS = "/";
// A route page, whose stamp reads "Rules read".
const ROUTE = "/germany/eu-blue-card-general/";

/** What the stamp says, and where its box is. */
const STAMP_STATE = `(() => {
  const box = document.querySelector(".stamps");
  const b = box.getBoundingClientRect();
  return JSON.stringify({
    text: box.querySelector(".stamp").innerHTML.replace(/<[^>]*>/g, " ").split(/[^!-~]+/).filter(Boolean).join(" "),
    datetime: box.querySelector("time").getAttribute("datetime"),
    left: Math.round(b.left), top: Math.round(b.top),
    width: Math.round(b.width), height: Math.round(b.height),
  });
})()`;

/** The tagline under the question: its own line, one step smaller. On a
 * route page it is the H1's next element rather than its em — the heading is
 * the route's name alone since s27 — and the same three things must hold. */
const HEADING = `(() => {
  const h1 = document.querySelector("h1");
  const next = h1.nextElementSibling;
  const tagline = h1.querySelector("em") || (next && next.classList.contains("tagline") ? next : null);
  if (!tagline) return JSON.stringify({ display: "no tagline", rects: 0, smaller: false });
  const size = (el) => Number.parseFloat(getComputedStyle(el).fontSize);
  return JSON.stringify({
    display: getComputedStyle(tagline).display,
    rects: tagline.getClientRects().length,
    smaller: size(tagline) < size(h1),
  });
})()`;

/** The two runs every browser case in this file makes. */
const STACKS = [
  { name: "our fonts", force: false },
  { name: "the fallback stack", force: true },
] as const;

/**
 * Where the pair sits, relative to the text block beside it.
 *
 * The absolute distances differ between the two screens because their content
 * measures do — the results page puts its padding on the body, the route page
 * on the wrap — so what is asserted is what the rule promises: the pair is
 * CENTRED in the space that remains, and level with the middle of the text.
 */
const PLACEMENT = `(() => {
  const head = document.querySelector('.masthead-with-stamps');
  if (!head) return JSON.stringify({ missing: true });
  const box = head.querySelector('.stamps');
  box.removeAttribute('hidden');
  const text = head.firstElementChild;
  const cs = getComputedStyle(head);
  const gap = Number.parseFloat(cs.columnGap) || 0;
  const h = head.getBoundingClientRect(), t = text.getBoundingClientRect(), s = box.getBoundingClientRect();
  return JSON.stringify({
    stack: cs.flexDirection,
    textWidth: Math.round(t.width),
    spaceLeft: Math.round(s.left - t.right - gap),
    spaceRight: Math.round(h.right - s.right),
    centreOffset: Math.round((s.top + s.height / 2) - (t.top + t.height / 2)),
    rightAlign: Math.round(s.right - t.right),
    belowText: Math.round(s.top - t.bottom),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  });
})()`;

/**
 * A corner of an element after its own transform. `getBoundingClientRect` gives
 * the axis-aligned box of a rotated element, which is not the corner — so the
 * transform matrix is applied to the untransformed corner by hand.
 */
const PROBE = `(() => {
  const box = document.querySelector(".stamps");
  if (!box) return JSON.stringify({ missing: true });
  box.removeAttribute("hidden");
  const corner = (el, ux, uy) => {
    const r = el.getBoundingClientRect();
    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform.replace("none", ""));
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const px = (ux - 0.5) * el.offsetWidth, py = (uy - 0.5) * el.offsetHeight;
    return { x: cx + m.a * px + m.c * py, y: cy + m.b * px + m.d * py };
  };
  const mark = box.querySelector(".mark"), stamp = box.querySelector(".stamp");
  const br = corner(mark, 1, 1);
  const mid = corner(stamp, 0.5, 0);
  const b = box.getBoundingClientRect();
  return JSON.stringify({
    dx: +(br.x - mid.x).toFixed(1), dy: +(br.y - mid.y).toFixed(1),
    markW: mark.offsetWidth, markH: mark.offsetHeight,
    stampH: stamp.offsetHeight, boxW: Math.round(b.width), boxH: Math.round(b.height),
    markTransform: getComputedStyle(mark).transform,
    text: stamp.innerHTML.replace(/<[^>]*>/g, " ").split(/[^!-~]+/).filter(Boolean).join(" "),
  });
})()`;

/** What the probe hands back. */
type Measure = Record<string, number | string | undefined>;

/** The stamp's state on question one, after one answer, on the results, and
 * with only its label swapped, the interview opened each time by `openTheInterview`. */
async function readStampOnScreensOpenedBy(page: BrowserPage, openTheInterview: () => Promise<void>): Promise<Record<string, Measure>> {
  const read = async () => JSON.parse(await page.evaluate(STAMP_STATE)) as Measure;
  await openTheInterview();
  const first = await read();
  await answerWith(page, 'document.querySelector(".qcard .opt").click()');
  const answered = await read();
  await page.evaluate(SEED_FINISHED_RECORD);
  await openTheInterview();
  const results = await read();
  // The words alone, with the masthead's own copy untouched.
  await page.evaluate('document.getElementById("stamp-label").textContent = "Rules read"');
  return { first, answered, results, swapped: await read() };
}

/** The stamp's state on every screen, in our fonts. */
const readStampOnEveryScreen = (page: BrowserPage, url: (path: string) => string) =>
  readStampOnScreensOpenedBy(page, () => openAtRest(page, url("/")));

/** The stamp's state on every screen, in the fonts the machine falls back to. */
const readStampOnEveryScreenInTheFallbackStack = (page: BrowserPage, url: (path: string) => string) =>
  readStampOnScreensOpenedBy(page, async () => {
    await openAtRest(page, url("/"));
    await page.evaluate(FALLBACK_STACK);
  });

/** What `probe` reads on the results page and on a route page, on a screen of `viewport`'s size, in `fonts`. */
async function measureBothScreens(
  probe: string, viewport: { width: number; height: number }, fonts: (typeof STACKS)[number],
): Promise<Record<string, Measure>> {
  return await withSite(async ({ page, url }) => {
    const out: Record<string, Measure> = {};
    for (const path of [RESULTS, ROUTE]) {
      await page.goto(url(path));
      if (fonts.force) await page.evaluate(FALLBACK_STACK);
      if (path === RESULTS) {
        // The results screen, which is where this page carries the
        // "Record generated" stamp; unseeded, `/` is question one and
        // states the rules-read date instead (human, 2026-09-08).
        await page.evaluate(SEED_FINISHED_RECORD);
        await openAtRest(page, url(path));
        if (fonts.force) await page.evaluate(FALLBACK_STACK);
      }
      out[path] = JSON.parse(await page.evaluate(probe)) as Measure;
    }
    return out;
  }, { viewport, mobile: viewport.width < 800 }) as Record<string, Measure>;
}

/** Holds the pair's placement on one screen, `m` at `path`, to the rule at `width`. */
function expectPlacementAt(width: number, path: string, m: Measure): void {
  if (width > 760) {
    // A row: the text column stops at 37rem and the pair is centred in
    // what is left, level with the middle of the text.
    expect(m.stack, path).toBe("row");
    expect(m.textWidth, `${path} text column`).toBe(592);
    expect(Math.abs((m.spaceLeft as number) - (m.spaceRight as number)), `${path} not centred`)
      .toBeLessThanOrEqual(1);
    expect(Math.abs(m.centreOffset as number), `${path} not level with the text`)
      .toBeLessThanOrEqual(1);
  } else {
    // A column: the pair sits under the text, right-aligned to it.
    expect(m.stack, path).toBe("column");
    expect(Math.abs(m.rightAlign as number), `${path} not right-aligned`).toBeLessThanOrEqual(1);
    expect(m.belowText as number, `${path} not below the text`).toBeGreaterThanOrEqual(0);
  }
}

describe.skipIf(skipped !== null)(LANDS_IDENTICALLY, () => {
  for (const fonts of STACKS)
  for (const [width, label] of [[1100, "desktop"], [390, "390 px"]] as const) {
    it(`is the same drawing on the results page and a route page at ${label}, in ${fonts.name}`, async () => {
      const seen = await measureBothScreens(PROBE, { width, height: 900 }, fonts);
      const results = seen[RESULTS];
      const route = seen[ROUTE];
      expect(results.missing, "the results page has no pair").toBeUndefined();
      expect(route.missing, "the route page has no pair").toBeUndefined();

      // The promise: the mark's bottom-right corner sits on the middle of the
      // stamp's top edge.
      for (const [path, m] of Object.entries(seen)) {
        expect(Math.abs(m.dx as number), `${path} dx`).toBeLessThan(2);
        expect(Math.abs(m.dy as number), `${path} dy`).toBeLessThan(2);
      }

      // And it is the same drawing, not merely a correct one on each page.
      for (const key of ["markW", "markH", "stampH", "boxW", "boxH", "markTransform", "dx", "dy"])
        expect(route[key], `${key} differs between the two screens`).toEqual(results[key]);

      // The text each stamp carries is its own, and stays its own.
      expect(results.text).toMatch(/^Record generated[ ]+[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
      expect(route.text).toMatch(/^Rules read[ ]+[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
    }, 120000);
  }
});

describe.skipIf(skipped !== null)(LANDS_IDENTICALLY, () => {
  for (const fonts of STACKS)
  for (const [width, label] of [[1100, "desktop"], [390, "390 px"]] as const) {
    it(`sits in the same place on both screens at ${label}, in ${fonts.name}`, async () => {
      const seen = await measureBothScreens(PLACEMENT, { width, height: 1000 }, fonts);
      const results = seen[RESULTS];
      const route = seen[ROUTE];
      expect(results.missing, "the results masthead does not carry the pair").toBeUndefined();
      expect(route.missing, "the route masthead does not carry the pair").toBeUndefined();

      // The pair must never push the page sideways. `measure:taps` walks the
      // results screen before any answers, where the stamp is still hidden,
      // so this is the only check that sees it (2026-09-08).
      for (const [path, m] of Object.entries(seen))
        expect(m.overflow as number, `${path} scrolls sideways`).toBeLessThanOrEqual(0);

      for (const [path, m] of Object.entries(seen)) expectPlacementAt(width, path, m);

      // The same placement, not merely a correct one on each page.
      const shared = width > 760
        ? ["stack", "textWidth", "centreOffset"]
        : ["stack", "rightAlign", "belowText"];
      for (const key of shared)
        expect(route[key], `${key} differs between the two screens`).toEqual(results[key]);
    }, 120000);
  }
});

/**
 * The first screen carries the pair too (human, 2026-09-08).
 *
 * It was hidden until a record existed, so the one screen every reader sees
 * first had an empty right-hand side. On the questions it states the fact a
 * route page states — when the rules were last read — and on the results it
 * becomes the record's own date. One pair, two states, and the box does not
 * move between them.
 */
describe.skipIf(skipped !== null)(LANDS_IDENTICALLY, () => {
  for (const [stack, readStamp] of [
    ["our fonts", readStampOnEveryScreen],
    ["the fallback stack", readStampOnEveryScreenInTheFallbackStack],
  ] as const)
  it(`states the rules-read date on the questions and the record's date on the results, in ${stack}`, async () => {
    const seen = await withSite(
      ({ page, url }) => readStamp(page, url),
      { viewport: { width: 1100, height: 1000 }, mobile: false },
    ) as Record<string, Measure>;

    const newest = datasetMeta(dataset as unknown as Dataset).newest_retrieved_at;
    // The questions stand on the dataset's own newest read date.
    expect(seen.first.text).toBe(`Rules read ${newest}`);
    expect(seen.first.datetime).toBe(newest);
    expect(seen.answered.text).toBe(`Rules read ${newest}`);
    // The results stand on the day the record was made.
    expect(seen.results.text).toMatch(/^Record generated [0-9]{4}-[0-9]{2}-[0-9]{2}$/);
    // The box is the same box on every screen, and swapping the words alone moves nothing at all.
    for (const state of ["answered", "results"])
      for (const key of ["left", "width", "height"])
        expect(seen[state][key], `${key} moved on ${state}`).toBe(seen.first[key]);
    for (const key of ["left", "top", "width", "height"])
      expect(seen.swapped[key], `${key} moved when only the label changed`).toBe(seen.results[key]);
  }, 120000);
});

describe.skipIf(skipped !== null)(LANDS_IDENTICALLY, () => {
  /**
   * The masthead heading is two lines by design, from one rule.
   */
  for (const { name: stack, force } of STACKS)
  it(`keeps the tagline on a line of its own, at every width, in ${stack}`, async () => {
    const seen = await withSite(async ({ page, url }) => {
      const out: Record<string, Measure> = {};
      for (const [label, path] of [["interview", "/"], ["route", ROUTE]] as const) {
        await page.goto(url(path));
        if (force) await page.evaluate(FALLBACK_STACK);
        out[label] = JSON.parse(await page.evaluate(HEADING)) as Measure;
      }
      return out;
    }, { viewport: { width: 320, height: 900 }, mobile: true }) as Record<string, Measure>;

    for (const [where, m] of Object.entries(seen)) {
      // `display: block` is what keeps it off the question's line; one client
      // rect is what proves it did not wrap up into it.
      expect(m.display, `${where}: the tagline is not its own line`).toBe("block");
      expect(m.rects, `${where}: the tagline wrapped`).toBe(1);
      expect(m.smaller, `${where}: the tagline is not a step smaller`).toBe(true);
    }
  }, 120000);
});
