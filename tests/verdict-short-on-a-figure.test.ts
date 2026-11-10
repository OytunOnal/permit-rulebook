import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import { evaluate, reasonFor, type Criterion, type Dataset, type Profile } from "permit-rulebook-data";
import { plainTextOf } from "./reader-pages.js";
import {
  badgeOf, drawnRouteOn, foldedLineOf, groupHeadingsIn, placed, stepsIn, stripTextOf, summaryRowOf, verdictFor,
  verdictOn,
} from "./verdict-cards.js";

/**
 * A route short on salary or points is called short, not within reach (#316;
 * rulings 1, 8, 9 and 10 on #187, through #310).
 *
 * The group says what is missing, not how near it is: its heading and its
 * count read "short on a figure", and each card's badge names the figure it is
 * short on, from the dataset's short label. A step states the gap it leaves
 * as a bound, in its route line and in its title. A not-yet row short on a
 * figure that also has a live unknown gives the gap first, then the unknown,
 * and stays under "Not yet". The words are the ones the ticket declares.
 */

const ds = dataset as unknown as Dataset;

/** Persona A of the v1.2.2 critique (W1): a Turkish passport, a German offer,
 * a degree not yet assessed, IT, five years in seven, on the shortage list. */
const PERSONA_A: Profile = {
  destination: "de", situation: "offer", qualification: "degree", citizenship: "TR", recognition_de: "not_assessed",
  experience_5y: "2plus", experience_7y: "5plus", occupation_shortage: "yes", occupation_it: "yes",
  salary_eur_year: "band_5", german: "a1", english: "c1", age_band: "a30to35", funds_eur_month: "unknown",
};

/** Persona A's W5 profile: the lowest salary band. */
const PERSONA_A_LOWEST: Profile = { ...PERSONA_A, salary_eur_year: "band_0" };

/** Priya: an Indian passport, a Dutch offer at €4,357–€4,754/month, 30–35, no
 * Dutch study, a designated institution she does not know. */
const PRIYA: Profile = {
  destination: "nl", situation: "offer", age_band: "a30to35", citizenship: "IN", qualification: "degree",
  salary_eur_month: "band_4", nl_recent_grad: "no", top200_grad: "unknown",
};

/** The two routes persona A's lowest band leaves short on salary: the
 * shortage Blue Card and the experienced worker. */
const BOTH_SHORT_ON_SALARY = ["de-blue-card-shortage", "de-experienced-worker"];

describe("the lowest band: the group says what is missing (rulings 8 and 9)", () => {
  const verdict = verdictFor(PERSONA_A_LOWEST);
  /** The same reader on all four countries, the offer in Germany. */
  const everywhere = verdictFor({ ...PERSONA_A_LOWEST, destination: "all", situation_country: "de" });

  it("both routes sit under \"Short on a figure\", each badged \"Short on yearly salary\"", () => {
    for (const route of BOTH_SHORT_ON_SALARY) expect(placed(verdict, route)?.kind, route).toBe("within-reach");
    expect(groupHeadingsIn(verdict)).toContain("Short on a figure");
    for (const route of BOTH_SHORT_ON_SALARY) expect(badgeOf(drawnRouteOn(verdict, route)), route).toBe("Short on yearly salary");
  });

  it("the strip and a country's summary row count \"2 short on a figure\"", () => {
    expect(stripTextOf(verdict)).toContain("2 short on a figure");
    expect(plainTextOf(summaryRowOf(everywhere, "Germany"))).toContain("2 short on a figure");
  });

  it("no screen says within reach", () => {
    for (const shown of [verdict, everywhere])
      expect(plainTextOf(shown.body).toLowerCase()).not.toContain("within reach");
  });
});

/**
 * A written dataset: the Opportunity Card asks a yearly salary as well as its
 * points, and a vocational reader with an offer falls short of both by a
 * bounded gap — the shipped dataset has no route short on two figures.
 */
function salaryOnTheOpportunityCard(): Dataset {
  const written = structuredClone(ds);
  const routes = written.countries.flatMap((c) => c.routes);
  const salary = routes.find((r) => r.id === "de-experienced-worker")!.criteria.find((c) => c.op === "gte")!;
  routes.find((r) => r.id === "de-chancenkarte")!.criteria.push(structuredClone(salary) as Criterion);
  return written;
}

/** Short on the Opportunity Card's points, and on €41,356.36–€45,630 a year. */
const POINTS_AND_SALARY_SHORT: Profile = {
  destination: "de", citizenship: "IN", situation: "offer", qualification: "vocational", occupation_it: "yes",
  recognition_de: "not_recognised", experience_5y: "lt2", experience_7y: "3to5", occupation_shortage: "no",
  salary_eur_year: "band_3", german: "b1", english: "none", age_band: "a35to40", de_stay6m: "no", partner_ck: "yes",
  funds_eur_month: "band_1",
};

describe("a route short on two figures names both (ruling 9)", () => {
  it("its badge reads \"Short on yearly salary and points\"", () => {
    const written = salaryOnTheOpportunityCard();
    const card = evaluate(written, POINTS_AND_SALARY_SHORT).find((r) => r.route.id === "de-chancenkarte")!;
    expect(card.status, "precondition: the route is short on a figure").toBe("near");
    expect(card.gap_max, "precondition: a salary gap").toBeGreaterThan(0);
    expect(card.gap_points, "precondition: a points gap").toBeGreaterThan(0);
    const verdict = verdictOn(written, POINTS_AND_SALARY_SHORT);
    expect(badgeOf(drawnRouteOn(verdict, "de-chancenkarte"))).toBe("Short on yearly salary and points");
    expect(plainTextOf(verdict.body).toLowerCase()).not.toContain("within reach");
  });
});

describe("a step states the gap it leaves as a bound (ruling 9; ruling 1, leftover 2)", () => {
  /** €45,630–€45,934.20: the shortage Blue Card €304.20 away at most. */
  const verdict = verdictFor({ ...PERSONA_A, salary_eur_year: "band_4" });
  const steps = stepsIn(verdict);

  it("a step's route line: \"would then be short only by up to\" the gap", () => {
    const recognition = steps.find((s) => s.title === "full German recognition");
    expect(recognition, "precondition: the recognition step").toBeDefined();
    expect(plainTextOf(recognition!.html)).toContain("EU Blue Card — general — would then be short only by up to €5,070/year");
  });

  it("a step title on a bounded gap keeps its bound: \"With up to €304.20/year more\"", () => {
    const salary = steps.find((s) => s.title.includes("€304.20/year"));
    expect(salary, "precondition: the salary step").toBeDefined();
    expect(plainTextOf(salary!.html)).toContain("With up to €304.20/year more");
  });
});

describe("Priya's not-yet row gives its gap before its unknown (ruling 10)", () => {
  const verdict = verdictFor(PRIYA);
  const ROUTE = "nl-hsm-30plus";

  it("the highly-skilled-migrant row stays under \"Not yet\" and reads the gap first", () => {
    expect(placed(verdict, ROUTE)?.kind).toBe("not-yet");
    const result = evaluate(ds, PRIYA).find((r) => r.route.id === ROUTE)!;
    const unknown = reasonFor(ds, result, PRIYA).line.replace(/\.$/, "");
    const line = foldedLineOf(drawnRouteOn(verdict, ROUTE));
    expect(line.startsWith("Up to €1,585/month short of the monthly salary this route asks for.")).toBe(true);
    expect(line.indexOf(unknown), "the unknown follows the gap").toBeGreaterThan(0);
  });
});
