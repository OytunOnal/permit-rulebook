import { describe, expect, it } from "vitest";
import dataset from "visa-rules/data/dataset.json";
import { deriveBands, evaluate, type Dataset, type Profile, type Route, type RouteResult } from "visa-rules";
import {
  appliedThresholdOf, caveatHtml, precondHtml, provenanceHtml, railHtml, unsourcedHtml,
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
    // Beside the plain lines, not in a block of its own.
    expect(html).toMatch(/three years of graduating/);
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
    expect(appliedThresholdOf(ds, resultOf(dutchGraduate, "nl-hsm-under30"), dutchGraduate)!.threshold_label)
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
      const aside = caveatHtml(routeOf(id)) + unsourcedHtml(routeOf(id));
      expect(aside, id).toMatch(/orientation year|collective wage|shortage occupation/i);
      expect(precondHtml(routeOf(id)), id).not.toMatch(/orientation year|collective wage|shortage occupation/i);
    }
  });

  it("the one with no quote says so, in the open, and says why", () => {
    const html = unsourcedHtml(routeOf("es-blue-card"));
    expect(html).toContain("we have not found the official wording");
    expect(html).toMatch(/shortage occupations/);
    expect(html).toMatch(/Orden PJC\/44\/2026/);
    // And it is not passed off as something the official page says.
    expect(caveatHtml(routeOf("es-blue-card"))).not.toMatch(/shortage occupations/);
  });

  it("the Opportunity Card's 20-hour limit is an aside about the permit, not a bar", () => {
    expect(caveatHtml(routeOf("de-chancenkarte"))).toMatch(/20 hours a week/);
    expect(precondHtml(routeOf("de-chancenkarte"))).toBe("");
  });
});
