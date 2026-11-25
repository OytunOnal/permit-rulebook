import { describe, expect, it } from "vitest";
import { fillRouteSlots, type Profile } from "permit-rulebook-data";
import { RECORD_VERSION } from "../src/lib/record.js";
import { STATUS_LABEL } from "../src/lib/copy/verdict.js";
import { resumedLine } from "../src/lib/copy/interview.js";
import { glossed } from "../src/lib/gloss.js";
import { plainTextOf, walkFrom } from "./reader-pages.js";
import { type BrowserPage } from "../scripts/browser/browser.mjs";
import { answerWith, openAtRest, withSite, skipReason } from "./browser-walk.js";
import {
  PAINTED_AS_COMPOSED, blocksIn, drawnRouteOn, paintedAsComposedScript, placed, verdictFor,
} from "./verdict-cards.js";
import { routeOf } from "./route-of.js";
import { FIVE, JOB_OFFER, SEVEN, ds, textOf, withExperience } from "./s25-experience.js";

/**
 * s25 — the experience ladder is two questions (v1.1 critique F2).
 *
 * One question with four rungs and a false implication (`y3in7 ⇒ y2in5`)
 * became two: how much related experience in the last five years, and how
 * much in the last seven. This file holds the walks: the interview walked
 * from a seeded record to the verdict, read from the verdict and in the
 * browser, and a record written before this slice restored in the browser;
 * `s25-dataset.test.ts` holds the cases read from the dataset and the drawn
 * HTML.
 */

/** The record the browser walks below start from: `occupation_it` is on it,
 * since Germany asks it before the experience questions now that the shortage
 * Blue Card's IT path reads it (#134). */
const SEEDED: Profile = {
  destination: "de", situation: "offer", qualification: "vocational", citizenship: "TR", recognition_de: "not_assessed",
  occupation_it: JOB_OFFER.occupation_it!,
};

/** The three ways the two questions are answered, and what each reads. */
const WAYS = [
  ["2plus", "3to5", { worker: "Criteria met", tally: "Experience (last 5 years) +2" }],
  ["lt2", "3to5", { worker: "Not yet", tally: null }],
  ["2plus", "5plus", { worker: "Criteria met", tally: "Experience (last 7 years) +3" }],
] as const;

/** The answers the interview ends on, from the seeded record, answering each
 * question it asks from the reader's profile. */
const walkedTo = (five: string, seven: string): Profile =>
  walkFrom(SEEDED, (q) => withExperience(five, seven)[q.field]!).answers;

/** The § 6 BeschV sentence the five-year rule quotes. */
const FIVE_YEAR_QUOTE = (() => {
  const route = routeOf(ds, "de-experienced-worker");
  const rule = route.criteria.find((c) => "field" in c && c.field === FIVE) as { source?: { quote: string } };
  return rule.source!.quote;
})();

describe("s25 — the walked results, from the verdict", () => {
  for (const [five, seven, expected] of WAYS)
    it(`${five} / ${seven}: the experienced worker is placed as ${expected.worker}, the Opportunity Card's tally ${expected.tally ?? "names no experience"}`, () => {
      const verdict = verdictFor(walkedTo(five, seven));
      const worker = placed(verdict, "de-experienced-worker");
      if (expected.worker === "Criteria met") {
        expect(worker?.kind).toBe("open");
        expect(worker!.html).toContain(`<span class="st met">${STATUS_LABEL.met}</span>`);
        // The § 6 BeschV sentence the rule quotes — "innerhalb der letzten fünf
        // Jahren … mindestens zweijährige einschlägige Berufserfahrung" — on
        // the met card, verbatim from the dataset.
        expect(plainTextOf(worker!.html)).toContain("Innerhalb der letzten fünf Jahren");
        expect(plainTextOf(worker!.html)).toContain(FIVE_YEAR_QUOTE);
      } else {
        expect(worker?.kind).toBe("not-yet");
      }
      const tally = textOf(blocksIn(drawnRouteOn(verdict, "de-chancenkarte"), "ptsline met", "ptsline short"));
      expect(tally, "the Opportunity Card has no tally").not.toBe("");
      if (expected.tally) expect(tally).toContain(expected.tally);
      else expect(tally).not.toContain("Experience");
    });
});

/**
 * The browser: the two questions answered three ways, by the buttons, to the
 * verdict the cases above read, as painted.
 */
const skipped = skipReason();
if (skipped)
  process.stderr.write(`\n  !! THE S25 WALK WAS NOT SEEN IN A BROWSER: ${skipped}.\n     Run: npm run build && npm test\n\n`);

