// @level infrastructure
/**
 * The tap floor, measured rather than argued.
 *
 * `tests/route-page-frame.test.ts` holds the invariant the way a suite can: every
 * control carries one of the two declared tap classes, and both classes are
 * written in `--tap-min`. That is a check over markup and stylesheet, and it is
 * honest about being one. This is the other half — real layout, real fonts,
 * a real 390 px viewport, over every built page.
 *
 *   npm run build && npm run measure:taps
 *
 * `measureTaps` hands over each screen as it is measured and returns them all,
 * and prints nothing: the report's lines and exit code are
 * `cli-measure-taps.mjs`'s, and `main-measure-taps.mjs` runs the two.
 *
 * The server and Chrome come from `browser.mjs`, and `owned.mjs` closes what
 * they open however the process leaves, so a throw halfway through leaves no
 * listener, Chrome or held port behind for the next run.
 *
 * It measures every page the build emits and every screen the page draws
 * from a record: the results screen exists only once drawn, and it carries the
 * most controls in the product.
 *
 * On each screen it also reads where the Strip wraps, and reports a Strip
 * line that starts with a separator dot. It counts each control a seed can
 * require (`required-controls.mjs`), and a result seeded to draw one fails
 * without it.
 *
 * A drawn screen is named after the result its record produces, so it must
 * end on the result screen: one that stops at a question, because the
 * interview asks something its record does not answer, would measure a
 * question card under a result's name. Each screen says whether it is a
 * result, and on a question screen which question it asks. A result that
 * compares routes draws a Strip, so one found without it fails; only a result
 * a notice answers outright has none.
 *
 * What it cannot see: whether the page is alive at all. It counts elements,
 * so a dead interview measures as "0 controls under the floor".
 * `npm run smoke` is the check for that.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { PHONE, walkSite } from "./browser/browser.mjs";
// The record module itself, not a copy of its constants: a seed written by
// hand goes stale the day the format moves, and this script would then
// measure a screen the reader never sees.
import { RECORD_VERSION, STORAGE_KEY } from "../src/lib/record.ts";
import {
  DUTCH_OFFER_ON_FOUR, FRENCH_OFFER_NO_STEPS, FRENCH_OFFER_TWO_STEPS, GERMAN_OFFER_ON_FOUR, GERMAN_OFFER_ON_ONE,
} from "./seeded-results.mjs";
import { REQUIRED_CONTROLS } from "./required-controls.mjs";

const dist = join(fileURLToPath(new URL("..", import.meta.url)), "dist");

/** The token's own value, asserted against the stylesheet the page ships. */
const TAP_MIN = 44;

// The five functions below run in the page, not here: the probe carries their
// source text into it, so each reads nothing from this module but the others.

/** An element's words on one line, cut to `cap` characters (all of them without one). */
function textOf(el, cap) {
  return (el.textContent || el.tagName).trim().replace(/\s+/g, " ").slice(0, cap);
}

/** How many controls the screen shows, and each one shorter than `floor` as "<height>px \u00b7 <words>". */
function measureControls(floor) {
  const bad = [];
  let controls = 0;
  for (const el of document.querySelectorAll("a, button, summary, input, select, [role='button'], [role='option']")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    controls++;
    // Half a pixel of slack: a box laid at fractional pixels a hair under the floor reaches it on screen.
    // 34 characters name the control on its failure line; the rest of a long label adds nothing.
    if (r.height + 0.5 < floor) bad.push(Math.round(r.height) + "px \u00b7 " + textOf(el, 34));
  }
  return { controls, bad };
}

/**
 * How many lines each Strip on screen takes, and each line that opens on a
 * separator. The Strip wraps between its parts. A part that starts a line
 * below the first, its left edge at the Strip's own, must not have a
 * separator drawn in front of it: a line that opens on a dot reads as a stray
 * mark.
 */
