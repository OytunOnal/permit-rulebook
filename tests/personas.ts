import type { Profile } from "permit-rulebook-data";

/**
 * The readers the verdict's tests walk, each written once: the v1.2.2
 * critique's personas and the hostile walk's readers.
 */

/** The money answer that is not an amount: "Doesn't apply to me, or I don't know". */
export const NO_AMOUNT = "unknown";

/** Persona A of the v1.2.2 critique (W1): a Turkish passport, a German offer,
 * a degree not yet assessed, IT, five years in seven, on the shortage list,
 * €45,934.20–€50,700, funds "Doesn't apply". */
export const PERSONA_A: Profile = {
  destination: "de", situation: "offer", qualification: "degree", citizenship: "TR", recognition_de: "not_assessed",
  experience_5y: "2plus", experience_7y: "5plus", occupation_shortage: "yes", occupation_it: "yes",
  salary_eur_year: "band_5", german: "a1", english: "c1", age_band: "a30to35", funds_eur_month: NO_AMOUNT,
};

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

/** The Algerian reader with a French offer, on €50,700–€59,373. */
export const ALGERIAN: Profile = {
  destination: "fr", citizenship: "DZ", situation: "offer", situation_country: "fr",
  qualification: "degree", fr_degree: "yes", fr_innovative_employer: "no", fr_local_contract: "no",
  experience_5y: "2plus", experience_7y: "5plus", salary_eur_year: "band_6",
};
