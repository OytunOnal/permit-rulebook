import { describe, expect, it } from "vitest";
import { RECORD_VERSION } from "../src/lib/record.js";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset, Profile } from "permit-rulebook-data";
import { glossed } from "../src/lib/gloss.js";
import { replayRecord } from "../src/lib/scope.js";
import { plainTextOf } from "./reader-pages.js";
import { PAINTED_AS_COMPOSED, everyCardIn, paintedAsComposedScript, verdictFor } from "./verdict-cards.js";
import type { BrowserPage } from "../scripts/browser/browser.mjs";

/**
 * Two things the interview did not do, walked in a browser.
 *
 * The help for "German recognition" arrived three screens after the question,
 * on a result card that had already assumed an answer (isolated v1-gate
 * critique, 2026-09-08, F13) — the reader was made to guess, then told where
 * she could have looked.
 *
 * And a verdict arrived on two answers that cannot both be true, with both of
 * them in the sidebar and nothing on the screen noticing (F7).
 */

const ds = dataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));

/** The critique's own hostile walk: no qualification, and a degree from a
 * designated institution. */
const CONTRADICTED: Profile = {
  destination: "nl", citizenship: "IN", situation: "offer",
  qualification: "none", experience_5y: "lt2", experience_7y: "3to5", occupation_it: "yes",
  salary_eur_month: "band_6", age_band: "a30to35", nl_recent_grad: "no", top200_grad: "yes",
};
/** The same walk with the qualification answered consistently. */
const CONSISTENT: Profile = { ...CONTRADICTED, qualification: "degree" };

