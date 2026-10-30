// @level presentation
/**
 * The verdict's words (`lib/verdict/`): the masthead of a comparison or a
 * notice, the summary line, the section headings, the cards, the steps and
 * the lines beside them. The numbers, names and amounts are the verdict's;
 * these are the words around them.
 *
 * Every word a reader reads lives in this folder, one file per screen or
 * part (CODING_STANDARDS.md, Rules).
 */
import { joinAnd } from "permit-rulebook-data";
import { capitalise } from "./frame.js";
import { IS_QUOTED_NOT_CHECKED } from "./interview.js";

/**
 * A result card's door to the route's own page.
 *
 * It was the third item of the scope line — "quoted and dated · scored … ·
 * The rules of this route" — set in the external-link red without its arrow,
 * so it read as a label, and the separator dangled at a line's end when the
 * link wrapped (the human's walk, 2026-09-17 — s27). A door is a line of its
 * own, in the imperative, underlined, in the colour internal links in prose
 * already wear.
 */
export const ROUTE_DOOR = "Read the rules of this route";

/**
 * The line at the end of a results body: the question, and the one word that
 * answers it, which is the link.
 *
 * It is an offer and not an accusation, and it appears on a results screen
 * only: never on a question, never before an answer. It sat under the verdict
 * strip for a day and said more ("— a wrong value, something missing, or
 * anything else"); the human's walk moved it to the end of the body and cut
 * it to the question and the word (2026-09-16). The sentence is composed here
 * so its full stop is the copy's and not the template's: the word arrives
 * already wrapped as a link, and the line closes it.
 */
export const RESULT_FEEDBACK_ASK = "Something to say about this result?";
export const resultFeedbackLine = (word: string): string => `${RESULT_FEEDBACK_ASK} ${word}.`;

/**
 * The written state a zero-open result through a marked answer reads, in
 * place of "Nothing open" (s19).
 *
 * The headline names the country and the situation in the option's own short
 * words ("a research hosting agreement"); the subline names the quoted route
 * — the situation phrase before it says what it is for, since the dataset
 * carries no other description of a route than its name — with the door on
 * the last three words, and then what the checked routes below do take,
 * derived from the situations they ask and joined the way the hold list
 * joins them. Without a quoted route the subline is the second sentence
 * alone.
 *
 * The rest sentence has two forms. "The routes below" is true on the France
 * page, where every route below is French; on the four-country result the
 * same words would claim the other three countries' routes need what
 * France's do, so there the sentence names the country (s26). Same steps,
 * same words after the subject.
 */
const unscoredClaim = (country: string, situation: string): string =>
  `No route we check in ${country} takes ${situation}`;
export const unscoredHeadline = (country: string, situation: string): string => `${unscoredClaim(country, situation)}.`;
export const READ_ITS_RULES = "read its rules";
/** `countryOpening` is the country's possessive where it opens a sentence,
 * the data package's ("The Netherlands'"). */
export const unscoredRouteLine = (countryOpening: string, situation: string, routeName: string): string =>
  `${countryOpening} route for ${situation} — ${routeName} — is quoted here but not checked: ${READ_ITS_RULES}.`;
const routesBelowNeed = (steps: string): string => `routes below need ${steps}.`;
export const unscoredRestLine = (steps: string): string => `The ${routesBelowNeed(steps)}`;
export const unscoredNamedRestLine = (countryOpening: string, steps: string): string =>
  `${countryOpening} ${routesBelowNeed(steps)}`;

/**
 * The same state on the four-country result, in the country's own summary
 * line (s21).
 *
 * The line that used to count France's routes as "5 not yet" says instead
 * what the s19 headline says, and then names the quoted route in the words
 * the question-3 mark uses of it. The route's name is the link on the screen;
 * the line without a route is the headline alone (v1.1 gate critique, N1).
 * It was the only place the four-country result said it until s26 gave the
 * named country the headline; it stays as the section's own tally, for the
 * reader who skips the masthead, and for the result where something is open
 * elsewhere and the headline is that.
 */
