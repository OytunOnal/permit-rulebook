import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import { phraseAtStartOf, deriveBands, evaluate, fillRouteSlots, remainingQuestions } from "permit-rulebook-data";
import { arrivalOf, arrivalPlan, arrivalSentence, questionPhrase } from "../src/lib/scope.js";
import { RECORD_VERSION, serialize } from "../src/lib/record.js";
import { CAME_FROM_LINE } from "../src/lib/copy/verdict.js";
import type { Dataset, Profile } from "permit-rulebook-data";
import { plainTextOf } from "./reader-pages.js";
import { everyCardIn, verdictOn } from "./verdict-cards.js";

const ds = dataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));

/**
 * A reader who has answered before, arriving from a country or a route page.
 *
 * The pre-scoped "Check yours" is the one call to action on 27 of the 29 pages,
 * and for anyone with a saved record it was dead: `/?country=fr` rendered the
 * German answers unchanged, with the word France nowhere on the screen
 * (isolated v1-gate critique, 2026-09-08, B2). "A link is not louder than a
 * declaration" was the old rule; it is louder than a STALE one, which is what a
 * record for another country becomes the moment the reader asks about this one.
 */
const germanRecord: Profile = {
  destination: "de", citizenship: "IN", situation: "offer", qualification: "degree",
  recognition_de: "recognized", occupation_shortage: "yes", experience_5y: "lt2", experience_7y: "3to5",
  // band_5 on the pooled ladder = €45,934.20 – under €50,700.
  salary_eur_year: "band_5", german: "b1", english: "c1", funds_eur_month: "band_1",
};

/** A reader with nothing on the record. */
const noRecord = { answers: {}, order: [] };
/** What an address that names nothing the dataset has does to that reader. */
const untouched = { record: { answers: {}, order: [] }, scopedRouteId: null, line: null };

describe("an arrival that names a country re-scopes the record", () => {
  it("the country in the link is where the record now stands", () => {
    // The arrival names a country; this is only the address it resolves to.
    expect(arrivalOf(ds, "?country=fr", noRecord).record.answers["destination"]).toBe("fr");
    expect(arrivalOf(ds, "?route=fr-talent-blue-card", noRecord).record.answers["destination"]).toBe("fr");
    expect(arrivalOf(ds, "?country=zz", noRecord)).toEqual(untouched);
    expect(arrivalOf(ds, "?route=de-does-not-exist", noRecord)).toEqual(untouched);
  });

  it("a German record arriving in France answers about France, keeping what it can", () => {
    const order = Object.keys(germanRecord);
    const { record, line } = arrivalOf(ds, "?country=fr", { answers: germanRecord, order });
    expect(line?.rescoped, "the move from Germany is not said as a move").toBe(true);
    expect(record.answers["destination"]).toBe("fr");
    // Facts France reads are hers still; facts only Germany reads are gone.
    expect(record.answers["citizenship"]).toBe("IN");
    expect(record.answers["qualification"]).toBe("degree");
    expect(record.answers["recognition_de"], "a German-only answer survived into France")
      .toBeUndefined();
    // The amount travels: one pooled ladder, so the band names the same euros.
    const bands = deriveBands(ds, "salary_eur_year");
    expect(bands.find((b) => b.id === record.answers["salary_eur_year"])!.label)
      .toBe("\u20ac45,934.20 \u2013 under \u20ac50,700");
    // And the verdicts are French.
    expect(evaluate(ds, record.answers).filter((r) => r.status !== "hold").every((r) => r.country === "FR"))
      .toBe(true);
  });

  it("arriving where the record already is changes nothing at all", () => {
    const order = Object.keys(germanRecord);
    const arrival = arrivalOf(ds, "?country=de", { answers: germanRecord, order });
    expect(arrival.line).toBeNull();
    expect(arrival.record).toEqual({ answers: germanRecord, order });
  });

  it("the stored record keeps its version: nothing about what an answer means moved", () => {
    // The ladder is the one it always was, so a record written yesterday still
    // names the amounts it named. Seeded from the module's own constant, so a
    // future format change cannot leave these tests reading a dead contract.
    expect(JSON.parse(serialize({ destination: "de" }, ["destination"])).version).toBe(RECORD_VERSION);
  });
});

