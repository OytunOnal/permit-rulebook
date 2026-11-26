// @level infrastructure
/**
 * The probes `InterviewPage` sends into the page, as the expressions it
 * evaluates there: the question card's markup lives here alone, in `MARKUP`,
 * which each probe is handed. Each function below runs in the page, not here:
 * it reads nothing from this module, and takes the markup and the others it
 * calls as arguments.
 */

/** The card's answer buttons, in their list. */
const BUTTONS = ".opts .opt";
/** The search's rows, in its list. */
const ROWS = "#clist .copt";

/** The question card's markup, as the page draws it; handed to each probe below. */
const MARKUP = {
  card: "#main .qcard",
  label: ".qlabel",
  meta: ".qmeta",
  recorded: "p.recorded",
  button: ".opt",
  buttons: BUTTONS,
  chosen: ".opt.sel, .copt.sel",
  answers: `${BUTTONS}, ${ROWS}`,
  askedFor: "[data-asked-for]",
  search: "#cfilter",
  row: ROWS,
  noRow: "#clist .cnone",
  statusId: "cstatus",
};

/** The markup as the page is handed it, in a probe's source. */
const MARKUP_SOURCE = JSON.stringify(MARKUP);

/** In the page: the beat in milliseconds, as the built stylesheet carries it, in either unit (`tokens.css` says
 * why). */
function readBeatMsInPage() {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--motion-beat").trim();
  return parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
}

/** In the page: the words of `el`, trimmed; "" where there is no `el`. */
function readTextInPage(el) {
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
function readAnswerInPage(el, card, readText) {
  const words = el.querySelector(".opt-label") ?? el.querySelector("span");
  const label = [...words.childNodes].filter((n) => !n.classList?.contains("tick")).map((n) => n.textContent).join("").trim();
  const means = el.querySelector(".opt-means");
  const mark = card.querySelector(`.opt-mark[data-for="${CSS.escape(el.dataset.value)}"]`);
  const link = mark && mark.querySelector("a");
  const describedBy = el.getAttribute("aria-describedby");
  return {
    value: el.dataset.value,
    label,
    means: means ? readText(means) : null,
    mark: mark && { id: mark.id, text: readText(mark), href: link && link.getAttribute("href"), glyph: link && getComputedStyle(link, "::after").content },
    describedBy: describedBy === null ? null : { id: describedBy, resolves: document.getElementById(describedBy) !== null },
  };
}

/** In the page: the words of `card`, a question card shown to the reader, its question aside. */
function readCardWordsInPage(card, { markup, readText, readAnswer, readAskedFor }) {
  const box = card.querySelector(markup.search);
  const linesAbove = [];
  for (const el of card.children) {
    if (el.matches(markup.label)) break;
    if (el.matches(markup.recorded)) linesAbove.push(readText(el));
  }
  return {
    meta: readText(card.querySelector(markup.meta)),
    arrival: linesAbove.join(" "),
    chosen: card.querySelector(markup.chosen)?.dataset.value ?? "",
    askedFor: readAskedFor(card.querySelector(markup.askedFor)),
    answers: [...card.querySelectorAll(markup.answers)].map((el) => readAnswer(el, card, readText)),
    search: box && { query: box.value, line: readText(card.querySelector(markup.noRow)) },
  };
}

/** In the page: which screen the interview is on, what its live region announces, and the question card shown to
 * the reader as `readers` read it, as JSON; `{ offTheInterview }`, naming the page's address, on a page with no interview. */
function readScreenInPage(readers) {
  const app = document.getElementById("app");
  if (app === null) return JSON.stringify({ offTheInterview: location.href });
  const card = document.querySelector(readers.markup.card);
  const label = card && card.querySelector(readers.markup.label);
  const style = label && getComputedStyle(label);
  const isShown = style !== null && style.visibility === "visible" && style.display !== "none" && label.offsetParent !== null;
  const words = isShown
    ? readers.readCardWords(card, readers)
    : { meta: "", arrival: "", chosen: "", askedFor: null, answers: [], search: null };
  const announced = readers.readText(document.getElementById(readers.markup.statusId));
  return JSON.stringify({ screen: app.dataset.state, question: isShown ? readers.readText(label) : "", announced, ...words });
}

// The markup and the readers `readScreenInPage` is handed in the page, each reader carried there as its source text.
const SCREEN_READERS = `{ markup: ${MARKUP_SOURCE}, readText: ${readTextInPage}, readCardWords: ${readCardWordsInPage}, readAnswer: ${
  readAnswerInPage}, readAskedFor: ${readAskedForInPage} }`;

/** In the page: once the screen `readScreen` reads with `readers` is another than `from` (its screen or its
 * question), and is not a question card still hidden from the reader, that screen, read in the same task as the
 * change is seen. */
function readScreenOnceChangedInPage(from, readScreen, readers) {
  return new Promise((resolve) => {
    const check = () => {
      const now = JSON.parse(readScreen(readers));
      const isUnchanged = now.screen === from.screen && now.question === from.question;
      const isQuestionHidden = now.screen === "questions" && now.question === "";
      if (isUnchanged || isQuestionHidden) return;
      watching.disconnect();
      resolve(JSON.stringify(now));
    };
    const watching = new MutationObserver(check);
    watching.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true });
    check();
  });
}

