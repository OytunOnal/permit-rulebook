// @level infrastructure
import rawDataset from "permit-rulebook-data/data/dataset.json" with { type: "json" };
import { fieldOptions } from "permit-rulebook-data";
import { STORAGE_KEY, serialize } from "../src/lib/record.ts";

/**
 * The interview as tests and scripts drive it: `new InterviewPage(site)` takes
 * the page a walk is handed on the site, and seeds the record on the device,
 * opens the interview, answers the question on the screen, reads which screen
 * is shown, and reads or clears the stored record. The storage key, the
 * record's format and the question card's markup stay in here, with the
 * probes that read them, so a change to any of them is made here alone.
 *
 * @typedef {import("./browser/browser.mjs").BrowserPage} BrowserPage
 * @typedef {import("permit-rulebook-data").Profile} Profile
 */

/**
 * The page on the site an interview is driven on: the walk's page, and `url`,
 * which makes the site's address of a path. Without `url` the interview
 * answers and reads the page it is on, and cannot seed or open one.
 *
 * @typedef {{ page: Pick<BrowserPage, "goto" | "evaluate" | "waitUntil" | "waitUntilAtRest">, url?: (path: string) => string }} PageOfInterview
 */

/**
 * The screen as a reader sees it: which screen the interview is on
 * (`questions` or `results`), and the question card's words where a question
 * is shown. Off a shown question every word is "", every list empty and
 * every part null.
 *
 * - `question`: the question's label; "" where none is shown, absent or
 *   hidden from the reader.
 * - `meta`: the line over the question, "Question N of about M", or the edit
 *   line on a reopened question.
 * - `arrival`: the lines above the question that say what was put on the
 *   record: an arrival from a country or route page, or the passport the
 *   search just recorded.
 * - `chosen`: the id of the answer the card holds as chosen.
 * - `askedFor`: the line naming the routes that ask the question.
 * - `answers`: what the reader can pick, in order: the buttons, or on the
 *   search the rows it lists now (none until something is typed).
 * - `search`: the search, where the question is one.
 *
 * @typedef {{ screen: string, question: string, meta: string, arrival: string, chosen: string, askedFor: AskedFor | null, answers: AnswerOffered[], search: SearchShown | null }} ScreenShown
 */

/**
 * An answer the card offers: its id, its words, the line under it saying what
 * it means (null where it has none), the mark under it (null where it has
 * none), and the element `aria-describedby` names, which a reader who Tabs to
 * it hears, with whether that element is on the page (null where it names
 * none).
 *
 * @typedef {{ value: string, label: string, means: string | null, mark: AnswerMark | null, describedBy: { id: string, resolves: boolean } | null }} AnswerOffered
 */

/**
 * The mark under an answer: its element's id, its words, where its link
 * leads, and the glyph the stylesheet draws after the link (null without a
 * link).
 *
 * @typedef {{ id: string, text: string, href: string | null, glyph: string | null }} AnswerMark
 */

/**
 * The asked-for line: each route it names, with its country and its words,
 * and each country it counts the routes of, with how many.
 *
 * @typedef {{ named: { route: string, country: string, text: string }[], counted: { country: string, routes: number }[] }} AskedFor
 */

/**
 * The search as a reader sees it: what is typed in its box, the line its list
 * shows where it lists no row (else ""), and what its live region says.
 *
 * @typedef {{ query: string, line: string, status: string }} SearchShown
 */

/**
 * The record the device holds, as the page wrote it: the answers, the fields
 * in the order they were asked, and whether nothing was left to ask.
 *
 * @typedef {{ answers: Profile, history: string[], done: boolean }} RecordOnDevice
 */

/** A page of the site the interview never runs on: storage is written there before the interview opens, so the
 * interview reads it on its first paint. */
const OUTSIDE_THE_INTERVIEW = "/404.html";

/** In the page: the beat in milliseconds, as the built stylesheet carries it, in either unit (`tokens.css` says
 * why). */
function readBeatMsInPage() {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--motion-beat").trim();
  return parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
}

// The functions below, up to `SCREEN_NOW`, run in the page, not here: each reads nothing from this module, and
// takes the others it calls as arguments.

/** In the page: the words of `el`, trimmed; "" where there is no `el`. */
function textOfInPage(el) {
  return el ? (el.textContent ?? "").trim() : "";
}

/** In the page: the asked-for line `line` as a reader reads its marks; null where there is no line. */
function readAskedForInPage(line) {
  if (line === null) return null;
  return {
    named: [...line.querySelectorAll("[data-route]")].map((el) => ({ route: el.dataset.route, country: el.dataset.country, text: el.textContent })),
    counted: [...line.querySelectorAll("[data-routes]")].map((el) => ({ country: el.dataset.country, routes: Number(el.dataset.routes) })),
  };
}

