// @level presentation
import {
  phraseOf, deriveQuestions, joinAnd, learnLinkOf, optionMeans, reckonAskingRoutes, shortLabelOf,
  type Dataset, type OpenRoute, type Profile, type Question,
} from "permit-rulebook-data";
import {
  ASKED_FOR, ASKED_FOR_COUNTS_JOIN, EDIT_LINE, INTRO_HEADLINE, INTRO_SUBLINE, LINK_ARRIVAL_LINE, NO_SCRIPT_LINE,
  RETURNING_LINE, SHORT_SUBLINE, askedForFirstCount, askedForNextCount, askedForRouteHtml, questionCounter,
  resumedLine, setAsideLead, setAsideLineHtml,
} from "./copy/interview.js";
import { countryOf } from "./countries.js";
import { type Glossary, glossSection, glossed } from "./gloss.js";
import { esc, escAttr } from "./reason.js";
import { glossedLearnLinkText } from "./quote.js";
import { QUERY_MAX_LENGTH } from "./listbox.js";
import type { Masthead, Screen } from "./screen.js";
// Which situation answers a country's scored routes take, and the quoted
// route that would have asked otherwise — derived, never typed (s19); keyed
// by the situation under a declared country, or by the country under a
// declared situation (s21).
import { markUnder, notScoredMarkHtml } from "./situations.js";

/**
 * The interview's question screen, rendered — the one copy of that markup.
 *
 * It lived inside `index.astro`'s module and nowhere else, so the page shipped
 * `<main id="main"></main>` empty and the first question appeared only once
 * 220 KB of script had arrived. On a phone the HTML paints first: the reader
 * met an empty box, and then the declaration panel and the footer moved down
 * to make room for a question. The counter put CLS poor for 23% of samples,
 * naming `#app` and the footer (Cloudflare, read 2026-09-10).
 *
 * So the build draws the first screen from here and the module draws every
 * screen after it from here, and the two cannot drift: there is no second copy
 * of the markup to drift from. The module's first render finds the screen it
 * would have drawn already on the page and leaves it alone (s10, 2026-09-15).
 */

/** s5c: above a dozen options the question becomes a filter over a list
 * instead of a wall of buttons; at or below a dozen, nothing changes. */
/**
 * A question screen's masthead: the standing tagline, and the promise — the
 * long form until the interview is under way, the short one after. It claims
 * no comparison: nothing has been compared yet (B4).
 */
export const questionMastheadOf = (screen: Extract<Screen, { kind: "question" }>): Masthead =>
  ({ headline: INTRO_HEADLINE, subline: screen.started ? SHORT_SUBLINE : INTRO_SUBLINE });

export const LONG_LIST_ABOVE = 12;

/** Whether this question is asked as a search rather than as buttons. */
export const isLongList = (question: Question): boolean => question.options.length > LONG_LIST_ABOVE;

/** Whether this question's options carry a country class. The card says so
 * once in a hint; the list the search draws says it row by row. */
export const hasClasses = (question: Question): boolean => question.options.some((o) => o.implies !== undefined);

/** Everything the question screen is a function of. */
export interface QuestionScreen {
  dataset: Dataset;
  /** The question on the table. */
  question: Question;
  /** Every answer on the record. */
  answers: Profile;
  /** Answered fields, in the order they were asked. */
  asked: string[];
  /** The answered field being reconsidered, from the ledger or from Back. */
  editing: string | null;
  /** How many questions this interview can still ask, this one included. */
  total: number;
  /** What the arrival said, already markup; nothing when nobody arrived. */
  arrival?: string;
  /** What the country picker just committed, said in words on the next screen. */
  justRecorded?: { field: string; label: string } | null;
  /** How many answers a returning reader's first paint brought back, when the
   * screen is the one they resume on; absent on every other screen (s20). The
   * line it draws is the sentence alone — the page moves its own "Start over"
   * in after it, so the control is the ledger's and there is never a second. */
  resumed?: number;
  /** The screen's memory of what it has already explained; the card's words
   * and the asked-for line's route names spend from it like every route name
   * on the page. Absent on the build's first paint, where the card starts
   * one of its own. */
  glossary?: Glossary;
}

