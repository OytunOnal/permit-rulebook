/**
 * The product's own words, in one place.
 *
 * The name, the tagline and the disclaimer are said on the results screen, on
 * twenty-eight route pages, in the social card and in both READMEs. Written out
 * at each of those sites they drift: the masthead once carried a second copy of
 * the intro copy and "Start over" left a stale claim on question 1
 * (product-critique v0.7, B4). Decision 9 makes the disclaimer one sentence
 * from one source everywhere; this is that source.
 */
// A count reads as a word in a sentence, and the dataset package spells it.
import { countedWords } from "permit-rulebook-data";

export const PRODUCT_NAME = "Permit Rulebook";

/** Decision 1. It is set from the token serif wherever it appears. */
export const TAGLINE = "Every route, quoted and dated.";

/**
 * The route page says something narrower under its own name.
 *
 * The product's tagline is a claim about the whole rulebook; a route page is
 * one route, and its second line has said so since the approved route-page mock
 * ("The rules, quoted and dated."). Both live here rather than one of them
 * living in a template, so a change of voice is one edit and a test can read
 * which page says which (Spec review, 2026-09-08).
 */
export const ROUTE_TAGLINE = "The rules, quoted and dated.";

/**
 * The one-line promise the README leads with and the social card carries.
 *
 * The two counts are read from the dataset rather than typed here: they were
 * typed, and s9 moved one of them the same day it was written (Standards
 * review, 2026-09-10).
 */
export const promise = (counts: { scored: number; quotedOnly: number }): string =>
  `An open, dated, source-quoted work-permit ruleset for four countries — ${counts.scored} routes ` +
  `scored against your answers and ${counts.quotedOnly} more quoted and dated without being scored, ` +
  "every value with its official sentence and the day it was read, checked daily.";

/**
 * The launch's legal wording, one sentence, everywhere. It is the IRCC-style
 * text that has been on the site since s1, and A1's condition — no advice, no
 * verdict on the person — is satisfied by these words and not by a policy
 * document nobody reads.
 */
export const DISCLAIMER =
  `${PRODUCT_NAME} makes no immigration decision and no authority is bound by these results — ` +
  "it compares published values with what you declare, nothing more.";

/**
 * What a reader without JavaScript is owed.
 *
 * Until s10 the interview's box shipped empty and a reader with script turned
 * off saw nothing at all — a blank page that said nothing about why. The
 * question is in the HTML now, which is better and still not enough: they can
 * read it and cannot answer it. So the page says so, in one line, under the
 * question. One clause and no more: where the answers go is the masthead's
 * sentence, and saying it twice is not saying it better (Spec review, s10).
 */
export const NO_SCRIPT_LINE = "This question needs JavaScript to answer.";

/**
 * What stands in the box until the module has a screen to draw, for a reader
 * whose screen is not the one the build painted.
 *
 * s10 put question one in the HTML and the page stopped moving. On a return
 * visit it was also WRONG for a moment: the reader was shown a question they
 * had already answered, every time they came back, until the module swapped it
 * for their own screen. The human saw it on the walk and named it — "the
 * question box fills a tick late" — and the line this product is built on is
 * that nothing untrue is ever on the screen. A placeholder that asks an
 * answered question is untrue (human, 2026-09-15).
 *
 * So the box says what is actually happening instead. The sentence is the
 * human's own, and it is true only where there are answers to bring back.
 */
export const RETURNING_LINE = "Your answers are on this device — bringing them back.";

/**
 * And for the other reader the pre-paint script marks as started: someone who
 * pressed "Check yours" on a country or route page and may have no answers at
 * all. The sentence above would be false for them and question one is wrong
 * for them too — their link has already answered it. This one is neutral and
 * true either way. It names no country: what the link scoped the interview to
 * is the dataset's word, and the script that chooses this line is inlined
 * where nothing checks a country name against the dataset (s10).
 */
export const LINK_ARRIVAL_LINE = "Setting up your questions.";

