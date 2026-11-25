/**
 * What both halves of s26's suite (`s26-headline.test.ts`, `s26-walk.test.ts`)
 * read: the shipped dataset, the four-country answers, and the critique's two
 * walks through question 3.
 */
import dataset from "permit-rulebook-data/data/dataset.json";
import { DESTINATION_FIELD, SITUATION_FIELD, type Dataset, type Profile } from "permit-rulebook-data";
import { SITUATION_COUNTRY_FIELD } from "../src/lib/situations.js";

export const ds = dataset as unknown as Dataset;

/** The four-country answers for a situation and the country the reader named at question 3. */
export const fourCountry = (situation: string, country: string): Profile =>
  ({ [DESTINATION_FIELD]: "all", [SITUATION_FIELD]: situation, [SITUATION_COUNTRY_FIELD]: country });

/** The critique's walk to nothing open: all four, research, France at
 * question 3, no qualification, a Turkish passport, no Dutch graduation, no
 * top-200 degree. */
export const WALKED_TO_NOTHING_OPEN: Profile = {
  ...fourCountry("research", "fr"), citizenship: "TR", qualification: "none", nl_recent_grad: "no", top200_grad: "no",
};
/** The same walk with a recognised degree, some German and the funds: Germany's Opportunity Card opens. */
export const WALKED_TO_A_GERMAN_ROUTE: Profile = {
  ...fourCountry("research", "fr"), citizenship: "TR", qualification: "degree", recognition_de: "recognized",
  nl_recent_grad: "no", top200_grad: "no", german: "a1", funds_eur_month: "band_1",
};