export const unscoredTallyLine = (country: string, situation: string, routeName?: string): string =>
  routeName
    ? `${unscoredClaim(country, situation)} — ${routeName} ${IS_QUOTED_NOT_CHECKED}.`
    : unscoredHeadline(country, situation);

/**
 * The two headings a card's preconditions sit under (s19, F8).
 *
 * The first is the card's honesty device: what the authority requires that
 * the interview never asked. The Spanish researcher card spent it on "A
 * hosting agreement" to a reader who had just declared one — the sentence
 * that condition stands on is the sentence the situation criterion stands on,
 * and the interview had asked it. Such a condition goes under the second
 * heading instead, with the s5 words for an answered rule: what the reader
 * declared, quoted back as the button said it.
 */
export const NOT_CHECKED_HEADING = "Also required — not checked here:";
export const askedHeading = (declared: string): string =>
  `Asked in the interview — you declared “${declared}”:`;

/**
 * The sentence under the unlock steps for a reader who has no offer yet and
 * an open job-search permit above (s23, F1a).
 *
 * It was typed into the results template and rendered to anyone with an open
 * job-search route and a step to take — including a reader who had just
 * declared "I have (or am about to get) a job offer there" (v1.1 gate
 * critique, F1). Who sees it is decided inside the verdict module, in its
 * steps, from the situation answer the dataset marks as the fallback; these
 * are only the words.
 */
export const SEEK_HINT =
  "Your job-search permit above is exactly for this — lawful time in the country to land that offer.";

/**
 * A ladder's lowest rung that changes a verdict, said as the step it is (s23,
 * F4). The unlock list offered "German at A2", "German at B1" and "German at
 * B2 or higher" as three steps to the same card; a rung and every rung above
 * it are one step, and the two words say so. The title before them is the
 * engine's own for the rung.
 */
export const orAbove = (title: string): string => `${title} or above`;

/**
 * The verdict's words (`lib/verdict/`): the badges, the card's lines, the
 * headlines, the summary line, the section headings, the not-yet folds and
 * the steps. The numbers, names and amounts are the verdict's; these are the
 * words around them.
 */
export const STATUS_LABEL = { met: "Criteria met", near: "Within reach", hold: "Not yet" } as const;
/** The badge under "unsettled for your passport": the rules are met, and
 * whether the route is the reader's at all is the notice's question (s8). */
export const RULES_MET = "Rules met";
export const CAME_FROM_LINE = "The route you came from.";
export const shortByUpTo = (amount: string): string => `Short by up to ${amount}`;
export const onField = (field: string): string => `on ${field}`;
/** The line a band open at the bottom is said by where a step brings its
 * route within reach. */
export const asksOrMore = (threshold: string): string => `asks ${threshold} or more`;
/**
 * A route's money shortfall with its amounts printed, as every place says it:
 * a bounded gap, "up to" an amount; or, on a band open at the bottom, the line
 * the route asks and the reader's band, never an amount short — the band has
 * no lower edge to measure from.
 */
export type PrintedShortfall =
  | { kind: "bounded"; gap: string }
  | { kind: "open-below"; line: string; band: string };
/** The headline's emphasis on a bounded gap: "up to", as the card says it. */
export const shortByUpToLine = (amount: string): string => `One is short by up to ${amount}.`;
/** The headline's emphasis on a band open at the bottom: the line, not an amount. */
export const needsOrMoreLine = (threshold: string): string => `One needs ${threshold} or more.`;
/** The card's note on a route within reach on money: its stressed opening, and
 * the rest, which names the field. */
export const shortfallNote = (shortfall: PrintedShortfall, field: string): { lead: string; rest: string } =>
  shortfall.kind === "bounded"
    ? { lead: shortByUpTo(shortfall.gap), rest: `${onField(field)}.` }
    : { lead: capitalise(asksOrMore(shortfall.line)), rest: `${onField(field)} — your answer is ${shortfall.band}.` };
/** How near a step would bring such a route, as its parenthesis says it. */
export const shortfallReach = (shortfall: PrintedShortfall): string =>
  (shortfall.kind === "bounded" ? shortfall.gap : asksOrMore(shortfall.line));
