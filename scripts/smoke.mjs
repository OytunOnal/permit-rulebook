// @level infrastructure
/**
 * Does the site actually run?
 *
 * On 2026-09-07 the interview rendered nothing at all — the client script threw
 * on import, `/` showed an empty "You declared" box and no question — and every
 * one of 111 tests passed, because they run in Node, while `measure:taps`
 * reported "0 controls under the floor" because it counts elements and a dead
 * page has none. This is the check that class of failure cannot survive: load
 * the built pages in a real browser and assert both that nothing threw and that
 * the things a reader comes for are on the screen.
 *
 * Both surfaces are walked, and the difference between them is the whole
 * point: `astro dev` serves the module graph unbundled, the production build
 * does not. The failure above appeared ONLY in dev — Rollup dropped the
 * offending module from `dist/` as unused, so the built site looked healthy
 * while the site a developer opens was dead. A smoke test that only loaded
 * `dist/` would have missed it exactly as the rest of the suite did.
 *
 *   npm run build && npm run smoke
 *
 * `smoke` walks the surfaces it is given and returns what each page load
 * showed, and prints nothing: the report's lines and exit code are
 * `cli-smoke.mjs`'s, and `main-smoke.mjs` runs the two.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PHONE, walkSite } from "./browser/browser.mjs";
import { startDev } from "./dev-server.mjs";
import { siteBase } from "./site-base.mjs";

const dist = join(fileURLToPath(new URL("..", import.meta.url)), "dist");

/** What each page must be true of. Every assertion is something a reader sees. */
export const CHECKS = [
  {
    path: "/",
    what: "the interview",
    probe: `JSON.stringify({
      question: document.querySelector(".qlabel")?.textContent?.trim() ?? "",
      options: document.querySelectorAll(".qcard .opt, .qcard .copt, .qcard #cfilter").length,
      ledger: document.getElementById("decl-list") !== null,
      stamp: (() => {
        const box = document.querySelector(".stamps");
        if (!box || box.hasAttribute("hidden")) return "";
        return box.querySelector(".stamp").innerHTML
          .replace(/<[^>]*>/g, " ").split(/[^!-~]+/).filter(Boolean).join(" ");
      })(),
    })`,
    expect(v) {
      const problems = [];
      if (!v.question) problems.push("no question is on the screen");
      if (v.options < 1) problems.push("the question has no answers to pick from");
      if (!v.ledger) problems.push("the declaration panel is missing");
      // The pair is on the first screen too, and on the questions it states the
      // date the rules were last read (human, 2026-09-08). It was hidden until a
      // record existed, which left this masthead lopsided.
      if (!/^Rules read [0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v.stamp))
        problems.push(`the stamp reads "${v.stamp}", not the rules-read date`);
      return problems;
    },
  },
  {
    path: "/germany/eu-blue-card-general/",
    what: "a route page",
    probe: `JSON.stringify({
      stamp: document.querySelector(".stamp time")?.getAttribute("datetime") ?? "",
      rules: document.querySelectorAll("article.rule").length,
      cta: document.querySelector(".cta a.btn")?.getAttribute("href") ?? "",
    })`,
    expect(v) {
      const problems = [];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v.stamp)) problems.push(`the rules-read stamp is "${v.stamp}"`);
      if (v.rules < 3) problems.push(`only ${v.rules} rule cards rendered`);
      // Under a base the interview is at `${base}/`, not `/` — the link is
      // right and an assertion written at the root is what is wrong.
      const interview = `${siteBase()}/?route=`;
      if (!v.cta.startsWith(interview))
        problems.push(`the call to action is "${v.cta}", not a link into the interview at ${interview}`);
      return problems;
    },
  },
  {
    path: "/germany/",
    what: "a country page",
    probe: `JSON.stringify({
      nav: [...document.querySelectorAll(".site-head .nav a")].map((a) => a.textContent.trim()),
      here: document.querySelector('.site-head .nav a[aria-current="page"]')?.textContent?.trim() ?? "",
      cards: document.querySelectorAll(".routes a.card").length,
      first: document.querySelector(".routes .name")?.textContent?.trim() ?? "",
      stamp: document.querySelector(".stamp time")?.getAttribute("datetime") ?? "",
    })`,
    expect(v) {
      const problems = [];
      // The header is the site's own orientation: four countries, the checker
      // and the data page, on every page (site map, 2026-09-08).
      for (const label of ["Germany", "France", "Spain", "Netherlands", "Check yours", "The data"])
        if (!v.nav.includes(label)) problems.push(`the header does not offer ${label}`);
      if (v.here !== "Germany") problems.push(`the header marks "${v.here}", not the country you are on`);
      if (v.cards < 8) problems.push(`only ${v.cards} route cards rendered`);
      if (!v.first) problems.push("the first route has no name");
      if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v.stamp)) problems.push(`the rules-read stamp is "${v.stamp}"`);
      return problems;
    },
  },
  {
    path: "/data/",
    what: "the data page",
    probe: `JSON.stringify({
      heading: document.querySelector("h1")?.textContent?.trim() ?? "",
      facts: document.querySelectorAll(".facts div").length,
      downloads: [...document.querySelectorAll("nav[aria-label='Downloads'] a")].map((a) => a.getAttribute("href")),
      marked: document.querySelectorAll('.site-head .nav a[aria-current]').length,
    })`,
    expect(v) {
      const problems = [];
      if (!v.heading.startsWith("The data")) problems.push(`the heading is "${v.heading}"`);
      if (v.facts < 5) problems.push(`only ${v.facts} facts about the dataset`);
      if (!v.downloads.some((h) => h.endsWith("/dataset.json")))
        problems.push("the whole dataset is not offered");
      // Nothing is marked here: this page belongs to no country.
      if (v.marked !== 0) problems.push(`${v.marked} nav items are marked current on a page under no country`);
      return problems;
    },
  },
];

