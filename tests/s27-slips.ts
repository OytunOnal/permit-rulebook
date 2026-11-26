/**
 * What both halves of s27's suite (`s27.test.ts`, `s27-walk.test.ts`) read:
 * the shipped dataset, the 404's sentence as a key, a route page's masthead
 * as its markup carries it, and the two four-country readers the walks draw.
 */
import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset, Profile } from "permit-rulebook-data";
import { NOT_FOUND_START } from "../src/lib/copy/not-found.js";
import { glossSection } from "../src/lib/gloss.js";
import { esc } from "../src/lib/reason.js";

export const ds = dataset as unknown as Dataset;

/** The masthead's own markup, from its opening tag to its close. */
export const mastheadOf = (html: string): string => {
  const start = html.indexOf('<header class="masthead');
  return start < 0 ? "" : html.slice(start, html.indexOf("</header>", start));
};

/** The 404's sentence as a key: case-folded, without its "Or" and its full
 * stop, so a hidden heading that says the same thing in other clothes counts
 * as the second carrier it is. */
export const SENTENCE = NOT_FOUND_START.toLowerCase().replace(/^or\s+/, "").replace(/[.]$/, "");

/** The H1 a route page gives itself: its name, glossed once, escaped as it ships. */
export const nameOf = (route: { name: string }): string => esc(glossSection(route.name, new Set()));

/** The masthead's H1 and the element after it, as the markup carries them. */
export const headerOf = (html: string): { h1: string; next: string } | null => {
  const m = /<h1>([^<]*)<\/h1>\s*<p class="tagline">([^<]*)<\/p>/.exec(mastheadOf(html));
  return m ? { h1: m[1]!, next: m[2]! } : null;
};

/** The German Opportunity Card open: one result card with the door under its scope line. */
export const OPENED: Profile = {
  destination: "all", situation: "research", situation_country: "fr", citizenship: "TR", qualification: "degree",
  recognition_de: "recognized", nl_recent_grad: "no", top200_grad: "no", german: "a1", funds_eur_month: "band_1",
};

/** The four-country walk s26 takes, to the result where every section is
 * drawn: all four, research, France at question 3, no qualification, a
 * Turkish passport, no Dutch graduation, no top-200 degree. */
export const WALKED_TO_FOUR: Profile = {
  destination: "all", situation: "research", situation_country: "fr", qualification: "none", citizenship: "TR",
  nl_recent_grad: "no", top200_grad: "no",
};