/**
 * What the box says to a reader who came back to a half-done interview, once
 * the module has their screen.
 *
 * The stand-in above says the answers are coming back; this is the line that
 * says they came. Without it a returning visitor landed on "question 3 of up
 * to 8" and read a second visit as a broken first question — the only clue
 * was the folded ledger under the card (v1.1 gate critique, F5). It counts
 * what was kept, in the ledger's own number, and the control that follows it
 * is the ledger's own "Start over", moved into the line rather than copied.
 */
export const resumedLine = (kept: number): string =>
  `Continuing where you left off — ${kept} answer${kept === 1 ? "" : "s"} kept.`;

/**
 * What a route page adds to it. A page a stranger lands on cold from a search
 * has to say, before it says anything else, that it is describing rules rather
 * than judging the reader.
 */
export const ROUTE_PAGE_ADDENDUM = "This page describes the rules; it does not decide on you.";

/**
 * What a page for a route the product does not score says instead.
 *
 * The scored version's promise — the rules, not a judgement — is true here too
 * and is not the thing a stranger needs first. A reader who arrives on one of
 * these from a search has to be told, in the same breath as the route's name,
 * that the checker will never rule on this one: the sentence under the heading
 * explains why, and this is the half-line that gets them there (s9).
 */
export const ROUTE_PAGE_UNSCORED_ADDENDUM =
  "This route is one the checker does not score — the rules are stated here and nothing is asked of you.";

/**
 * What the site says about the daily check — the claim, and the qualification a
 * partial run puts on it.
 *
 * Three surfaces say it, and they said it in four wordings typed into four
 * files. When s11 taught the qualification to two of them, the route page went
 * on asserting on twenty-eight pages that a daily check re-reads every source,
 * on days it had not — and a fourth copy sat in this file, rendered by nothing,
 * waiting to be picked up (Standards review, 2026-09-15). One fact, one source,
 * three surfaces: the shape the "within reach" sentence has followed since
 * 2026-09-08.
 *
 * `unread` is how many sources behind the values a reader is looking at the
 * last run could not read — `unreadSources` in the data package is the one
 * place that works it out. Zero is the ordinary day, and says what the product
 * has always said, to the byte.
 */
const DAILY_CHECK = "a daily check re-reads every source";

/** The route page, inside its own sentence about what is quoted. */
export const dailyCheck = (unread: number): string =>
  // The noun counted here is a pronoun: "them" is the sources the first half
  // of the sentence has just claimed are all re-read.
  unread === 0 ? DAILY_CHECK : `${DAILY_CHECK}; the last run did not reach ${
    countedWords(unread, "of them", "of them")}`;

/** `/data/`, which carries the whole exception sentence after it. */
export const DAILY_CHECK_CLAIM = "Every source is re-read daily";

/** The footer, which has room for the count and no more — a label, so figures. */
export const unreadLabel = (unread: number): string =>
  unread === 0 ? "" : `${unread} source${unread === 1 ? "" : "s"} unread`;

/** The rest of the route-page footer: what the date beside each quote means. */
export const freshnessNote = (unread: number): string =>
  `Rules change; the date beside each quote is the day we last read it, and ${dailyCheck(unread)}.`;

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
 * Why the proof is not in English (human decision, 2026-09-08).
 *
 * The quotes carrying this product's whole claim are in German, French, Spanish
 * and Dutch, and a reader from India, Nigeria or Brazil meets them with no
 * English beside them (isolated v1-gate critique, 2026-09-08, F4). They are not
 * translated and will not be: a translation is our words standing beside the
 * authority's, and the sentence the authority wrote is the record. What the
 * site owes the reader is to say so.
 */
export const TRANSLATION_POLICY =
  "Quotes are shown in the authority's own language and are never translated: a translation " +
  "would be our words beside theirs, and the original is the record. Each quote names its " +
  "language and its source.";

