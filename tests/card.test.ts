import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  deriveBands, evaluate,
  type Criterion, type Dataset, type Profile, type Route, type RouteResult,
} from "permit-rulebook-data";
import {
  caveatHtml, measuredCriterionOf, precondHtml, provenanceHtml, railHtml,
  sourcedCaveatHtml, unsourcedCaveatHtml,
} from "../src/lib/card.js";

const ds = dataset as unknown as Dataset;

const routeOf = (id: string): Route =>
  ds.countries.flatMap((c) => c.routes).find((r) => r.id === id)!;

const resultOf = (profile: Profile, id: string): RouteResult =>
  evaluate(ds, profile).find((r) => r.route.id === id)!;

function bandFor(field: string, amount: number): string {
  return deriveBands(ds, field).find(
    (b) => (b.min === undefined || amount >= b.min) && (b.max === undefined || amount < b.max),
  )!.id;
}

/**
 * The orientation year used to test "you have no job offer yet" as a rule of
 * the route. It is not one — the Dutch immigration service's requirement list
 * says nothing about an offer (human read 2026-09-07) — and it hid the route
 * from the graduate for whom it is the way to the lower salary threshold.
 * What replaced it is prose on the card, so the card is what these read.
 */
describe("the orientation year, on the card", () => {
  const graduate: Profile = {
    destination: "nl", citizenship: "TR", situation: "offer",
    nl_recent_grad: "yes", top200_grad: "no",
  };

  it("reaches a person who has a job offer", () => {
    const result = evaluate(ds, graduate).find((r) => r.route.id === "nl-orientation-year")!;
    expect(result.status).toBe("met");
  });

  it("states the condition the interview cannot ask, under the same heading as the rest", () => {
    const html = precondHtml(routeOf("nl-orientation-year"));
    expect(html).toContain("Also required — not checked here");
    expect(html).toMatch(/must not have previously held an orientation year permit/i);
    // Beside the plain lines, not in a block of its own. The deadline reads
    // as the immigration service states it since s5f — "in the three years
    // before the date of application" — because the page it is quoted from
    // never makes a doctoral defence a deadline of its own.
    expect(html).toMatch(/three years before the date of application/);
    expect(html.match(/class="precond"/g)).toHaveLength(1);
  });

  it("passes on the qualification the source puts on its own answer", () => {
    const html = caveatHtml(routeOf("nl-orientation-year"));
    expect(html).toContain("The official page also says");
    expect(html).toMatch(/Turkish passport/);
    // Not invented, and not a bar the reader can fail.
    expect(html).toMatch(/does not say how/i);
    expect(html).not.toMatch(/Also required/);
  });

  it("a route that makes no such statement renders nothing at all", () => {
    expect(caveatHtml(routeOf("de-blue-card-general"))).toBe("");
    expect(precondHtml(routeOf("de-chancenkarte"))).toBe("");
  });

  it("dataset prose reaches the page as text, never as markup", () => {
    const route: Route = {
      ...routeOf("nl-orientation-year"),
      preconditions: ["<script>alert(1)</script>"],
      statements: [{
        id: "x", kind: "caveat", text: "a & b <em>c</em>",
        source: { source_url: "https://example.org", quote: "quoted", retrieved_at: "2026-09-07" },
      }],
    };
    expect(precondHtml(route)).toContain("&lt;script&gt;");
    expect(caveatHtml(route)).toContain("a &amp; b &lt;em&gt;c&lt;/em&gt;");
  });
});

/**
 * One card carried a verdict and a picture of the same man failing: CRITERIA
 * MET through the €3,122 path, over a rail labelled "€4,357/month — under 30,
 * 2026" with his declared band under that line (human catch 2026-09-07).
 */
