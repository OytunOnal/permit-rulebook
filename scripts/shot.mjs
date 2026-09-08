/**
 * A record of the product doing its one thing: the results screen for a real
 * profile, at the width a README reader is looking at it.
 *
 * The README's first screen answers a stranger's five questions, and the first
 * of them is answered by a picture rather than a paragraph (Spine steward-32).
 * The file is dated in its name because it is a record: a later one is taken
 * beside it, never over it.
 *
 * Usage: node scripts/shot.mjs [out.png]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serve, withBrowser } from "./browser.mjs";
import { RECORD_VERSION, STORAGE_KEY } from "../src/lib/record.ts";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const today = new Date().toISOString().slice(0, 10);
const out = process.argv[2] ?? join(root, "docs", "media", `results-${today}.png`);

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
  experience: "y2in5", german: "b1", funds_eur_month: "band_1", salary_eur_year: "band_4",
};

const server = await serve(join(root, "dist"));
try {
  const png = await withBrowser(async (page) => {
    await page.goto(server.url("/"), 300);
    await page.evaluate(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${
      JSON.stringify(JSON.stringify({
        version: RECORD_VERSION, answers: PROFILE, history: Object.keys(PROFILE),
      }))})`);
    await page.goto(server.url("/"), 1600);
    const problems = page.problems();
    if (problems.length) throw new Error(`the page reported ${problems.length}: ${problems[0]}`);
    return page.screenshot();
  }, { viewport: { width: 1100, height: 1400 }, mobile: false });

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, png);
  console.log(`${out} — ${png.readUInt32BE(16)}×${png.readUInt32BE(20)}, ${(png.length / 1024).toFixed(0)} KB`);
} finally {
  server.close();
}