describe("a route arrival, from the verdict", () => {
  it("the card of the route the reader came from is the one marked, and says so", () => {
    // The German record arriving from Germany's researcher page: the record
    // stands where it is, and the route the link names is the one marked.
    const verdict = verdictOn(ds, germanRecord, "de-researcher");
    const marked = everyCardIn(verdict).filter((c) => c.html.includes("data-came-from="));
    expect(marked.map((c) => c.route), "no card is marked as the one the reader came from").toEqual(["de-researcher"]);
    expect(marked[0]!.html).toContain(`data-came-from="de-researcher"`);
    expect(plainTextOf(marked[0]!.html)).toContain("Researcher");
    expect(marked[0]!.html).toContain(CAME_FROM_LINE);
  });
});

const { chromePath } = await import("../scripts/chrome.mjs");
const { serve, withBrowser } = await import("../scripts/browser.mjs");

function why(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}
const skipped = why();

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
}

const SEED = `localStorage.setItem("permit-rulebook.record.v1", ${
  JSON.stringify(serialize(germanRecord, Object.keys(germanRecord)))})`;

/**
 * The page's own call to action, not the header's: both say "Check yours", and
 * the header's is the unscoped one.
 */
const CLICK_CHECK_YOURS = '(() => { const a = [...document.querySelectorAll("a")]'
  + '.find((x) => /[?](country|route)=/.test(x.getAttribute("href") || ""));'
  + ' if (!a) throw new Error("no pre-scoped call to action on this page");'
  + ' a.click(); return a.getAttribute("href"); })()';

describe.skipIf(skipped !== null)("the walk the critique took, with a record in the browser", () => {
  it("a German record, /france/, Check yours: French verdicts and a line saying so", async () => {
    const server = await serve(dist);
    try {
      const seen = JSON.parse(await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/france/"), 500);
        await page.evaluate(SEED);
        await page.evaluate(CLICK_CHECK_YOURS);
        await new Promise((r) => setTimeout(r, 1500));
        return page.evaluate(
          'JSON.stringify({ url: location.search,'
          + ' countries: [...document.querySelectorAll("#main .country")].map((c) => c.textContent.trim()),'
          + ' recorded: [...document.querySelectorAll(".recorded")].map((p) => p.textContent.trim()),'
          + ' text: (document.getElementById("main").textContent || "").split(/\\s+/).join(" ").slice(0, 300) })',
        );
      }, { viewport: { width: 1100, height: 1000 }, mobile: false }) as string) as
        { url: string; countries: string[]; recorded: string[]; text: string };

      expect(seen.url).toBe("?country=fr");
      // Not one German verdict on a screen the reader asked about France.
      expect(seen.countries.filter((c) => /German/i.test(c)), seen.countries.join(" | ")).toEqual([]);
      expect(seen.recorded.join(" "), seen.text).toContain("France");
    } finally {
      server.close();
    }
  }, 180000);

  it("a route arrival scrolls to that route's card and marks it", async () => {
    const server = await serve(dist);
    try {
      const seen = JSON.parse(await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/germany/researcher/"), 500);
        await page.evaluate(SEED);
        await page.evaluate(CLICK_CHECK_YOURS);
        await new Promise((r) => setTimeout(r, 1800));
        return page.evaluate(
          '(() => { const el = document.querySelector("[data-came-from]");'
          + ' const r = el ? el.getBoundingClientRect() : null;'
          + ' const open = el ? [...document.querySelectorAll("details")]'
          + '   .filter((d) => d.contains(el)).every((d) => d.open) : false;'
          + ' return JSON.stringify({ found: el ? el.dataset.cameFrom : null,'
          + '   inView: r ? r.top > -240 && r.top < window.innerHeight : false, open }); })()',
        );
      }, { viewport: { width: 1100, height: 1000 }, mobile: false }) as string) as
        { found: string | null; inView: boolean; open: boolean };

      // Which card is marked, and what it says, is the verdict's ("a route
      // arrival, from the verdict"); the page lands on it: every fold around
      // it opened, and the card in view.
      expect(seen.found, "no card is marked as the one the reader came from").toBe("de-researcher");
      expect(seen.open, "the group holding it is still collapsed").toBe(true);
      expect(seen.inView, "the card is out of view").toBe(true);
    } finally {
      server.close();
    }
  }, 180000);
});

/**
 * The sentence the arrival prints, over every country pair.
 *
 * Two defects, both read off the live site (deploy 34263141644 and the Spec
 * review, 2026-09-08). It lower-cased the ledger label "IT work" into the
 * fragment "it work"; and it was built from the answers the move DROPPED, so a
 * reader arriving in France was told five German questions were coming back
 * when what actually followed were two French ones. The sentence now reads
 * forwards, off the same plan the screen is drawn from: what survived, and how
 * many questions this country still has.
 */