/** In the page: `el`, a button or a search's row on `card`, as the answer a reader sees. */
function readAnswerInPage(el, card, textOf) {
  const words = el.querySelector(".opt-label") ?? el.querySelector("span");
  const label = [...words.childNodes].filter((n) => !n.classList?.contains("tick")).map((n) => n.textContent).join("").trim();
  const means = el.querySelector(".opt-means");
  const mark = card.querySelector(`.opt-mark[data-for="${CSS.escape(el.dataset.value)}"]`);
  const link = mark && mark.querySelector("a");
  const describedBy = el.getAttribute("aria-describedby");
  return {
    value: el.dataset.value,
    label,
    means: means ? textOf(means) : null,
    mark: mark && { id: mark.id, text: textOf(mark), href: link && link.getAttribute("href"), glyph: link && getComputedStyle(link, "::after").content },
    describedBy: describedBy === null ? null : { id: describedBy, resolves: document.getElementById(describedBy) !== null },
  };
}

/** In the page: the words of `card`, a question card shown to the reader, its question aside. */
function readCardWordsInPage(card, { textOf, readAnswer, readAskedFor }) {
  const box = card.querySelector("#cfilter");
  const linesAbove = [];
  for (const el of card.children) {
    if (el.classList.contains("qlabel")) break;
    if (el.matches("p.recorded")) linesAbove.push(textOf(el));
  }
  return {
    meta: textOf(card.querySelector(".qmeta")),
    arrival: linesAbove.join(" "),
    chosen: card.querySelector(".opt.sel, .copt.sel")?.dataset.value ?? "",
    askedFor: readAskedFor(card.querySelector("[data-asked-for]")),
    answers: [...card.querySelectorAll(".opts .opt, #clist .copt")].map((el) => readAnswer(el, card, textOf)),
    search: box && { query: box.value, line: textOf(card.querySelector("#clist .cnone")), status: textOf(document.getElementById("cstatus")) },
  };
}

/** In the page: which screen the interview is on, and the question card shown to the reader as `kit`'s readers read
 * it, as JSON; `{ offTheInterview }`, naming the page's address, on a page with no interview. */
function readScreenInPage(kit) {
  const app = document.getElementById("app");
  if (app === null) return JSON.stringify({ offTheInterview: location.href });
  const card = document.querySelector("#main .qcard");
  const label = card && card.querySelector(".qlabel");
  const style = label && getComputedStyle(label);
  const isShown = style !== null && style.visibility === "visible" && style.display !== "none" && label.offsetParent !== null;
  const words = isShown
    ? kit.readCardWords(card, kit)
    : { meta: "", arrival: "", chosen: "", askedFor: null, answers: [], search: null };
  return JSON.stringify({ screen: app.dataset.state, question: isShown ? kit.textOf(label) : "", ...words });
}

// The readers `readScreenInPage` is handed in the page, each carried there as its source text.
const SCREEN_READERS = `{ textOf: ${textOfInPage}, readCardWords: ${readCardWordsInPage}, readAnswer: ${readAnswerInPage}, readAskedFor: ${readAskedForInPage} }`;
// The screen as a reader sees it, read in the page.
const SCREEN_NOW = `(${readScreenInPage})(${SCREEN_READERS})`;

/** In the page: taps `value` on the question on the screen, its button or, on the search, the row `searchFor`
 * finds; says "opt" or "row" for what it tapped, or why it tapped nothing. */
function pickInPage(value, searchFor) {
  const option = document.querySelector(`#main .qcard .opt[data-value='${value}']`);
  if (option) { option.click(); return "opt"; }
  const search = document.querySelector("#cfilter");
  if (!search) return "no option";
  search.value = searchFor;
  search.dispatchEvent(new Event("input", { bubbles: true }));
  const row = document.querySelector(`#clist .copt[data-value='${value}']`);
  if (!row) return "no row";
  row.click();
  return "row";
}

/** The name the search finds `value` of `field` by: its option's label, or the value where none is. */
const nameOf = (field, value) => fieldOptions(rawDataset, field).find((o) => o.value === value)?.label ?? value;

/** Why a pick that said `how` was refused, read from the screen `before` and `after` it; null when it moved the
 * screen on. A pick that takes moves the screen in its own task, so a screen still where it was is refused. */
function refusalOf(how, before, after) {
  if (how !== "opt" && how !== "row") return how;
  const isStill = after.screen === before.screen && after.question === before.question;
  return isStill ? "the tap was refused: the screen did not move on" : null;
}