/** Up to this many routes the asked-for line names; above it, it counts. */
const NAMED_UP_TO = 2;

/**
 * The asked-for line (#139; GLOSSARY.md): the routes the question is asked
 * for, drawn when they are fewer than the open routes.
 *
 * Both lists are the engine's own asking reckoning, so the line can never
 * name a route that does not read the answer; this only compares them and
 * draws names or counts. The question is reckoned without its own answer, so
 * a question reopened with the pencil names what it would be asked for had
 * it not been answered (spec #133, decision 7).
 */
function askedForLineHtml({ dataset, answers, question, glossary }: QuestionScreen): string {
  const unanswered: Profile = { ...answers };
  delete unanswered[question.field];
  const { asked_for: askedFor, open } = reckonAskingRoutes(dataset, unanswered, question.field);
  if (askedFor.length === 0 || askedFor.length === open.length) return "";
  const body = askedFor.length <= NAMED_UP_TO
    ? namedRoutesHtml(dataset, askedFor, glossary ?? new Set())
    : countedRoutesHtml(askedFor);
  return `<p class="asked-for" data-asked-for>${esc(ASKED_FOR)} ${body}</p>`;
}

/** Each route by its card's name, through the screen's "§" expansion, and
 * its country's name; each name carries its route's mark. */
function namedRoutesHtml(dataset: Dataset, routes: OpenRoute[], glossary: Glossary): string {
  return joinAnd(routes.map(({ route, country }) => askedForRouteHtml(
    `<span data-route="${escAttr(route.id)}" data-country="${escAttr(country)}">${esc(glossSection(route.name, glossary))}</span>`,
    esc(countryOf(dataset, country).name),
  )));
}

/** How many routes per country, in the dataset's order of countries; each
 * count carries its country's mark. */
function countedRoutesHtml(routes: OpenRoute[]): string {
  const perCountry = new Map<string, number>();
  for (const { country } of routes) perCountry.set(country, (perCountry.get(country) ?? 0) + 1);
  return [...perCountry].map(([country, count], i) => {
    const place = phraseOf(country);
    const words = i === 0 ? askedForFirstCount(count, place) : askedForNextCount(count, place);
    return `<span data-country="${escAttr(country)}" data-routes="${escAttr(String(count))}">${esc(words)}</span>`;
  }).join(ASKED_FOR_COUNTS_JOIN);
}

