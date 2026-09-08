import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

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
    version: 1, answers, history: Object.keys(answers),
  }))})`;

describe.skipIf(skipped !== null)("the interview helps where it asks", () => {
  it("puts the way to look an answer up at the question, not after it", async () => {
    const server = await serve(dist);
    try {
      const seen = JSON.parse(await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/"), 300);
        // Answered up to the German recognition question, and no further.
        await page.evaluate(seed({
          destination: "de", citizenship: "third_country", situation: "offer",
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
          destination: "nl", citizenship: "third_country", situation: "offer",
          qualification: "none", experience: "lt2", experience_7y: "yes", occupation_it: "yes",
          salary_eur_month: "band_6", age_band: "a30to35", nl_recent_grad: "no", top200_grad: "yes",
        }));
        await page.goto(server.url("/"), 1400);
        const contradicted = await page.evaluate(read);
        // The same walk with the qualification answered consistently.
        await page.evaluate(seed({
          destination: "nl", citizenship: "third_country", situation: "offer",
          qualification: "degree", experience: "lt2", experience_7y: "yes", occupation_it: "yes",
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
});