function measureStripLines() {
  const stripLineCounts = [];
  const stripLinesStartingWithADot = [];
  for (const strip of document.querySelectorAll(".strip")) {
    const stripBox = strip.getBoundingClientRect();
    if (stripBox.width === 0 && stripBox.height === 0) continue;
    const parts = [...strip.children].map((part) => ({ part, box: part.getBoundingClientRect() }));
    if (parts.length === 0) continue;
    const firstLineTop = Math.min(...parts.map(({ box }) => box.top));
    let lineCount = 1;
    for (const { part, box } of parts) {
      // 1 px either way: boxes laid at fractional pixels round apart by up to
      // one, which is neither a different edge nor a different line.
      const isLineStart = Math.abs(box.left - stripBox.left) <= 1 && box.top > firstLineTop + 1;
      if (!isLineStart) continue;
      lineCount++;
      const beforeContent = getComputedStyle(part, "::before").content;
      const drawsSeparatorInFront = beforeContent !== "none" && beforeContent !== "normal" && beforeContent !== '""';
      // 34 characters, as for a control: enough to name the part on its failure line.
      if (drawsSeparatorInFront) stripLinesStartingWithADot.push(beforeContent + " " + textOf(part, 34));
    }
    stripLineCounts.push(lineCount);
  }
  return { stripLineCounts, stripLinesStartingWithADot };
}

/** How many of each control a seed can require are on screen, by its name,
 * from `selectorsByName`; each a control the floor above already measures. */
function requiredControlCountsOf(selectorsByName) {
  const counts = {};
  for (const [name, selector] of Object.entries(selectorsByName)) counts[name] = document.querySelectorAll(selector).length;
  return { requiredControlCounts: counts };
}

/**
 * Whether the page drew the result, whether that result is one a notice
 * answers outright, and the question card's progress and label where it drew
 * a question instead. The interview marks its box "results" when it draws a
 * verdict, and only then; a question screen keeps it "questions". A result a
 * notice answers outright draws its notices and no body under them; every
 * result that compares routes ends its body on the feedback line.
 */
function readScreenState() {
  const isResult = document.querySelector("#app[data-state='results']") !== null;
  const drawsNotice = document.querySelector("#main article.notice") !== null;
  const drawsFeedbackLine = document.querySelector("#main p.say") !== null;
  const questionLabel = document.querySelector(".qcard .qlabel");
  const questionProgress = document.querySelector(".qcard .qmeta");
  return {
    isResult,
    isAnsweredByNotice: isResult && drawsNotice && !drawsFeedbackLine,
    // 120 characters name the question on one failure line; a long label's rest adds nothing.
    questionAskedIfAny: questionLabel
      ? [questionProgress, questionLabel].filter(Boolean).map((el) => textOf(el)).join(" ").slice(0, 120)
      : null,
  };
}

const PROBE = `(() => {
  ${textOf}
  ${measureControls}
  ${measureStripLines}
  ${readScreenState}
  ${requiredControlCountsOf}
  return JSON.stringify({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    ...measureControls(${TAP_MIN}),
    ...measureStripLines(),
    ...requiredControlCountsOf(${JSON.stringify(Object.fromEntries(REQUIRED_CONTROLS.map((c) => [c.name, c.selector])))}),
    ...readScreenState(),
    tapMin: getComputedStyle(document.documentElement).getPropertyValue("--tap-min").trim(),
  });
})()`;

function listBuiltPages(dir) {
  const pages = [];
  (function walk(here) {
    for (const entry of readdirSync(here)) {
      const full = join(here, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith(".html")) pages.push(full);
    }
  })(dir);
  return pages.sort();
}

/**
 * Screens the page draws rather than the build emits, each with the record
 * that produces it. A record is written, the page is reloaded, and what the
 * reader actually taps is measured. Each record answers every question the
 * interview asks on the way, so the page reloads onto the result. A third
 * entry names the controls of `REQUIRED_CONTROLS` the result draws, so they
 * are among the controls measured: one drawn without them fails.
 */
