import { describe, expect, it } from "vitest";
import { RECORD_VERSION } from "../src/lib/record.js";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import { optionMeans, type Dataset, type Profile } from "permit-rulebook-data";
import { plainTextOf } from "./reader-pages.js";
import { PAINTED_AS_COMPOSED, paintedAsComposedScript, stepsIn, verdictFor } from "./verdict-cards.js";
import type { BrowserPage } from "./browser-walk.js";

/**
 * The human's walk, 2026-09-08.
 *
 * Profile: the Netherlands, a transfer to the employer's branch there, a
 * Turkish passport, €5,942 or more, no Dutch degree, not a designated
 * institution, 30–35. The leverage box said "With a job offer → Highly skilled
 * migrant — 30 or older would be met", and the reader asked: I already have my
 * employer's branch there — doesn't that count as a job offer?
 *
 * It does not, and the two places that could have said so said nothing: the
 * answer he picked, and the step he was offered. Both say it now, and neither
 * names a country — the place comes from what he declared.
 */

const ds = dataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));
const optionOf = (field: string, value: string) =>
  ds.fields.find((f) => f.id === field)!.options!.find((o) => o.value === value)!;

const WALK = {
  destination: "nl", citizenship: "TR", situation: "ict", salary_eur_month: "band_6",
  nl_recent_grad: "no", top200_grad: "no", age_band: "a30to35",
};

describe("the answer and the step both say what they mean", () => {
  it("the sentence is the dataset's, with the reader's own place in it", () => {
    const said = optionMeans(optionOf("situation", "offer"), ds, WALK);
    expect(said).toContain("An employment contract directly with an employer in the Netherlands");
    // A reader already employed by the Dutch company from abroad has a job, not
    // an offer, and hesitated at the label (human, 2026-09-08).
    expect(said).toContain("including one you already hold");
    expect(said).toContain("not a transfer to a branch on a contract you hold abroad");
    // Derived, not typed: the same option reads differently for another reader.
    expect(optionMeans(optionOf("situation", "offer"), ds, { destination: "de" }))
      .toContain("an employer in Germany");
    expect(said).not.toContain("{place}");
  });

  it("the transfer answer says what it is, so the pair can be told apart", () => {
    const transfer = optionMeans(optionOf("situation", "ict"), ds, WALK);
    expect(transfer).toContain("Your contract stays with the company abroad");
    expect(transfer).toContain("in the Netherlands");
  });

  it("an answer with nothing to distinguish adds nothing", () => {
    for (const value of ["research", "none"])
      expect(optionMeans(optionOf("situation", value), ds, WALK), value).toBe("");
  });
});

/** Still deciding where to go: every step forks per country, so each row has a
 * place of its own that the reader has not declared. A real passport, since
 * the record keeps only answers a question offers (s25). */
const EXPLORER = {
  destination: "all", citizenship: "IN", situation: "none",
  qualification: "degree", recognition_de: "recognized", occupation_shortage: "yes",
  experience_5y: "2plus", experience_7y: "3to5", german: "b1", funds_eur_month: "band_1",
  nl_recent_grad: "no", top200_grad: "no",
};

/** Each step card the verdict for these answers draws: its heading, and the
 * sentence beside it, or null where it has none. */
const stepRowsFor = (answers: Profile): { head: string; means: string | null }[] =>
  stepsIn(verdictFor(answers)).map((s) => {
    const means = /<p class="unlock-means">([\s\S]*?)<\/p>/.exec(s.html);
    return { head: plainTextOf(/<h3>([\s\S]*?)<\/h3>/.exec(s.html)![1]!), means: means ? plainTextOf(means[1]!) : null };
  });