/** In the page: the asked-for line `el` against `isInsideCard`: inside the card or not, overflowing its box, and
 * how many lines it wraps to; null where there is no line. */
function readAskedForBoxInPage(el, isInsideCard) {
  if (el === null) return null;
  const box = el.getBoundingClientRect();
  const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
  return { isInsideCard: isInsideCard(box), isOverflowing: el.scrollWidth > el.clientWidth, lines: Math.round(box.height / lineHeight) };
}

/** In the page: where the question card sits, where the focus is against its first control, how many animations
 * it runs, where each answer sits, and the asked-for line's box, as JSON; null where no card is drawn. The first
 * control is the one the page focuses: the first button or the search's box, else the question's heading. */
function readCardLayoutInPage(markup, readAskedForBox) {
  const card = document.querySelector(markup.card);
  if (card === null) return JSON.stringify(null);
  const cardBox = card.getBoundingClientRect();
  const isInsideCard = (b) => b.left >= cardBox.left && b.right <= cardBox.right && b.top >= cardBox.top && b.bottom <= cardBox.bottom;
  const firstControl = card.querySelector(`${markup.button}, ${markup.search}`) ?? card.querySelector(markup.label);
  const active = document.activeElement;
  const answers = [...card.querySelectorAll(markup.answers)].map((el) => {
    const box = el.getBoundingClientRect();
    const centre = { x: Math.round(box.left + box.width / 2), y: Math.round(box.top + box.height / 2) };
    return { value: el.dataset.value, centre, isInsideCard: isInsideCard(box) };
  });
  return JSON.stringify({
    top: cardBox.top,
    left: cardBox.left,
    focus: {
      isOnFirstControl: firstControl !== null && active === firstControl,
      isInCard: active !== null && card.contains(active),
      isFirstControlShown: firstControl !== null && getComputedStyle(firstControl).visibility === "visible",
    },
    animations: card.getAnimations({ subtree: true }).length,
    answers,
    askedFor: readAskedForBox(card.querySelector(markup.askedFor), isInsideCard),
  });
}

/** In the page: the id of the answer on the question card under `point`, or "" where it is on none. */
function readAnswerAtInPage(markup, { x, y }) {
  const answer = document.elementFromPoint(x, y)?.closest(markup.answers);
  return answer && answer.closest(markup.card) ? answer.dataset.value : "";
}

/** In the page: answers `value` to the question on the screen with a click on its button or, on the search, on the
 * row `searchFor` finds; says which it clicked as `kind`, "button" or "row", or why it clicked nothing as
 * `refusal`. */
function answerInPage(markup, value, searchFor) {
  const button = document.querySelector(`${markup.card} ${markup.button}[data-value='${value}']`);
  if (button) { button.click(); return { kind: "button", refusal: null }; }
  const search = document.querySelector(markup.search);
  if (!search) return { kind: null, refusal: "no option" };
  search.value = searchFor;
  search.dispatchEvent(new Event("input", { bubbles: true }));
  const row = document.querySelector(`${markup.row}[data-value='${value}']`);
  if (!row) return { kind: null, refusal: "no row" };
  row.click();
  return { kind: "row", refusal: null };
}

/** In the page: answers the question on the screen with the first answer it offers, a click on its first button
 * or, on the search, on the first row it lists; says which it clicked as `kind` and its id as `value`, or why it
 * clicked nothing as `refusal`. */