/** The headline's emphasis on the nearest such route. */
export const shortfallHeadline = (shortfall: PrintedShortfall): string =>
  (shortfall.kind === "bounded" ? shortByUpToLine(shortfall.gap) : needsOrMoreLine(shortfall.line));
/** Where the reader's band stands against one amount, on the rail's row. */
export const upToShort = (amount: string): string => `up to ${amount} short`;
export const ABOVE_THE_AMOUNT = "above the amount";
export const BELOW_THE_AMOUNT = "below the amount";
export const LOWER_THRESHOLD_HINT = "A route with a lower threshold may already apply — check the other cards.";
export const shortByPoints = (points: number): string => `Short by ${points} point${points === 1 ? "" : "s"}.`;
export const POINTS_TABLE_HINT =
  "The sourced points table shows where more can come from — language level, experience and age all score.";
/** A step's heading; `titleHtml` is the step's title, already markup. */
export const withStepHtml = (titleHtml: string): string => `With <b>${titleHtml}</b>`;
export const WOULD_BE_MET = "would be met";
export const WOULD_COME_WITHIN_REACH = "would come within reach";
export const pointsMore = (points: number): string => `${points} pt${points === 1 ? "" : "s"} more`;

/** The rail's rows: what each amount is, what the reader's own row is, and
 * the list's name for a screen reader. */
export const WHAT_THIS_ROUTE_ASKS = "what this route asks";
export const YOUR_ANSWER = "your answer";
export const RAIL_ROWS_LABEL = "What this route asks, and what you answered";

/** The headings over what a card says beside the verdict that is not a
 * requirement: what the authority sets aside for this passport, a caveat we
 * found no official wording for, and our own reading. */
export const NOT_REQUIRED_FOR_YOUR_PASSPORT = "Not required for your passport:";
export const NO_OFFICIAL_WORDING_HEADING = "Worth knowing — we have not found the official wording:";
export const OUR_READING_HEADING = "Our reading, not the authority's words:";

/** A card's source list: the period an amount is stated per, which of two
 * thresholds applies to the reader, and what a route with no number says in
 * place of one. */
export const perPeriod = (period: string): string => `per ${period}`;
export const APPLIES_TO_YOU = "applies to you";
export const DOES_NOT_APPLY_TO_YOU = "does not apply to you";
export const NO_THRESHOLD_ON_ROUTE = "No salary or points threshold on this route — nothing here to fall short of. "
  + "What it asks for is in the conditions above, each with the official wording behind it.";

/** A points route's tally, before the items that scored. */
export const pointsOfNeeded = (scored: number, required: number): string =>
  `${scored} point${scored === 1 ? "" : "s"} — ${required} needed`;

/** The lead of the box that links where an open unknown can be looked up. */
export const FIND_OUT_YOURSELF = "You can find out yourself:";

/** The notice screen's headline: the notice's own title, closed. */
export const noticeHeadline = (title: string): string => `${title}.`;
export const unsettledHeadline = (n: number): string =>
  `${n} route${n === 1 ? "" : "s"} meet${n === 1 ? "s" : ""} the rules — whether your passport `
  + `can use ${n === 1 ? "it" : "them"} is unsettled.`;
export const stepsWouldChangeHeadline = (steps: number): string =>
  `Nothing open yet — ${steps} step${steps === 1 ? "" : "s"} would change that.`;
export const NOTHING_OPEN_HEADLINE = "Nothing open on these answers.";
export const routesOpenHeadline = (open: number, countries: number): string =>
  `${open} route${open === 1 ? "" : "s"} look${open === 1 ? "s" : ""} open${countries > 1 ? ` across ${countries} countries` : ""}.`;
export const pointsAwayLine = (points: number): string => `One is ${points} point${points === 1 ? "" : "s"} away.`;

/**
 * A verdict's subline. What the results compared, counted in routes — the
 * thing the reader came for — and in the reader's verb, "checked" (#151), in
 * the passive as the intro is: the count is the subject, so the verb agrees
 * with it. Then the next step it names, or the nothing-open screen's way
 * forward, which points at country sections only where there are some (F7).
 */
