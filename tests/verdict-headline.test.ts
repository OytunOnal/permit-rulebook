import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import { fieldOptions, type Criterion, type Dataset, type Profile, type Route } from "permit-rulebook-data";
import { groupsIn, layoutPinOf, verdictFor, verdictOn } from "./verdict-cards.js";

const ds = dataset as unknown as Dataset;

/**
 * What the headline speaks of, read from the layout at the verdict's entry:
 * the nearest route short on a figure, by the share of its own amount still
 * missing (ruling 11 on #187), and, with nothing open, the routes whose rules
 * are met leading it (ruling 12). And no step offers an answer that is no
 * action (ruling 13).
 */

/** The hostile walk's qualified Nigerian reader: a recognised degree, a
 * shortage occupation, a German offer, on €41,356.36–€45,630. */
const QUALIFIED_NIGERIAN: Profile = {
  destination: "de", citizenship: "NG", situation: "offer", situation_country: "de", qualification: "degree",
  recognition_de: "recognized", occupation_shortage: "yes", occupation_it: "no", experience_5y: "2plus", salary_eur_year: "band_3",
};

/** The Algerian reader with a French offer, on €50,700–€59,373. */
const ALGERIAN: Profile = {
  destination: "fr", citizenship: "DZ", situation: "offer", situation_country: "fr",
  qualification: "degree", fr_degree: "yes", fr_innovative_employer: "no", fr_local_contract: "no",
  experience_5y: "2plus", experience_7y: "5plus", salary_eur_year: "band_6",
};

/** Priya with a Dutch offer at €4,357–€4,754/month, looking at all four
 * countries, with a recognised degree and a yearly salary declared too. */
const PRIYA_EVERYWHERE: Profile = {
  destination: "all", situation: "offer", situation_country: "nl", age_band: "a30to35", citizenship: "IN",
  qualification: "degree", salary_eur_month: "band_4", nl_recent_grad: "no", top200_grad: "unknown",
  recognition_de: "recognized",
};

/** The route a headline's second sentence names, from the layout. */
const headlineRouteOf = (answers: Profile, data: Dataset = ds): string | null =>
  layoutPinOf(verdictOn(data, answers)).headline.route;

/** A copy of the shipped dataset with each named route's criteria rewritten. */
function rewritten(rewrites: Record<string, (criteria: Criterion[]) => Criterion[]>): Dataset {
  const routeOf = (route: Route): Route =>
    (rewrites[route.id] ? { ...route, criteria: rewrites[route.id]!(route.criteria) } : route);
  return { ...ds, countries: ds.countries.map((c) => ({ ...c, routes: c.routes.map(routeOf) })) };
}

/** A route's yearly salary threshold moved to another amount. */
const yearlySalaryAt = (amount: number) => (criteria: Criterion[]): Criterion[] =>
  criteria.map((c) => (c.op === "gte" && c.field === "salary_eur_year" ? { ...c, threshold: { ...c.threshold, amount } } : c));

/** A German route that takes an offer in any country: its rule on where the
 * offer is left out. */
const offerAnywhere = (criteria: Criterion[]): Criterion[] =>
  criteria.filter((c) => !(c.op === "any" && c.paths.some((p) => p.criteria.some((x) => "field" in x && x.field === "situation_country"))));

describe("the headline names the nearest route short on a figure", () => {
  it("the qualified Nigerian reader on €41,356.36–€45,630: the experienced-worker route, nearer by share than the first", () => {
    expect(headlineRouteOf(QUALIFIED_NIGERIAN)).toBe("de-experienced-worker");
  });

  it("Priya with a German route on screen too: a monthly gap beside a yearly one, nearest by share", () => {
    // The German Blue Card asks €50,700/year. On €33,085.09–€39,582 it is
    // €17,614.91 short, 35% of its amount; the Dutch Blue Card is €1,585/month
    // short of €5,942, 27%. On €41,356.36–€45,630 the German one is €9,343.64
    // short, 18%: nearer by share though further in euros.
    const data = rewritten({ "de-blue-card-general": offerAnywhere });
    expect(headlineRouteOf({ ...PRIYA_EVERYWHERE, salary_eur_year: "band_1" }, data)).toBe("nl-blue-card");
    expect(headlineRouteOf({ ...PRIYA_EVERYWHERE, salary_eur_year: "band_3" }, data)).toBe("de-blue-card-general");
  });

  it("a tie on the share goes to the dataset's order", () => {
    // The shortage Blue Card, first, moved far away; the general Blue Card and
    // the experienced-worker route both asking €50,700, so equally short.
    const data = rewritten({ "de-blue-card-shortage": yearlySalaryAt(60_000), "de-experienced-worker": yearlySalaryAt(50_700) });
    expect(headlineRouteOf(QUALIFIED_NIGERIAN, data)).toBe("de-blue-card-general");
  });
});

describe("with nothing open, a route whose rules are met leads the headline", () => {
  it("the Algerian reader in France on €50,700–€59,373: the unsettled route first, the nearest gap second", () => {
    const verdict = verdictFor(ALGERIAN);
    expect(layoutPinOf(verdict).headline).toEqual({ kind: "unsettled", route: "fr-talent-blue-card", step: null });
    expect(verdict.action.masthead.announced).toBe(
      "1 route meets the rules — whether your passport can use it is unsettled. One is short by up to €8,673/year.",
    );
  });
});

/** A refusal is an outcome, not something a reader can go and do. */
const REFUSAL = "recognition_de=not_recognised";

/** German offer-holders across their qualification, recognition, occupation
 * and experience answers, on €41,356.36–€45,630. */
function germanOfferHolders(): Profile[] {
  let profiles: Profile[] = [{}];
  for (const field of ["qualification", "recognition_de", "occupation_shortage", "occupation_it", "experience_5y", "experience_7y"]) {
    const values = fieldOptions(ds, field).map((o) => o.value);
    profiles = profiles.flatMap((p) => values.map((v) => ({ ...p, [field]: v })));
  }
  const offerHolder = { destination: "de", citizenship: "NG", situation: "offer", situation_country: "de", salary_eur_year: "band_3" };
  return profiles.map((p) => ({ ...offerHolder, ...p }));
}

/** The answers that are no action, each as a step's key writes it: the
 * refusal, and every "I don't know". */
const noActionAnswers = (): string[] => [
  REFUSAL,
  ...ds.fields.flatMap((f) => fieldOptions(ds, f.id).filter((o) => o.is_unknown).map((o) => `${f.id}=${o.value}`)),
];

describe("no step offers an answer that is no action", () => {
  it("across 540 German offer-holder profiles", () => {
    const [field, value] = REFUSAL.split("=");
    expect(fieldOptions(ds, field!).map((o) => o.value), "the dataset no longer has the refusal").toContain(value);
    const profiles = germanOfferHolders();
    expect(profiles.length).toBe(540);
    const noAction = noActionAnswers();
    let stepsRead = 0;
    for (const answers of profiles)
      for (const group of groupsIn(verdictFor(answers))) {
        if (group.kind !== "steps") continue;
        for (const place of group.steps) {
          stepsRead++;
          const offered = place.step.split("+");
          expect(offered.filter((answer) => noAction.includes(answer)), JSON.stringify(answers)).toEqual([]);
        }
      }
    expect(stepsRead, "the profiles were offered no step at all").toBeGreaterThan(0);
  });
});