function answerFirstInPage(markup) {
  const button = document.querySelector(`${markup.card} ${markup.buttons}`);
  if (button) { button.click(); return { kind: "button", value: button.dataset.value, refusal: null }; }
  const search = document.querySelector(`${markup.card} ${markup.search}`);
  if (!search) return { kind: null, value: "", refusal: "the screen offered no answer" };
  if (!document.querySelector(markup.row)) {
    // An untouched search lists no row; one letter, which nearly every country's name holds, lists them.
    search.value = "a";
    search.dispatchEvent(new Event("input", { bubbles: true }));
  }
  const row = document.querySelector(markup.row);
  if (!row) return { kind: null, value: "", refusal: "the search listed no row" };
  const { value } = row.dataset;
  row.click();
  return { kind: "row", value, refusal: null };
}

/** In the page: the first answer offered answered by `answerFirst`, then, in the same task, before the browser
 * draws a frame, the card's layout as `readCardLayout` reads it with `readAskedForBox`, and the caller's
 * `readAtOnce` (null for none), as JSON. */
function answerFirstAndReadInPage(markup, { answerFirst, readCardLayout, readAskedForBox }, readAtOnce) {
  const answered = answerFirst(markup);
  const read = readAtOnce === null ? null : readAtOnce.probe(...readAtOnce.args);
  return JSON.stringify({ ...answered, layout: JSON.parse(readCardLayout(markup, readAskedForBox)), readAtOnce: read });
}

/** In the page: whether the screen shows a search. */
function isSearchShownInPage(markup) {
  return document.querySelector(`${markup.card} ${markup.search}`) !== null;
}

/** In the page: focuses the search's box, where it was not, and selects what it holds, so typing replaces it. */
function focusSearchInPage(markup) {
  const box = document.querySelector(`${markup.card} ${markup.search}`);
  if (document.activeElement !== box) box.focus();
  box.select();
}

/** In the page: whether the search holds `typed` and its list has drawn for it, a row or its line. */
function isSearchListedForInPage(markup, typed) {
  const box = document.querySelector(`${markup.card} ${markup.search}`);
  return box !== null && box.value === typed && document.querySelector(`${markup.row}, ${markup.noRow}`) !== null;
}

/** The source of a call in the page of `probe`, one of the functions above, handed the markup and then `args`,
 * each given as its source text. */
const callWithMarkup = (probe, ...args) => `(${probe})(${[MARKUP_SOURCE, ...args].join(", ")})`;

/** Each probe as the expression `InterviewPage` evaluates in the page. */
export const questionCardProbes = {
  /** The beat in milliseconds. */
  beatMsNow: `(${readBeatMsInPage})()`,
  /** The screen as a reader sees it, as JSON. */
  screenNow: `(${readScreenInPage})(${SCREEN_READERS})`,
  /** The screen as a reader sees it once it is another than `from`, as JSON. */
  readScreenOnceChangedFrom: ({ screen, question }) =>
    `(${readScreenOnceChangedInPage})(${JSON.stringify({ screen, question })}, ${readScreenInPage}, ${SCREEN_READERS})`,
  /** Where the question card and its parts sit, and the focus, as JSON. */
  cardLayoutNow: callWithMarkup(readCardLayoutInPage, readAskedForBoxInPage),
  /** The first answer offered answered, and read in the same task with `readAtOnce`, a probe and its arguments. */
  answerFirstAndRead: (readAtOnce) => callWithMarkup(answerFirstAndReadInPage,
    `{ answerFirst: ${answerFirstInPage}, readCardLayout: ${readCardLayoutInPage}, readAskedForBox: ${readAskedForBoxInPage} }`,
    readAtOnce ? `{ probe: ${readAtOnce.probe}, args: ${JSON.stringify(readAtOnce.args ?? [])} }` : "null"),
  /** Whether the screen shows a search. */
  isSearchShown: callWithMarkup(isSearchShownInPage),
  /** The search's box focused and its words selected. */
  focusSearch: callWithMarkup(focusSearchInPage),
  /** Whether the search holds `typed` and has listed for it. */
  isSearchListedFor: (typed) => callWithMarkup(isSearchListedForInPage, JSON.stringify(typed)),
  /** Where a real tap lands on the button of `value`. */
  buildButtonSelector: (value) => `${MARKUP.card} ${MARKUP.button}[data-value='${value}']`,
  /** The answer under `point`. */
  readAnswerAt: (point) => callWithMarkup(readAnswerAtInPage, JSON.stringify(point)),
  /** The answer `value` clicked on the question on the screen, or on the search the row `searchFor` finds. */
  answer: (value, searchFor) => callWithMarkup(answerInPage, JSON.stringify(value), JSON.stringify(searchFor)),
};
