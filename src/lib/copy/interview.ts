// @level presentation
/**
 * The question screens' words: the masthead before anything is compared,
 * the arrival line, the question card and its search, and what stands in the
 * box until the module draws (`lib/question.ts`, `lib/arrival-line.ts`,
 * `lib/country-search/`, `lib/situations.ts`).
 *
 * Every word a reader reads lives in this folder, one file per screen or
 * part (CODING_STANDARDS.md, Rules).
 */

/**
 * The arrival line's sentences (`lib/arrival-line.ts`): a reader sent from a country's
 * own page, or from one of its route pages, with the record set to that
 * country — newly, or moved from another. `placeOpening` is the country's
 * phrase where it opens a sentence, `place` its phrase within one, `route` the
 * route's name.
 */
export const placeOnRecordLine = (placeOpening: string): string => `${placeOpening} is on the record.`;
export const placeOnRecordNowLine = (placeOpening: string): string => `${placeOpening} is on the record now.`;
export const comingFromRouteLine = (route: string, place: string): string => `Coming from ${route} — ${place} is on the record.`;
export const startingFromRouteLine = (route: string, place: string): string => `Starting from ${route} — ${place} is on the record.`;
/** The clause that names the answers a move kept, by their phrases already joined. */
export const answersKeptClause = (phrases: string): string => `Your answers about ${phrases} are kept`;
/** A kept answer's name when the dataset gives its field neither a subject nor a short label. */
export const UNNAMED_QUESTION_PHRASE = "one more question";
/** The clause that counts the questions still to come; `place` opens it or follows a clause before it. */
export const placeAsksMoreClause = (place: string, asks: number): string =>
  `${place} asks ${asks} more question${asks === 1 ? "" : "s"}`;

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

/** The ledger's heading, and its one control, which takes the record away. */
export const YOU_DECLARED = "You declared";
export const START_OVER = "Start over";

/**
 * The asked-for line's words (#139; GLOSSARY.md, *Asked-for line*): on a
 * question only some of the reader's open routes read, which routes ask it,
 * so a question one route needs is not read as one every route needs. The
 * route and country names are the dataset's; these are the words around them.
 *
 * One or two routes are named, each by its card's own name and its country;
 * the two arguments are markup, already escaped, because the name carries its
 * route's mark. The country is held to the name's last word, so a wrap at
 * 390 px never leaves "· Germany" alone on a line. More routes are counted
 * per country: "3 routes in Germany, 1 in the Netherlands".
 */
export const ASKED_FOR = "Asked for:";
export const askedForRouteHtml = (routeNameHtml: string, countryHtml: string): string =>
  `${routeNameHtml}&nbsp;·&nbsp;${countryHtml}`;
export const askedForFirstCount = (routes: number, place: string): string =>
  `${routes} route${routes === 1 ? "" : "s"} in ${place}`;
export const askedForNextCount = (routes: number, place: string): string => `${routes} in ${place}`;
export const ASKED_FOR_COUNTS_JOIN = ", ";

/**
 * Over a question reopened with the pencil. It promises only what happens: a
 * change keeps the answers the new choice still uses, and sets aside the
 * ones no route reads any more (#137).
 */
export const EDIT_LINE = "Your answer — pick another to change it; answers your new choice still uses are kept";

/**
 * The question card's two exits (#56, ruling 6). Side by side on an edit
 * screen they read alike, so each says where it goes: Back by the question it
 * returns to, Keep by the question it moves on to, or the result. `label` is
 * the question's short label, the ledger's own.
 */
export const backToLine = (label: string): string => `← Back to ${label}`;
export const keepNextLine = (label: string): string => `Keep this answer — next: ${label}`;
export const keepToResultLine = "Keep this answer — see your result";

/**
 * What opens the set-aside line: the answers a change left without a route
 * that reads them, named after it by their short labels, on the next screen
 * only (#137).
 */
export const setAsideLead = (count: number): string =>
  `Set aside — after your change, no route uses ${count === 1 ? "this answer" : "these answers"}:`;
/** The whole line: the lead and the names, both already markup, and its
 * closing full stop. */
export const setAsideLineHtml = (leadHtml: string, namesHtml: string): string => `${leadHtml} ${namesHtml}.`;