const seed = (answers: Record<string, string>) =>
  `localStorage.setItem("permit-rulebook.record.v1", ${JSON.stringify(JSON.stringify({
    version: RECORD_VERSION, answers, history: Object.keys(answers),
  }))})`;
// The page script that reads which question the card asks: the walk maps it back to a field.
const QLABEL = '(() => { const h = document.querySelector(".qcard .qlabel"); return h ? h.textContent.trim() : ""; })()';
// The page script that reads the app's screen: the walk stops once it is the results.
const STATE = 'document.getElementById("app").dataset.state';
// Quoted: a rung like 2plus is not a bare CSS identifier.
const tap = (value: string) => `document.querySelector(".qcard .opt[data-value='${value}']").click()`;
// The page script that reads the resumed line: the cases check it counts the kept answers.
const RESUMED = '(() => { const p = document.querySelector("#main .resumed"); return p ? p.textContent.trim() : ""; })()';

/** Answer whatever question is on the screen from the profile, until the
 * verdict; then whether the page painted the verdict `painted` reads. */
async function walk(page: BrowserPage, profile: Profile, painted: string): Promise<{ asked: string[]; painted: typeof PAINTED_AS_COMPOSED }> {
  // Each label as its card draws it: the first words on the card, glossed
  // (#156), with any route it names said in full (#159).
  const byLabel = new Map(ds.fields.map((f) => [glossed(fillRouteSlots(f.label, ds), new Set()), f.id]));
  const asked: string[] = [];
  for (let i = 0; i < 24; i++) {
    if ((await page.evaluate(STATE)) === "results") break;
    const label = await page.evaluate(QLABEL);
    const field = byLabel.get(label);
    if (!field) throw new Error(`no field for the question "${label}"`);
    asked.push(field);
    // A tap commits once the card's beat is over, and draws the next screen
    // in the task that handles it; the page is read once it is at rest.
    await answerWith(page, tap(profile[field]!));
  }
  return { asked, painted: JSON.parse(await page.evaluate(painted)) };
}

describe.skipIf(skipped !== null)("s25 — in the browser", () => {
  for (const [five, seven, expected] of WAYS)
    it(`${five} / ${seven}: the experienced worker reads ${expected.worker}, the card's tally ${expected.tally ?? "names no experience"}`, async () => {
      const seen = await withSite(async ({ page, url }) => {
        await page.goto(url("/"));
        await page.evaluate(seed(SEEDED as Record<string, string>));
        await page.goto(url("/"));
        const resumed = await page.evaluate(RESUMED);
        const first = await page.evaluate(QLABEL);
        const walked = await walk(page, withExperience(five, seven), paintedAsComposedScript(verdictFor(walkedTo(five, seven))));
        return { resumed, first, ...walked };
      }, { viewport: { width: 1100, height: 1200 }, mobile: false }) as
        { resumed: string; first: string; asked: string[]; painted: typeof PAINTED_AS_COMPOSED };
      expect(seen.resumed).toContain(resumedLine(Object.keys(SEEDED).length));
      expect(seen.first).toBe(ds.fields.find((f) => f.id === FIVE)!.label);
      expect(seen.asked.slice(0, 2)).toEqual([FIVE, SEVEN]);
      // Where the experienced worker stands, its quote and the Opportunity
      // Card's tally are the verdict's ("s25 — the walked results, from the
      // verdict"); the walk ends on that verdict, painted.
      expect(seen.painted).toEqual(PAINTED_AS_COMPOSED);
    }, 120_000);

  it("an old record with y3in7 restores without it and says how many answers were kept", async () => {
    const seen = await withSite(async ({ page, url }) => {
      await page.goto(url("/"));
      await page.evaluate(seed({ ...SEEDED as Record<string, string>, experience: "y3in7", experience_7y: "yes" }));
      await openAtRest(page, url("/"));
      return {
        resumed: await page.evaluate(RESUMED),
        first: await page.evaluate(QLABEL),
        rows: await page.evaluate('[...document.querySelectorAll("#decl-list [data-field]")].map((r) => r.dataset.field).join(",")'),
      };
    }, { viewport: { width: 1100, height: 1200 }, mobile: false }) as
      { resumed: string; first: string; rows: string };
    expect(seen.resumed).toContain(resumedLine(Object.keys(SEEDED).length));
    expect(seen.first).toBe(ds.fields.find((f) => f.id === FIVE)!.label);
    expect(seen.rows.split(",")).toEqual(Object.keys(SEEDED));
  }, 120_000);
});
