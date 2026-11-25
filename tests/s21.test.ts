import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  DESTINATION_FIELD, SITUATION_FIELD, fieldOptions, remainingQuestions, situationsAsked, type Country, type Dataset,
} from "permit-rulebook-data";
import { notScoredMarkHtml, questionCardHtml } from "../src/lib/question.js";
import { SITUATION_COUNTRY_FIELD, markUnder, notScoredFor } from "../src/lib/situations.js";
import { IS_QUOTED_NOT_CHECKED, READ_IT_HERE, notCheckedQuotedLine } from "../src/lib/copy/interview.js";
import { unscoredHeadline, unscoredTallyLine } from "../src/lib/copy/verdict.js";
import { url } from "../src/lib/site.js";
import { countryNamed, saidLineOf, verdictOn, type SaidLine } from "./verdict-cards.js";
import { countryQuestion } from "./s21-country-question.js";

const ds = dataset as unknown as Dataset;

const france = ds.countries.find((c) => c.code === "FR")!;
const researcher = france.routes.find((r) => r.id === "fr-talent-chercheur")!;

/**
 * Each country's line on the four-country verdict for a declared situation,
 * by the country's name: the s19 sentence where the line carries one, or null.
 */
function tallyLinesFor(situation: string | undefined, data: Dataset = ds): Map<string, SaidLine | null> {
  const answers = { [DESTINATION_FIELD]: "all", ...(situation === undefined ? {} : { [SITUATION_FIELD]: situation }) };
  const verdict = verdictOn(data, answers);
  if (verdict.layout.kind !== "countries") throw new Error("the four-country verdict draws no country sections");
  return new Map(verdict.layout.sections.map((s) => [countryNamed(s.country), saidLineOf(verdict, s)]));
}

/** Question 3, drawn by the one renderer, for a reader on the four-country path who declared this situation. */
const countryScreen = (situation: string): string =>
  questionCardHtml({
    dataset: ds, question: countryQuestion(), answers: { [DESTINATION_FIELD]: "all", [SITUATION_FIELD]: situation },
    asked: [DESTINATION_FIELD, SITUATION_FIELD], editing: null, total: 15,
  });

/** The marks on a drawn screen, keyed by the option they sit under. */
function marksOn(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<small class="opt-mark"[^>]*data-for="([^"]+)"[^>]*>([\s\S]*?)<\/small>/g;
  for (let m = re.exec(html); m; m = re.exec(html)) out[m[1]!] = m[2]!;
  return out;
}

/**
 * s21 — the mark on the country, and on the four-country result.
 *
 * The same researcher on the "Any of these four" path answers research at
 * question 2 (nothing to mark — three destinations score it) and France at
 * question 3, and met "Nothing open on these answers" thirteen questions
 * later, France's line saying "5 not yet" (v1.1 gate critique, N1). The
 * derivation s19 built is keyed by the destination answer; question 3's
 * options ARE destination answers, so the same set answers for it the other
 * way round: the situation is declared, the option is the country.
 */
describe("s21 — question 3 marks a country the declared situation cannot use", () => {
  it("the country question is the third on the four-country path, and its options are the destination answers", () => {
    expect(countryQuestion().field).toBe(SITUATION_COUNTRY_FIELD);
    const destinations = new Set(fieldOptions(ds, DESTINATION_FIELD).map((o) => o.value));
    for (const o of countryQuestion().options) expect(destinations.has(o.value), o.value).toBe(true);
  });

  it("one derivation, keyed either way: the mark under a country option is the s19 mark for that country and the declared situation", () => {
    expectOneDerivationKeyedEitherWay();
  });

  it("over every situation × country, the mark is exactly where situationsAsked says", () => {
    expectMarksExactlyWhereSituationsAskedSays();
  });

  it("draws the s19 mark under France — same words, same link — and the option stays a button", () => {
    const html = countryScreen("research");
    const marks = marksOn(html);
    expect(Object.keys(marks)).toEqual(["fr"]);
    expect(marks.fr!.replace(/<[^>]+>/g, "")).toBe(notCheckedQuotedLine(france.name, researcher.name));
    expect(marks.fr).toContain(`<a href="${url("/france/talent-researcher")}">${READ_IT_HERE}</a>`);
    expect(html.match(/<button class="opt"/g)!.length).toBe(4);
    // After its button, never inside it.
    expect(html).toMatch(/<button class="opt" data-value="fr"[^>]*>[\s\S]*?<\/button><small class="opt-mark"/);
  });

  it("the mark is announced: it has an id, its option is described by it, and no other option is", () => {
    expectMarkAnnouncedByItsOptionAlone();
  });

  it("the mark's link is internal and says so: no out class", () => {
    expect(notScoredMarkHtml(notScoredFor(ds, "fr", "research")!)).not.toMatch(/class="[^"]*\bout\b/);
    expect(countryScreen("research")).not.toMatch(/class="[^"]*\bout\b/);
  });
});