/**
 * The mark under a situation answer no route the checker asks about in the
 * chosen country takes (s19).
 *
 * A researcher with a French hosting agreement was offered the answer, took
 * it, and read "Nothing open on these answers" two taps later — for a route
 * that was merely absent, said nowhere on the site (v1.1 gate critique, B1).
 * The mark says so before the answer is picked. The option stays a button: a
 * reader may still want to see what the rest need.
 *
 * Both names are the data package's — the country's phrase within a sentence,
 * and the quoted route's own name, because the site has no shorter word for a route than the one the
 * dataset gives it and a typed "researcher permit" would be a second name to
 * keep in step. The last three words are the link to that route's page; the
 * line without a route is for a situation nothing quoted carries either.
 */
export const notCheckedLine = (country: string): string => `Not checked for ${country} yet.`;
export const READ_IT_HERE = "read it here";
/** What is said of the quoted route, after its name — here and on the
 * four-country result's line (s21): one clause, so the two cannot drift. */
export const IS_QUOTED_NOT_CHECKED = "is quoted, not checked";
export const notCheckedQuotedLine = (country: string, routeName: string): string =>
  `Not checked for ${country} yet — ${routeName} ${IS_QUOTED_NOT_CHECKED}: ${READ_IT_HERE}.`;

/**
 * The interview's counter (s23, P6). "of up to 24" under "A few quick
 * questions." was the one contradiction on the first screen for four runs
 * (v1.1 gate critique, P6): the denominator moves with every answer, and
 * "about" is the honest word for a number that moves.
 */
export const questionCounter = (n: number, about: number): string => `Question ${n} of about ${about}`;

/**
 * What the passport search says when what was typed matches no row: how to
 * search, and the shorter words the live region reads.
 */
export const NO_COUNTRY_MATCHES = "No country matches. Try fewer letters, or the country's own name.";
export const NO_COUNTRY_MATCHES_STATUS = "No country matches";

/**
 * The same line when what was typed is a dependent territory, which is no row
 * because its people hold another country's passport (#160). The names are
 * the dataset's: the territory's phrase where it opens the sentence and inside
 * it, the passport country's in-sentence phrase, and its row's label.
 */
export const territoryLine = (
  territory: { atStart: string; inSentence: string }, countryPhrase: string, country: string,
): string =>
  `${territory.atStart} is not on this list: people from ${territory.inSentence} hold a passport of ${countryPhrase}. Choose ${country}.`;

/**
 * The passport search's other words (`lib/country-search/`). An empty box
 * counts the list and says an everyday name finds a country; the live region
 * counts the matches and names the row Enter would record; a list cut short
 * counts what it left out.
 */
export const countriesToSearchLine = (countries: number): string =>
  `${countries} countries — the name you grew up with works too.`;
export const matchesHighlightedLine = (matches: number, highlighted: string | undefined): string =>
  `${matches} match${matches === 1 ? "" : "es"}`
  + (highlighted === undefined ? "" : `. ${highlighted} highlighted — press Enter to record it`);
export const moreMatchesLine = (more: number): string => `${more} more — keep typing to narrow the list`;
/** The box's name for a screen reader, and what it shows while empty. */
export const SEARCH_BOX_LABEL = "Search the list";
export const SEARCH_BOX_PLACEHOLDER = "Start typing…";
/** What leads the passport already on the record, under the box. */
export const ANSWER_ON_FILE = "Your answer on file:";
/** Under a list whose options carry a country class: the class decides no
 * rule, an agreement adds to it. The line break is the card's own. */
export const PASSPORT_CLASSES_HINT = `Every non-EU passport is checked against the same rules. A few countries
              have agreements that add rights on top — those are stated with their source when they apply to you.`;
/** Beside a passport row a notice adds rights to, in place of its class. */
export const NOTE_APPLIES_HINT = "a note applies to this passport";

/**
 * The question screens' masthead (`lib/question.ts`): the standing tagline and
 * the promise, before anything has been compared. Present tense throughout,
 * and in the passive (human, 2026-09-16): the claim — a comparison by code,
 * not a judgement by a person — without "Code" as a sentence's subject.
 *
 * `<em>`, not `<b>`, in the headline: this is the standing tagline, and it is
 * a line of its own under the question (human, 2026-09-08). `<b>` stays for
 * the inline emphasis a result headline puts on a number, which must not
 * break the line.
 */
export const INTRO_HEADLINE = "Which work-permit routes could fit? <em>A few quick questions.</em>";
export const INTRO_SUBLINE =
  "Your answers are compared against published rules — every value shows its official quote and the " +
  "date we read it from the source. Your answers stay on this device. At the end: which routes look open, " +
  "how close the near-misses are, and which single step would unlock more.";
/** Once the interview is under way the promise has been read; one line is enough. */
export const SHORT_SUBLINE =
  "Every value at the end shows its official quote and the date we read it. Your answers stay on this device.";