/** The clash lines a verdict draws above everything, as text. */
const clashesOn = (answers: Profile): string[] =>
  [...verdictFor(answers).notices.matchAll(/<p class="clash"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => plainTextOf(m[1]!));

describe("two answers that cannot both be true, from the verdict", () => {
  it("says so when two answers cannot both be true, before any verdict", () => {
    const clash = clashesOn(CONTRADICTED);
    expect(clash.length, "the screen still says nothing").toBe(1);
    expect(clash[0]!).toContain("no completed qualification");
    expect(clash[0]!).toContain("Both cannot be true");
    // It says it beside the verdicts, which are still shown: this reports on
    // the answers, it does not withhold the result.
    expect(everyCardIn(verdictFor(CONTRADICTED)).filter((c) => c.html.includes('<span class="st ')).length).toBeGreaterThan(0);
    // And a reader whose answers agree is not accused of anything.
    expect(clashesOn(CONSISTENT)).toEqual([]);
  });
});

const { chromePath } = await import("../scripts/browser/browser.mjs");
const { serve, withBrowser } = await import("../scripts/browser/browser.mjs");

function why(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}
const skipped = why();
if (skipped)
  process.stderr.write([
    "",
    `  !! THE INTERVIEW WAS NOT WALKED: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join("\n"));

const seed = (answers: Record<string, string>) =>
  `localStorage.setItem("permit-rulebook.record.v1", ${JSON.stringify(JSON.stringify({
    version: RECORD_VERSION, answers, history: Object.keys(answers),
  }))})`;

describe.skipIf(skipped !== null)("the interview helps where it asks", () => {
  it("puts the way to look an answer up at the question, not after it", async () => {
    const server = await serve(dist);
    try {
      const seen = JSON.parse(await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/"));
        // Answered up to the German recognition question, and no further — with
        // a real passport, since the record keeps only answers a question
        // offers (s25) and the class the rules reason with was never one.
        await page.evaluate(seed({
          destination: "de", citizenship: "IN", situation: "offer",
          qualification: "degree", occupation_shortage: "yes",
        }));
        await page.goto(server.url("/"));
        return page.evaluate(
          'JSON.stringify({'
          + ' question: document.querySelector(".qlabel").textContent.trim(),'
          + ' help: document.querySelector(".qlearn") ? document.querySelector(".qlearn").textContent.trim() : null,'
          + ' href: document.querySelector(".qlearn a") ? document.querySelector(".qlearn a").href : null })',
        );
      }, { viewport: { width: 1100, height: 900 }, mobile: false }) as string) as
        { question: string; help: string | null; href: string | null };

      expect(seen.question).toContain("recognition");
      expect(seen.help, "the question offers no way to find the answer out").toBeTruthy();
      expect(seen.help!).toContain("Anabin");
      expect(seen.href!).toContain("anabin");
    } finally {
      server.close();
    }
  }, 180000);

  it("says so when two answers cannot both be true, before any verdict", async () => {
    const server = await serve(dist);
    try {
      // What the screen says, and that the verdicts still stand, is the
      // verdict's ("two answers that cannot both be true, from the verdict");
      // the page paints it, over the record as it restores it.
      const painted = (answers: Profile) =>
        paintedAsComposedScript(verdictFor(replayRecord(ds, answers, Object.keys(answers)).answers));
      const seen = await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/"));
        await page.evaluate(seed(CONTRADICTED as Record<string, string>));
        await page.goto(server.url("/"));
        const contradicted = JSON.parse(await page.evaluate(painted(CONTRADICTED)));
        await page.evaluate(seed(CONSISTENT as Record<string, string>));
        await page.goto(server.url("/"));
        const consistent = JSON.parse(await page.evaluate(painted(CONSISTENT)));
        return { contradicted, consistent };
      }, { viewport: { width: 1100, height: 900 }, mobile: false }) as Record<string, typeof PAINTED_AS_COMPOSED>;

      expect(seen.contradicted).toEqual(PAINTED_AS_COMPOSED);
      expect(seen.consistent).toEqual(PAINTED_AS_COMPOSED);
    } finally {
      server.close();
    }
  }, 180000);

  /**
   * The interview used to print "§" here — the shortage question's help cited
   * § 18g AufenthG — and glossed it on first use (Spec review, 2026-09-08),
   * so the link read "§ 18g AufenthG (§ = section; AufenthG = the Residence
   * Act) lists …": an explainer inside a link, underlined end to end (the
   * human's walk, 2026-09-17). The help is a link, and a link says what the
   * reader does there in the data's own words, with no citation in it (s28);
   * its other shorthand is explained on first use like the rest of the card
   * (#151, ruling 8).
   */
  it("prints the shortage question's help as the dataset's sentence, its shorthand explained and no act named", async () => {
    const server = await serve(dist);
    try {
      const seen = JSON.parse(await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/"));
        // `occupation_it` on the record: Germany asks it before the shortage
        // question since the shortage Blue Card's IT path reads it (#134), and
        // a reader out of IT is asked the shortage question next.
        await page.evaluate(seed({
          destination: "de", citizenship: "IN", situation: "offer",
          qualification: "degree", recognition_de: "recognized", occupation_it: "no",
        }));
        await page.goto(server.url("/"));
        return page.evaluate(
          'JSON.stringify({'
          + ' question: document.querySelector(".qlabel").textContent.trim(),'
          + ' help: document.querySelector(".qlearn") ? document.querySelector(".qlearn").textContent.trim() : null })',
        );
      }, { viewport: { width: 1100, height: 900 }, mobile: false }) as string) as
        { question: string; help: string | null };

      expect(seen.question.toLowerCase()).toContain("shortage");
      expect(seen.help, "the shortage question offers no help at all").toBeTruthy();
      // The link's text is the label as the data wrote it, whole, glossed on
      // the card's memory: nothing above it on the card uses its shorthand.
      const door = ds.fields.find((f) => f.id === "occupation_shortage")!.learn!;
      expect(seen.help!).toContain(glossed(door.label, new Set()));
      // And no act was explained into it: no citation, no symbol to explain
      // (and the sign's own explainer is gone from every screen since s32's
      // amendment 6).
      expect(seen.help!).not.toContain(glossed("AufenthG", new Set()));
      expect(seen.help!).not.toContain("§");
    } finally {
      server.close();
    }
  }, 180000);
});
