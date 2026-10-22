import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  SITUATION_FIELD, fieldOptions, phraseOf, routesAnOfferFrees, shortLabelOf, unlockTitleOf, unlocks,
  type Dataset, type Profile,
} from "permit-rulebook-data";
import {
  EXPLORE_ONE_COUNTRY, NOTHING_OPEN_HEADLINE, STATUS_LABEL, STEPS_HEADING, WOULD_BE_MET, arrangedLine, nearestLine,
  offerLine, stepsWouldChangeHeadline,
} from "../src/lib/copy.js";
import { esc } from "../src/lib/reason.js";
import { verdictHtml, type CountrySection, type Verdict, type VerdictGroup } from "../src/lib/verdict/index.js";
import { groupsIn, stepsIn, verdictFor } from "./verdict-cards.js";

const ds = dataset as unknown as Dataset;

/**
 * Steps are what the reader can do (#175; rulings 7, 8, 14, 16, 17 on #55).
 *
 * A transfer and a hosting agreement are arranged answers: someone else
 * decides them, so they are never a step, never "Nearest:", never in a
 * tally, and what they would open is one line apart from the steps. An
 * explorer with no offer reads, per country, what a job offer would have
 * checked — never that it would be met. The not-yet fold points up only at
 * something that stands above it.
 */

/** Deniz: Turkish engineer with a Berlin offer (persona P1, s23). An offer-holder. */
const DENIZ: Profile = {
  destination: "de", citizenship: "TR", situation: "offer", situation_country: "de", qualification: "degree",
  recognition_de: "unknown", occupation_shortage: "yes", occupation_it: "yes", experience_5y: "lt2", experience_7y: "3to5", german: "a1",
  english: "c1", funds_eur_month: "band_1", salary_eur_year: "band_5", age_band: "a30to35",
};

/** Priya: Indian analyst exploring all four (persona P2, s23). No offer. */
const PRIYA: Profile = {
  destination: "all", citizenship: "IN", situation: "none", qualification: "degree", recognition_de: "unknown",
  occupation_shortage: "unknown", experience_5y: "2plus", experience_7y: "3to5", german: "none", english: "c1", nl_recent_grad: "no",
  top200_grad: "unknown", funds_eur_month: "band_1", age_band: "u30", de_stay6m: "no", partner_ck: "no",
};

/** The hostile walk's offer-holder in Spain with no qualification: nothing
 * open, and nothing but a hosting agreement would open anything. */
const SPAIN_OFFER: Profile = {
  destination: "es", citizenship: "TR", situation: "offer", situation_country: "es", qualification: "none",
};

/** The titles the engine gives the rows an arranged answer would open. */
const arrangedTitles = (answers: Profile): string[] =>
  unlocks(ds, answers).filter((u) => u.option.is_arranged).map((u) => unlockTitleOf(ds, u, answers));

/** What an arranged answer would open in one country, from the engine's rows:
 * each answer's own words and its count of routes there. */
function arrangedIn(answers: Profile, code: string): { answer: string; routes: number }[] {
  const out = new Map<string, number>();
  for (const u of unlocks(ds, answers).filter((x) => x.option.is_arranged)) {
    const n = u.routes.filter((r) => r.country === code).length;
    const answer = u.option.short ?? u.option.label;
    if (n) out.set(answer, (out.get(answer) ?? 0) + n);
  }
  return [...out].map(([answer, routes]) => ({ answer, routes }));
}

const groupOf = <K extends VerdictGroup["kind"]>(groups: VerdictGroup[], kind: K) =>
  groups.find((g): g is Extract<VerdictGroup, { kind: K }> => g.kind === kind);

const sectionsOf = (verdict: Verdict): CountrySection[] =>
  verdict.layout.kind === "countries" ? verdict.layout.sections : [];

const codeOf = (name: string): string => ds.countries.find((c) => c.name === name)!.code;

/** The step the masthead names, where it names one: the title in "Nearest: …". */
const nearestIn = (verdict: Verdict, titles: string[]): string | undefined =>
  titles.find((t) => verdict.action.masthead.subline.includes(nearestLine(t)));

