import { describe, expect, it } from "vitest";
import type { Profile } from "permit-rulebook-data";
import { cardsIn, groupsIn, verdictFor } from "./verdict-cards.js";

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
    const routeGroups = verdict.layout.groups.filter((g) => g.kind !== "steps" && g.kind !== "arranged");
    expect(routeGroups.map((g) => ({ kind: g.kind, routes: cardsIn(g).map((c) => c.route) }))).toEqual([
      { kind: "open", routes: ["nl-orientation-year"] },
      { kind: "within-reach", routes: ["nl-hsm-under30"] },
      { kind: "not-yet", routes: ["nl-hsm-30plus", "nl-blue-card", "nl-ict", "nl-researcher"] },
    ]);
  });
});

/**
 * The marks on a whole card's first line, in order — "country" for the
 * country's chip, "badge" for the status badge — where that line comes before
 * the card's title; null where the card opens on anything else.
 */
function firstLineOf(card: string): string[] | null {
  const top = /^\s*<article class="route"[^>]*>\s*<div class="top">([\s\S]*?)<\/div>\s*<h3>/.exec(card);
  if (!top) return null;
  return [...top[1]!.matchAll(/<span class="(country|st)\b/g)].map((m) => (m[1] === "st" ? "badge" : "country"));
}

/** The cards of the open, unsettled and within-reach groups: the whole cards. */
const wholeCardsOf = (answers: Profile): string[] =>
  groupsIn(verdictFor(answers))
    .filter((g) => g.kind === "open" || g.kind === "unsettled" || g.kind === "within-reach")
    .flatMap((g) => cardsIn(g).map((c) => c.html));

describe("verdictHtml's cards — the badge's one home (#95; ruling 10 on #55)", () => {
  it("on the one-country layout a card's first line is the country's chip and the badge, above the title", () => {
    const cards = wholeCardsOf(DUTCH_OFFER);
    expect(cards.length, "precondition: whole cards on the verdict").toBeGreaterThan(0);
    for (const card of cards) expect(firstLineOf(card)).toEqual(["country", "badge"]);
  });

  it("in a country's section a card's first line is the badge alone, above the title", () => {
    const cards = wholeCardsOf({ ...DUTCH_OFFER, destination: "all" });
    expect(cards.length, "precondition: whole cards on the verdict").toBeGreaterThan(0);
    for (const card of cards) expect(firstLineOf(card)).toEqual(["badge"]);
  });
});
