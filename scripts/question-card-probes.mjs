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
  /** The tap of `value` on the question on the screen, or on the search the row `searchFor` finds. */
  pickOf: (value, searchFor) => `(${pickInPage})(${JSON.stringify(value)}, ${JSON.stringify(searchFor)})`,
};
