import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { RETURNING_LINE } from "../src/lib/copy.js";
import { holdLineHtml } from "../src/lib/question.js";
import { STORAGE_KEY, serialize } from "../src/lib/record.js";

/**
 * s31 — the hold state says where it is, and two small things.
 *
 * A returning reader with a finished record saw, until the module drew (~700
 * ms on a slow connection), the header, the eyebrow and — a thousand pixels of
 * blank later — *Your answers are on this device — bringing them back*: s22
 * covered the headline, the subline, the stamp, the box and the footer with
 * `visibility: hidden`, which keeps their room, and centred the line inside
 * the hidden box (measured 2026-09-18 at 390×844, the line at 445–800 under an
 * eyebrow at 107–122). The blank read as a failure. Now the covered things
 * take no room and the line sits under the eyebrow, in the masthead's flow.
 *
 * Two smaller things ride with it. After a correction the verdict was drawn
 * and announced but the focus stayed on `<body>` (F6 was fixed for the
 * interview, not for the return to the verdict); now the headline — the very
 * element the live region reads — takes it. And on a desktop with classic
 * scrollbars the verdict's arrival made a scrollbar appear and took its width
 * from the layout (s22's note); the root now keeps the gutter.
 *
 * The cases below read the built page in a real browser — with the module
 * held back where the hold state is the question, and with the platform's
 * scrollbars drawn where the gutter is.
 */
const dist = fileURLToPath(new URL("../dist", import.meta.url));

const { chromePath } = await import("../scripts/chrome.mjs");
const { serve, withBrowser } = await import("../scripts/browser.mjs");

