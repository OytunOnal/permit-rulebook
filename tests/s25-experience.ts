/**
 * What both halves of s25's suite (`s25-dataset.test.ts`, `s25-walk.test.ts`)
 * read: the shipped dataset, the two experience field ids, the critique's
 * reader and a plain-text reading of drawn HTML.
 */
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { type Dataset, type Profile } from "permit-rulebook-data";

export const ds = rawDataset as unknown as Dataset;
/** The text of this HTML, tags and non-breaking spaces read as single spaces. */
export const textOf = (html: string): string =>
  html.replace(/<[^>]*>/g, " ").split(/\s+/).join(" ").split(String.fromCharCode(160)).join(" ").trim();

// The five-year experience field's id, named once since nearly every case reads it.
export const FIVE = "experience_5y";
// The seven-year experience field's id, named once since nearly every case reads it.
export const SEVEN = "experience_7y";

/**
 * The critique's reader, made concrete: a Turkish vocational worker with a
 * German offer whose qualification is not yet recognised — so the Opportunity
 * Card counts its points (a fully recognised qualification takes the direct
 * path and counts nothing, s23) and the experience rows show in the tally.
 * The experienced-worker route never reads recognition.
 */
export const JOB_OFFER: Profile = {
  destination: "de", situation: "offer", situation_country: "de", citizenship: "TR", qualification: "vocational",
  recognition_de: "not_assessed", occupation_shortage: "yes", occupation_it: "no", salary_eur_year: "band_4",
  german: "a1", english: "none", funds_eur_month: "band_1", age_band: "a30to35", de_stay6m: "no", partner_ck: "no",
};
/** The critique's reader with these two experience answers. */
export const withExperience = (five: string, seven: string): Profile => ({ ...JOB_OFFER, [FIVE]: five, [SEVEN]: seven });
