import dataset from "permit-rulebook-data/data/dataset.json";
import { feedbackPage } from "../src/lib/feedback-page.js";
import { recordSeedScript, skipReason } from "./browser-walk.js";
import type { Dataset, Profile } from "permit-rulebook-data";

/**
 * What the s13 suites (the feedback door) share: the dataset, the built
 * /feedback/ page, the two answered-through records the results line is read
 * on, and whether the browser walks can run here.
 */

export const ds = dataset as unknown as Dataset;

/** The /feedback/ page as the build makes it. */
export const page = feedbackPage(ds);

/**
 * The two seeds the browser cases walk with, each ANSWERED THROUGH: a
 * record with a question still open is a question screen, and the line under
 * the verdict is the results screen's own.
 *
 * `frRecord` is already where the arrival points, which is the only way a
 * `?country=` arrival reaches a results screen at all — naming a country
 * re-scopes a record for another one, and a re-scoped record has the new
 * country's questions still to answer ("arriving where the record already is
 * changes nothing at all", arrival.test.ts). That is also why the four-country
 * layout is not reached through an arrival: an arrival names ONE country
 * and a screen scoped to one country is the flat layout by definition.
 */
export const frRecord: Profile = {
  destination: "fr", situation: "offer", qualification: "none", experience_5y: "lt2", experience_7y: "lt3",
  fr_innovative_employer: "yes", citizenship: "AF", salary_eur_year: "band_0",
};
/** The four-country seed: a section per country. */
export const allRecord: Profile = {
  destination: "all", situation: "offer", situation_country: "de", qualification: "none",
  occupation_it: "yes", citizenship: "AF", experience_5y: "lt2", experience_7y: "lt3", salary_eur_year: "band_0",
  nl_recent_grad: "yes",
};
/** The script that saves `profile` as the device's record. */
export const seed = (profile: Profile): string => recordSeedScript(profile);

/** The two layouts the walks read: the flat one, with no country
 * sections, and the four-country one, a section per country. */
export const LAYOUTS = [["one country", frRecord, "/?country=fr", 0], ["four countries", allRecord, "/", 4]] as const;

/** Why the browser walks cannot run here, or null when they can. */
export const skipped = skipReason();

/** Says, loudly, that the feedback door's walks did not run, so a skipped
 * suite is not read as a passing one. */
export function warnFeedbackDoorNotWalked(): void {
  if (skipped)
    process.stderr.write([
      "",
      `  !! THE FEEDBACK DOOR WAS NOT WALKED IN A BROWSER: ${skipped}.`,
      "     Run: npm run build && npm test",
      "",
      "",
    ].join(String.fromCharCode(10)));
}