const DRAWN = [
  ["/ (results, one country)", GERMAN_OFFER_ON_ONE],
  ["/ (results, all four countries)", GERMAN_OFFER_ON_FOUR, ["Steps line", "More quotes control"]],
  // Short Tallies draw one-line country headers here, and a job offer in the
  // Netherlands gathers Germany's routes into a Fold, so the floor is measured
  // on one-line country headers and on a Fold's header; its Steps line links
  // to two countries' steps.
  ["/ (results, all four countries, job offer in the Netherlands)", DUTCH_OFFER_ON_FOUR, ["Steps line", "More quotes control"]],
  // The Algerian notice's Learn link, a foot link longer than a phone's line,
  // wraps here; its Steps line is a one-country result's single link.
  ["/ (results, France, Algerian passport)", FRENCH_OFFER_TWO_STEPS, ["Steps line", "More quotes control"]],
  // A reader who does not know whether the employer is innovative meets the
  // talent card's Learn link, which wraps here.
  ["/ (results, France, a Learn link)", FRENCH_OFFER_NO_STEPS],
];

const seedFor = (answers) =>
  `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${
    JSON.stringify(JSON.stringify({ version: RECORD_VERSION, answers, history: Object.keys(answers) }))})`;

/**
 * The open page's measure, once it is at rest: the probe's fields, the
 * screen's name, the floor it was measured against, and `kind`, "built" for
 * a page the build emits or "drawn" for one the page draws from a record.
 * `isResult` is whether the page drew the result screen, `isAnsweredByNotice`
 * whether that result is one a notice answers outright; `questionAskedIfAny` is
 * the question card's progress and label where it drew one instead, else null.
 */
async function measureAtRest(page, name, kind) {
  await page.waitUntilAtRest();
  const measured = JSON.parse(await page.evaluate(PROBE));
  // 1 px over the viewport is fractional layout rounded up, not a page that scrolls sideways.
  return { name, kind, floorPx: TAP_MIN, ...measured, isOverflowing: measured.scrollWidth > measured.innerWidth + 1 };
}

/** Each page the build emitted, in its path's order: its name, its kind, and how the page opens it at the site's address `url` makes. */
const listBuiltScreens = (url) => listBuiltPages(dist).map((file) => {
  const path = relative(dist, file).split("\\").join("/");
  // Through the walk's own url(): a site built for a subpath asks for
  // its assets there, and served at the root it measures as unstyled.
  return { name: path, kind: "built", open: (page) => page.goto(url(`/${path.replace(/index\.html$/, "")}`)) };
});

/** Each drawn screen: its name, its kind, the controls it is seeded to draw, and how the page opens it at the site's address `url` makes, its record written and the page reloaded. */
const drawnScreens = (url) => DRAWN.map(([name, answers, requiredControls = []]) => ({
  name,
  kind: "drawn",
  requiredControls,
  async open(page) {
    await page.goto(url("/"));
    await page.evaluate(seedFor(answers));
    await page.goto(url("/"));
  },
}));

/** Each of `screens` opened and measured in turn, handed to `onScreen` as it is measured; all of them returned. */
async function measureEach(page, screens, onScreen) {
  const measured = [];
  for (const { name, kind, requiredControls = [], open } of screens) {
    await open(page);
    const screen = { ...await measureAtRest(page, name, kind), requiredControls };
    onScreen(screen);
    measured.push(screen);
  }
  return measured;
}

/**
 * Serves `dist/` and measures every built page, then every drawn screen, in
 * Chrome on the phone screen. Each screen goes to `onScreen` the moment it is
 * measured, so a run that stops halfway has already handed over what it
 * measured; all of them come back at the end. Nothing here judges the pages'
 * errors, so the walk fails on them. With no `dist/`, `isBuilt` is false and
 * `screens` is empty; nothing is served.
 */
export async function measureTaps({ onScreen = () => {} } = {}) {
  if (!existsSync(dist)) return { isBuilt: false, viewportWidth: PHONE.viewport.width, screens: [] };
  const { returned: screens } = await walkSite({ site: { folder: dist }, screen: PHONE },
    ({ page, url }) => measureEach(page, [...listBuiltScreens(url), ...drawnScreens(url)], onScreen));
  return { isBuilt: true, viewportWidth: PHONE.viewport.width, screens };
}
