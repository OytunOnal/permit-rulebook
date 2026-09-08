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

if (!existsSync(dist)) { console.error("no dist/ — run npm run build first"); process.exit(2); }

const pages = builtPages(dist);

/**
 * Screens the page draws rather than the build emits, each with the record
 * that produces it. A record is written, the page is reloaded, and what the
 * reader actually taps is measured.
 */
const DRAWN = [
  ["/ (results, one country)", {
    destination: "de", citizenship: "IN", situation: "offer", qualification: "degree",
    recognition_de: "unknown", occupation_shortage: "unknown", experience: "y3in7",
    german: "b1", english: "c1", age_band: "a30to35", de_stay6m: "no", partner_ck: "no",
    funds_eur_month: "band_1", salary_eur_year: "unknown",
  }],
  ["/ (results, all four countries)", {
    destination: "all", citizenship: "TR", situation: "offer", qualification: "degree",
    recognition_de: "recognized", occupation_shortage: "yes", experience: "y3in7",
    german: "b1", english: "c1", nl_recent_grad: "no", top200_grad: "no", age_band: "a30to35",
  }],
];

const seedFor = (answers) =>
  `localStorage.setItem("permit-rulebook.record.v1", ${
    JSON.stringify(JSON.stringify({ version: 1, answers, history: Object.keys(answers) }))})`;
const server = await serve(dist);
let failures = 0;
let overflows = 0;

try {
  await withBrowser(async (page) => {
    for (const file of pages) {
      const path = relative(dist, file).split("\\").join("/");
      // Through the server's own url(): a site built for a subpath asks for
      // its assets there, and served at the root it measures as unstyled.
      await page.goto(server.url(`/${path.replace(/index\.html$/, "")}`), 350);
      const m = JSON.parse(await page.evaluate(PROBE));
      const overflow = m.scrollWidth > m.innerWidth + 1;
      if (overflow) overflows++;
      if (m.bad.length || overflow) {
        failures++;
        console.log(`FAIL ${path}`);
        console.log(`     viewport ${m.innerWidth}px · scrollWidth ${m.scrollWidth}px · ${m.controls} controls · --tap-min ${m.tapMin}`);
        for (const b of m.bad) console.log(`     under the floor: ${b}`);
        if (overflow) console.log(`     horizontal overflow: ${m.scrollWidth - m.innerWidth}px`);
      } else {
        console.log(`ok   ${path} — ${m.innerWidth}px, ${m.controls} controls, none under ${TAP_MIN}px, no overflow`);
      }
    }
    for (const [name, answers] of DRAWN) {
      await page.goto(server.url("/"), 300);
      await page.evaluate(seedFor(answers));
      await page.goto(server.url("/"), 1200);
      const m = JSON.parse(await page.evaluate(PROBE));
      const overflow = m.scrollWidth > m.innerWidth + 1;
      if (overflow) overflows++;
      if (m.bad.length || overflow) {
        failures++;
        console.log(`FAIL ${name}`);
        console.log(`     viewport ${m.innerWidth}px · scrollWidth ${m.scrollWidth}px · ${m.controls} controls`);
        for (const b of m.bad) console.log(`     under the floor: ${b}`);
        if (overflow) console.log(`     horizontal overflow: ${m.scrollWidth - m.innerWidth}px`);
      } else {
        console.log(`ok   ${name} — ${m.innerWidth}px, ${m.controls} controls, none under ${TAP_MIN}px, no overflow`);
      }
    }
  }, { viewport: VIEWPORT, mobile: true });
} finally {
  server.close();
}

console.log(`\n${pages.length + DRAWN.length} screens at ${VIEWPORT.width} px — ${failures} with a problem (${overflows} overflowing)`);
process.exit(failures === 0 ? 0 : 1);