describe("#175 — an arranged answer is never a step", () => {
  it("the explorer's steps, Nearest and tallies leave a transfer and a hosting agreement out", () => {
    const verdict = verdictFor(PRIYA);
    const arranged = arrangedTitles(PRIYA);
    expect(arranged.length, "the explorer no longer has an arranged answer that opens a route").toBeGreaterThan(0);
    const steps = stepsIn(verdict).map((s) => s.title);
    for (const title of arranged) expect(steps).not.toContain(title);
    expect(nearestIn(verdict, arranged)).toBeUndefined();
    for (const section of sectionsOf(verdict)) {
      const block = groupOf(section.groups, "steps");
      expect(section.tally.steps, section.name).toBe(block?.steps.length ?? 0);
    }
  });

  it("the arranged line stands in each country it opens a route in, naming only that country's routes", () => {
    const verdict = verdictFor(PRIYA);
    const sections = sectionsOf(verdict);
    expect(sections.length).toBeGreaterThan(1);
    let drawn = 0;
    for (const section of sections) {
      const expected = arrangedIn(PRIYA, codeOf(section.name));
      const line = groupOf(section.groups, "arranged");
      if (!expected.length) { expect(line, section.name).toBeUndefined(); continue; }
      drawn++;
      expect(line?.answers, section.name).toEqual(expected);
      expect(line?.country).toBe(phraseOf(codeOf(section.name)));
      // Nothing is open anywhere, and here a different situation would open a
      // route: the section opens on it, as it did on the steps (critique #4).
      expect(section.open, section.name).toBe(true);
    }
    expect(drawn, "no section drew an arranged line").toBeGreaterThan(0);
  });

  it("an offer-holder's steps hold none, and the line after them says what one would open", () => {
    const verdict = verdictFor(DENIZ);
    if (verdict.layout.kind !== "one-country") throw new Error("Deniz's verdict is not one country flat");
    const { groups } = verdict.layout;
    const steps = stepsIn(verdict).map((s) => s.title);
    expect(steps.length).toBeGreaterThan(0);
    for (const title of arrangedTitles(DENIZ)) expect(steps).not.toContain(title);
    const kinds = groups.map((g) => g.kind);
    expect(kinds.indexOf("arranged")).toBe(kinds.indexOf("steps") + 1);
    const line = groupOf(groups, "arranged");
    expect(line?.answers).toEqual(arrangedIn(DENIZ, "DE"));
    expect(verdictHtml(verdict)).toContain(esc(arrangedLine(line!)));
  });
});

describe("#175 — where only an arranged answer would open something", () => {
  it("the headline is the nothing-open one with its explore sentence, and the arranged line stands alone", () => {
    expect(arrangedIn(SPAIN_OFFER, "ES").length, "a hosting agreement no longer opens a Spanish route").toBeGreaterThan(0);
    expect(unlocks(ds, SPAIN_OFFER).every((u) => u.option.is_arranged)).toBe(true);
    const verdict = verdictFor(SPAIN_OFFER);
    const { headline, subline } = verdict.action.masthead;
    expect(headline).toBe(esc(NOTHING_OPEN_HEADLINE));
    expect(subline).toContain(EXPLORE_ONE_COUNTRY);
    expect(nearestIn(verdict, arrangedTitles(SPAIN_OFFER))).toBeUndefined();
    const groups = groupsIn(verdict);
    expect(groupOf(groups, "steps")).toBeUndefined();
    const line = groupOf(groups, "arranged");
    expect(line?.answers).toEqual(arrangedIn(SPAIN_OFFER, "ES"));
    const html = verdictHtml(verdict);
    expect(html).toContain(esc(arrangedLine(line!)));
    expect(html).not.toContain(esc(STEPS_HEADING));
  });
});