export const answersCheckedLine = (answered: number, routes: number): string =>
  `Your ${answered} answer${answered === 1 ? "" : "s"} ${answered === 1 ? "was" : "were"} checked against the `
  + `published rules of ${routes} route${routes === 1 ? "" : "s"}.`;
export const EVERY_VALUE_BELOW_QUOTED = "Every value below shows its official quote and the date we read it from the source.";
export const nearestLine = (step: string): string => `Nearest: ${step}.`;
export const EXPLORE_ONE_COUNTRY = "Change an answer to explore — every route below says what it asks for, and quotes it.";
export const EXPLORE_SEVERAL_COUNTRIES = "Change an answer to explore — or see each country's reasons below.";
/** The notice screen's subline. */
export const NOTHING_TO_COMPARE = "Nothing to compare: the published rule below answers your situation directly.";

/** The summary line under the notices, and a country's summary row. */
export const SUMMARY_LABEL = "Summary";
export const openCount = (n: number): string => `${n} open`;
export const withinReachCount = (n: number): string => `${n} within reach`;
export const unsettledCount = (n: number): string => `${n} unsettled for your passport`;
export const notOpenToPassportCount = (n: number): string => `${n} not open to your passport`;
export const notYetCount = (n: number): string => `${n} not yet`;
export const notYetWithUnknowns = (n: number, unknowns: number): string =>
  `${notYetCount(n)} — ${unknowns} ${unknowns === 1 ? "has" : "have"} an open unknown`;
export const unlockingSteps = (n: number): string => `${n} unlocking step${n === 1 ? "" : "s"}`;

/** The section headings, and the unsettled section's line, which names no
 * country and no passport: the notice above it does. */
export const OPEN_HEADING = "Open — criteria met";
export const UNSETTLED_HEADING = "Open on the rules — unsettled for your passport";
export const UNSETTLED_SECTION_LINE = "The rules below are met by what you declared. Whether this permit "
  + "is open to your passport at all is the question in the note above.";
export const WITHIN_REACH_HEADING = "Within reach";
export const NOT_YET_HEADING = "Not yet";
export const CLOSED_HEADING = "Not open to your passport";
export const STEPS_HEADING = "Steps that would unlock more";
export const STEPS_HEADING_TAIL = "each re-checked against the rules";
export const STEPS_HERE_HEADING = "Steps that would unlock more here";

/** The job offer line: what a job offer would have checked in one country for an
 * explorer — a check, never a verdict, so never "met" or "within reach". The
 * offer, the country and the fields' subjects are the dataset's words. */
export const writeJobOfferLine = (line: { jobOffer: string; country: string; routes: number; fields: string[] }): string =>
  `With ${line.jobOffer} in ${line.country}: ${line.routes} more route${line.routes === 1 ? "" : "s"} would be checked`
  + `${line.fields.length ? ` — on ${joinAnd(line.fields)}` : ""}.`;

/** The arranged line: what an answer someone else arranges would open in one
 * country, said apart from the steps; "situation" is the question's answer. */
export const arrangedLine = (line: { country: string; answers: { answer: string; routes: number }[] }): string =>
  `With a different situation: ${joinAnd(line.answers.map(({ answer, routes }) =>
    `${answer} would open ${routes} route${routes === 1 ? "" : "s"} in ${line.country}`))}.`;

/** The not-yet group's folds: rows that need only a path answer, named by
 * the answers they ask for, and rows in another country than the one the
 * reader is looking at. */
export const routesNeed = (n: number, pathAnswers: string): string => `${n} routes need ${pathAnswers}`;
export const routesNeedSeeStepsAbove = (n: number, pathAnswers: string): string =>
  `${routesNeed(n, pathAnswers)} — see the steps above`;
export const routesInCountryWhereYouToldUs = (n: number, country: string, told: string): string =>
  `${n} ${country} routes — you told us ${told}`;
export const routesInCountryYouAreNotLookingAt = (n: number, country: string): string =>
  `${n} ${country} routes — not where you are looking`;
