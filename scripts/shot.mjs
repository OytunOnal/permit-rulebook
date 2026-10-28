// @level infrastructure
/**
 * A record of the product doing its one thing: the results screen for a real
 * profile, at the width a README reader is looking at it.
 *
 * The README's first screen answers a stranger's five questions, and the first
 * of them is answered by a picture rather than a paragraph (Spine steward-32).
 * The file is dated in its name because it is a record: a later one is taken
 * beside it, never over it.
 *
 * `takeShot` serves `dist/`, takes the picture, writes it and returns it, and
 * prints nothing: the written picture's line is `cli-shot.mjs`'s, and
 * `main-shot.mjs` runs the two.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { walkSite } from "./browser/browser.mjs";
import { RECORD_VERSION, STORAGE_KEY } from "../src/lib/record.ts";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

/** Today's record in `docs/media/`, dated in its name. */
const todaysPath = () => join(root, "docs", "media", `results-${new Date().toISOString().slice(0, 10)}.png`);

/**
 * A German profile with an open route, a threshold that decided it, and a step
 * that would open more — so the card, its rail and the identity pair are all in
 * the frame. Answered in full, the way a reader reaches the screen.
 */
const PROFILE = {
  // A real passport code, the way the picker records one: "third_country" is a
  // class the rules reason with and not an answer anyone can give, and the
  // ledger row for it printed "Passport —" (Spec review, 2026-09-08). India,
  // because the one-pager's reader carries that passport and it raises no
  // agreement notice — the picture is of the product's ordinary output.
  destination: "de", citizenship: "IN", situation: "offer",
  qualification: "degree", recognition_de: "recognized", occupation_shortage: "yes",
  experience_5y: "2plus", experience_7y: "3to5", german: "b1", funds_eur_month: "band_1", salary_eur_year: "band_4",
};

/** The screen the picture is taken at: the width a README reader looks at it, which is not the walks' `DESK`. */
const README_SCREEN = { viewport: { width: 1100, height: 1400 }, mobile: false };

/**
 * Serves `dist/`, opens the results screen for `PROFILE` in Chrome, its record
 * written and the page reloaded, and returns its screenshot; a page that
 * reported a problem throws, so the walk returns the pages' errors to it.
 */
async function screenshotResultsInChrome() {
  const walk = { site: { folder: join(root, "dist") }, screen: README_SCREEN, errorsExpected: true };
  const { returned } = await walkSite(walk, async ({ page, url }) => {
    await page.goto(url("/"));
    await page.evaluate(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${
      JSON.stringify(JSON.stringify({
        version: RECORD_VERSION, answers: PROFILE, history: Object.keys(PROFILE),
      }))})`);
    await page.goto(url("/"));
    await page.waitUntilAtRest();
    const problems = page.problems();
    if (problems.length) throw new Error(`the page reported ${problems.length}: ${problems[0]}`);
    return page.screenshot();
  });
  return returned;
}

/**
 * Takes the results screen's picture and writes it at `path` (today's record
 * in `docs/media/` when none is given), its folder made. Returns where it
 * wrote and the PNG.
 */
export async function takeShot({ path = todaysPath() } = {}) {
  const png = await screenshotResultsInChrome();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, png);
  return { path, png };
}