/**
 * The two dates the `/data/` list prints, each under a word that means it.
 *
 * They are two facts and they sat side by side under one word: the day a value
 * last changed, and the day every source was last checked. The row said "Newest
 * value read", and on 2026-09-15 the product's own author read it as "last
 * checked" and asked why the numbers were old. They were not — nothing had
 * changed since, which is what the daily watch keeps confirming and what, by
 * design, never moves a value's date. A label its author misreads has not
 * earned its meaning (s12).
 *
 * "Changed" is the accurate word for the first: that date moves only when a
 * person updates a value after a flag. The second is the run the freshness
 * sentence below already prints, and the page reads it from the one place that
 * has it rather than asking the state again.
 */
export const NEWEST_VALUE_CHANGED = "Newest value changed";
export const LAST_CHECKED = "Last checked";

/**
 * The `/data/` counts row for our own sentences, after the number: what the
 * provenance gate calls "declared" is, to a reader, that we wrote them and
 * said so. The gate's own line further down the page keeps its own words —
 * the label was in the gate's vocabulary, and the reader has not met the gate
 * (light critique of s12, 2026-09-16; s16).
 */
export const PROSE_OURS_TAIL = "written by us and marked as ours";

/**
 * `/data/`'s masthead lede. The opening is one sentence whose numbers are the
 * page's own, so it is a function of them; the closing sentence ended as
 * plain text with no door for four days, which the human's walk of the s16
 * preview found (2026-09-16) — and once the door was there, "or tell us it
 * is wrong" presupposed a wrong, which the human's read of the same preview
 * found the same day ("1" of three). So the sentence is a condition and an
 * offer, with the door on the last two words. Composed here the way
 * `resultFeedbackLine` is, so the full stop is the copy's and not the
 * template's: the words arrive already wrapped as a link, and the line
 * closes the sentence around them.
 */
export const DATA_LEDE_OPEN = "Everything this site shows is one open dataset:";
export const dataLedeOpen = (scored: number, quotedOnly: number, countries: number): string =>
  `${DATA_LEDE_OPEN} ${scored} routes scored against your answers and ${
    quotedOnly} more quoted and dated but not scored, across ${countries} countries, every threshold and condition `
  + "carrying the authority's own sentence, the page it came from and the day we read it.";
export const DATA_LEDE_CLOSE_TAIL = "tell us";
export const dataLedeClose = (door: string): string => `Take it, check it, and if something is wrong, ${door}.`;

/**
 * The freshness sentence's second half on `/data/`: what happens when a source
 * moves, and the one thing that never happens on its own. It used to say a
 * moved source "files an issue in the tracker" — a tracker the reader had not
 * met, and since s13 not where a reader goes. The exception clause before it
 * is s11's and prints on its own terms; this is the part that follows it on
 * every day (s16).
 */
export const FRESHNESS_HUMAN_HAND =
  "A source that has moved raises a flag and a person reads it: the values on this site, and the dates beside "
  + "them, change when a person changes them, never on their own.";

/**
 * What a search result and a link preview say about `/data/`. The counts are
 * the page's own, so it is a function of them and not a string. It used to end
 * "the downloads, the checks and the tracker" — a door the page stopped
 * offering in s16, found by that build's own check and taken as a back-edge
 * the same day. A description is a summary of the page, and the door is one
 * link, so the tail is plainer rather than renamed.
 */
export const dataMetaDescription = (scored: number, quotedOnly: number, countries: number): string =>
  `What ${PRODUCT_NAME} holds today: ${scored} routes scored against your answers and ${
    quotedOnly} quoted and dated but not scored, across ${countries} countries, every value carrying its source `
  + "and the day it was read — with the downloads and the checks.";

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

/** The eyebrow, the lede and the h1 of `/feedback/`, as the mock draws them. */
export const FEEDBACK_EYEBROW = "Read by a person.";
export const FEEDBACK_LEDE =
  "One address, three kinds of mail. The link fills in the subject and a few headings; the rest is yours. "
  + "Nothing you declared in the interview is sent.";
/** What a search result and a link preview say about the page. */
export const FEEDBACK_META_DESCRIPTION =
  "One address, three kinds of mail: a value is wrong, something is missing, or anything else. "
  + "A person reads every mail, and nothing you declared in the interview is ever sent.";

