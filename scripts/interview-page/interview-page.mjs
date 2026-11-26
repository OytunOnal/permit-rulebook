// @level infrastructure
import rawDataset from "permit-rulebook-data/data/dataset.json" with { type: "json" };
import { fieldOptions } from "permit-rulebook-data";
import { STORAGE_KEY, serialize } from "../../src/lib/record.ts";
import { questionCardProbes } from "./probes/question-card-probes.mjs";

/**
 * The interview as tests and scripts drive it: `new InterviewPage(site)` takes
 * the page a walk is handed on the site, and seeds the record on the device,
 * opens the interview, answers the question on the screen, reads which screen
 * is shown, and reads or clears the stored record. The storage key and the
 * record's format stay in here, and the question card's markup in the probes
 * `question-card-probes.mjs` holds for it, so a change to any of them is made
 * there alone.
 *
 * @typedef {import("../browser/browser.mjs").BrowserPage} BrowserPage
 * @typedef {import("permit-rulebook-data").Profile} Profile
 */

/**
 * The page on the site an interview is driven on: the walk's page, and `url`,
 * which makes the site's address of a path. Without `url` the interview
 * answers and reads the page it is on, and cannot seed or open one.
 *
 * @typedef {{ page: Pick<BrowserPage, "goto" | "evaluate" | "waitUntil" | "waitUntilAtRest" | "tapOn" | "type" | "pressEnter">, url?: (path: string) => string }} PageOfInterview
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
 * Where the question card sits, as a reader's eye finds it, in viewport
 * pixels: its `top` and `left`; the `focus` against the card's first control
 * (the one the page focuses: the first button or the search's box, else the
 * question's heading), whether it is in the card, and whether that control
 * can be seen; how many `animations` the card runs; each answer offered, by
 * its id, with its centre and whether it lies inside the card; and the
 * asked-for line's box, whether it lies inside the card, overflows, and how
 * many lines it wraps to (null where the card has no line).
 *
 * @typedef {{ top: number, left: number, focus: { isOnFirstControl: boolean, isInCard: boolean, isFirstControlShown: boolean }, animations: number, answers: { value: string, centre: Point, isInsideCard: boolean }[], askedFor: { isInsideCard: boolean, isOverflowing: boolean, lines: number } | null }} CardLayout
 */

/** A point of the viewport, in pixels. @typedef {{ x: number, y: number }} Point */

/**
 * The record the device holds, as the page wrote it: the answers, the fields
 * in the order they were asked, and whether nothing was left to ask.
 *
 * @typedef {{ answers: Profile, history: string[], done: boolean }} RecordOnDevice
 */

/** A page of the site the interview never runs on: storage is written there before the interview opens, so the
 * interview reads it on its first paint. */
const OUTSIDE_THE_INTERVIEW = "/404.html";

/** The storage key as a probe's source writes it. */
const STORAGE_KEY_SOURCE = JSON.stringify(STORAGE_KEY);

/** Finds the name the search finds `value` of `field` by: its option's label, or the value where none is. */
const findSearchName = (field, value) => fieldOptions(rawDataset, field).find((o) => o.value === value)?.label ?? value;

/**
 * An answer's gesture as the page reported it: which control it answered on (`kind`, "button" or "row"), or why
 * it answered on none (`refusal`).
 *
 * @typedef {{ kind: "button" | "row" | null, refusal: string | null }} Answered
 */

/** Finds why an answer `answered` reports was refused, read from it and from the screen `before` and `after` it;
 * null when it moved the screen on. An answer that takes moves the screen in its own task, so a screen still where
 * it was is refused. @param {Answered} answered */
function findRefusal({ refusal }, before, after) {
  if (refusal !== null) return refusal;
  const isStill = after.screen === before.screen && after.question === before.question;
  return isStill ? "the tap was refused: the screen did not move on" : null;
}

/** Parses the screen the page read as `json`; throws, naming the `caller` and the page's address, where the page
 * held no interview. @returns {ScreenShown} */
