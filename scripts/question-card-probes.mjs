// @level infrastructure
/**
 * The probes `InterviewPage` sends into the page, as the expressions it
 * evaluates there: the question card's markup lives here and in
 * `interview-page.mjs` alone. Each function below runs in the page, not
 * here: it reads nothing from this module, and takes the others it calls as
 * arguments.
 */

/** In the page: the beat in milliseconds, as the built stylesheet carries it, in either unit (`tokens.css` says
 * why). */
function readBeatMsInPage() {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--motion-beat").trim();
  return parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
}

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

/** In the page: once the screen `readScreenNow` reads is another than `from` (its screen or its question), and is
 * not a question card still hidden from the reader, that screen, read in the same task as the change is seen. */
function readScreenOnceChangedInPage(from, readScreenNow) {
  return new Promise((resolve) => {
    const check = () => {
      const now = JSON.parse(readScreenNow());
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
function readCardLayoutInPage(readAskedForBox) {
  const card = document.querySelector("#main .qcard");
  if (card === null) return JSON.stringify(null);
  const cardBox = card.getBoundingClientRect();
  const isInsideCard = (b) => b.left >= cardBox.left && b.right <= cardBox.right && b.top >= cardBox.top && b.bottom <= cardBox.bottom;
  const firstControl = card.querySelector(".opt, #cfilter") ?? card.querySelector(".qlabel");
  const active = document.activeElement;
  const answers = [...card.querySelectorAll(".opts .opt, #clist .copt")].map((el) => {
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
    askedFor: readAskedForBox(card.querySelector("[data-asked-for]"), isInsideCard),
  });
}

/** In the page: the id of the answer on the question card under `point`, or "" where it is on none. */
function readAnswerAtInPage({ x, y }) {
  const answer = document.elementFromPoint(x, y)?.closest("#main .qcard .opt, #main .qcard .copt");
  return answer?.dataset.value ?? "";
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

/** Each probe as the expression `InterviewPage` evaluates in the page. */
export const questionCardProbes = {
  /** The beat in milliseconds. */
  beatMsNow: `(${readBeatMsInPage})()`,
  /** The screen as a reader sees it, as JSON. */
  screenNow: `(${readScreenInPage})(${SCREEN_READERS})`,
  /** The screen as a reader sees it once it is another than `from`, as JSON. */
  screenOnceChangedFrom: ({ screen, question }) =>
    `(${readScreenOnceChangedInPage})(${JSON.stringify({ screen, question })}, () => (${readScreenInPage})(${SCREEN_READERS}))`,
  /** Where the question card and its parts sit, and the focus, as JSON. */
  cardLayoutNow: `(${readCardLayoutInPage})(${readAskedForBoxInPage})`,
  /** The answer under `point`. */
  answerAt: (point) => `(${readAnswerAtInPage})(${JSON.stringify(point)})`,
  /** The tap of `value` on the question on the screen, or on the search the row `searchFor` finds. */
  pickOf: (value, searchFor) => `(${pickInPage})(${JSON.stringify(value)}, ${JSON.stringify(searchFor)})`,
};