/**
 * What one check showed on one page load.
 *
 * @typedef {object} PageLoad
 * @property {string} surface "dev" or "dist".
 * @property {string} path The check's path.
 * @property {string} what What the page is, in words.
 * @property {Record<string, any>} value What the check's probe read; its fields are the probe's own, so they differ per check.
 * @property {string[]} thrown What the page threw or logged since it was opened.
 * @property {string[]} failures Every reason the check failed; none when it passed.
 */

/**
 * Every check on `site`, named `surface` in its results; the checks judge the pages' errors, so the walk returns them.
 *
 * @returns {Promise<PageLoad[]>}
 */
async function walk(site, surface) {
  const { returned } = await walkSite({ site, screen: PHONE, errorsExpected: true }, async ({ page, url }) => {
    const results = /** @type {PageLoad[]} */ ([]);
    for (const check of CHECKS) {
      await page.goto(url(check.path));
      await page.waitUntilAtRest();
      let value = {};
      let unreadable = [];
      try {
        value = JSON.parse(await page.evaluate(check.probe));
      } catch (e) {
        unreadable = [`the page could not even be read — ${e.message}`];
      }
      const thrown = page.problems();
      results.push({
        surface, path: check.path, what: check.what, value, thrown,
        failures: [
          ...unreadable,
          ...(unreadable.length ? [] : check.expect(value)),
          ...thrown.map((t) => `the page threw — ${t}`),
        ],
      });
    }
    return results;
  });
  return returned;
}

/**
 * Walk every check on both surfaces. `dev` is where an unbundled module graph
 * is exercised; `dist` is what a visitor gets. Neither substitutes for the
 * other, and the bug this exists for showed only on the first.
 */
/** In CI the deployable artifact is dist/, so that is what is walked; the dev
 * surface is a local developer check (human ruling, 2026-09-08). */
export const DEFAULT_SURFACES = process.env.CI ? ["dist"] : ["dev", "dist"];

export async function smoke({ dir = dist, surfaces = DEFAULT_SURFACES } = {}) {
  const results = [];
  if (surfaces.includes("dev")) {
    const dev = await startDev();
    try { results.push(...await walk({ address: dev.url("/") }, "dev")); } finally { dev.close(); }
  }
  if (surfaces.includes("dist")) {
    if (!existsSync(dir)) throw new Error(`no ${dir} — run npm run build first`);
    results.push(...await walk({ folder: dir }, "dist"));
  }
  return results;
}
