import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset, Profile } from "permit-rulebook-data";
import { verdictOf, type RouteCard, type Verdict, type VerdictGroup } from "../src/lib/verdict/index.js";

const ds = dataset as unknown as Dataset;

/**
 * The verdict a reader with these answers is shown, read through the
 * module's entry the way the page reads it, with no route page behind them.
 */
export const verdictFor = (answers: Profile): Verdict =>
  verdictOf(ds, answers, { cameFrom: null, answered: Object.keys(answers).length });

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