/** Checks that question 3's mark and question 2's come from the one derivation, each keyed its own way. */
function expectOneDerivationKeyedEitherWay(): void {
  const answers = { [DESTINATION_FIELD]: "all", [SITUATION_FIELD]: "research" };
  expect(markUnder(ds, { field: SITUATION_COUNTRY_FIELD, value: "fr" }, answers)).toEqual(notScoredFor(ds, "fr", "research"));
  expect(markUnder(ds, { field: SITUATION_COUNTRY_FIELD, value: "de" }, answers)).toBeNull();
  // Question 2 keeps its own key: the option is the situation, the destination is declared.
  expect(markUnder(ds, { field: SITUATION_FIELD, value: "research" }, { [DESTINATION_FIELD]: "fr" }))
    .toEqual(notScoredFor(ds, "fr", "research"));
  // With no situation on the record there is nothing to mark a country against.
  expect(markUnder(ds, { field: SITUATION_COUNTRY_FIELD, value: "fr" }, { [DESTINATION_FIELD]: "all" })).toBeNull();
  // And no other question is ever marked.
  expect(markUnder(ds, { field: "qualification", value: "degree" }, answers)).toBeNull();
}

/** Checks that over every situation × country, question 3 marks exactly the countries situationsAsked leaves out. */
function expectMarksExactlyWhereSituationsAskedSays(): void {
  const asked = situationsAsked(ds);
  const countries = countryQuestion().options.map((o) => o.value);
  for (const s of fieldOptions(ds, SITUATION_FIELD)) {
    const marked = Object.keys(marksOn(countryScreen(s.value)));
    const expected = s.is_fallback || s.is_unknown ? [] : countries.filter((c) => !asked.get(c)!.has(s.value));
    expect(marked, s.value).toEqual(expected);
  }
  // Which is one country under one answer in the whole dataset today.
  const all = fieldOptions(ds, SITUATION_FIELD).flatMap((s) =>
    Object.keys(marksOn(countryScreen(s.value))).map((c) => `${s.value}:${c}`));
  expect(all).toEqual(["research:fr"]);
}

/** Checks that the mark has a unique id that its own option, and no other, is described by — on question 3 and question 2. */
function expectMarkAnnouncedByItsOptionAlone(): void {
  const html = countryScreen("research");
  const mark = html.match(/<small class="opt-mark"([^>]*)>/)![1]!;
  const id = mark.match(/ id="([^"]+)"/)?.[1];
  expect(id, "the mark has no id").toBeTruthy();
  expect(html.match(new RegExp(` id="${id}"`, "g"))!.length).toBe(1);
  const button = html.match(/<button class="opt" data-value="fr"([^>]*)>/)![1]!;
  expect(button).toContain(` aria-describedby="${id}"`);
  expect(html.match(/aria-describedby/g)!.length).toBe(1);
  // Question 2 for France, the same way (the s19 mark, announced too).
  const q2 = questionCardHtml({
    dataset: ds, question: remainingQuestions(ds, { [DESTINATION_FIELD]: "fr" }).find((q) => q.field === SITUATION_FIELD)!,
    answers: { [DESTINATION_FIELD]: "fr" }, asked: [DESTINATION_FIELD], editing: null, total: 12,
  });
  const q2id = q2.match(/<small class="opt-mark"[^>]* id="([^"]+)"/)?.[1];
  expect(q2id).toBeTruthy();
  expect(q2).toMatch(new RegExp(`<button class="opt" data-value="research"[^>]* aria-describedby="${q2id}"`));
}