describe("the rail names the threshold the reader was measured against", () => {
  const dutchGraduate: Profile = {
    destination: "nl", citizenship: "TR", situation: "offer", qualification: "degree",
    age_band: "u30", nl_recent_grad: "yes", top200_grad: "no", occupation_it: "no",
    salary_eur_month: bandFor("salary_eur_month", 3500),
  };

  it("met through the reduced path: the rail says €3,122, and never labels €4,357", () => {
    const r = resultOf(dutchGraduate, "nl-hsm-under30");
    expect(r.status).toBe("met");
    const html = railHtml(ds, r, dutchGraduate);
    expect(html).toContain("€3,122/month");
    expect(html).not.toContain("€4,357/month</b>");
    expect(html).toContain("lower amount for a recent graduate");
    expect(html).not.toContain("under 30, 2026");
  });

  it("the caption under the number is the deciding path's own label", () => {
    expect(measuredCriterionOf(ds, resultOf(dutchGraduate, "nl-hsm-under30"), dutchGraduate)!.threshold_label)
      .toBe("lower amount for a recent graduate, 2026");
  });

  it("not met, with the reduced path out of reach: the rail says €4,357", () => {
    const profile = { ...dutchGraduate, nl_recent_grad: "no" };
    const r = resultOf(profile, "nl-hsm-under30");
    expect(r.status).toBe("near");
    const html = railHtml(ds, r, profile);
    expect(html).toContain("€4,357/month");
    expect(html).toContain("under 30, 2026");
  });

  it("a route with one threshold is unaffected", () => {
    const profile: Profile = {
      destination: "de", citizenship: "TR", situation: "offer", qualification: "degree",
      recognition_de: "recognized", occupation_shortage: "yes", experience: "y2in5",
      salary_eur_year: bandFor("salary_eur_year", 48000),
    };
    expect(railHtml(ds, resultOf(profile, "de-experienced-worker"), profile)).toContain("€45,630/year");
  });
});

describe("the source list says which quote applied to this reader", () => {
  const dutchGraduate: Profile = {
    destination: "nl", citizenship: "TR", situation: "offer", qualification: "degree",
    age_band: "u30", nl_recent_grad: "yes", top200_grad: "no", occupation_it: "no",
    salary_eur_month: bandFor("salary_eur_month", 3500),
  };

  it("both quotes still render — the other threshold exists and the reader may want it", () => {
    const html = provenanceHtml(ds, resultOf(dutchGraduate, "nl-hsm-under30"));
    expect(html).toContain("€ 3,122.00");
    expect(html).toContain("€ 4,357.00");
  });

  it("exactly one of them is marked as theirs, and the other as not", () => {
    const html = provenanceHtml(ds, resultOf(dutchGraduate, "nl-hsm-under30"));
    const reduced = html.slice(html.indexOf("€ 3,122.00"), html.indexOf("€ 3,122.00") + 400);
    const full = html.slice(html.indexOf("€ 4,357.00"), html.indexOf("€ 4,357.00") + 400);
    expect(reduced).toContain("applies to you");
    expect(reduced).not.toContain("does not apply to you");
    expect(full).toContain("does not apply to you");
  });

  it("an undecided route marks nothing — it has ruled the reader out of nothing", () => {
    // The scenario's own step 5, "I don't know wherever it is offered", with
    // the salary question not yet reached. `applied` was one boolean carrying
    // both LOST and NOT YET DECIDED, and an undecided disjunction decides
    // nothing — so both quotes came back false and the card told the reader
    // that each of its two thresholds was not theirs (review 2026-09-07).
    const undecided: Profile = {
      destination: "nl", citizenship: "third_country", situation: "offer",
      age_band: "u30", qualification: "degree", experience: "y2in5",
    };
    const r = resultOf(undecided, "nl-hsm-under30");
    expect(r.status).toBe("hold");
    const html = provenanceHtml(ds, r);
    // Both quotes still render: the reader may want to know they exist.
    expect(html).toContain("€ 3,122.00");
    expect(html).toContain("€ 4,357.00");
    expect(html).not.toContain("does not apply to you");
    expect(html).not.toContain("applies to you");
  });

  it("one settled choice on a card never marks a second one nobody has decided", () => {
    // The guard is per entry, not per card, and the shipped dataset has no
    // route with two disjunctions — so this builds one. The Chancenkarte's
    // living-costs threshold is lifted onto the graduate's route as a second
    // choice of numbers and left unanswered. The salary choice IS settled, so
    // the card is marking; the living-costs quote must still carry no mark,
    // because nothing has decided it (review 2026-09-07).
    const twoChoices = structuredClone(ds);
    const route = twoChoices.countries.flatMap((c) => c.routes).find((r) => r.id === "nl-hsm-under30")!;
    const funds = ds.countries.flatMap((c) => c.routes).find((r) => r.id === "de-chancenkarte")!
      .criteria.flatMap(function flat(c): Criterion[] {
        return c.op === "any" ? c.paths.flatMap((pa) => pa.criteria.flatMap(flat)) : [c];
      })
      .find((c) => c.op === "gte" && c.field === "funds_eur_month")!;
    route.criteria.push({ op: "any", label: "living costs", paths: [{ criteria: [funds] }] });

    const r = evaluate(twoChoices, dutchGraduate).find((x) => x.route.id === "nl-hsm-under30")!;
    const html = provenanceHtml(twoChoices, r);
    const near = (needle: string) => html.slice(html.indexOf(needle), html.indexOf(needle) + 400);
    // The settled choice is still marked, both ways.
    expect(near("€ 3,122.00")).toContain("applies to you");
    expect(near("€ 4,357.00")).toContain("does not apply to you");
    // The unsettled one is not marked at all — neither in words, nor by the
    // dimming that says "this one is not yours" without saying it.
    const fundsQuote = funds.op === "gte" ? funds.threshold.quote.slice(0, 30) : "";
    const rows = html.split(`<div class="src`).slice(1);
    const fundsRow = rows.find((row) => row.includes(fundsQuote))!;
    expect(fundsRow).toBeDefined();
    expect(fundsRow).not.toContain("apply to you");
    expect(fundsRow.startsWith(`"`), "an undecided row must not be dimmed as ruled out").toBe(true);
    // And the row that WAS ruled out still is, so the check above is not
    // passing because nothing is ever dimmed.
    expect(rows.find((row) => row.includes("€ 4,357.00"))!.startsWith(" unapplied")).toBe(true);
  });

  it("a route with a single threshold marks nothing — there is nothing to tell apart", () => {
    const profile: Profile = {
      destination: "de", citizenship: "TR", situation: "offer", qualification: "degree",
      recognition_de: "recognized", occupation_shortage: "yes", experience: "y2in5",
      salary_eur_year: bandFor("salary_eur_year", 48000),
    };
    expect(provenanceHtml(ds, resultOf(profile, "de-experienced-worker"))).not.toContain("applies to you");
  });
});