describe("the arrival line says what actually happens next", () => {
  const fullRecordFor = (code: string): { answers: Profile; order: string[] } => {
    // A complete interview for one country, answered the way a reader would.
    const answers: Profile = { destination: code.toLowerCase(), citizenship: "IN" };
    const order = ["destination", "citizenship"];
    for (let i = 0; i < 30; i++) {
      const next = remainingQuestions(ds, answers)[0];
      if (!next) break;
      const pick = next.options.find((o) => !o.is_unknown && !o.is_fallback) ?? next.options[0]!;
      answers[next.field] = pick.value;
      order.push(next.field);
    }
    return { answers, order };
  };

  it("names only answers that survived and only questions that are actually coming", () => {
    for (const from of ds.countries)
      for (const to of ds.countries) {
        if (from.code === to.code) continue;
        const record = fullRecordFor(from.code);
        const plan = arrivalPlan(ds, record, to.code.toLowerCase());
        const where = `${from.code} → ${to.code}`;

        // Every named answer is one the reader still has on the record.
        for (const field of plan.kept)
          expect(plan.answers[field], `${where}: ${field} is named but not kept`).toBeDefined();
        expect(plan.kept, `${where}: the destination is not an answer that survived`)
          .not.toContain("destination");
        // The count is the questions the interview will actually ask next.
        expect(plan.asks, where).toBe(remainingQuestions(ds, plan.answers).length);

        const line = arrivalSentence(ds, {
          route: null, country: to.code, rescoped: true, kept: plan.kept, asks: plan.asks,
        });
        // One sentence, in the dataset's own words, with no field id in it.
        expect(line, where).toMatch(new RegExp(`^${phraseAtStartOf(to.code)} is on the record now\\.`));
        expect(line, where).not.toMatch(/_/);
        expect(line, where).not.toContain("  ");
        for (const field of plan.kept)
          expect(line, `${where}: ${field}`).toContain(questionPhrase(ds, field));
        // And nothing the move dropped is named anywhere in it.
        for (const field of record.order.filter((f) => plan.answers[f] === undefined))
          expect(line, `${where}: ${field} was dropped but is named`)
            .not.toContain(questionPhrase(ds, field));
      }
  });

  it("uses a declared name for every field the interview can ask", () => {
    for (const field of ds.fields.map((f) => f.id)) {
      const def = ds.fields.find((f) => f.id === field)!;
      const phrase = questionPhrase(ds, field);
      // The subject with any route it names said in full (#159), or the short label.
      const subject = def.subject && fillRouteSlots(def.subject, ds);
      expect([subject, def.short_label].filter(Boolean), `${field}: "${phrase}" is not declared`)
        .toContain(phrase);
      expect(phrase, field).not.toBe(field);
      expect(phrase, field).not.toMatch(/_/);
    }
    // The regression itself, named: "IT work" lower-cased is "it work".
    expect(questionPhrase(ds, "occupation_it")).toBe("whether your work is in information technology");
  });

  it("is built the way the ruling wrote it", () => {
    expect(arrivalSentence(ds, {
      route: null, country: "FR", rescoped: true, kept: ["citizenship", "german"], asks: 2,
    })).toBe(
      "France is on the record now."
      + " Your answers about the passport you would apply with and your German level are kept;"
      + " France asks 2 more questions.",
    );
    // One question, singular; nothing kept, no clause about answers.
    expect(arrivalSentence(ds, { route: null, country: "ES", rescoped: true, kept: [], asks: 1 }))
      .toBe("Spain is on the record now. Spain asks 1 more question.");
    // A country's own page names the country once, not three times.
    expect(arrivalSentence(ds, {
      route: null, country: "DE", rescoped: false, kept: [], asks: 12,
    })).toBe("Germany is on the record.");
    // A first arrival narrates itself the way the route pages always did, and
    // says no more: the reader has answered nothing, and the question counter
    // under the line already states how many are coming.
    expect(arrivalSentence(ds, {
      route: "EU Blue Card — general", country: "DE", rescoped: false, kept: [], asks: 12,
    })).toBe("Coming from EU Blue Card — general — Germany is on the record.");
  });

  it("an arrival that changes nothing is not an event", () => {
    const record = fullRecordFor("DE");
    expect(arrivalOf(ds, "?country=de", record).line).toBeNull();
  });
});