describe("s21 — the four-country result says it in the country's line", () => {
  it("France's line: the s19 headline, then the quoted route as the link", () => {
    expectFranceLineSaysHeadlineThenLink();
  });

  it("is the s19 sentence and the s19 words — one copy, in the copy module", () => {
    expectTallyLineIsTheS19Sentence();
  });

  it("only a country closed to the declared situation: the other three, the other answers and no answer leave the tally alone", () => {
    const research = tallyLinesFor("research");
    for (const c of ds.countries.filter((c) => c.code !== "FR")) expect(research.get(c.name), c.code).toBeNull();
    expect(tallyLinesFor("offer").get(france.name)).toBeNull();
    expect(tallyLinesFor("none").get(france.name)).toBeNull();
    expect(tallyLinesFor(undefined).get(france.name)).toBeNull();
  });

  it("escapes the names it prints", () => {
    expectTallyLineEscapesTheNamesItPrints();
  });

  /**
   * The headline on that path. The branch the page takes is
   * the existing headline: the other branch — every visible country closed to
   * the situation — cannot occur on the dataset today, because the "all"
   * answer's set is the union of the four countries' and every offered
   * situation is taken by a scored route somewhere. This pins that: the day it
   * stops being true, the branch is reachable and needs a written state of
   * its own, which nothing has drawn.
   */
  it("every situation the interview offers is taken by a scored route in some country", () => {
    expectEverySituationTakenSomewhere();
  });
});

/** Checks France's line on the four-country verdict for research: the s19 headline, then the quoted route as an internal link. */
function expectFranceLineSaysHeadlineThenLink(): void {
  const line = tallyLinesFor("research").get(france.name);
  expect(line).toBeTruthy();
  expect(line!.text).toBe(
    "No route we check in France takes a research hosting agreement — Talent — researcher (chercheur) is quoted, not checked.",
  );
  expect(line!.html).toBe(
    "No route we check in France takes a research hosting agreement — "
    + `<a href="${url("/france/talent-researcher")}">Talent — researcher (chercheur)</a> ${IS_QUOTED_NOT_CHECKED}.`,
  );
  expect(line!.html).not.toMatch(/class="[^"]*\bout\b/);
}

/** Checks the tally line is the s19 headline and clause, from the copy module. */
function expectTallyLineIsTheS19Sentence(): void {
  expect(unscoredTallyLine("France", "a research hosting agreement", "Talent — researcher (chercheur)")).toBe(
    `${unscoredHeadline("France", "a research hosting agreement").replace(/\.$/, "")} — Talent — researcher (chercheur) ${IS_QUOTED_NOT_CHECKED}.`,
  );
  // Without a quoted route the line is the headline alone.
  expect(unscoredTallyLine("France", "a research hosting agreement")).toBe(unscoredHeadline("France", "a research hosting agreement"));
  // The question-2 mark reads the same clause.
  expect(notCheckedQuotedLine("France", "R")).toContain(IS_QUOTED_NOT_CHECKED);
}

/** Checks that France's line escapes a quoted route's name. */
function expectTallyLineEscapesTheNamesItPrints(): void {
  // France's researcher route, renamed; the rules untouched. The country is
  // named by the country list's phrase, not the dataset's name.
  const renamed = (c: Country): Country => c.code !== "FR" ? c
    : { ...c, routes: c.routes.map((r) => (r.id === researcher.id ? { ...r, name: "<x>" } : r)) };
  const doctored = { ...ds, countries: ds.countries.map(renamed) } as Dataset;
  const line = tallyLinesFor("research", doctored).get(france.name);
  expect(line).toBeTruthy();
  expect(line!.text).toBe("No route we check in France takes a research hosting agreement — <x> is quoted, not checked.");
  expect(line!.html).toContain(">&lt;x&gt;</a>");
  expect(line!.html).not.toContain("<x>");
}

/** Checks that every offered situation is taken by a scored route in some country, so some line stays unmarked. */
function expectEverySituationTakenSomewhere(): void {
  const asked = situationsAsked(ds);
  for (const s of fieldOptions(ds, SITUATION_FIELD)) {
    if (s.is_unknown) continue;
    expect(asked.get("all")!.has(s.value), s.value).toBe(true);
    expect([...tallyLinesFor(s.value).values()].some((line) => line === null), s.value).toBe(true);
  }
}
