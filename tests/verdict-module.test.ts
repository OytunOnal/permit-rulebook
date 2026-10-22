import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset, Profile } from "permit-rulebook-data";
import { verdictOf, type VerdictGroup } from "../src/lib/verdict/index.js";

const ds = dataset as unknown as Dataset;

/** The routes a group lists, in its order, folded rows included. */
const routesOf = (group: VerdictGroup): string[] => {
  if (group.kind === "steps") return [];
  if (group.kind !== "not-yet") return group.cards.map((c) => c.route);
  return group.items.flatMap((i) => ("kind" in i ? i.cards.map((c) => c.route) : [i.route]));
};

/**
 * A reader of the Netherlands alone, with an offer there: the orientation
 * year is met, the highly skilled migrant permit for under-30s is within
 * reach on the monthly salary, and the other four Dutch routes are not yet —
 * none of them gated on a path answer alone, so each keeps its own row.
 */
const DUTCH_OFFER: Profile = {
  destination: "nl", citizenship: "IN", situation: "offer", situation_country: "nl", english: "b1", age_band: "u30",
  qualification: "none", experience_7y: "lt3", occupation_it: "yes", salary_eur_month: "band_0", nl_recent_grad: "yes",
};

describe("verdictOf — the one-country layout's groups", () => {
  it("a one-country reader's groups come in the order open, within reach, not yet, each listing its routes", () => {
    const verdict = verdictOf(ds, DUTCH_OFFER, { cameFrom: null, answered: Object.keys(DUTCH_OFFER).length });
    expect(verdict.layout.kind).toBe("one-country");
    if (verdict.layout.kind !== "one-country") return;
    const routeGroups = verdict.layout.groups.filter((g) => g.kind !== "steps");
    expect(routeGroups.map((g) => ({ kind: g.kind, routes: routesOf(g) }))).toEqual([
      { kind: "open", routes: ["nl-orientation-year"] },
      { kind: "within-reach", routes: ["nl-hsm-under30"] },
      { kind: "not-yet", routes: ["nl-hsm-30plus", "nl-blue-card", "nl-ict", "nl-researcher"] },
    ]);
  });
});