/**
 * `preconditions` was doing two jobs and the header lied about one of them:
 * sentences saying the reader may qualify for LESS were rendered as things
 * demanded of them.
 */
/**
 * A route whose caveat carries no quote.
 *
 * It used to be a shipped one: the es-blue-card shortage-occupation caveat
 * stood on a declared, dated "scanned-image" reason until the UGE PDF turned
 * out to state the same conditions in words, and s5f's `pdf-text` strategy
 * made even that machine-readable. `declared_unsourced` is 0 across the
 * dataset now, and that is the healthy state for an exception — but the
 * exception still exists, the card still has to render it honestly, and this
 * is what proves it does. The text is the one that shipped, so what a reader
 * would have seen is still the thing under test.
 */
const unsourcedRoute = (): Route => ({
  ...routeOf("es-blue-card"),
  statements: [{
    id: "reduced-also-for-shortage-occupations",
    kind: "caveat",
    text: "The lower salary can also apply to shortage occupations that fall in the managerial and professional groups of Spain’s occupation classification (CNO-2011 groups 1 and 2) — we do not check that list.",
    unsourced: {
      reason: "scanned-image",
      checked_at: "2026-09-07",
      note: "Orden PJC/44/2026 is published as a scan of the printed bulletin.",
    },
  }],
});

