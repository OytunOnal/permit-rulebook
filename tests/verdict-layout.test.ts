import { describe, expect, it } from "vitest";
import type { Profile } from "permit-rulebook-data";
import { layoutPinOf, verdictFor, type LayoutPin } from "./verdict-cards.js";

/**
 * Today's layout, held as data at the verdict's entry (#314, seam 1 of #310):
 * each section's groups in order and the routes in each, which sections
 * open, each fold's rows and whether it opens, the strip's and each tally's
 * numbers, the lead country, and the headline's kind with the route or step
 * its second sentence names. The cases guard the move of the layout's rules
 * into one file; a change of rule moves an expectation here, by its ruling.
 */

/** The money answer that is not an amount: "Doesn't apply to me, or I don't know". */
const NO_AMOUNT = "unknown";

/** Persona A of the v1.2.2 critique (W1): a Turkish passport, a German offer,
 * a degree not yet assessed, IT, five years in seven, on the shortage list,
 * €45,934.20–€50,700, funds "Doesn't apply". */
const PERSONA_A: Profile = {
  destination: "de", situation: "offer", qualification: "degree", citizenship: "TR", recognition_de: "not_assessed",
  experience_5y: "2plus", experience_7y: "5plus", occupation_shortage: "yes", occupation_it: "yes",
  salary_eur_year: "band_5", german: "a1", english: "c1", age_band: "a30to35", funds_eur_month: NO_AMOUNT,
};

/** Persona C of the v1.2.2 critique (W3): a Colombian passport, all four
 * countries, exploring, a degree whose recognition they do not know. */
const PERSONA_C: Profile = {
  destination: "all", situation: "none", qualification: "degree", citizenship: "CO", recognition_de: "unknown",
  experience_5y: "2plus", experience_7y: "5plus", occupation_shortage: "no", nl_recent_grad: "no", top200_grad: "unknown",
  german: "none", english: "b2", age_band: "a35to40", de_stay6m: "no", partner_ck: "no", funds_eur_month: "band_1",
};

/** Priya: an Indian passport, a Dutch offer at €4,357–€4,754/month, 30–35, no
 * Dutch study, a designated institution she does not know. */
const PRIYA: Profile = {
  destination: "nl", situation: "offer", age_band: "a30to35", citizenship: "IN", qualification: "degree",
  salary_eur_month: "band_4", nl_recent_grad: "no", top200_grad: "unknown",
};

/** The Nigerian reader of the hostile walk, on €41,356.36–€45,630. */
const NIGERIAN: Profile = {
  destination: "de", citizenship: "NG", situation: "offer", situation_country: "de", qualification: "none",
  occupation_it: "yes", experience_5y: "2plus", salary_eur_year: "band_3",
};

/** The Algerian reader with a French offer, on €50,700–€59,373. */
const ALGERIAN: Profile = {
  destination: "fr", citizenship: "DZ", situation: "offer", situation_country: "fr",
  qualification: "degree", fr_degree: "yes", fr_innovative_employer: "no", fr_local_contract: "no",
  experience_5y: "2plus", experience_7y: "5plus", salary_eur_year: "band_6",
};

/** A headline whose second sentence names neither a route nor a step. */
const NO_NAMED = { route: null, step: null };

/** The German not-yet rows every persona A screen draws, each on its own row. */
const GERMAN_NOT_YET = [
  "de-blue-card-general", "de-skilled-academic", "de-skilled-vocational", "de-chancenkarte", "de-researcher", "de-ict-card",
];

/** The arranged line of a transfer and a hosting agreement, one route each. */
const ARRANGED = { kind: "arranged", arranged: [1, 1] };

/** Persona A on €45,934.20–€50,700: two open, two steps, the arranged line, six not yet. */
const PERSONA_A_PIN: LayoutPin = {
  kind: "one-country", headline: { kind: "open", ...NO_NAMED },
  strip: { open: 2, withinReach: 0, unsettled: 0, closed: 0, notYet: 6, openUnknowns: 1 },
  groups: [
    { kind: "open", routes: ["de-blue-card-shortage", "de-experienced-worker"] },
    { kind: "steps", steps: ["full German recognition", "at least €1,091/month — monthly funds"], jobOfferLine: false },
    ARRANGED,
    { kind: "not-yet", count: 6, items: GERMAN_NOT_YET },
  ],
};

/** Persona A on the lowest band: both routes within reach, the headline measuring the first. */
const PERSONA_A_LOWEST_PIN: LayoutPin = {
  kind: "one-country", headline: { kind: "open", route: "de-blue-card-shortage", step: null },
  strip: { open: 0, withinReach: 2, unsettled: 0, closed: 0, notYet: 6, openUnknowns: 1 },
  groups: [
    { kind: "within-reach", routes: ["de-blue-card-shortage", "de-experienced-worker"] },
    {
      kind: "steps", jobOfferLine: false,
      steps: ["full German recognition", "at least €45,630/year — yearly salary", "at least €1,091/month — monthly funds"],
    },
    ARRANGED,
    { kind: "not-yet", count: 6, items: GERMAN_NOT_YET },
  ],
};

/** A section's tally of not-yet rows only, as persona C's are. */
const notYetTally = (notYet: number, openUnknowns: number, steps: number) =>
  ({ open: 0, unsettled: 0, withinReach: 0, notYet, openUnknowns, closed: 0, steps, closedTo: false });

/** A fold of rows gated on a path answer alone, collapsed. */
const gatedFold = (routes: string[]) => ({ fold: "needs-path-answers", open: false, routes });

/** A steps block that holds the job offer line and no step. */
const JOB_OFFER_LINE_ONLY = { kind: "steps", steps: [], jobOfferLine: true };

