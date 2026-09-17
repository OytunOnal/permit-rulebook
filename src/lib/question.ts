import {
  deriveBands, fieldOptions, optionMeans, shortLabelOf,
  type Dataset, type FieldOption, type Profile, type Question,
} from "permit-rulebook-data";
import { LINK_ARRIVAL_LINE, NO_SCRIPT_LINE, RETURNING_LINE, questionCounter, resumedLine } from "./copy.js";
import { esc, escAttr } from "./reason.js";
import { type Glossary, glossSection } from "./gloss.js";
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
  /** The abbreviations this screen has already expanded; mutated as it draws. */
  glossary: Glossary;
}

export function questionCardHtml(screen: QuestionScreen): string {
  const { dataset, question: q, answers, asked, editing, total, glossary } = screen;
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
            editing ? "Your answer — pick another to change it, the rest are kept" : esc(questionCounter(asked.length + 1, total))
          }</div>
          <h2 class="qlabel">${esc(q.label)}</h2>
          ${(() => {
            // Where the answer is a thing a person can look up, the way to look
            // it up belongs at the question, not three screens later on a
            // result card that already assumed an answer (isolated v1-gate
            // critique, 2026-09-08, F13). It is the dataset's own link — the
            // same one the card and the route page show.
            const learn = dataset.fields.find((f) => f.id === q.field)?.learn;
            return learn
              ? `<p class="qlearn">Not sure? <a href="${escAttr(learn.url)}" target="_blank" rel="noopener">${
                esc(glossSection(learn.label, glossary))}</a></p>`
              : "";
          })()}
          ${longList ? `
            <div class="csearch">
              <span class="mag" aria-hidden="true">⌕</span>
              <input type="text" id="cfilter" autocomplete="off" spellcheck="false"
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
                means ? `<small class="opt-means">${esc(means)}</small>` : ""}</button>${
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
 */
export function declarationHtml(
  dataset: Dataset, answers: Profile, asked: string[], currentField: string | null,
): string {
  const fields = currentField && !asked.includes(currentField) ? [...asked, currentField] : asked;
  return fields.map((f) => {
    const opt = (fieldOptions(dataset, f) as FieldOption[]).find((o) => o.value === answers[f]) ??
      deriveBands(dataset, f).find((b) => b.id === answers[f]);
    return opt
      ? `<div class="done" data-field="${escAttr(f)}" role="button" tabindex="0" title="Change this answer"><dt>${esc(shortLabelOf(dataset, f))}</dt><dd>${esc(opt.label)}&nbsp;<span class="pen" aria-hidden="true">✎</span></dd></div>`
      : `<div><dt>${esc(shortLabelOf(dataset, f))}</dt><dd class="pending">—</dd></div>`;
  }).join("");
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
 * flag the pre-paint script wrote before anything appeared (s10). They sit
 * inside the box and over the question rather than in place of it: the card
 * keeps its own height because its contents are still there, hidden, so the
 * box a returning reader meets is the box every reader meets and the page
 * below it does not move. The module takes them out the moment it has a real
 * screen to draw.
 *
 * A reader with no script never sees either — no flag is ever set — and gets
 * question one and the line that says why they cannot answer it.
 */
export const firstPaintPlaceholdersHtml = (): string =>
  `<p class="stand-in stand-in-record">${esc(RETURNING_LINE)}</p>`
  + `<p class="stand-in stand-in-link">${esc(LINK_ARRIVAL_LINE)}</p>`;