function why(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}
const skipped = why();
if (skipped)
  process.stderr.write([
    "",
    `  !! THE HOLD STATE WAS NOT WALKED IN A BROWSER: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join(String.fromCharCode(10)));

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
  problems(): string[];
}

const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** s20's finished persona: an offer in Germany, a Turkish passport, every
 * question answered, so the record restores straight to a verdict. */
const finished = {
  destination: "de", situation: "offer", qualification: "degree", citizenship: "TR",
  occupation_shortage: "yes", recognition_de: "recognized", experience_5y: "lt2", experience_7y: "lt3",
  salary_eur_year: "band_4", german: "none", english: "none", funds_eur_month: "band_0",
};
/** Seeded the way the product writes it: a record that reached a verdict
 * carries the bit that says so (s22). */
const SEED_FINISHED = `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${
  JSON.stringify(serialize(finished, Object.keys(finished), true))})`;

/**
 * What is on the screen, read as a reader reads it: which elements have any
 * room on the page, where the eyebrow and the line are, and what — if
 * anything — is painted below the line. An element "takes room" when the
 * browser has a box for it at all: `display: none` has none, `visibility:
 * hidden` still does, and the difference is the whole of point 1.
 */
const HOLD = `JSON.stringify((() => {
  const head = document.querySelector(".site-head");
  const brand = document.querySelector(".masthead-with-stamps .brand");
  // Painted, as the browser knows it: a box, no display or visibility
  // hiding it, and no closed <details> above it — Chrome lays the header's
  // folded country list out under content-visibility: hidden, so its items
  // have boxes on the page a reader cannot see.
  const shown = (el) => !!el && el.getClientRects().length > 0
    && el.checkVisibility({ visibilityProperty: true });
  const lines = [...document.querySelectorAll(".stand-in")].filter(shown);
  const line = lines[0] ?? null;
  const box = (el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height }; };
  const takesRoom = (sel) => { const el = document.querySelector(sel); return !!el && el.getClientRects().length > 0; };
  // Everything visible whose top is below the line's bottom — the line's
  // own ancestors start above it, so they are not in this list.
  const below = !line ? [] : [...document.body.querySelectorAll("*")]
    .filter((el) => shown(el) && !el.classList.contains("visually-hidden"))
    .filter((el) => { const r = el.getBoundingClientRect(); return r.height > 0 && r.top >= box(line).bottom - 1; })
    .map((el) => el.id ? "#" + el.id : el.tagName + "." + (el.className || "").split(" ")[0]);
  return {
    first: document.documentElement.dataset.first ?? "",
    state: document.getElementById("app").dataset.state,
    headerShown: shown(head),
    brandShown: shown(brand),
    brand: box(brand),
    gap: parseFloat(getComputedStyle(head).paddingBottom),
    lines: lines.map((el) => el.textContent),
    line: line ? box(line) : null,
    standInsLeft: document.querySelectorAll(".stand-in").length,
    room: {
      headline: takesRoom("#headline"), subline: takesRoom("#subline"), stamp: takesRoom("#stamp"),
      app: takesRoom("#app"), footer: takesRoom("footer.site-foot"),
    },
    headlineShown: shown(document.getElementById("headline")),
    headline: box(document.getElementById("headline")),
    below,
    docHeight: document.documentElement.scrollHeight,
    scrollY: window.scrollY,
  };
})())`;

interface Hold {
  first: string;
  state: string;
  headerShown: boolean;
  brandShown: boolean;
  brand: { top: number; bottom: number; height: number };
  gap: number;
  lines: string[];
  line: { top: number; bottom: number; height: number } | null;
  standInsLeft: number;
  room: { headline: boolean; subline: boolean; stamp: boolean; app: boolean; footer: boolean };
  headlineShown: boolean;
  headline: { top: number; bottom: number; height: number };
  below: string[];
  docHeight: number;
  scrollY: number;
}

/**
 * The line is in the built page, between the eyebrow and the headline —
 * read off the HTML rather than the constant read back to itself, so
 * emptying it or moving it turns this red (DECISIONS.md — checks require
 * decisions, not content).
 */
describe.skipIf(!existsSync(dist))("the hold line ships in the masthead (s31)", () => {
  const built = readFileSync(join(dist, "index.html"), "utf8");
  const masthead = /<header class="masthead-with-stamps">([\s\S]*?)<\/header>/.exec(built)?.[1] ?? "";

  it("is a sentence, the record line's own, under the eyebrow and above the headline", () => {
    const said = /<p class="stand-in stand-in-verdict">([^<]*)<\/p>/.exec(masthead)?.[1] ?? "";
    expect(said, "the hold line shipped empty, or not in the masthead").not.toBe("");
    expect(said.length, `too short to be a sentence: ${JSON.stringify(said)}`).toBeGreaterThan(20);
    expect(said, "not a sentence").toMatch(/[.!]$/);
    expect(said).toBe(RETURNING_LINE);
    expect(masthead).toContain(holdLineHtml());
    expect(masthead.indexOf('class="brand"')).toBeLessThan(masthead.indexOf("stand-in-verdict"));
    expect(masthead.indexOf("stand-in-verdict")).toBeLessThan(masthead.indexOf('id="headline"'));
  });
});

/** The module held four seconds out — the scenario's own measurement — and
 * the page read while it is still in the post. */
const HELD_MS = 4000;

describe.skipIf(skipped !== null)("the hold state is one line under the eyebrow (point 1)", () => {
  for (const [name, viewport, mobile] of [
    ["390x844", { width: 390, height: 844 }, true],
    ["390x1400", { width: 390, height: 1400 }, true],
    ["1280x900", { width: 1280, height: 900 }, false],
  ] as const)
    it(`at ${name}: header, eyebrow, the line, and nothing else — then the verdict where it stays`, async () => {
      const server = await serve(dist, { delayJsMs: HELD_MS });
      try {
        const seen = await withBrowser(async (page: BrowserPage) => {
          await page.goto(server.url("/404.html"), 300);
          await page.evaluate(SEED_FINISHED);
          await page.goto(server.url("/"), 500);
          const held = JSON.parse(await page.evaluate(HOLD)) as Hold;
          await settle(HELD_MS + 1200);
          const drawn = JSON.parse(await page.evaluate(HOLD)) as Hold;
          return { held, drawn, problems: page.problems() };
        }, { viewport, mobile });
        expect(seen.problems).toEqual([]);
        const h = seen.held;
        expect(h.first, "the pre-paint script did not name a reader owed a verdict").toBe("verdict");
        expect(h.state, "the module had already drawn — the hold was not held").toBe("questions");
        expect(h.headerShown, "the site header is not on the screen").toBe(true);
        expect(h.brandShown, "the eyebrow is not on the screen").toBe(true);
        // The line, once, in the reader's own words.
        expect(h.lines).toEqual([RETURNING_LINE]);
        // Directly under the eyebrow: within the eyebrow's own height and one
        // gap — the breath the header keeps under itself — of its bottom.
        expect(h.line!.top, `the line's top is at ${h.line!.top}, the eyebrow's bottom at ${h.brand.bottom}`)
          .toBeGreaterThanOrEqual(h.brand.bottom - 1);
        expect(h.line!.top - h.brand.bottom, `the line sits ${h.line!.top - h.brand.bottom} px under the eyebrow`)
          .toBeLessThanOrEqual(h.brand.height + h.gap);
        // The covered things take no room: not hidden in place, gone from
        // the flow until the module draws.
        expect(h.room, "something covered still holds its room").toEqual({
          headline: false, subline: false, stamp: false, app: false, footer: false,
        });
        expect(h.below, `painted below the line: ${h.below.join(", ")}`).toEqual([]);

        // The module has drawn: the line is gone, the verdict is there, and
        // it appeared under the eyebrow — where the line was — not somewhere
        // the reader has to scroll to.
        const d = seen.drawn;
        expect(d.state, "the module did not draw the verdict").toBe("results");
        expect(d.standInsLeft, "a stand-in outlived the first screen").toBe(0);
        expect(d.headlineShown).toBe(true);
        expect(d.room.footer).toBe(true);
        expect(d.headline.top, "the headline is not under the eyebrow").toBeGreaterThanOrEqual(d.brand.bottom - 1);
        expect(d.headline.top - d.brand.bottom).toBeLessThanOrEqual(d.brand.height + d.gap);
        expect(d.scrollY, "the first paint is not a gesture: nothing scrolls").toBe(0);
      } finally {
        server.close();
      }
    }, 180000);
});

/**
 * Where the focus is, and what the live region says — read after the
 * gesture, or after the arrival, the way s20 reads them.
 */
const FOCUS = `JSON.stringify((() => {
  const active = document.activeElement;
  const h1 = document.getElementById("headline");
  return {
    state: document.getElementById("app").dataset.state,
    active: !active ? "" : active.id ? "#" + active.id : active.tagName.toLowerCase(),
    headline: (h1.textContent || "").trim(),
    tabindex: h1.getAttribute("tabindex"),
    live: (document.getElementById("cstatus").textContent || "").trim(),
    scrollY: Math.round(window.scrollY),
    h1Top: Math.round(h1.getBoundingClientRect().top),
    h1Bottom: Math.round(h1.getBoundingClientRect().bottom),
    viewport: window.innerHeight,
  };
})())`;

interface Focus {
  state: string;
  active: string;
  headline: string;
  tabindex: string | null;
  live: string;
  scrollY: number;
  h1Top: number;
  h1Bottom: number;
  viewport: number;
}

/** s20's walk: on the verdict, open the ledger, tap the salary row's ✎,
 * answer another band. The row is found by its field, never by its words. */
const TAP_SALARY = `(() => {
  document.getElementById("decl").open = true;
  const row = document.querySelector('#decl-list [data-field="salary_eur_year"]');
  row.scrollIntoView({ block: "center" });
  row.click();
  return "tapped";
})()`;
const ANSWER_ANOTHER_BAND = `(() => {
  const other = document.querySelector("#main .qcard .opt:not(.sel)");
  other.click();
  return other.textContent.trim();
})()`;

describe.skipIf(skipped !== null)("focus follows the verdict (point 2)", () => {
  for (const [name, viewport, mobile] of [
    ["390x1400, the tall phone s20 measured", { width: 390, height: 1400 }, true],
    ["1240x900, where the ledger is a sidebar", { width: 1240, height: 900 }, false],
  ] as const)
    it(`at ${name}: after a correction the headline holds the focus — the element the live region says`, async () => {
      const server = await serve(dist);
      try {
        const seen = await withBrowser(async (page: BrowserPage) => {
          await page.goto(server.url("/404.html"), 300);
          await page.evaluate(SEED_FINISHED);
          await page.goto(server.url("/"), 1600);
          const arrived = JSON.parse(await page.evaluate(FOCUS)) as Focus;
          await page.evaluate(TAP_SALARY);
          await settle(900);
          const onQuestion = JSON.parse(await page.evaluate(FOCUS)) as Focus;
          await page.evaluate(ANSWER_ANOTHER_BAND);
          await settle(900);
          const back = JSON.parse(await page.evaluate(FOCUS)) as Focus;
          return { arrived, onQuestion, back, problems: page.problems() };
        }, { viewport, mobile });
        expect(seen.problems).toEqual([]);
        // The arrival keeps s10's rule: a reader who touched nothing has
        // nothing taken from them.
        expect(seen.arrived.state).toBe("results");
        expect(seen.arrived.active, `the arrival focused ${seen.arrived.active}`).toBe("body");
        expect(seen.onQuestion.state).toBe("questions");
        // The return: the verdict is drawn, announced once, and the headline
        // — the same element — holds the focus, out of the tab order.
        const r = seen.back;
        expect(r.state).toBe("results");
        expect(r.headline).not.toBe("");
        expect(r.headline).not.toBe(seen.arrived.headline);
        expect(r.active, `the focus is on ${r.active || "nothing"}`).toBe("#headline");
        expect(r.tabindex, "the headline is in the tab order, or not focusable").toBe("-1");
        expect(r.live, "the live region does not say the headline").toBe(r.headline);
        // One move: the reveal brought the masthead into view (s20), and the
        // focus did not scroll a second time — the headline is on the screen.
        expect(r.h1Top, `the headline's top is at ${r.h1Top} (scrollY ${r.scrollY})`).toBeGreaterThanOrEqual(0);
        expect(r.h1Bottom, `the headline's bottom is at ${r.h1Bottom} of ${r.viewport}`).toBeLessThanOrEqual(r.viewport);
      } finally {
        server.close();
      }
    }, 180000);

  for (const [name, path, seed] of [
    ["a cold /", "/", "localStorage.clear()"],
    ["a country page's link", "/?country=fr", "localStorage.clear()"],
    ["a finished record", "/", SEED_FINISHED],
  ] as const)
    it(`a first arrival takes no focus: ${name}`, async () => {
      const server = await serve(dist);
      try {
        const seen = await withBrowser(async (page: BrowserPage) => {
          await page.goto(server.url("/404.html"), 300);
          await page.evaluate(seed);
          await page.goto(server.url(path), 1600);
          return { at: JSON.parse(await page.evaluate(FOCUS)) as Focus, problems: page.problems() };
        }, { viewport: { width: 390, height: 844 }, mobile: true });
        expect(seen.problems).toEqual([]);
        expect(seen.at.active, `the arrival focused ${seen.at.active}`).toBe("body");
      } finally {
        server.close();
      }
    }, 180000);
});