describe("#175 — the offer line", () => {
  const offer = fieldOptions(ds, SITUATION_FIELD).find((o) => !o.is_arranged && !o.is_fallback && !o.is_unknown)!;

  it("opens the explorer's steps block in each country an offer frees routes in", () => {
    const freed = routesAnOfferFrees(ds, PRIYA);
    expect(freed.length, "an offer frees nothing for the explorer").toBeGreaterThan(0);
    const verdict = verdictFor(PRIYA);
    const html = verdictHtml(verdict);
    for (const section of sectionsOf(verdict)) {
      const here = freed.find((f) => f.country === codeOf(section.name));
      const block = groupOf(section.groups, "steps");
      if (!here) { expect(block?.offer ?? null, section.name).toBeNull(); continue; }
      expect(block?.offer, section.name).toEqual({
        offer: offer.short ?? offer.label, country: phraseOf(here.country), routes: here.routes.length,
        fields: here.fieldsLeftOpen.map((f) => shortLabelOf(ds, f)),
      });
      // The line is drawn, and before any step card of its block.
      const line = esc(offerLine(block!.offer!));
      expect(html, section.name).toContain(line);
      for (const step of block!.steps) expect(html.indexOf(line)).toBeLessThan(html.indexOf(step.html));
    }
  });

  it("never says met or within reach, and is in neither the headline's count nor Nearest", () => {
    const verdict = verdictFor(PRIYA);
    const lines = sectionsOf(verdict).flatMap((s) => {
      const block = groupOf(s.groups, "steps");
      return block?.offer ? [offerLine(block.offer)] : [];
    });
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line).not.toContain(WOULD_BE_MET);
      expect(line.toLowerCase()).not.toContain(STATUS_LABEL.near.toLowerCase());
      expect(line.toLowerCase()).not.toContain(STATUS_LABEL.met.toLowerCase());
      expect(verdict.action.masthead.subline).not.toContain(line);
    }
    const titles = [...new Set(stepsIn(verdict).map((s) => s.title))];
    expect(verdict.action.masthead.headline).toBe(esc(stepsWouldChangeHeadline(titles.length)));
    expect(nearestIn(verdict, titles)).toBe(titles[0]);
  });

  it("with no step to take, the steps heading stands over the offer line", () => {
    const explorer: Profile = { destination: "fr", citizenship: "TR", situation: "none", qualification: "none" };
    expect(unlocks(ds, explorer).filter((u) => !u.option.is_arranged)).toEqual([]);
    const verdict = verdictFor(explorer);
    const block = groupOf(groupsIn(verdict), "steps");
    expect(block?.steps).toEqual([]);
    const html = verdictHtml(verdict);
    expect(html.indexOf(esc(STEPS_HEADING))).toBeGreaterThan(-1);
    expect(html.indexOf(esc(STEPS_HEADING))).toBeLessThan(html.indexOf(esc(offerLine(block!.offer!))));
  });

  it("an offer-holder never gets it", () => {
    for (const answers of [DENIZ, SPAIN_OFFER])
      for (const group of groupsIn(verdictFor(answers)))
        if (group.kind === "steps") expect(group.offer ?? null).toBeNull();
  });
});

describe("#175 — the not-yet fold points up only at something above it", () => {
  /** Profiles drawing a fold of rows gated on a path answer, some with the
   * steps block, the offer line or the arranged line above it, some with none. */
  const PROFILES: Profile[] = [
    PRIYA, DENIZ, SPAIN_OFFER,
    { destination: "fr", citizenship: "TR", situation: "none", qualification: "none" },
    { destination: "fr", citizenship: "TR", situation: "research", situation_country: "fr", qualification: "none" },
    { destination: "de", citizenship: "TR", situation: "ict", situation_country: "de", qualification: "none" },
    { destination: "es", citizenship: "TR", situation: "research", situation_country: "es", qualification: "none" },
  ];

  /** Each section's country code and groups: the flat layout's, or every country's. */
  const sectionGroups = (verdict: Verdict, answers: Profile): [string, VerdictGroup[]][] =>
    verdict.layout.kind === "one-country"
      ? [[String(answers.destination).toUpperCase(), verdict.layout.groups]]
      : sectionsOf(verdict).map((s) => [codeOf(s.name), s.groups]);

  /** Whether the engine has something to stand above a country's not-yet
   * group: a step, what an offer frees, or what an arranged answer opens. */
  function standsAbove(answers: Profile, code: string): boolean {
    const opensHere = unlocks(ds, answers).some((u) => u.routes.some((r) => r.country === code));
    return opensHere || routesAnOfferFrees(ds, answers).some((f) => f.country === code);
  }

  it("'see the steps above' appears exactly when the steps, the offer line or the arranged line stands above", () => {
    const seen = new Set<boolean>();
    for (const answers of PROFILES)
      for (const [code, groups] of sectionGroups(verdictFor(answers), answers)) {
        const notYet = groupOf(groups, "not-yet");
        const fold = notYet?.items.find((i) => "kind" in i && i.kind === "needs-steps");
        if (!fold || !("kind" in fold) || fold.kind !== "needs-steps") continue;
        const above = standsAbove(answers, code);
        expect(fold.pointsUp, `${code} ${JSON.stringify(answers)}`).toBe(above);
        seen.add(above);
      }
    expect([...seen].sort(), "the profiles no longer draw a fold both with and without something above").toEqual([false, true]);
  });
});
