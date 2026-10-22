import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset, Profile } from "permit-rulebook-data";
import { ABBREVIATIONS } from "../src/lib/gloss.js";
import { esc } from "../src/lib/reason.js";
import {
  verdictOf, type CountrySection, type RouteCard, type StepCard, type Verdict, type VerdictGroup,
} from "../src/lib/verdict/index.js";

const ds = dataset as unknown as Dataset;

/**
 * The verdict a reader with these answers is shown on a dataset — the shipped
 * one, or one a test writes — read through the module's entry the way the
 * page reads it, from a route page when `cameFrom` names one.
 */
export const verdictOn = (data: Dataset, answers: Profile, cameFrom: string | null = null): Verdict =>
  verdictOf(data, answers, { cameFrom, answered: Object.keys(answers).length });

/** The verdict on the shipped dataset, with no route page behind it. */
export const verdictFor = (answers: Profile): Verdict => verdictOn(ds, answers);

/** The route cards a group lists, in its order, folded rows included. */
export function cardsIn(group: VerdictGroup): RouteCard[] {
  if (group.kind === "steps") return [];
  if (group.kind !== "not-yet") return group.cards;
  return group.items.flatMap((item) => ("kind" in item ? item.cards : [item]));
}

/** Every group of a verdict, in the order drawn: the flat layout's, or each
 * country section's in turn. */
export function groupsIn(verdict: Verdict): VerdictGroup[] {
  if (verdict.layout.kind === "one-country") return verdict.layout.groups;
  if (verdict.layout.kind === "countries") return verdict.layout.sections.flatMap((s) => s.groups);
  return [];
}

/** Where a route is listed on a verdict — the kind of group, and its card's
 * markup — or undefined where the verdict lists it nowhere. */
export function placed(verdict: Verdict, route: string): { kind: VerdictGroup["kind"]; html: string } | undefined {
  for (const group of groupsIn(verdict)) {
    const card = cardsIn(group).find((c) => c.route === route);
    if (card) return { kind: group.kind, html: card.html };
  }
  return undefined;
}

/** The markup of the card a route is drawn with on a verdict; a route the
 * verdict lists nowhere fails the case that asked for it. */
export function cardOn(verdict: Verdict, route: string): string {
  const at = placed(verdict, route);
  if (!at) throw new Error(`${route} is on no group of this verdict`);
  return at.html;
}

/** Every route card a verdict draws, in order, with its route's id. */
export const everyCardIn = (verdict: Verdict): RouteCard[] => groupsIn(verdict).flatMap(cardsIn);

/** The steps a verdict offers, in the order drawn, every section's in turn. */
export const stepsIn = (verdict: Verdict): StepCard[] =>
  groupsIn(verdict).flatMap((g) => (g.kind === "steps" ? g.steps : []));

/** The job-search sentences under a verdict's steps groups, joined. */
export const hintsIn = (verdict: Verdict): string =>
  groupsIn(verdict).map((g) => (g.kind === "steps" ? g.hint : "")).join("");

/** A country's section on the several-country layout, by its name. */
export function sectionNamed(verdict: Verdict, name: string): CountrySection {
  if (verdict.layout.kind !== "countries") throw new Error("this verdict draws no country sections");
  const section = verdict.layout.sections.find((s) => s.name === name);
  if (!section) throw new Error(`no section named ${name}`);
  return section;
}

/**
 * The blocks of a card drawn as a `<div>` whose class attribute is exactly
 * one of `classes`, each whole, in the order the card draws them, joined —
 * the markup the card piece of that name printed.
 */
export function blocksIn(html: string, ...classes: string[]): string {
  const out: string[] = [];
  const opening = /<div class="([^"]*)"/g;
  for (let m = opening.exec(html); m; m = opening.exec(html)) {
    if (!classes.includes(m[1]!)) continue;
    let depth = 0;
    const tag = /<div\b|<\/div>/g;
    tag.lastIndex = m.index;
    for (let t = tag.exec(html); t; t = tag.exec(html)) {
      depth += t[0] === "</div>" ? -1 : 1;
      if (depth === 0) { out.push(html.slice(m.index, tag.lastIndex)); opening.lastIndex = tag.lastIndex; break; }
    }
  }
  return out.join("");
}

/**
 * Markup with the abbreviations' explainers taken out. A verdict explains an
 * abbreviation on its first use on the screen, so whether a card's sentence
 * carries the explainer depends on the cards drawn before it; a case about
 * which sentences a card states reads them without it.
 */
export function withoutGlosses(html: string): string {
  let out = html;
  for (const [token, words] of ABBREVIATIONS)
    for (const said of [words, esc(words)])
      out = out.split(` (${said})`).join("").split(`; ${token} = ${said}`).join("");
  return out;
}