/**
 * The column's left edge and the platform's chrome, read with the scrollbars
 * drawn — the harness hides them unless asked, and a hidden scrollbar takes
 * no width, which would make this case pass for nothing.
 */
const EDGE = `JSON.stringify({
  state: document.getElementById("app").dataset.state,
  mainLeft: document.getElementById("main").getBoundingClientRect().left,
  gutter: getComputedStyle(document.documentElement).scrollbarGutter,
  scrolls: document.documentElement.scrollHeight > window.innerHeight,
  chrome: window.innerWidth - document.documentElement.clientWidth,
})`;

interface Edge {
  state: string;
  mainLeft: number;
  gutter: string;
  /** Whether the page is taller than the viewport — whether a scrollbar has
   * anything to do. */
  scrolls: boolean;
  /** The width the platform's scrollbar takes from the layout, in pixels:
   * zero for a hidden or overlay one. */
  chrome: number;
}

describe.skipIf(skipped !== null)("the gutter is stable (point 3)", () => {
  /**
   * At 1280x900 the question page is already taller than the viewport
   * (1,315 px on master, 2026-09-18), so a scrollbar is there before and
   * after and the edge could not move; the taller screen is where the
   * question page fits and the verdict's arrival used to take 15 px from
   * the layout — the column's edge moved 7.5 px on master. Both are read:
   * the scenario's viewport, and the one where the defect shows.
   */
  for (const [name, viewport] of [
    ["1280x900", { width: 1280, height: 900 }],
    ["1280x1400, where the question page fits without a scrollbar", { width: 1280, height: 1400 }],
  ] as const)
    it(`at ${name}: the column's left edge is the same before and after the verdict`, async () => {
      const server = await serve(dist);
      try {
        const seen = await withBrowser(async (page: BrowserPage) => {
          await page.goto(server.url("/404.html"), 300);
          await page.evaluate("localStorage.clear()");
          await page.goto(server.url("/"), 1200);
          const question = JSON.parse(await page.evaluate(EDGE)) as Edge;
          await page.goto(server.url("/404.html"), 300);
          await page.evaluate(SEED_FINISHED);
          await page.goto(server.url("/"), 1600);
          const verdict = JSON.parse(await page.evaluate(EDGE)) as Edge;
          return { question, verdict, problems: page.problems() };
        }, { viewport, mobile: false, scrollbars: true });
        expect(seen.problems).toEqual([]);
        expect(seen.question.state).toBe("questions");
        expect(seen.verdict.state).toBe("results");
        // The browser draws classic scrollbars, or the case measures nothing.
        expect(seen.verdict.scrolls).toBe(true);
        expect(seen.verdict.chrome, "the scrollbar takes no width — an overlay, or hidden").toBeGreaterThan(0);
        expect(seen.question.gutter).toBe("stable");
        expect(
          seen.question.mainLeft,
          `the column's edge moved from ${seen.question.mainLeft} to ${seen.verdict.mainLeft} when the verdict arrived`,
        ).toBe(seen.verdict.mainLeft);
      } finally {
        server.close();
      }
    }, 180000);
});