describe("the step says what it means, from the verdict", () => {
  it("beside the step in the results: the walk's job-offer step says it, and no other step says anything", () => {
    const rows = stepRowsFor(WALK);
    const step = rows.find((r) => r.head.includes("job offer"));
    expect(step, "the walk's leverage row is gone").toBeDefined();
    expect(step!.head, "the row is still scanned by its short step").toBe("With a job offer");
    expect(step!.means).toContain("an employer in the Netherlands");
    // A step with nothing to distinguish stays one line; a hosting agreement
    // is an arranged answer, no step card at all (#175).
    expect(rows.filter((r) => r !== step).filter((r) => r.means !== null)).toEqual([]);
    expect(rows.find((r) => r.head.includes("hosting agreement"))).toBeUndefined();
  });

  /**
   * The phone walk of 2026-09-08: a reader still deciding where to go was told
   * "With a job offer in your offer, transfer or agreement in Germany", and
   * under it a sentence about "an employer there itself" — the place wrong
   * once and stated twice, then missing from the sentence entirely.
   */
  it("a forked step names its country once, and its sentence says the same one", () => {
    const rows = stepRowsFor(EXPLORER);
    const german = rows.find((r) => r.head.includes("job offer") && r.head.includes("Germany"));
    expect(german, "the German fork of the job-offer step is gone").toBeDefined();
    expect(german!.head).toBe("With a job offer in Germany");
    expect(german!.means).toContain("an employer in Germany");
    for (const r of rows) {
      expect(r.head, "a heading is carrying a field's subject text").not.toContain(
        "your offer, transfer or agreement");
      if (r.means) expect(r.means, r.head).not.toContain(" there ");
    }
  });
});

/** And the page actually shows both, where the reader was standing. */
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
    `  !! THE ANSWER AND STEP WORDING WAS NOT SEEN ON THE PAGE: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join("\n"));

const seed = (answers: Record<string, string>) =>
  `localStorage.setItem("permit-rulebook.record.v1", ${JSON.stringify(JSON.stringify({
    version: RECORD_VERSION, answers, history: Object.keys(answers),
  }))})`;

describe.skipIf(skipped !== null)("the page shows it where the reader was standing", () => {
  it("under the answer in the interview, and beside the step in the results", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        // 1. The situation question, with the destination already declared.
        await page.goto(server.url("/"));
        await page.evaluate(seed({ destination: "nl" }));
        await page.goto(server.url("/"));
        const question = await page.evaluate('document.querySelector(".qlabel").textContent.trim()');
        const options = JSON.parse(await page.evaluate(
          'JSON.stringify([...document.querySelectorAll(".qcard .opt")].map((b) => ({'
          + ' label: b.querySelector(".opt-label").textContent.trim(),'
          + ' means: b.querySelector(".opt-means") ? b.querySelector(".opt-means").textContent.trim() : null })))',
        ));

        // 2. The results the walk reached: the verdict whose step the case
        // above reads, as painted.
        await page.evaluate(seed(WALK));
        await page.goto(server.url("/"));
        const painted = JSON.parse(await page.evaluate(paintedAsComposedScript(verdictFor(WALK))));
        return { question, options, painted };
      }, { viewport: { width: 1100, height: 1200 }, mobile: false }) as {
        question: string;
        options: { label: string; means: string | null }[];
        painted: typeof PAINTED_AS_COMPOSED;
      };

      expect(seen.question).toBe("Which best describes your situation?");
      const offer = seen.options.find((o) => o.label.includes("job offer"))!;
      const transfer = seen.options.find((o) => o.label.includes("transferring"))!;
      expect(offer.means, "the job-offer answer says nothing about what it means")
        .toContain("not a transfer to a branch on a contract you hold abroad");
      expect(transfer.means, "the transfer answer says nothing about what it means")
        .toContain("Your contract stays with the company abroad");
      // Only where there is something to settle.
      expect(seen.options.filter((o) => o.means).length).toBe(2);

      // Beside the step: what the step says is the verdict's ("the step says
      // what it means, from the verdict"); the page paints it.
      expect(seen.painted).toEqual(PAINTED_AS_COMPOSED);
    } finally {
      server.close();
    }
  }, 180000);
});
