// @level presentation
/**
 * The frame every page draws: the product's name and tagline, the header's
 * and the footer's words, the disclaimer, the one way a date prints, and the
 * one way a sentence opens.
 *
 * Every word a reader reads lives in this folder, one file per screen or
 * part (CODING_STANDARDS.md, Rules).
 */

export const PRODUCT_NAME = "Permit Rulebook";

/** Decision 1. It is set from the token serif wherever it appears. */
export const TAGLINE = "Every route, quoted and dated.";

/**
 * How many routes there are and how many the checker asks about: the social
 * card's count and the home page's. A page with no answers says what the
 * checker asks, never what it checked (GLOSSARY, Scope statement).
 */
export const routesCheckerAsksAbout = (total: number, asked: number): string =>
  `${total} routes · the checker asks about ${asked}`;

/**
 * The one-line promise a link preview of the home page carries.
 *
 * The two counts are read from the dataset rather than typed here: they were
 * typed, and s9 moved one of them the same day it was written (Standards
 * review, 2026-09-10). `scored` is the dataset's count of the routes the
 * checker asks about.
 */
export const promise = (counts: { total: number; scored: number }): string =>
  `An open, dated, source-quoted work-permit ruleset for four countries — ${
    routesCheckerAsksAbout(counts.total, counts.scored)} — every value with its official sentence and the day it was read, checked daily.`;

/** The home page's title, and the title its link preview carries. */
export const HOME_TITLE = `${PRODUCT_NAME} — which work-permit routes fit?`;
export const HOME_PREVIEW_TITLE = `${PRODUCT_NAME} — ${TAGLINE.toLowerCase().replace(/\.$/, "")}`;

/** What a search result says about the interview. */
export const HOME_DESCRIPTION =
  "Which European work-permit routes fit? A check against dated, source-quoted "
  + "official rules. Your answers never leave this device.";

/**
 * The stamp's two labels: the day the rules were read, on every page that
 * shows quotes and on the interview's questions; the day a record was made, on
 * the interview's verdict.
 */
export const RULES_READ = "Rules read";
export const RECORD_GENERATED = "Record generated";

/**
 * The launch's legal wording, one sentence, everywhere. It is the IRCC-style
 * text that has been on the site since s1, and A1's condition — no advice, no
 * verdict on the person — is satisfied by these words and not by a policy
 * document nobody reads.
 */
export const DISCLAIMER =
  `${PRODUCT_NAME} makes no immigration decision and no authority is bound by these results — ` +
  "it compares published values with what you declare, nothing more.";

/** The footer, which has room for the count and no more — a label, so figures. */
export const unreadLabel = (unread: number): string =>
  unread === 0 ? "" : `${unread} source${unread === 1 ? "" : "s"} unread`;

/** The two words the identity is set in, wherever the seal is drawn. */
export const SEAL_LETTERS = "PR";

/**
 * A date, the one way this product prints one.
 *
 * Decision 12: ISO everywhere a date prints. Three formats competed on the
 * route-page mock for the same fact — `04 · 09 · 2026` in the stamp, `read
 * 2026-09-04` on the cards, `dataset 2026.09.07` in the footer — on a page
 * whose whole differentiator is when a thing was read, and the headline one was
 * ambiguous to exactly the reader most likely to be reading it: 4 September or
 * 9 April depends on where you learned to write dates (critique F3).
 *
 * Local time, not UTC: the stamp on a record is the day the person holding it
 * is having.
 */
