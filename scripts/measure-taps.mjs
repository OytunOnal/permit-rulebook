// @level infrastructure
/**
 * The tap floor, measured rather than argued.
 *
 * `tests/route-page.test.ts` holds the invariant the way a suite can: every
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
 * It used to carry its own copy of the server and the CDP plumbing, and its own
 * cleanup at the end of the happy path only: a throw halfway through left a
 * listener and a Chrome behind, and the next run then found a port held by a
 * process nobody owned (coordinator, 2026-09-07). Both now come from
 * `browser.mjs`, which closes what it opens however the process leaves.
 *
 * What it cannot see, and never could: whether the page is alive at all. It
 * counts elements, so a dead interview measures as "0 controls under the
 * floor". `npm run smoke` is the check for that.
 *
 * It also measured only what the BUILD emits, so the results screen — drawn by
 * the page from a record, and the screen with the most controls in the product
 * — was never measured at all. Five "Official page" links at 84×16 px and every
 * collapsed route row at 330×41 px shipped under a floor this script reported
 * clean (isolated v1-gate critique, 2026-09-08, F6). It now walks the drawn
 * screens too.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { serve, withBrowser } from "./browser.mjs";
// The record module itself, not a copy of its constants: a seed written by
// hand goes stale the day the format moves, and this script would then
// measure a screen the reader never sees (Standards review, 2026-09-08).
import { RECORD_VERSION, STORAGE_KEY } from "../src/lib/record.ts";

const dist = join(fileURLToPath(new URL("..", import.meta.url)), "dist");

/** The token's own value, asserted against the stylesheet the page ships. */
const TAP_MIN = 44;
const VIEWPORT = { width: 390, height: 844 };

const PROBE = `(() => {
  const floor = ${TAP_MIN};
  const bad = [];
  let n = 0;
  for (const el of document.querySelectorAll("a, button, summary, input, select, [role='button'], [role='option']")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    n++;
    if (r.height + 0.5 < floor)
      // Doubled on purpose: this is a template literal, so a single backslash
      // would reach the browser as /s+/g and delete the letter s from every
      // name this script prints.
      bad.push(Math.round(r.height) + "px \u00b7 " + (el.textContent || el.tagName).trim().replace(/\\s+/g, " ").slice(0, 34));
  }
  return JSON.stringify({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    controls: n,
    bad,
    tapMin: getComputedStyle(document.documentElement).getPropertyValue("--tap-min").trim(),
  });
})()`;

function builtPages(dir) {
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
 * reader actually taps is measured.
 */
const DRAWN = [
  ["/ (results, one country)", {
    destination: "de", citizenship: "IN", situation: "offer", qualification: "degree",
    recognition_de: "unknown", occupation_shortage: "unknown", experience_5y: "lt2", experience_7y: "3to5",
    german: "b1", english: "c1", age_band: "a30to35", de_stay6m: "no", partner_ck: "no",
    funds_eur_month: "band_1", salary_eur_year: "unknown",
  }],
  ["/ (results, all four countries)", {
    destination: "all", citizenship: "TR", situation: "offer", qualification: "degree",
    recognition_de: "recognized", occupation_shortage: "yes", experience_5y: "lt2", experience_7y: "3to5",
    german: "b1", english: "c1", nl_recent_grad: "no", top200_grad: "no", age_band: "a30to35",
  }],
];

const seedFor = (answers) =>
  `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${
    JSON.stringify(JSON.stringify({ version: RECORD_VERSION, answers, history: Object.keys(answers) }))})`;

/**
 * The open page's measure, once it is at rest: the probe's fields, the
 * screen's name, the floor it was measured against, and `kind`, "built" for
 * a page the build emits or "drawn" for one the page draws from a record.
 */
async function measureAtRest(page, name, kind) {
  await page.waitUntilAtRest();
  const measured = JSON.parse(await page.evaluate(PROBE));
  return { name, kind, floorPx: TAP_MIN, ...measured, isOverflowing: measured.scrollWidth > measured.innerWidth + 1 };
}

/** Each page the build emitted, measured in its path's order and handed to `onScreen` as it is measured. */
async function measureBuilt(page, server, onScreen) {
  const screens = [];
  for (const file of builtPages(dist)) {
    const path = relative(dist, file).split("\\").join("/");
    // Through the server's own url(): a site built for a subpath asks for
    // its assets there, and served at the root it measures as unstyled.
    await page.goto(server.url(`/${path.replace(/index\.html$/, "")}`));
    const screen = await measureAtRest(page, path, "built");
    onScreen(screen);
    screens.push(screen);
  }
  return screens;
}

/** Each drawn screen, measured after its record is written and the page reloaded, and handed to `onScreen`. */
async function measureDrawn(page, server, onScreen) {
  const screens = [];
  for (const [name, answers] of DRAWN) {
    await page.goto(server.url("/"));
    await page.evaluate(seedFor(answers));
    await page.goto(server.url("/"));
    const screen = await measureAtRest(page, name, "drawn");
    onScreen(screen);
    screens.push(screen);
  }
  return screens;
}

/**
 * Serves `dist/` and measures every built page, then every drawn screen, in
 * Chrome at the viewport. Each screen goes to `onScreen` the moment it is
 * measured, so a run that stops halfway has already handed over what it
 * measured; all of them come back at the end. With no `dist/`, `isBuilt` is
 * false and `screens` is empty; nothing is served.
 */
export async function measureTaps({ onScreen = () => {} } = {}) {
  if (!existsSync(dist)) return { isBuilt: false, viewportWidth: VIEWPORT.width, screens: [] };
  const server = await serve(dist);
  try {
    const screens = await withBrowser(
      async (page) => [...await measureBuilt(page, server, onScreen), ...await measureDrawn(page, server, onScreen)],
      { viewport: VIEWPORT, mobile: true },
    );
    return { isBuilt: true, viewportWidth: VIEWPORT.width, screens };
  } finally {
    server.close();
  }
}