export function questionCardHtml(screen: QuestionScreen): string {
  const { dataset, question: q, answers, asked, editing, total } = screen;
  // One card, one memory: the label, the asked-for line, the help and every
  // answer's words spend from it in the order they are drawn.
  const glossary: Glossary = screen.glossary ?? new Set();
  const longList = isLongList(q);
  const classed = hasClasses(q);
  const declared = q.options.find((o) => o.value === answers[q.field]);
  const justRecorded = screen.justRecorded ?? null;
  return `
        <section class="qcard">
          ${screen.resumed ? `<p class="resumed">${esc(resumedLine(screen.resumed))}</p>` : ""}
          ${screen.arrival ?? ""}
          ${justRecorded ? `<p class="recorded" role="status">${esc(shortLabelOf(dataset, justRecorded.field))} recorded: <b>${esc(justRecorded.label)}</b></p>` : ""}
          <div class="qmeta" role="status" aria-live="polite">${
            esc(editing ? EDIT_LINE : questionCounter(asked.length + 1, total))
          }</div>
          <h2 class="qlabel">${esc(glossed(q.label, glossary))}</h2>
          ${askedForLineHtml({ ...screen, glossary })}
          ${(() => {
            // Where the answer is a thing a person can look up, the way to look
            // it up belongs at the question, not three screens later on a
            // result card that already assumed an answer (isolated v1-gate
            // critique, 2026-09-08, F13). It is the dataset's own link — the
            // same one the card and the route page show — and its label is
            // glossed like the rest of the card's words (#151, ruling 8),
            // followed by what the page is where it is not the authority's
            // (#158). Any route it names is said in full (#159).
            const learn = learnLinkOf(dataset, q.field);
            return learn
              ? `<p class="qlearn">Not sure? <a href="${escAttr(learn.url)}" target="_blank" rel="noopener">${
                esc(glossedLearnLinkText(learn, glossary))}</a></p>`
              : "";
          })()}
          ${longList ? `
            <div class="csearch">
              <span class="mag" aria-hidden="true">⌕</span>
              <input type="text" id="cfilter" autocomplete="off" spellcheck="false" maxlength="${escAttr(String(QUERY_MAX_LENGTH))}"
                role="combobox" aria-expanded="false" aria-autocomplete="list"
                aria-label="Search the list" aria-controls="clist" placeholder="Start typing…"
                value="${escAttr(declared?.label ?? "")}">
            </div>
            <div class="clist" id="clist" role="listbox" aria-label="${escAttr(q.label)}"></div>
            <p class="recorded" id="crecorded"${declared ? "" : " hidden"}>Your answer on file: <b>${esc(declared?.label ?? "")}</b></p>
            ${classed ? `<p class="hint">Every non-EU passport is checked against the same rules. A few countries
              have agreements that add rights on top — those are stated with their source when they apply to you.</p>` : ""}`
          : `<div class="opts">
            ${q.options.map((o) => {
              const chosen = answers[q.field] === o.value;
              // A reader whose employer was moving them to a branch abroad read
              // "a job offer there" as their situation and took a route as open
              // that is not (human walk, 2026-09-08). Where an answer says what
              // it means, it says it here — under the answer, not in a hint at
              // the foot of the question nobody reads before choosing.
              const means = optionMeans(o, dataset, answers);
              // A situation no scored route in the declared country takes
              // says so under the answer, before it is picked: the reader who
              // took it read "Nothing open" for a route that was merely absent
              // (v1.1 gate critique B1, s19) — and, on the four-country path,
              // under the country whose scored routes do not take the declared
              // situation (N1, s21). It follows the button rather than sitting
              // inside it — the last words are a link to the quoted route's
              // page, and a link inside a button is not one. The button is
              // described by it, so a reader who Tabs to the answer hears the
              // mark too, not only the one who sees it (re-score polish).
              const mark = markUnder(dataset, q.field, o.value, answers);
              return `<button class="opt${chosen ? " sel" : ""}" data-value="${escAttr(o.value)}"${
                chosen ? ` aria-pressed="true"` : ""}${mark ? ` aria-describedby="mark-${escAttr(o.value)}"` : ""}><span class="opt-label">${esc(o.label)}${
                chosen ? `<span class="tick" aria-hidden="true">✓</span>` : ""}</span>${
                means ? `<small class="opt-means">${esc(glossed(means, glossary))}</small>` : ""}</button>${
                mark ? `<small class="opt-mark" id="mark-${escAttr(o.value)}" data-for="${escAttr(o.value)}">${notScoredMarkHtml(mark)}</small>` : ""}`;
            }).join("")}
          </div>`}
          ${(editing ? asked.indexOf(editing) > 0 : asked.length > 0)
            ? `<button class="back" id="back">← Back</button>` : ""}
          ${editing ? `<button class="back" id="done">Keep this answer</button>` : ""}
          <noscript><p class="nojs">${esc(NO_SCRIPT_LINE)}</p></noscript>
        </section>`;
}