/** Persona C's German section: five steps, the arranged line, two rows and a fold of six. */
const PERSONA_C_GERMANY = {
  country: "Germany", open: true, tally: notYetTally(8, 1, 5),
  groups: [
    {
      kind: "steps", jobOfferLine: true,
      steps: [
        "full German recognition", "a partial recognition decision", "German at B1 (intermediate) or above",
        "a qualification not yet assessed in Germany", "a qualification Germany assessed and did not recognise",
      ],
    },
    ARRANGED,
    {
      kind: "not-yet", count: 8,
      items: ["de-skilled-vocational", "de-chancenkarte", gatedFold([
        "de-blue-card-shortage", "de-blue-card-general", "de-skilled-academic", "de-experienced-worker",
        "de-researcher", "de-ict-card",
      ])],
    },
  ],
};

/** Persona C on all four countries: Germany and Spain open, France and the Netherlands collapsed. */
const PERSONA_C_PIN: LayoutPin = {
  kind: "countries", headline: { kind: "steps", route: null, step: "full German recognition" }, lead: null,
  strip: { open: 0, withinReach: 0, unsettled: 0, closed: 0, notYet: 23, openUnknowns: 2 },
  sections: [
    PERSONA_C_GERMANY,
    {
      country: "France", open: false, tally: notYetTally(5, 0, 0),
      groups: [JOB_OFFER_LINE_ONLY, {
        kind: "not-yet", count: 5,
        items: [gatedFold(["fr-talent-qualifie", "fr-talent-blue-card", "fr-ict", "fr-talent-innovante", "fr-talent-mission"])],
      }],
    },
    {
      country: "Spain", open: true, tally: notYetTally(4, 0, 0),
      groups: [JOB_OFFER_LINE_ONLY, ARRANGED, {
        kind: "not-yet", count: 4, items: [gatedFold(["es-blue-card", "es-highly-qualified", "es-ict", "es-researcher"])],
      }],
    },
    {
      country: "Netherlands", open: false, tally: notYetTally(6, 1, 0),
      groups: [JOB_OFFER_LINE_ONLY, {
        kind: "not-yet", count: 6,
        items: ["nl-hsm-under30", "nl-orientation-year", gatedFold(["nl-hsm-30plus", "nl-blue-card", "nl-ict", "nl-researcher"])],
      }],
    },
  ],
};

/**
 * A salary step from a band with a floor, titled by its bound: "up to" since
 * ruling 1 on #187, leftover 2 (#316).
 */
const salaryStepUpTo = (title: string) => ({ kind: "steps", steps: [`up to ${title}`], jobOfferLine: false });

/** Priya: the Dutch Blue Card within reach and named by the headline, five not yet. */
const PRIYA_PIN: LayoutPin = {
  kind: "one-country", headline: { kind: "open", route: "nl-blue-card", step: null },
  strip: { open: 0, withinReach: 1, unsettled: 0, closed: 0, notYet: 5, openUnknowns: 2 },
  groups: [
    { kind: "within-reach", routes: ["nl-blue-card"] },
    salaryStepUpTo("€1,585/month more — monthly salary"),
    ARRANGED,
    { kind: "not-yet", count: 5, items: ["nl-hsm-30plus", "nl-hsm-under30", "nl-ict", "nl-orientation-year", "nl-researcher"] },
  ],
};

/** The Nigerian reader: the experienced worker within reach, seven not yet. */
const NIGERIAN_PIN: LayoutPin = {
  kind: "one-country", headline: { kind: "open", route: "de-experienced-worker", step: null },
  strip: { open: 0, withinReach: 1, unsettled: 0, closed: 0, notYet: 7, openUnknowns: 0 },
  groups: [
    { kind: "within-reach", routes: ["de-experienced-worker"] },
    salaryStepUpTo("€4,273.64/year more — yearly salary"),
    ARRANGED,
    { kind: "not-yet", count: 7, items: ["de-blue-card-shortage", ...GERMAN_NOT_YET] },
  ],
};

/** The Algerian reader: one unsettled, one within reach, the transfer closed. */
const ALGERIAN_PIN: LayoutPin = {
  kind: "one-country", headline: { kind: "open", route: "fr-talent-blue-card", step: null },
  strip: { open: 0, withinReach: 1, unsettled: 1, closed: 1, notYet: 2, openUnknowns: 0 },
  groups: [
    { kind: "unsettled", routes: ["fr-talent-qualifie"] },
    { kind: "within-reach", routes: ["fr-talent-blue-card"] },
    salaryStepUpTo("€8,673/year more — yearly salary"),
    { kind: "not-yet", count: 2, items: ["fr-talent-innovante", "fr-talent-mission"] },
    { kind: "closed", routes: ["fr-ict"] },
  ],
};

/** Each guarded reader, the answers they gave, and the layout they are shown. */
const GUARDED: [string, Profile, LayoutPin][] = [
  ["persona A on €45,934.20–€50,700", PERSONA_A, PERSONA_A_PIN],
  ["persona A on the lowest band", { ...PERSONA_A, salary_eur_year: "band_0" }, PERSONA_A_LOWEST_PIN],
  ["persona C on all four countries", PERSONA_C, PERSONA_C_PIN],
  ["Priya in the Netherlands", PRIYA, PRIYA_PIN],
  ["the Nigerian reader on €41,356.36–€45,630", NIGERIAN, NIGERIAN_PIN],
  ["the Algerian reader in France on €50,700–€59,373", ALGERIAN, ALGERIAN_PIN],
];

describe("the verdict's layout, as data, at its entry (#314)", () => {
  for (const [reader, answers, pin] of GUARDED)
    it(`${reader}: the layout is today's`, () => {
      expect(layoutPinOf(verdictFor(answers))).toEqual(pin);
    });
});
