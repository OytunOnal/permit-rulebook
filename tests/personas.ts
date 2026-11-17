import dataset from "permit-rulebook-data/data/dataset.json";
import { deriveBands, type Dataset, type Profile } from "permit-rulebook-data";

/**
 * The readers the verdict's tests walk, each written once: the v1.2.2
 * critique's personas and the hostile walk's readers.
 */

/** The money answer that is not an amount: "Doesn't apply to me, or I don't know". */
export const NO_AMOUNT = "unknown";

/** The id of the shipped dataset's band of `field` that holds `amount`. */
export function bandFor(field: string, amount: number): string {
  return deriveBands(dataset as unknown as Dataset, field).find(
    (b) => (b.min === undefined || amount >= b.min) && (b.max === undefined || amount < b.max),
  )!.id;
}

/** Persona A of the v1.2.2 critique (W1): a Turkish passport, a German offer,
 * a degree not yet assessed, IT, five years in seven, on the shortage list,
 * €45,934.20–€50,700, funds "Doesn't apply". */
export const PERSONA_A: Profile = {
  destination: "de", situation: "offer", qualification: "degree", citizenship: "TR", recognition_de: "not_assessed",
  experience_5y: "2plus", experience_7y: "5plus", occupation_shortage: "yes", occupation_it: "yes",
  salary_eur_year: "band_5", german: "a1", english: "c1", age_band: "a30to35", funds_eur_month: NO_AMOUNT,
};

/** Persona A with a recognised degree: the shortage Blue Card is met through
 * the recognised-degree path, and quotes the IT path's sentences dimmed. */
export const RECOGNISED_A: Profile = { ...PERSONA_A, recognition_de: "recognized" };

/** Persona C of the v1.2.2 critique (W3): a Colombian passport, all four
 * countries, exploring, a degree whose recognition they do not know. */
export const PERSONA_C: Profile = {
  destination: "all", situation: "none", qualification: "degree", citizenship: "CO", recognition_de: "unknown",
  experience_5y: "2plus", experience_7y: "5plus", occupation_shortage: "no", nl_recent_grad: "no", top200_grad: "unknown",
  german: "none", english: "b2", age_band: "a35to40", de_stay6m: "no", partner_ck: "no", funds_eur_month: "band_1",
};

/** Priya: an Indian passport, a Dutch offer at €4,357–€4,754/month, 30–35, no
 * Dutch study, a designated institution she does not know. */
export const PRIYA: Profile = {
  destination: "nl", situation: "offer", age_band: "a30to35", citizenship: "IN", qualification: "degree",
  salary_eur_month: "band_4", nl_recent_grad: "no", top200_grad: "unknown",
};

/** Priya exploring all four countries (persona P2, s23): an Indian passport, no
 * offer, a degree whose recognition she does not know, one point short of the
 * Opportunity Card. Nothing is open, and there are steps that would change that. */
export const PRIYA_EXPLORING_ALL: Profile = {
  destination: "all", citizenship: "IN", situation: "none", qualification: "degree", recognition_de: "unknown",
  occupation_shortage: "unknown", experience_5y: "2plus", experience_7y: "3to5", german: "none", english: "c1", nl_recent_grad: "no",
  top200_grad: "unknown", funds_eur_month: "band_1", age_band: "u30", de_stay6m: "no", partner_ck: "no",
};

/** Deniz: Turkish engineer with a Berlin offer (persona P1, s23). An offer-holder. */
export const DENIZ: Profile = {
  destination: "de", citizenship: "TR", situation: "offer", situation_country: "de", qualification: "degree",
  recognition_de: "unknown", occupation_shortage: "yes", occupation_it: "yes", experience_5y: "lt2", experience_7y: "3to5", german: "a1",
  english: "c1", funds_eur_month: "band_1", salary_eur_year: "band_5", age_band: "a30to35",
};

/** The Dutch graduate under 30 with a Turkish passport and a Dutch offer at
 * €3,500/month, not from a top-200 university: their under-30 card settles one
 * of its two amounts, the graduate's. */
export const DUTCH_GRADUATE: Profile = {
  destination: "nl", citizenship: "TR", situation: "offer", qualification: "degree",
  age_band: "u30", nl_recent_grad: "yes", top200_grad: "no", occupation_it: "no",
  salary_eur_month: bandFor("salary_eur_month", 3500),
};

/** The Algerian reader with a French offer, on €50,700–€59,373. */
export const ALGERIAN: Profile = {
  destination: "fr", citizenship: "DZ", situation: "offer", situation_country: "fr",
  qualification: "degree", fr_degree: "yes", fr_innovative_employer: "no", fr_local_contract: "no",
  experience_5y: "2plus", experience_7y: "5plus", salary_eur_year: "band_6",
};