describe("nothing that says \"you may qualify for less\" renders as a requirement", () => {
  const CARRIERS = ["nl-hsm-30plus", "nl-hsm-under30", "de-experienced-worker", "es-blue-card"];

  it("no caveat text ever appears under the \"Also required\" heading", () => {
    for (const country of ds.countries)
      for (const route of country.routes) {
        const required = precondHtml(route);
        for (const s of route.statements ?? [])
          if (s.kind === "caveat") expect(required, `${route.id}:${s.id}`).not.toContain(s.text);
      }
  });

  it("each moved line now renders as an aside instead", () => {
    for (const id of CARRIERS) {
      const aside = caveatHtml(routeOf(id));
      expect(aside, id).toMatch(/orientation year|collective wage|shortage occupation/i);
      expect(precondHtml(routeOf(id)), id).not.toMatch(/orientation year|collective wage|shortage occupation/i);
    }
  });

  it("the card's aside is one block the page asks for, not two it glues", () => {
    // The seam exists so a rendering decision does not sit in the page. The
    // page composed the sourced and unsourced blocks itself (review
    // 2026-09-07), which is the thing this module's own comment says it is for.
    // A route carrying only one kind is the case that hid it: the glue looked
    // harmless right up until the page had to decide the order of the two.
    for (const country of ds.countries)
      for (const route of country.routes)
        expect(caveatHtml(route), route.id)
          .toBe(sourcedCaveatHtml(route) + unsourcedCaveatHtml(route));
    expect(caveatHtml(unsourcedRoute())).toContain("we have not found the official wording");
    expect(caveatHtml(routeOf("de-chancenkarte"))).toContain("The official page also says:");
  });

  it("the reason there is no quote reaches the card as words, with the day we looked", () => {
    // The payoff of making the absence a decision rather than an essay: the
    // card can now say WHY in its own voice and print a date a reader can age,
    // instead of reprinting whatever prose the dataset happened to carry.
    const html = unsourcedCaveatHtml(unsourcedRoute());
    expect(html).toContain("only as a scan");
    expect(html).toContain("Last checked 2026-09-07");
  });

  it("the one with no quote says so, in the open, and says why", () => {
    const route = unsourcedRoute();
    const html = unsourcedCaveatHtml(route);
    expect(html).toContain("we have not found the official wording");
    expect(html).toMatch(/shortage occupations/);
    expect(html).toMatch(/Orden PJC\/44\/2026/);
    // And it is not passed off as something the official page says.
    expect(sourcedCaveatHtml(route)).not.toMatch(/shortage occupations/);
  });

  it("the Opportunity Card's 20-hour limit is an aside about the permit, not a bar", () => {
    expect(sourcedCaveatHtml(routeOf("de-chancenkarte"))).toMatch(/20 hours a week/);
    expect(precondHtml(routeOf("de-chancenkarte"))).toBe("");
  });
});

/**
 * The results card stripped the language scaffolding the route pages carry
 * (isolated v1-gate critique, 2026-09-08, F2). Twenty sentences of German
 * statute sat on the screen inside a page marked `lang="en"`, with no "German,
 * from arbeitsagentur.de." beside them — so a screen reader read the proof of
 * the product's whole claim aloud in an English voice, and a reader with A2
 * German got a wall of untranslated law with nothing telling her what it was.
 */
describe("a quote on the results card is framed the way it is on a route page", () => {
  const german: Profile = {
    destination: "de", citizenship: "third_country", situation: "offer",
    qualification: "degree", recognition_de: "recognized", occupation_shortage: "yes",
    experience: "y2in5", german: "b1", funds_eur_month: "band_1", salary_eur_year: "band_4",
  };

  it("carries the quote's own language, never the page's", () => {
    const html = provenanceHtml(ds, resultOf(german, "de-blue-card-general"));
    expect(html, "no German quote reached the card").toContain("Mindestbruttojahresgehalt");
    expect(html).toMatch(/lang="de"/);
    // Every quote on the card is tagged, not just the first.
    const quotes = html.match(/<i[^>]*>/g) ?? [];
    expect(quotes.length).toBeGreaterThan(1);
    for (const q of quotes) expect(q, q).toContain("lang=");
  });

  it("says which language it is and whose page it came from", () => {
    const html = provenanceHtml(ds, resultOf(german, "de-blue-card-general"));
    expect(html).toContain("German, from arbeitsagentur.de.");
  });

  it("and says so where the source spells a number its own way", () => {
    const html = provenanceHtml(ds, resultOf(german, "de-blue-card-general"));
    expect(html).toContain("The source writes 50.700 where this page writes 50,700");
  });

  it("an English source is not labelled as anything else", () => {
    const dutch: Profile = {
      destination: "nl", citizenship: "third_country", situation: "offer",
      salary_eur_month: "band_6", nl_recent_grad: "no", top200_grad: "no", age_band: "a30to35",
    };
    const html = provenanceHtml(ds, resultOf(dutch, "nl-hsm-30plus"));
    expect(html).not.toContain("German, from");
  });
});
