import { describe, expect, it } from "vitest";
import { RECORD_VERSION } from "../src/lib/record.js";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import { optionMeans, type Dataset } from "permit-rulebook-data";

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
    expect(said).toContain("An employment contract with an employer in the Netherlands itself");
    // A reader already employed by the Dutch company from abroad has a job, not
    // an offer, and hesitated at the label (human, 2026-09-08).
    expect(said).toContain("including one you already hold");
    expect(said).toContain("not a transfer to a branch on a contract you hold abroad");
    // Derived, not typed: the same option reads differently for another reader.
    expect(optionMeans(optionOf("situation", "offer"), ds, { destination: "de" }))
      .toContain("an employer in Germany itself");
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

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
}

const seed = (answers: Record<string, string>) =>
  `localStorage.setItem("permit-rulebook.record.v1", ${JSON.stringify(JSON.stringify({
    version: RECORD_VERSION, answers, history: Object.keys(answers),
  }))})`;

/** Still deciding where to go: every step forks per country, so each row has a
 * place of its own that the reader has not declared. */
const EXPLORER = {
  destination: "all", citizenship: "third_country", situation: "none",
  qualification: "degree", recognition_de: "recognized", occupation_shortage: "yes",
  experience: "y2in5", german: "b1", funds_eur_month: "band_1",
  nl_recent_grad: "no", top200_grad: "no",
};

describe.skipIf(skipped !== null)("the page shows it where the reader was standing", () => {
  it("under the answer in the interview, and beside the step in the results", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        // 1. The situation question, with the destination already declared.
        await page.goto(server.url("/"), 300);
        await page.evaluate(seed({ destination: "nl" }));
        await page.goto(server.url("/"), 900);
        const question = await page.evaluate('document.querySelector(".qlabel").textContent.trim()');
        const options = JSON.parse(await page.evaluate(
          'JSON.stringify([...document.querySelectorAll(".qcard .opt")].map((b) => ({'
          + ' label: b.querySelector(".opt-label").textContent.trim(),'
          + ' means: b.querySelector(".opt-means") ? b.querySelector(".opt-means").textContent.trim() : null })))',
        ));

        // 2. The results the walk reached, and the step it offered.
        await page.evaluate(seed(WALK));
        await page.goto(server.url("/"), 1400);
        const rows = JSON.parse(await page.evaluate(
          'JSON.stringify([...document.querySelectorAll(".unlock")].map((u) => ({'
          + ' head: u.querySelector("h4").textContent.trim(),'
          + ' means: u.querySelector(".unlock-means") ? u.querySelector(".unlock-means").textContent.trim() : null })))',
        ));
        return { question, options, rows };
      }, { viewport: { width: 1100, height: 1200 }, mobile: false }) as {
        question: string;
        options: { label: string; means: string | null }[];
        rows: { head: string; means: string | null }[];
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

      const step = seen.rows.find((r) => r.head.includes("job offer"));
      expect(step, "the walk's leverage row is gone").toBeDefined();
      expect(step!.head, "the row is still scanned by its short step").toBe("With a job offer");
      expect(step!.means).toContain("an employer in the Netherlands itself");
      // A step with nothing to distinguish stays one line.
      expect(seen.rows.find((r) => r.head.includes("hosting agreement"))?.means).toBeNull();
    } finally {
      server.close();
    }
  }, 180000);

  /**
   * The phone walk of 2026-09-08: a reader still deciding where to go was told
   * "With a job offer in your offer, transfer or agreement in Germany", and
   * under it a sentence about "an employer there itself" — the place wrong
   * once and stated twice, then missing from the sentence entirely.
   */
  it("a forked step names its country once, and its sentence says the same one", async () => {
    const server = await serve(dist);
    try {
      const rows = await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/"), 300);
        await page.evaluate(seed(EXPLORER));
        await page.goto(server.url("/"), 1400);
        return JSON.parse(await page.evaluate(
          'JSON.stringify([...document.querySelectorAll(".unlock")].map((u) => ({'
          + ' head: u.querySelector("h4").textContent.trim(),'
          + ' means: u.querySelector(".unlock-means") ? u.querySelector(".unlock-means").textContent.trim() : null })))',
        ));
      }, { viewport: { width: 1100, height: 1200 }, mobile: false }) as
        { head: string; means: string | null }[];

      const german = rows.find((r) => r.head.includes("job offer") && r.head.includes("Germany"));
      expect(german, "the German fork of the job-offer step is gone").toBeDefined();
      expect(german!.head).toBe("With a job offer in Germany");
      expect(german!.means).toContain("an employer in Germany itself");
      for (const r of rows) {
        expect(r.head, "a heading is carrying a field's subject text").not.toContain(
          "your offer, transfer or agreement");
        if (r.means) expect(r.means, r.head).not.toContain(" there ");
      }
    } finally {
      server.close();
    }
  }, 180000);
});
