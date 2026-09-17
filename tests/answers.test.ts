import { describe, expect, it } from "vitest";
import { RECORD_VERSION } from "../src/lib/record.js";
import { SECTION_EXPLAINER } from "../src/lib/copy.js";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset } from "permit-rulebook-data";

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
    `  !! THE INTERVIEW WAS NOT WALKED: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join("\n"));

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
}

const seed = (answers: Record<string, string>) =>
  `localStorage.setItem("permit-rulebook.record.v1", ${JSON.stringify(JSON.stringify({
    version: RECORD_VERSION, answers, history: Object.keys(answers),
  }))})`;

describe.skipIf(skipped !== null)("the interview helps where it asks", () => {
  it("puts the way to look an answer up at the question, not after it", async () => {
    const server = await serve(dist);
    try {
      const seen = JSON.parse(await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/"), 300);
        // Answered up to the German recognition question, and no further — with
        // a real passport, since the record keeps only answers a question
        // offers (s25) and the class the rules reason with was never one.
        await page.evaluate(seed({
          destination: "de", citizenship: "IN", situation: "offer",
          qualification: "degree", occupation_shortage: "yes",
        }));
        await page.goto(server.url("/"), 1200);
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
      const seen = JSON.parse(await withBrowser(async (page: BrowserPage) => {
        const read = 'JSON.stringify({'
          + ' clash: [...document.querySelectorAll(".clash")].map((n) => n.textContent.trim()),'
          + ' verdicts: [...document.querySelectorAll(".st")].map((n) => n.textContent.trim()) })';
        // The critique's own hostile walk: no qualification, and a degree from a
        // designated institution.
        await page.goto(server.url("/"), 300);
        await page.evaluate(seed({
          destination: "nl", citizenship: "IN", situation: "offer",
          qualification: "none", experience_5y: "lt2", experience_7y: "3to5", occupation_it: "yes",
          salary_eur_month: "band_6", age_band: "a30to35", nl_recent_grad: "no", top200_grad: "yes",
        }));
        await page.goto(server.url("/"), 1400);
        const contradicted = await page.evaluate(read);
        // The same walk with the qualification answered consistently.
        await page.evaluate(seed({
          destination: "nl", citizenship: "IN", situation: "offer",
          qualification: "degree", experience_5y: "lt2", experience_7y: "3to5", occupation_it: "yes",
          salary_eur_month: "band_6", age_band: "a30to35", nl_recent_grad: "no", top200_grad: "yes",
        }));
        await page.goto(server.url("/"), 1400);
        const consistent = await page.evaluate(read);
        return JSON.stringify({ contradicted: JSON.parse(contradicted), consistent: JSON.parse(consistent) });
      }, { viewport: { width: 1100, height: 900 }, mobile: false }) as string) as {
        contradicted: { clash: string[]; verdicts: string[] };
        consistent: { clash: string[]; verdicts: string[] };
      };

      expect(seen.contradicted.clash.length, "the screen still says nothing").toBe(1);
      expect(seen.contradicted.clash[0]!).toContain("no completed qualification");
      expect(seen.contradicted.clash[0]!).toContain("Both cannot be true");
      // It says it beside the verdicts, which are still shown: this reports on
      // the answers, it does not withhold the result.
      expect(seen.contradicted.verdicts.length).toBeGreaterThan(0);
      // And a reader whose answers agree is not accused of anything.
      expect(seen.consistent.clash).toEqual([]);
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
   * reader does there in the data's own words, unglossed (s28); the screen's
   * first-use explainer counts prose only.
   */
  it("prints the shortage question's help as the dataset's sentence, and glosses nothing in it", async () => {
    const server = await serve(dist);
    try {
      const seen = JSON.parse(await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/"), 300);
        await page.evaluate(seed({
          destination: "de", citizenship: "IN", situation: "offer",
          qualification: "degree", recognition_de: "recognized",
        }));
        await page.goto(server.url("/"), 1200);
        return page.evaluate(
          'JSON.stringify({'
          + ' question: document.querySelector(".qlabel").textContent.trim(),'
          + ' help: document.querySelector(".qlearn") ? document.querySelector(".qlearn").textContent.trim() : null })',
        );
      }, { viewport: { width: 1100, height: 900 }, mobile: false }) as string) as
        { question: string; help: string | null };

      expect(seen.question.toLowerCase()).toContain("shortage");
      expect(seen.help, "the shortage question offers no help at all").toBeTruthy();
      // The link's text is the label as the data wrote it, whole.
      const door = ds.fields.find((f) => f.id === "occupation_shortage")!.learn!;
      expect(seen.help!).toContain(door.label);
      // And nothing was explained into it: no explainer, no symbol to explain.
      expect(seen.help!).not.toContain(SECTION_EXPLAINER);
      expect(seen.help!).not.toContain("§");
    } finally {
      server.close();
    }
  }, 180000);
});