export function isoDay(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * The dataset's own version, printed as a date where it is one.
 *
 * `dataset_version` is stamped `2026.09.07`, which is a third date format on a
 * page whose differentiator is when a thing was read (critique F3). It is
 * guarded rather than blindly rewritten: `schema_version` is `0.5.0`, the same
 * shape to a careless replace, and it must never print as `0-5-0`. Two screens
 * were formatting it their own way (Standards review, 2026-09-07).
 */
export function datasetDay(version: string): string {
  return /^\d{4}\.\d{2}\.\d{2}$/.test(version) ? version.replace(/\./g, "-") : version;
}

/**
 * Words set to open a sentence or a heading: the first letter a capital. A
 * phrase composed for the middle of a sentence ("one route", a field's own
 * noun) opens one on every screen this one way.
 */
export const capitalise = (words: string): string => words.charAt(0).toUpperCase() + words.slice(1);

/**
 * The words that explain each abbreviation the first time a page uses it,
 * by the abbreviation, in the order `gloss.ts` looks for them (#392; ruling
 * 39 on #382). Every page that glosses its prose says them.
 */
export const ABBREVIATION_WORDS: Readonly<Record<string, string>> = { // read by gloss.ts, which holds the matching
  AufenthG: "the Residence Act",
  BeschV: "the Employment Ordinance",
  TFEU: "the Treaty on the Functioning of the European Union",
  UGE: "Spain's large-companies unit",
  IND: "the Dutch immigration service",
  "CNO-2011": "Spain's occupation classification",
  MVV: "the Dutch entry visa",
  IELTS: "an English-language test",
  Schengen: "the EU's border-free travel area",
  "ISCO-08": "the international occupation codes",
};

/**
 * The feedback door, in the one word that opens it.
 *
 * It is said in four places — the header's row, the footer column's heading,
 * the line under the verdict and the page's own h1 — and all four lead to the
 * same page. One word from one source, because a door a reader learns in the
 * header and then meets under another name in the footer is two doors
 * ("the feedback door sits as F", 2026-09-16).
 */
export const FEEDBACK = "Feedback";

/** The header's word for the four countries, and the phone menu's heading over
 * the same four rows. The word is the country's own name on a page that
 * belongs to a country, which is the header's job and not this file's. */
export const COUNTRIES = "Countries";

/**
 * The phone's menu control, in its two states.
 *
 * It read "Menu" open and closed: `aria-expanded` moved and the word did not,
 * so a sighted reader had a control whose label stopped describing what a tap
 * would do (v1.1 gate critique, P8 — s27). The script swaps the word from
 * attributes the header renders off these two, so no user-facing string is
 * typed into an inline script.
 */
export const MENU = "Menu";
export const MENU_CLOSE = "Close";

/** The header's navigation, by the name a screen reader lists it under. */
export const SITE_NAV_LABEL = "Site"; // the header nav's aria-label

/** The footer's row under the address: what the page behind it is for. The
 * column's heading is already the word, so the row says the rest (critique F6,
 * 2026-09-16). */
export const FEEDBACK_FOOTER_ROW = "How to write, and what happens";

/**
 * The footer's words: its columns' headings and rows, the licence line and
 * the health line. The wording is #85's and #185's; it moved here unchanged
 * (#389), so the footer's template types none of it.
 */
export const CHECK_YOURS = "Check yours"; // the countries column's last row and the header's: where the interview starts
/** A page's own button into the interview: "Check yours", then the places it is scoped to, joined. */
export const checkYoursFor = (...places: string[]): string => `${CHECK_YOURS} — ${places.join(", ")}`;
/** The way into the interview, said as a heading or a button: the 404's and a route page's. */
export const CHECK_YOUR_OWN_SITUATION = "Check your own situation"; // the 404's button and a route page's hidden heading
export const THE_DATA = "The data"; // the data column's heading and the header's link to /data/
export const DATA_FOOTER_ROW = "The data — status, versions, downloads"; // the data column's row to /data/
export const ROUTE_AS_JSON = "This route as JSON"; // the link to the route's own JSON, in the footer and on the route page
export const REPOSITORY_FOOTER_ROW = "The repository"; // the data column's row to the data repository
export const licenceFooterRow = (licenceName: string): string => `Licence · ${licenceName}`;
export const SPONSOR_FOOTER_ROW = "Sponsor this work"; // the feedback column's second row

/** The open dataset's door and its terms, as `/data/` and every route page say them. */
export const DATASET_ON_GITHUB = "The dataset on GitHub"; // the link to the data repository
export const reuseUnder = (licenceName: string): string => `Reuse it under ${licenceName} — credit and link back.`;
export const CODE_LICENCE = "code MIT"; // the licence line: the code's licence, beside the data's
export const dataLicence = (licenceName: string): string => `data ${licenceName}`;
export const copyrightNotice = (year: string, owner: string): string => `© ${year} ${owner}`;

/** The health line's read range; each day is already markup, its `<time>` in bold. */
export const readRangeHtml = (oldestHtml: string, newestHtml: string): string =>
  `values read between ${oldestHtml} and ${newestHtml}`;
export const READ_DAILY = "re-read daily"; // the health line's promise, after the read range
export const LAST_RUN = "last run"; // opens the health line's parenthesis, before the watch's day
export const datasetVersionLabel = (version: string): string => `dataset ${version}`;

/**
 * The social card's own words: the question over the tagline, and its last
 * line's promise, the last two words in bold. Its stamp says `RULES_READ` and
 * its mark `SEAL_LETTERS`, as every page's pair does.
 */
export const CARD_HEADLINE = "Which work-permit routes could fit?"; // the card's h1, before the tagline
export const CARD_PROMISE = "every value with its official sentence"; // the card's last line, before the bold words
export const CHECKED_DAILY = "checked daily"; // the card's last line, in bold