/**
 * One of the three kinds of mail the page offers.
 *
 * `subject` and `body` are the whole of what a `mailto:` carries: the link is
 * built from these strings and from the address, and from nothing else. The
 * record never enters one — that is the bound the 2026-09-16 decision put in
 * place of "the GitHub account requirement is said before the click", and it
 * holds here by construction rather than by care, because this file cannot see
 * a reader's answers.
 */
export interface FeedbackDoor {
  heading: string;
  line: string;
  button: string;
  subject: string;
  /** The headings written into the mail's body, one per line. Empty for a note
   * of any length, which is a blank sheet on purpose. */
  body: string[];
}

export const FEEDBACK_DOORS: readonly FeedbackDoor[] = [
  {
    heading: "Something is wrong",
    line: "The page says one thing; the source says another.",
    button: "Report what is wrong",
    subject: "Wrong information",
    body: ["Page:", "What it says:", "What the source says:", "Where (link):"],
  },
  {
    heading: "Something is missing",
    line: "A route, a question, a country, a case.",
    button: "Say what is missing",
    subject: "Missing",
    body: ["What:", "Where you looked for it:"],
  },
  {
    // The human's own amendment to the drawing: the draft's "Confusing, useful,
    // broken, kind — anything / Write anything" said nothing about what the
    // maker wants to hear (2026-09-16).
    heading: "Anything else",
    line: "What helped, what confused you, what you would want next — a note of any length.",
    button: "Write a note",
    // The subject is the door's, not the button's: "Subject: Note bu note
    // değil feedback" (the human's walk, 2026-09-16).
    subject: "Feedback",
    body: [],
  },
];

/**
 * The site's door for a wrong value, wherever a page offers one — `/data/`'s
 * Take it and every route page's data door. Those two linked the tracker under
 * the footer's old verb for a day after s13 had moved the tracker to
 * `/feedback/`; now they say the first door's own button and lead to the page
 * it is on (s16). Derived from the door, not typed beside it: one action keeps
 * one name across the site.
 */
export const WRONG_DOOR_LABEL = FEEDBACK_DOORS[0]!.button;

/**
 * What the reader is told the mail will carry, before they click it.
 *
 * Derived from the door rather than typed beside it: a line that says the mail
 * holds one thing while the link writes another is worse than no line at all,
 * and the critique's own praise for F was that the reader knows the contents
 * before the click (2026-09-16).
 */
export const feedbackTemplateLine = (door: FeedbackDoor): string =>
  [`Subject: ${door.subject}`, ...door.body.map((h) => h.replace(/:$/, ""))].join(" · ");

/**
 * The second link under each button — the same template as a `mailto:`, for
 * a reader whose mail is not Gmail, or who is on a phone (decision,
 * 2026-09-16). The lead word is the sentence's and the link is the rest.
 */
export const FEEDBACK_OWN_APP_LEAD = "or";
export const FEEDBACK_OWN_APP = "with your own mail app";

/** What happens to a mail, said once, under the address — and, first, what
 * the two links do, because on the preview both were a mystery until one of
 * them opened nothing. */
export const FEEDBACK_NOTE =
  "The button opens Gmail. If Gmail is not yours, the second link opens your mail app; if that opens "
  + "nothing, tap the address to copy it. A person reads every mail. Something wrong, "
  + "confirmed against its source, "
  + "is changed and the change gets a history line with the date. No reply is promised; a fix is the reply.";

/**
 * The address is a button that copies itself, with a copy glyph beside it and
 * no visible word: this is its accessible name. What it says for two seconds
 * after it has worked rides on the button as `data-done`, so the script that
 * writes it names no string of its own (the human's walk, 2026-09-16: the
 * address as a `mailto:` opened nothing on their desktop; a "Copy" word beside
 * it was too loud, then not loud enough — the glyph is the third drawing).
 */
export const COPY_ADDRESS_LABEL = "Copy the address";
export const COPIED = "Copied";

