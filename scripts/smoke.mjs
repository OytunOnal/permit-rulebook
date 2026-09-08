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
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { serve, withBrowser } from "./browser.mjs";
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
];

async function walk(target, surface) {
  return withBrowser(async (page) => {
    const results = [];
    for (const check of CHECKS) {
      await page.goto(target.url(check.path), 900);
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
    try { results.push(...await walk(dev, "dev")); } finally { dev.close(); }
  }
  if (surfaces.includes("dist")) {
    if (!existsSync(dir)) throw new Error(`no ${dir} — run npm run build first`);
    const server = await serve(dir);
    try { results.push(...await walk(server, "dist")); } finally { server.close(); }
  }
  return results;
}
if (process.argv[1]?.endsWith("smoke.mjs")) {
  const only = process.argv.includes("--dev") ? ["dev"]
    : process.argv.includes("--dist") ? ["dist"]
    : DEFAULT_SURFACES;
  const results = await smoke({ surfaces: only });
  let failed = 0;
  for (const r of results) {
    if (r.failures.length) {
      failed++;
      console.log(`FAIL [${r.surface}] ${r.path} (${r.what})`);
      for (const f of r.failures) console.log(`     ${f}`);
    } else {
      console.log(`ok   [${r.surface}] ${r.path} (${r.what}) — ${JSON.stringify(r.value)}, 0 console errors`);
    }
  }
  console.log(`
${results.length} page loads in a real browser — ${failed} broken`);
  process.exit(failed === 0 ? 0 : 1);
}
