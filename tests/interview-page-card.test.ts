import { describe, expect, it } from "vitest";
import { fieldOptions, optionMeans, remainingQuestions, type Profile } from "permit-rulebook-data";
import { arrivalLineHtml } from "../src/lib/arrival-line.js";
import { EDIT_LINE, countriesToSearchLine, questionCounter } from "../src/lib/copy/interview.js";
import { arrivalOf } from "../src/lib/scope.js";
import { url } from "../src/lib/site.js";
import { DESK } from "../scripts/browser/browser.mjs";
import { InterviewPage } from "../scripts/interview-page.mjs";
import { skipReason, warnNotWalked, withSite } from "./browser-walk.js";
import { BEFORE_PASSPORT, FIRST_ANSWER, ds, first, labelOf, withInterview } from "./interview-on-site.js";
import { plainTextOf } from "./reader-pages.js";

/**
 * `InterviewPage.readScreen()` on the built site (#485): the question card's
 * words as a reader sees them — its meta line, the line of an arrival, the
 * answer chosen, the asked-for line, each answer offered with what it means
 * and the mark under it, and the search.
 */
const skipped = skipReason();
if (skipped) warnNotWalked("THE QUESTION CARD READ THROUGH INTERVIEWPAGE", skipped);

/** The record of a reader who has answered nothing, as an arrival reads it. */
const NO_RECORD = { answers: {}, order: [] };

/** The first question's card, read from a cold start. */
const coldCard = () => withInterview(async (interview) => {
  await interview.open();
  return interview.readScreen();
});

/** In the page: the ledger opened, and the ✎ of `field`'s row tapped. */
function tapPencilInPage(field: string): string {
  (document.getElementById("decl") as HTMLDetailsElement).open = true;
  document.querySelector<HTMLElement>(`#decl-list [data-field="${field}"]`)!.click();
  return "tapped";
}

/** The first question reopened by its ✎ on a record of its answer, read once the page is at rest. */
const reopenedCard = () => withSite(async (site) => {
  const interview = new InterviewPage(site);
  await interview.seed(FIRST_ANSWER);
  await interview.open();
  await site.page.evaluate(`(${tapPencilInPage})(${JSON.stringify(first.field)})`);
  await site.page.waitUntilAtRest();
  return interview.readScreen();
}, DESK);

/** The card a route page's call to action opens on, with nothing on the record. */
const arrivedCard = (search: string) => withInterview(async (interview) => {
  await interview.open(`/${search}`);
  return interview.readScreen();
});

/** The card `answers` open on. */
const seededCard = (answers: Profile) => withInterview(async (interview) => {
  await interview.seed(answers);
  await interview.open();
  return interview.readScreen();
});

describe.skipIf(skipped !== null)("readScreen() reads the question card as a reader sees it", () => {
  it("a cold card: its meta line, each answer's value and words, nothing chosen, no arrival line, no search", async () => {
    const card = await coldCard();
    expect(card.meta).toBe(questionCounter(1, remainingQuestions(ds, {}).length));
    expect(card.answers.map(({ value, label }) => ({ value, label })))
      .toEqual(first.options.map(({ value, label }) => ({ value, label })));
    expect([card.chosen, card.arrival, card.search]).toEqual(["", "", null]);
  }, 120000);

  it("a question reopened by its ✎: the edit line, and the answer on file chosen", async () => {
    const card = await reopenedCard();
    expect(card.question, "precondition: the ✎ reopened the first question").toBe(first.label);
    expect([card.meta, card.chosen]).toEqual([EDIT_LINE, FIRST_ANSWER[first.field]]);
  }, 120000);

  it("an arrival from a route page: the arrival line above the question, as the page words it", async () => {
    const search = "?route=de-blue-card-general";
    const card = await arrivedCard(search);
    expect(card.arrival).toBe(plainTextOf(arrivalLineHtml(ds, arrivalOf(ds, search, NO_RECORD).line!, new Set())));
  }, 120000);
});

describe.skipIf(skipped !== null)("readScreen() reads the question card as a reader sees it", () => {
  it("each answer's means line, where the dataset gives one, and none where it gives none", async () => {
    const card = await seededCard({ destination: "nl" });
    const situation = ds.fields.find((f) => f.id === "situation")!;
    expect(card.question, "precondition: the situation question is on the screen").toBe(situation.label);
    expect(card.answers.map((a) => [a.value, a.means !== null]))
      .toEqual(situation.options!.map((o) => [o.value, optionMeans(o, ds, { destination: "nl" }) !== ""]));
  }, 120000);

  it("a marked answer: its mark, linked, and the answer described by it; the others neither", async () => {
    const card = await seededCard({ destination: "all", situation: "research" });
    const marked = card.answers.filter((a) => a.mark !== null);
    expect(marked.map((a) => a.value), "precondition: France alone is marked").toEqual(["fr"]);
    const { mark, describedBy } = marked[0]!;
    expect(mark!.text).not.toBe("");
    expect(mark!.href).toBe(url("/france/talent-researcher"));
    expect(describedBy).toEqual({ id: mark!.id, resolves: true });
    expect(card.answers.filter((a) => a.value !== "fr").map((a) => a.describedBy)).toEqual([null, null, null]);
  }, 120000);

  it("the asked-for line: the countries it counts the routes of, and no route named", async () => {
    const card = await seededCard({ destination: "all", citizenship: "IN" });
    expect(card.question, "precondition: the situation question is on the screen").toBe(labelOf("situation"));
    expect(card.askedFor!.named).toEqual([]);
    expect(card.askedFor!.counted.map((c) => c.country)).toEqual(["DE", "FR", "ES", "NL"]);
    expect(card.askedFor!.counted.every((c) => c.routes > 0)).toBe(true);
  }, 120000);

  it("the search: what is typed in it, its line and the live region, and the rows it lists as the answers", async () => {
    const card = await seededCard(BEFORE_PASSPORT);
    expect(card.question, "precondition: the passport question is on the screen").toBe(labelOf("citizenship"));
    expect(card.search).toEqual({ query: "", line: countriesToSearchLine(fieldOptions(ds, "citizenship").length), status: "" });
    expect(card.answers, "an untouched search lists no rows").toEqual([]);
  }, 120000);
});
