import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  deriveBands, evaluate, reasonFor, shortLabelOf, type Band, type Criterion, type Dataset, type Profile,
} from "permit-rulebook-data";
import {
  POINTS_FIGURE, SHORT_ON_A_FIGURE_HEADING, figureGapSentence, shortOn, shortOnAFigureCount, upToTitle, withStepHtml,
  wouldThenBeShortOnly,
} from "../src/lib/copy/verdict.js";
import { PERSONA_A, PRIYA } from "./personas.js";
import { plainTextOf } from "./reader-pages.js";
import type { RouteStanding, StepPlace, Verdict } from "../src/lib/verdict/verdict.js";
import {
  badgeOf, drawnRouteOn, foldedLineOf, groupHeadingsIn, groupsIn, placed, standingOn, stepsIn, stripTextOf,
  summaryRowOf, verdictFor, verdictOn,
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

/** Persona A's W5 profile: the lowest salary band. */
const PERSONA_A_LOWEST: Profile = { ...PERSONA_A, salary_eur_year: "band_0" };

/** The two routes persona A's lowest band leaves short on salary: the
 * shortage Blue Card and the experienced worker. */
const BOTH_SHORT_ON_SALARY = ["de-blue-card-shortage", "de-experienced-worker"];

/** The yearly salary's field: the money figure persona A is short on. */
const SALARY = "salary_eur_year";

/** One figure a route's standing says it is short on. */
type FigureGap = RouteStanding["figureGaps"][number];

/** The figure a gap is on: a money gap's field, or points. */
const figureOf = (gap: FigureGap): string => (gap.kind === "money" ? gap.shortfall.field : gap.kind);

/** A money field as a badge and a gap name it: its short label, in lower case. */
const figureNamed = (field: string): string => shortLabelOf(ds, field).toLowerCase();
const YEARLY_SALARY = figureNamed("salary_eur_year");  // persona A's figure
const MONTHLY_SALARY = figureNamed("salary_eur_month");  // Priya's figure

/** The general Blue Card's name, as a step's route line opens on it. */
const GENERAL_BLUE_CARD = ds.countries.flatMap((c) => c.routes).find((r) => r.id === "de-blue-card-general")!.name;

describe("the lowest band: the group says what is missing (rulings 8 and 9)", () => {
  const verdict = verdictFor(PERSONA_A_LOWEST);
  /** The same reader on all four countries, the offer in Germany. */
  const everywhere = verdictFor({ ...PERSONA_A_LOWEST, destination: "all", situation_country: "de" });

  it("both routes sit under \"Short on a figure\", each badged \"Short on yearly salary\"", () => {
    for (const route of BOTH_SHORT_ON_SALARY) expect(placed(verdict, route)?.kind, route).toBe("within-reach");
    expect(groupHeadingsIn(verdict)).toContain(SHORT_ON_A_FIGURE_HEADING);
    // The reckoning: each route is short on yearly salary alone, as its
    // standing's figure gaps say (ruling 7 on #322); the badge words them.
    for (const route of BOTH_SHORT_ON_SALARY)
      expect(standingOn(verdict, route).figureGaps.map(figureOf), route).toEqual([SALARY]);
  });

  it("the strip and a country's summary row count \"2 short on a figure\"", () => {
    expect(stripTextOf(verdict)).toContain(shortOnAFigureCount(2));
    expect(plainTextOf(summaryRowOf(everywhere, "Germany"))).toContain(shortOnAFigureCount(2));
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
    expect(badgeOf(drawnRouteOn(verdict, "de-chancenkarte"))).toBe(shortOn([YEARLY_SALARY, POINTS_FIGURE]));
    expect(plainTextOf(verdict.body).toLowerCase()).not.toContain("within reach");
  });

  it("its standing carries both figure gaps in the dataset's order, the salary's a bounded gap (#375)", () => {
    const written = salaryOnTheOpportunityCard();
    const card = evaluate(written, POINTS_AND_SALARY_SHORT).find((r) => r.route.id === "de-chancenkarte")!;
    const salary = written.countries.flatMap((c) => c.routes).find((r) => r.id === "de-chancenkarte")!.criteria.at(-1)!;
    expect(salary.op, "precondition: the salary the written dataset adds").toBe("gte");
    const line = salary.op === "gte" ? salary.threshold.amount : NaN;
    const band = deriveBands(written, SALARY).find((b) => b.id === POINTS_AND_SALARY_SHORT[SALARY])!;
    expect(band.min, "precondition: a band with a lower edge").toBeDefined();
    // The route's points come before the salary the written dataset appends;
    // the card's lead line says them in that order, the badge amounts first.
    expect(standingOn(verdictOn(written, POINTS_AND_SALARY_SHORT), "de-chancenkarte").figureGaps).toEqual([
      { kind: "points", points: card.gap_points },
      { kind: "money", shortfall: { kind: "bounded", field: SALARY, gap: expect.closeTo(line - band.min!, 2) } },
    ]);
  });
});

describe("a step states the gap it leaves as a bound (ruling 9; ruling 1, leftover 2)", () => {
  /** €45,630–€45,934.20: the shortage Blue Card €304.20 away at most. */
  const verdict = verdictFor({ ...PERSONA_A, salary_eur_year: "band_4" });
  const steps = stepsIn(verdict);

  it("a step's route line: \"would then be short only by up to\" the gap", () => {
    const recognition = steps.find((s) => s.title === "full German recognition");
    expect(recognition, "precondition: the recognition step").toBeDefined();
    const leftShort = wouldThenBeShortOnly([
      { kind: "money", shortfall: { kind: "bounded", gap: "€5,070/year" }, field: YEARLY_SALARY },
    ]);
    expect(plainTextOf(recognition!.html)).toContain(`${GENERAL_BLUE_CARD} — ${leftShort}`);
  });

  it("a step title on a bounded gap keeps its bound: \"With up to €304.20/year more\"", () => {
    const salary = steps.find((s) => s.title.includes("€304.20/year"));
    expect(salary, "precondition: the salary step").toBeDefined();
    expect(plainTextOf(salary!.html)).toContain(plainTextOf(withStepHtml(upToTitle("€304.20/year more"))));
  });

  it("from a band open at the bottom, the route line names the line it asks (ruling 27)", () => {
    const recognition = stepsIn(verdictFor(PERSONA_A_LOWEST)).find((s) => s.title === "full German recognition");
    expect(recognition, "precondition: the recognition step").toBeDefined();
    const leftShort = wouldThenBeShortOnly([
      { kind: "money", shortfall: { kind: "open-below", line: "€50,700/year", band: "" }, field: YEARLY_SALARY },
    ]);
    expect(plainTextOf(recognition!.html)).toContain(`${GENERAL_BLUE_CARD} — ${leftShort}`);
  });
});

/** The one step a verdict places on a question, by the question's field;
 * none, or more than one, fails the case. */
function stepPlaceOn(verdict: Verdict, field: string): StepPlace {
  const places = groupsIn(verdict).flatMap((g) => (g.kind === "steps" ? g.steps : []))
    .filter((place) => place.step.startsWith(`${field}=`));
  if (places.length !== 1) throw new Error(`${places.length} steps on ${field} on this verdict`);
  return places[0]!;
}

/** A yearly salary band of the shipped dataset, by its id. */
function salaryBand(id: string): Band {
  const band = deriveBands(ds, SALARY).find((b) => b.id === id);
  if (!band) throw new Error(`no salary band ${id}`);
  return band;
}

/** The question a recognition step answers. */
const RECOGNITION = "recognition_de";

describe("a step's place says whether its title is a bounded gap, and how each route it opens would stand (#378)", () => {
  /** €45,630–€45,934.20: a band with a floor. */
  const fromAFloor = verdictFor({ ...PERSONA_A, salary_eur_year: "band_4" });

  it("a salary step from a band with a floor to a band with a floor has a bounded-gap title", () => {
    expect(salaryBand("band_4").min, "precondition: the reader's band has a floor").toBeDefined();
    const place = stepPlaceOn(fromAFloor, SALARY);
    expect(salaryBand(place.step.split("=")[1]!).min, "precondition: the band the step asks has a floor").toBeDefined();
    expect(place.titleIsBoundedGap).toBe(true);
  });

  it("a salary step from a band open at the bottom has not", () => {
    expect(salaryBand(PERSONA_A_LOWEST[SALARY]!).min, "precondition: the band is open at the bottom").toBeUndefined();
    expect(stepPlaceOn(verdictFor(PERSONA_A_LOWEST), SALARY).titleIsBoundedGap).toBe(false);
  });

  it("each route a step opens says met, or its figure gaps with the step taken", () => {
    const place = stepPlaceOn(fromAFloor, RECOGNITION);
    expect(place.withStepTaken).toEqual({
      "de-blue-card-general": {
        kind: "short", figureGaps: [{ kind: "money", shortfall: { kind: "bounded", field: SALARY, gap: expect.closeTo(5070, 2) } }],
      },
      "de-skilled-academic": { kind: "met" },
    });
    expect(Object.keys(place.withStepTaken), "each route the step opens, in its order").toEqual(place.routes);
  });

  it("from a band open at the bottom, a route the step leaves short carries the line it asks", () => {
    const place = stepPlaceOn(verdictFor(PERSONA_A_LOWEST), RECOGNITION);
    expect(place.withStepTaken).toMatchObject({
      "de-blue-card-general": {
        kind: "short",
        figureGaps: [{ kind: "money", shortfall: { kind: "open-below", field: SALARY, line: 50700, band: salaryBand("band_0") } }],
      },
    });
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
    const gap = figureGapSentence({ kind: "money", shortfall: { kind: "bounded", gap: "€1,585/month" }, field: MONTHLY_SALARY });
    expect(line.startsWith(gap)).toBe(true);
    expect(line.indexOf(unknown), "the unknown follows the gap").toBeGreaterThan(0);
  });
});