/** The tracker, beside the address and named as what it is — not hidden, not
 * first (decision, 2026-09-16). */
export const FEEDBACK_GITHUB_HEADING = "If you have a GitHub account";
export const FEEDBACK_GITHUB_LINE =
  "The tracker is where changes are recorded in public and where contributors work. The same things can go "
  + "there instead:";
/** The tracker's two doors, in the verbs the footer used to carry, so one
 * action keeps one name across the site. */
export const TRACKER_WRONG_VALUE = "Report a wrong value";
export const TRACKER_NEW_NEED = "Suggest a route or a change";

/** The footer's row under the address: what the page behind it is for. The
 * column's heading is already the word, so the row says the rest (critique F6,
 * 2026-09-16). */
export const FEEDBACK_FOOTER_ROW = "How to write, and what happens";

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
 * The mark under a situation answer no scored route in the chosen country
 * takes (s19).
 *
 * A researcher with a French hosting agreement was offered the answer, took
 * it, and read "Nothing open on these answers" two taps later — for a route
 * that was merely absent, said nowhere on the site (v1.1 gate critique, B1).
 * The mark says so before the answer is picked. The option stays a button: a
 * reader may still want to see what the rest need.
 *
 * Both names are the dataset's — the country's, and the quoted route's own
 * name, because the site has no shorter word for a route than the one the
 * dataset gives it and a typed "researcher permit" would be a second name to
 * keep in step. The last three words are the link to that route's page; the
 * line without a route is for a situation nothing quoted carries either.
 */
export const notScoredLine = (country: string): string => `Not scored for ${country} yet.`;
export const READ_IT_HERE = "read it here";
/** What is said of the quoted route, after its name — here and on the
 * four-country result's line (s21): one clause, so the two cannot drift. */
export const IS_QUOTED_NOT_SCORED = "is quoted, not scored";
export const notScoredQuotedLine = (country: string, routeName: string): string =>
  `Not scored for ${country} yet — ${routeName} ${IS_QUOTED_NOT_SCORED}: ${READ_IT_HERE}.`;

/**
 * The written state a zero-open result through a marked answer reads, in
 * place of "Nothing open" (s19).
 *
 * The headline names the country and the situation in the option's own short
 * words ("a research hosting agreement"); the subline names the quoted route
 * — the situation phrase before it says what it is for, since the dataset
 * carries no other description of a route than its name — with the door on
 * the last three words, and then what the scored routes below do take,
 * derived from the situations they ask and joined the way the hold list
 * joins them. Without a quoted route the subline is the second sentence
 * alone.
 */
const unscoredClaim = (country: string, situation: string): string =>
  `No scored route in ${country} takes ${situation}`;
export const unscoredHeadline = (country: string, situation: string): string => `${unscoredClaim(country, situation)}.`;
export const READ_ITS_RULES = "read its rules";
/** The possessive, for the one country whose name ends in an s. */
const possessive = (name: string): string => (name.endsWith("s") ? `${name}'` : `${name}'s`);
export const unscoredRouteLine = (country: string, situation: string, routeName: string): string =>
  `${possessive(country)} route for ${situation} — ${routeName} — is quoted here but not scored: ${READ_ITS_RULES}.`;
export const unscoredRestLine = (steps: string): string => `The routes below need ${steps}.`;

/**
 * The same state on the four-country result, in the country's own summary
 * line (s21).
 *
 * The four-country result has no headline to give one country — three of the
 * four take the situation and the headline is theirs — so the line that used
 * to count France's routes as "5 not yet" says instead what the s19 headline
 * says, and then names the quoted route in the words the question-3 mark
 * uses of it. The route's name is the link on the screen; the line without a
 * route is the headline alone (v1.1 gate critique, N1).
 */
export const unscoredTallyLine = (country: string, situation: string, routeName?: string): string =>
  routeName
    ? `${unscoredClaim(country, situation)} — ${routeName} ${IS_QUOTED_NOT_SCORED}.`
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
