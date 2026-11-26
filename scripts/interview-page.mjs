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
 * @typedef {{ page: Pick<BrowserPage, "goto" | "evaluate" | "waitUntilAtRest">, url?: (path: string) => string }} PageOfInterview
 */

/**
 * The screen as a reader tells one from the next: which screen the interview
 * is on (`questions` or `results`), and the label of the question on it, or
 * "" where none is.
 *
 * @typedef {{ screen: string, question: string }} ScreenShown
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

/** In the page: which screen the interview is on, and its question's label, as JSON. */
function readScreenInPage() {
  const label = document.querySelector("#main .qcard .qlabel");
  return JSON.stringify({ screen: document.getElementById("app").dataset.state, question: label ? label.textContent.trim() : "" });
}

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
   * Answers the question on the screen, `field`, with `value`: its button,
   * or on the search the row its name finds. Returns once the screen has
   * moved on and the page is at rest; a refused answer throws, naming the
   * field and the value. A card a gesture drew refuses every tap for its
   * beat, so a caller waits the beat out first.
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
    const before = await this.readScreen();
    const how = await this.#page.evaluate(`(${pickInPage})(${JSON.stringify(value)}, ${JSON.stringify(nameOf(field, value))})`);
    const refusal = refusalOf(how, before, await this.readScreen());
    if (refusal !== null) throw new Error(`${field} = ${value}: ${refusal}`);
    await this.#page.waitUntilAtRest();
  }

  /** Which screen the interview is on, and its question. @returns {Promise<ScreenShown>} */
  async readScreen() {
    return JSON.parse(await this.#page.evaluate(`(${readScreenInPage})()`));
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

  /** The site's address of `path`; throws where the interview was made without the site's `url`. */
  #addressOf(path) {
    if (!this.#url) throw new Error(`precondition: an InterviewPage that opens ${path} is made with the site's url`);
    return this.#url(path);
  }
}