/**
 * The declaration panel's rows.
 *
 * Rows in the order they were asked; the pending row appends last. Answered
 * rows are edit points: clicking one resumes the interview at that question,
 * keeping everything before it (a full reset destroyed every answer — human
 * catch, golden G3). The listeners that make them so stay with the page; what
 * lives here is the markup, so the build can draw the same panel the module
 * would have drawn.
 *
 * The pen is tied to the answer's last word by a space that cannot break: a
 * long answer in the desktop sidebar wrapped, and the pen alone went to the
 * second line — "University degree ⏎ ✎" at 1280 (v1.1 gate critique, P8 —
 * s27). Now the last word goes with it or neither moves.
 *
 * A row's answer is looked up among the options its question offers, so every
 * answer a reader can pick draws an answered row with its pencil: a money
 * question's open unknown is one of its options and none of its bands.
 */
export function declarationHtml(
  dataset: Dataset, answers: Profile, asked: string[], currentField: string | null,
): string {
  const fields = currentField && !asked.includes(currentField) ? [...asked, currentField] : asked;
  const offered = new Map(deriveQuestions(dataset).map((q) => [q.field, q.options]));
  return fields.map((f) => {
    const opt = offered.get(f)?.find((o) => o.value === answers[f]);
    return opt
      ? `<div class="done" data-field="${escAttr(f)}" role="button" tabindex="0" title="Change this answer"><dt>${esc(shortLabelOf(dataset, f))}</dt><dd>${esc(opt.label)}&nbsp;<span class="pen" aria-hidden="true">✎</span></dd></div>`
      : `<div><dt>${esc(shortLabelOf(dataset, f))}</dt><dd class="pending">—</dd></div>`;
  }).join("");
}

/**
 * The set-aside line: the answers the last edit's replay dropped, each by its
 * short label. Nothing when nothing was set aside. Each name carries its
 * field, so a reader of the page can tell which answer it is without reading
 * the words. A span, because the folded panel shows it in its summary row,
 * which holds phrasing only.
 */
export function setAsideHtml(dataset: Dataset, setAside: readonly string[]): string {
  if (!setAside.length) return "";
  const names = setAside.map((f) => `<b data-set-aside="${escAttr(f)}">${esc(shortLabelOf(dataset, f))}</b>`);
  return `<span class="set-aside">${setAsideLineHtml(esc(setAsideLead(setAside.length)), joinAnd(names))}</span>`;
}

/** On a phone the ledger collapses to this one line; on a wide screen the
 * summary is hidden and the panel is always open. */
export const declarationCount = (answered: number): string =>
  answered
    ? `${answered} answer${answered === 1 ? "" : "s"} — tap to review or change`
    : "nothing yet";

/**
 * The two lines that stand in the box for a reader whose first screen is not
 * the one the build painted.
 *
 * Both are painted; the stylesheet shows at most one, on the strength of the
 * cover the pre-paint script wrote before anything appeared (s10). They sit
 * inside the box and over the question rather than in place of it: the card
 * keeps its own height because its contents are still there, hidden, so the
 * box a returning reader meets is the box every reader meets and the page
 * below it does not move. The module takes them out the moment it has a real
 * screen to draw.
 *
 * A reader with no script never sees either — no cover is ever written — and gets
 * question one and the line that says why they cannot answer it.
 */
export const renderStandInsOverQuestionOne = (): string =>
  `<p class="stand-in stand-in-record">${esc(RETURNING_LINE)}</p>`
  + `<p class="stand-in stand-in-link">${esc(LINK_ARRIVAL_LINE)}</p>`;

/**
 * The same sentence for the reader owed a verdict, in the masthead rather
 * than in the box.
 *
 * Nothing the build painted below the eyebrow is that reader's — not the
 * masthead's question, not the card, not the ledger, not the footer — and
 * s22 covered it all in place: the covers kept their room and the line sat
 * centred in a hidden box, a thousand pixels of blank under the eyebrow. Now
 * the covered things take no room until the module draws, and the line
 * stands directly under the eyebrow, where the headline will (s31). It is the
 * record line's own words: the same fact is true for both readers, and one
 * sentence cannot drift from itself.
 */
export const holdLineHtml = (): string =>
  `<p class="stand-in stand-in-verdict">${esc(RETURNING_LINE)}</p>`;
