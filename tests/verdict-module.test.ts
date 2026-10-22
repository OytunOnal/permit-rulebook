import { describe, expect, it } from "vitest";
import type { Profile } from "permit-rulebook-data";
import { cardsIn, verdictFor } from "./verdict-cards.js";

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
    const verdict = verdictFor(DUTCH_OFFER);
    expect(verdict.layout.kind).toBe("one-country");
    if (verdict.layout.kind !== "one-country") return;
    const routeGroups = verdict.layout.groups.filter((g) => g.kind !== "steps");
    expect(routeGroups.map((g) => ({ kind: g.kind, routes: cardsIn(g).map((c) => c.route) }))).toEqual([
      { kind: "open", routes: ["nl-orientation-year"] },
      { kind: "within-reach", routes: ["nl-hsm-under30"] },
      { kind: "not-yet", routes: ["nl-hsm-30plus", "nl-blue-card", "nl-ict", "nl-researcher"] },
    ]);
  });
});
