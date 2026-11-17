// @level domain
/**
 * The results `measure:taps` seeds, each a reader's answers written once:
 * the tap check draws each from its record, and the verdict's tests read the
 * same answers at the verdict's entry.
 */

/** @typedef {import("permit-rulebook-data").Profile} Profile */

/** A German offer, a degree whose recognition the reader does not know: one
 * country. @type {Profile} */
export const GERMAN_OFFER_ON_ONE = {
  destination: "de", citizenship: "IN", situation: "offer", qualification: "degree",
  recognition_de: "unknown", occupation_shortage: "unknown", experience_5y: "lt2", experience_7y: "3to5",
  german: "b1", english: "c1", age_band: "a30to35", de_stay6m: "no", partner_ck: "no",
  funds_eur_month: "band_1", salary_eur_year: "unknown", occupation_it: "no",
};

/** Germany with an offer and a recognised degree on the shortage list, all
 * four countries asked, the offer in Germany: two routes open there.
 * @type {Profile} */
export const GERMAN_OFFER_ON_FOUR = {
  destination: "all", citizenship: "TR", situation: "offer", qualification: "degree",
  recognition_de: "recognized", occupation_shortage: "yes", experience_5y: "lt2", experience_7y: "3to5",
  german: "b1", english: "c1", nl_recent_grad: "no", top200_grad: "no", age_band: "a30to35",
  situation_country: "de", salary_eur_year: "unknown", funds_eur_month: "band_1",
};

/** The v1.2.6 gate critique's reader (#362): all four countries, a job offer
 * in the Netherlands, a Turkish passport, a degree not yet assessed.
 * @type {Profile} */
export const DUTCH_OFFER_ON_FOUR = {
  destination: "all", situation: "offer", situation_country: "nl", age_band: "a30to35", citizenship: "TR",
  qualification: "degree", recognition_de: "not_assessed", experience_5y: "2plus", experience_7y: "5plus",
  occupation_shortage: "yes", salary_eur_month: "band_5", nl_recent_grad: "no", top200_grad: "no",
  german: "a1", funds_eur_month: "unknown",
};

/** A French offer from an innovative employer, no qualification, an
 * Algerian passport: one country, two steps. @type {Profile} */
export const FRENCH_OFFER_TWO_STEPS = {
  destination: "fr", situation: "offer", qualification: "none", fr_innovative_employer: "yes", citizenship: "DZ",
  experience_7y: "lt3", salary_eur_year: "band_0",
};

/** A French offer from an employer the reader does not know is innovative:
 * nothing open, and no step. @type {Profile} */
export const FRENCH_OFFER_NO_STEPS = {
  destination: "fr", situation: "offer", qualification: "none", fr_innovative_employer: "unknown", citizenship: "IN",
  experience_7y: "lt3", salary_eur_year: "unknown",
};