function parseScreen(json, caller) {
  const { offTheInterview, ...shown } = JSON.parse(json);
  if (offTheInterview !== undefined) throw new Error(`${caller}: no interview on ${offTheInterview}`);
  return shown;
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
    await this.#page.goto(this.#makeAddress(OUTSIDE_THE_INTERVIEW));
    await this.#page.evaluate(`localStorage.setItem(${STORAGE_KEY_SOURCE}, ${JSON.stringify(serialize(answers, history, done))})`);
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
      await this.#page.goto(this.#makeAddress(OUTSIDE_THE_INTERVIEW));
      await this.#page.evaluate("localStorage.clear()");
    }
    this.#seeded = false;
    await this.#page.goto(this.#makeAddress(path));
  }

  /**
   * Answers the question on the screen, `field`, with `value`, once the
   * card's beat is over, by the gesture the option `by` names:
   *
   * - `"script"` (the default): a click dispatched in the page on its
   *   button, or on the search on the row its name finds;
   * - `"hand"`: as a reader does, a real tap on its button, or on the search
   *   its name typed with the keyboard and Enter pressed.
   *
   * Returns once the screen has moved on and the page is at rest; a refused
   * answer throws, naming the field and the value.
   *
   * Where an answer's id comes from: it is `fields[].options[].value` in the
   * data package's `data/dataset.json`; a money question's ids are `band_<i>`,
   * from the data package's `deriveBands` (its `src/engine.ts`); and "Doesn't
   * apply to me, or I don't know" is `UNKNOWN_BAND` (its `src/questions.ts`).
   *
   * @param {string} field
   * @param {string} value
   * @param {{ by?: "script" | "hand" }} [options]
   */
  async answer(field, value, { by = "script" } = {}) {
    if (by !== "script" && by !== "hand") throw new Error(`precondition: an answer is made by "script" or "hand", not "${by}"`);
    const answerOnPage = by === "hand"
      ? (before) => this.#answerByHand(field, value, before)
      : () => this.#page.evaluate(questionCardProbes.answer(value, findSearchName(field, value)));
    await this.#answerOnceAndCheck(answerOnPage, () => `${field} = ${value}`);
  }

  /**
   * Answers the question on the screen with the first answer it offers, once
   * the card's beat is over: a click dispatched in the page on its first
   * button, or on the search on the first row it lists once a letter is
   * typed. With the option `readAtOnce`, a function serialised into the page
   * (closing over nothing) and its `args`, the page runs it in the tap's own
   * task, before the browser draws a frame; the card's layout is read in that
   * task too. Returns the id answered, that layout and what `readAtOnce`
   * returned (null without it), once the screen has moved on and the page is
   * at rest; a refused answer throws.
   *
   * @param {{ readAtOnce?: { probe: (...args: any[]) => unknown, args?: unknown[] } }} [options]
   * @returns {Promise<{ value: string, layoutAtOnce: CardLayout | null, readAtOnce: unknown }>}
   */
  async answerFirstOffered({ readAtOnce } = {}) {
    const answerOnPage = async () => JSON.parse(await this.#page.evaluate(questionCardProbes.answerFirstAndRead(readAtOnce)));
    const answered = await this.#answerOnceAndCheck(answerOnPage, ({ value }) => `the first answer offered${value ? ` (${value})` : ""}`);
    return { value: answered.value, layoutAtOnce: answered.layout, readAtOnce: answered.readAtOnce };
  }

  /**
   * Types `text` into the search on the screen with the keyboard, in place of
   * what its box held, and returns once its list has drawn for it: the rows
   * it finds, or its line. Throws where the screen shows no search.
   *
   * @param {string} text
   */
  async searchFor(text) {
    if (!(await this.#page.evaluate(questionCardProbes.isSearchShown))) throw new Error(`searchFor: no search on the screen to type "${text}" into`);
    await this.#page.evaluate(questionCardProbes.focusSearch);
    await this.#page.type(text);
    await this.#page.waitUntil(questionCardProbes.isSearchListedFor(text), `the search listed nothing for "${text}"`);
  }

  /**
   * Answers once the card's beat is over, by `answerOnPage`, handed the screen
   * before it and returning what the page reported (`Answered`, with what
   * else the gesture read); returns that report once the screen has moved on
   * and the page is at rest. A refused answer throws, named by `nameAnswer`
   * from the report.
   */
  async #answerOnceAndCheck(answerOnPage, nameAnswer) {
    await this.#waitUntilPastTheBeat();
    const before = await this.readScreen();
    const answered = await answerOnPage(before);
    const refusal = findRefusal(answered, before, await this.readScreen());
    if (refusal !== null) throw new Error(`${nameAnswer(answered)}: ${refusal}`);
    await this.#page.waitUntilAtRest();
    return answered;
  }

  /** Answers `value` to `field` on the screen `before` showed as a reader does: a real tap on its button, or its
   * name searched for and Enter pressed. @returns {Promise<Answered>} */
  async #answerByHand(field, value, { answers, search }) {
    if (search !== null) {
      await this.searchFor(findSearchName(field, value));
      await this.#page.pressEnter();
      await this.#page.waitUntilAtRest();
      return { kind: "row", refusal: null };
    }
    if (!answers.some((a) => a.value === value)) return { kind: null, refusal: "no option" };
    await this.#page.tapOn(questionCardProbes.buildButtonSelector(value));
    await this.#page.waitUntilAtRest();
    return { kind: "button", refusal: null };
  }

  /** Which screen the interview is on, and the question card as a reader sees it; throws, naming the page's
   * address, on a page that holds no interview. @returns {Promise<ScreenShown>} */
  async readScreen() {
    return parseScreen(await this.#page.evaluate(questionCardProbes.screenNow), "readScreen");
  }

  /**
   * Waits in the page until the screen is another than `from` (a screen this
   * interview read: another screen, or another question) and its question is
   * shown, and returns it as read in the same task the page drew it in, before
   * the next gesture or frame. A history move draws on the browser's turn,
   * not the gesture's, so a caller waits here after one. Throws, naming the
   * page's address, where the interview left the page.
   *
   * @param {ScreenShown} from
   * @returns {Promise<ScreenShown>}
   */
  async waitUntilScreenChanges(from) {
    const what = `the screen never changed from "${from.screen} ${from.question}"`;
    return parseScreen(String(await this.#page.waitUntil(questionCardProbes.readScreenOnceChangedFrom(from), what)), "waitUntilScreenChanges");
  }

  /** Where the question card sits and where the focus is; null where no card is drawn. @returns {Promise<CardLayout | null>} */
  async readCardLayout() {
    return JSON.parse(await this.#page.evaluate(questionCardProbes.cardLayoutNow));
  }

  /** The id of the answer on the question card under `point`, or "" where the point is on none, as the page's own
   * hit-test finds it. @param {Point} point @returns {Promise<string>} */
  async readAnswerAt(point) {
    return this.#page.evaluate(questionCardProbes.readAnswerAt(point));
  }

  /** The record the device holds, or null where it holds none. @returns {Promise<RecordOnDevice | null>} */
  async readRecord() {
    const text = await this.#page.evaluate(`localStorage.getItem(${STORAGE_KEY_SOURCE})`);
    if (text === null) return null;
    const { answers, history, done } = JSON.parse(text);
    return { answers, history, done: done === true };
  }

  /** Takes the record off the device. */
  async clearRecord() {
    await this.#page.evaluate(`localStorage.removeItem(${STORAGE_KEY_SOURCE})`);
  }

  /**
   * Returns once the beat of the card on the screen is over, by the page's
   * own clock: the moment this read sees the card, plus the page's beat. A
   * card shows only once it is drawn, and its beat begins as it is drawn. A
   * page without the beat's token fails here rather than waiting nothing.
   */
  async #waitUntilPastTheBeat() {
    const seenAt = Number(await this.#page.evaluate("performance.now()"));
    const beatMs = Number(await this.#page.evaluate(questionCardProbes.beatMsNow));
    if (!(beatMs > 0)) throw new Error("the page declares no --motion-beat");
    await this.#page.waitUntil(`performance.now() >= ${seenAt + beatMs}`, "the page's clock never passed the beat");
  }

  /** Makes the site's address of `path`; throws where the interview was made without the site's `url`. */
  #makeAddress(path) {
    if (!this.#url) throw new Error(`precondition: an InterviewPage that opens ${path} is made with the site's url`);
    return this.#url(path);
  }
}