/** The interview on one page of the site, as tests and scripts drive it. */
export class InterviewPage {
  #page;
  #url;
  /** Whether a record was seeded since the interview was last opened. */
  #seeded = false;

  /** @param {PageOfInterview} site */
  constructor({ page, url }) {
    this.#page = page;
    this.#url = url;
  }

  /**
   * Puts a record of `answers` on the device, asked in the order the
   * option `history` gives (the answers' own order by default), unfinished
   * unless the option `done` says so, as the page writes one; the next
   * `open` opens on it.
   *
   * Where an answer's id comes from: it is `fields[].options[].value` in the
   * data package's `data/dataset.json`; a money question's ids are `band_<i>`,
   * from the data package's `deriveBands` (its `src/engine.ts`); and "Doesn't
   * apply to me, or I don't know" is `UNKNOWN_BAND` (its `src/questions.ts`).
   *
   * @param {Profile} answers
   * @param {{ history?: string[], done?: boolean }} [options]
   */
  async seed(answers, { history = Object.keys(answers), done = false } = {}) {
    await this.#page.goto(this.#addressOf(OUTSIDE_THE_INTERVIEW));
    await this.#page.evaluate(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(serialize(answers, history, done))})`);
    this.#seeded = true;
  }

  /**
   * Opens the interview at `path` (its first screen by default): on the
   * record seeded since it was last opened, or cold, with nothing on the
   * device, where none was.
   *
   * @param {string} [path]
   */
  async open(path = "/") {
    if (!this.#seeded) {
      await this.#page.goto(this.#addressOf(OUTSIDE_THE_INTERVIEW));
      await this.#page.evaluate("localStorage.clear()");
    }
    this.#seeded = false;
    await this.#page.goto(this.#addressOf(path));
  }

  /**
   * Answers the question on the screen, `field`, with `value`, once the
   * card's beat is over: its button, or on the search the row its name
   * finds. Returns once the screen has moved on and the page is at rest; a
   * refused answer throws, naming the field and the value.
   *
   * Where an answer's id comes from: it is `fields[].options[].value` in the
   * data package's `data/dataset.json`; a money question's ids are `band_<i>`,
   * from the data package's `deriveBands` (its `src/engine.ts`); and "Doesn't
   * apply to me, or I don't know" is `UNKNOWN_BAND` (its `src/questions.ts`).
   *
   * @param {string} field
   * @param {string} value
   */
  async answer(field, value) {
    await this.#waitUntilPastTheBeat();
    const before = await this.readScreen();
    const how = await this.#page.evaluate(`(${pickInPage})(${JSON.stringify(value)}, ${JSON.stringify(nameOf(field, value))})`);
    const refusal = refusalOf(how, before, await this.readScreen());
    if (refusal !== null) throw new Error(`${field} = ${value}: ${refusal}`);
    await this.#page.waitUntilAtRest();
  }

  /** Which screen the interview is on, and the question card as a reader sees it; throws, naming the page's
   * address, on a page that holds no interview. @returns {Promise<ScreenShown>} */
  async readScreen() {
    const { offTheInterview, ...shown } = JSON.parse(await this.#page.evaluate(SCREEN_NOW));
    if (offTheInterview !== undefined) throw new Error(`readScreen: no interview on ${offTheInterview}`);
    return shown;
  }

  /** The record the device holds, or null where it holds none. @returns {Promise<RecordOnDevice | null>} */
  async readRecord() {
    const text = await this.#page.evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`);
    if (text === null) return null;
    const { answers, history, done } = JSON.parse(text);
    return { answers, history, done: done === true };
  }

  /** Takes the record off the device. */
  async clearRecord() {
    await this.#page.evaluate(`localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`);
  }

  /**
   * Returns once the beat of the card on the screen is over, by the page's
   * own clock: the moment this read sees the card, plus the page's beat. A
   * card shows only once it is drawn, and its beat begins as it is drawn. A
   * page without the beat's token fails here rather than waiting nothing.
   */
  async #waitUntilPastTheBeat() {
    const seenAt = Number(await this.#page.evaluate("performance.now()"));
    const beatMs = Number(await this.#page.evaluate(`(${readBeatMsInPage})()`));
    if (!(beatMs > 0)) throw new Error("the page declares no --motion-beat");
    await this.#page.waitUntil(`performance.now() >= ${seenAt + beatMs}`, "the page's clock never passed the beat");
  }

  /** The site's address of `path`; throws where the interview was made without the site's `url`. */
  #addressOf(path) {
    if (!this.#url) throw new Error(`precondition: an InterviewPage that opens ${path} is made with the site's url`);
    return this.#url(path);
  }
}
