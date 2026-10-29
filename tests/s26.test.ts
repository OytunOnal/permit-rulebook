import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  DESTINATION_FIELD, SITUATION_FIELD, possessiveAtStartOf, evaluate, fieldOptions, isClosed, situationsAsked,
  type Dataset, type Profile,
} from "permit-rulebook-data";
import { RECORD_VERSION } from "../src/lib/record.js";
import { SITUATION_COUNTRY_FIELD } from "../src/lib/situations.js";
import {
  NOTHING_OPEN_HEADLINE, READ_ITS_RULES, unscoredNamedRestLine, unscoredRestLine,
} from "../src/lib/copy/verdict.js";
import { url } from "../src/lib/site.js";
import type { CountrySection, Tally, Verdict, VerdictGroup } from "../src/lib/verdict/index.js";
import { PAINTED_AS_COMPOSED, cardsIn, paintedAsComposedScript, verdictFor } from "./verdict-cards.js";
import { expectNothingLeft } from "./wire.js";
import { chromePath, walkSite, type BrowserPage, type SentRequest } from "../scripts/browser/browser.mjs";
import { PICK_TURKEY, answerWith } from "./browser-walk.js";

const ds = dataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));

/** The four-country answers for a situation and the country the reader named at question 3. */
const fourCountry = (situation: string, country: string): Profile =>
  ({ [DESTINATION_FIELD]: "all", [SITUATION_FIELD]: situation, [SITUATION_COUNTRY_FIELD]: country });
/** The direct answers: that country at question 1, the situation at question 2. */
const direct = (situation: string, country: string): Profile =>
  ({ [DESTINATION_FIELD]: country, [SITUATION_FIELD]: situation });

/** The written state as a reader meets it: the headline, the subline as
 * text, the words of the subline that are its door, and the country whose
 * section leads. */
interface WrittenState {
  headline: string;
  subline: string;
  door?: { text: string; href: string };
  lead?: string;
}

/**
 * The written state the verdict for these answers reads, or null where it
 * reads none: its masthead is the only one whose subline is drawn in markup,
 * for the door in it. On the four-country layout the country it is about
 * leads the sections.
 */
function unscoredVerdict(answers: Profile): WrittenState | null {
  const { action, layout } = verdictFor(answers);
  const m = action.masthead;
  if (m.sublineHtml === undefined) return null;
  const door = /<a href="([^"]*)">([^<]*)<\/a>/.exec(m.sublineHtml);
  const first = layout.kind === "countries" ? ds.countries.find((c) => c.name === layout.sections[0]!.name) : undefined;
  return {
    headline: m.announced, subline: m.subline,
    ...(door ? { door: { text: door[2]!, href: door[1]! } } : {}),
    ...(first ? { lead: first.code.toLowerCase() } : {}),
  };
}

/** The subline in its two sentences: the route line, with the door, and the rest. */
const sentences = (v: WrittenState): { route: string; rest: string } => {
  const cut = v.subline.indexOf(`${READ_ITS_RULES}. `);
  if (cut < 0) return { route: "", rest: v.subline };
  const end = cut + READ_ITS_RULES.length + 1;
  return { route: v.subline.slice(0, end), rest: v.subline.slice(end + 1) };
};

/** Whether nothing is open anywhere on these answers, the way the results screen counts it. */
const zeroOpen = (answers: Profile): boolean =>
  evaluate(ds, answers).filter((r) => !isClosed(r)).every((r) => r.status === "hold");

/** The critique's walk to nothing open: all four, research, France at
 * question 3, no qualification, a Turkish passport, no Dutch graduation, no
 * top-200 degree. */
const WALKED_TO_NOTHING_OPEN: Profile = {
  ...fourCountry("research", "fr"), citizenship: "TR", qualification: "none", nl_recent_grad: "no", top200_grad: "no",
};
/** The same walk with a recognised degree, some German and the funds: Germany's Opportunity Card opens. */
const WALKED_TO_A_GERMAN_ROUTE: Profile = {
  ...fourCountry("research", "fr"), citizenship: "TR", qualification: "degree", recognition_de: "recognized",
  nl_recent_grad: "no", top200_grad: "no", german: "a1", funds_eur_month: "band_1",
};

/**
 * s26 — one reader, one hierarchy.
 *
 * A researcher with a French hosting agreement reads s19's written state on
 * the France path and "Nothing open on these answers." over a green 0 OPEN on
 * the four-country path, the sentence that explains it third, in France's
 * line, under Germany's (s21). But they named France at question 3: the
 * product knows which country their agreement is in, and the headline is
 * that country's.
 */
describe("s26 — the named country gets the four-country headline", () => {
  it("over every (situation × country) pair situationsAsked marks, the four-country answers read the direct path's headline and route line; the rest sentence differs only by the country's name", () => {
    const asked = situationsAsked(ds);
    const pairs: string[] = [];
    for (const s of fieldOptions(ds, SITUATION_FIELD)) {
      for (const c of fieldOptions(ds, SITUATION_COUNTRY_FIELD)) {
        const four = unscoredVerdict(fourCountry(s.value, c.value));
        const one = unscoredVerdict(direct(s.value, c.value));
        if (s.is_fallback || s.is_unknown || asked.get(c.value)!.has(s.value)) {
          // A situation the country's scored routes take: no written state either way.
          expect(four, `${s.value}:${c.value}`).toBeNull();
          expect(one, `${s.value}:${c.value}`).toBeNull();
          continue;
        }
        pairs.push(`${s.value}:${c.value}`);
        expect(four, `${s.value}:${c.value}`).not.toBeNull();
        expect(one, `${s.value}:${c.value}`).not.toBeNull();
        // One function, one copy: the same headline, the same door.
        expect(four!.headline).toBe(one!.headline);
        expect(four!.door).toEqual(one!.door);
        const country = ds.countries.find((x) => x.code.toLowerCase() === c.value)!;
        const f = sentences(four!);
        const d = sentences(one!);
        expect(f.route).toBe(d.route);
        // "The routes below need …" on the direct path; "France's routes below need …" on this one.
        expect(f.rest).toBe(d.rest.replace(/^The\b/, possessiveAtStartOf(country.code)));
        expect(f.rest).not.toBe(d.rest);
        // The four-country verdict names the country whose section leads; the direct path has no list to lead.
        expect(four!.lead).toBe(c.value);
        expect(one!.lead).toBeUndefined();
      }
    }
    // Which is one pair on the whole dataset today.
    expect(pairs).toEqual(["research:fr"]);
  });

  it("the two rest sentences are one sentence, but for the name", () => {
    expect(unscoredRestLine("a job offer or an intra-corporate transfer"))
      .toBe("The routes below need a job offer or an intra-corporate transfer.");
    expect(unscoredNamedRestLine(possessiveAtStartOf("FR"), "a job offer or an intra-corporate transfer"))
      .toBe("France's routes below need a job offer or an intra-corporate transfer.");
    // The data package's possessive at a sentence's start, the article's capital and the apostrophe included.
    expect(unscoredNamedRestLine(possessiveAtStartOf("NL"), "x")).toBe("The Netherlands' routes below need x.");
  });

  it("the France researcher, both ways: the same words, the door to the quoted route", () => {
    const four = unscoredVerdict(fourCountry("research", "fr"))!;
    expect(four.headline).toBe("No route we check in France takes a research hosting agreement.");
    expect(four.subline).toBe(
      "France's route for a research hosting agreement — Talent — researcher (chercheur) — is quoted here but not checked: "
      + "read its rules. France's routes below need a job offer or an intra-corporate transfer.",
    );
    expect(four.door).toEqual({ text: READ_ITS_RULES, href: url("/france/talent-researcher") });
    expect(four.lead).toBe("fr");
    // The direct path, as s19 left it.
    expect(unscoredVerdict(direct("research", "fr"))!.subline).toMatch(/ The routes below need /);
  });

  it("is keyed by the named country only where the destination is all four: no country named, or a country that takes the situation, leaves the verdicts as they were", () => {
    expect(unscoredVerdict({ [DESTINATION_FIELD]: "all", [SITUATION_FIELD]: "research" })).toBeNull();
    expect(unscoredVerdict(fourCountry("research", "de"))).toBeNull();
    expect(unscoredVerdict(fourCountry("offer", "fr"))).toBeNull();
    expect(unscoredVerdict(fourCountry("none", "fr"))).toBeNull();
    // A stray country answer under a one-country destination is not a key: the direct path never asks it.
    expect(unscoredVerdict({ ...direct("research", "es"), [SITUATION_COUNTRY_FIELD]: "fr" })).toBeNull();
  });
});

describe("s26 — the named country's section leads", () => {
  const walk = WALKED_TO_NOTHING_OPEN;
  const opened = WALKED_TO_A_GERMAN_ROUTE;
  /** An offer in Germany, nothing met: zero open, but Germany's routes take an offer. */
  const readerWithJobOffer: Profile = { [DESTINATION_FIELD]: "all", [SITUATION_FIELD]: "offer", [SITUATION_COUNTRY_FIELD]: "de", citizenship: "TR", qualification: "none" };
  /** An explorer: no offer, transfer or agreement, so no country named. */
  const explorer: Profile = { [DESTINATION_FIELD]: "all", [SITUATION_FIELD]: "none", citizenship: "TR", qualification: "none" };

  /** The country sections the verdict draws, in order. */
  const sectionsOf = (answers: Profile) => {
    const { layout } = verdictFor(answers);
    if (layout.kind !== "countries") throw new Error("the four-country verdict draws no country sections");
    return layout.sections;
  };
  /** The order the result draws, by country code. */
  const order = (answers: Profile): string[] =>
    sectionsOf(answers).map((s) => ds.countries.find((c) => c.name === s.name)!.code);
  /** The country the verdict leads with, where its headline names one. */
  const leadOf = (answers: Profile): string | undefined => unscoredVerdict(answers)?.lead;

  it("first, before the others in dataset order, when nothing is open anywhere", () => {
    expect(zeroOpen(walk)).toBe(true);
    expect(leadOf(walk)).toBe("fr");
    expect(order(walk)).toEqual(["FR", "DE", "ES", "NL"]);
    // The one predicate: the named country leads, and it is the only one that does.
    const first = sectionsOf(walk)[0]!;
    expect(ds.countries.map((c) => c.name === first.name)).toEqual([false, true, false, false]);
    expect(first.open).toBe(true);
    // Its line keeps s21's sentence and link.
    expect(first.tally.closedTo!.text).toBe(
      "No route we check in France takes a research hosting agreement — Talent — researcher (chercheur) is quoted, not checked.",
    );
  });

  it("dataset order with something open anywhere, and where the named country takes the situation, and with no country named", () => {
    // The headline is the open one; the written state is not drawn, and no country leads.
    expect(zeroOpen(opened)).toBe(false);
    expect(leadOf(opened)).toBeUndefined();
    expect(order(opened)).toEqual(["DE", "FR", "ES", "NL"]);
    // Zero open, but no written state for Germany: nothing leads.
    expect(zeroOpen(readerWithJobOffer)).toBe(true);
    expect(unscoredVerdict(readerWithJobOffer)).toBeNull();
    expect(leadOf(readerWithJobOffer)).toBeUndefined();
    expect(order(readerWithJobOffer)).toEqual(["DE", "FR", "ES", "NL"]);
    // The explorer: nothing named, nothing leads.
    expect(zeroOpen(explorer)).toBe(true);
    expect(leadOf(explorer)).toBeUndefined();
    expect(order(explorer)).toEqual(["DE", "FR", "ES", "NL"]);
    // And the walk's own lead is nobody's the moment something is open: the
    // decision is the headline's — `opened` is the walk with a German route open.
    expect(leadOf(opened)).toBeUndefined();
    // The order is stable: with France leading, nothing else moves.
    expect(order(walk).slice(1)).toEqual(ds.countries.map((c) => c.code).filter((c) => c !== "FR"));
  });
});

/**
 * What the browser walks below end on, decided by the verdict's entry: the
 * headline and the subline, the strip, which section leads and which open, and
 * what each country's line and headings say.
 */
describe("s26 — the results the walks end on, from the verdict", () => {
  const sectionsOf = (answers: Profile): CountrySection[] => {
    const { layout } = verdictFor(answers);
    if (layout.kind !== "countries") throw new Error("the four-country verdict draws no country sections");
    return layout.sections;
  };
  /** The link in a country's line, where its line carries one. */
  const linkIn = (tally: Tally): { text: string; href: string } | null => {
    const a = tally.closedTo ? /<a href="([^"]*)">([^<]*)<\/a>/.exec(tally.closedTo.html) : null;
    return a ? { text: a[2]!, href: a[1]! } : null;
  };
  /** The count a group's heading prints; the steps heading prints none. */
  const countHeaded = (g: VerdictGroup): number | undefined => {
    if (g.kind === "steps") return undefined;
    return g.kind === "not-yet" ? g.count : cardsIn(g).length;
  };
  /** The groups a section draws under a heading, each with the count it
   * prints; the arranged line stands under none. */
  const headed = (section: CountrySection) =>
    section.groups.filter((g) => g.kind !== "arranged").map((g) => ({ kind: g.kind, count: countHeaded(g) }));

  it("the walk to nothing open reads France's written state; France's section leads, open; Germany's line is its count", () => {
    const { action, layout } = verdictFor(WALKED_TO_NOTHING_OPEN);
    const m = action.masthead;
    // The headline is France's written state — the one s19 writes on the France path.
    expect(m.announced).toBe("No route we check in France takes a research hosting agreement.");
    expect(m.subline).toBe(
      "France's route for a research hosting agreement — Talent — researcher (chercheur) — is quoted here but not checked: "
      + "read its rules. France's routes below need a job offer or an intra-corporate transfer.",
    );
    expect(/<a href="([^"]*)">([^<]*)<\/a>/.exec(m.sublineHtml ?? "")?.slice(1)).toEqual([url("/france/talent-researcher"), "read its rules"]);
    expect(m.announced + m.subline).not.toContain("Nothing open");
    // The strip stays, and the count is right.
    if (layout.kind !== "countries") throw new Error("the four-country verdict draws no country sections");
    expect(layout.strip).toMatchObject({ open: 0, withinReach: 0, notYet: 23 });
    // France's section leads, open; the others follow in dataset order, collapsed as before.
    const sections = sectionsOf(WALKED_TO_NOTHING_OPEN);
    expect(sections.map((s) => [s.name, s.open])).toEqual([
      ["France", true], ["Germany", false], ["Spain", false], ["Netherlands", false],
    ]);
    const [fr, germany] = sections;
    expect(fr!.tally.closedTo!.text).toBe(
      "No route we check in France takes a research hosting agreement — Talent — researcher (chercheur) is quoted, not checked.",
    );
    expect(linkIn(fr!.tally)).toEqual({ text: "Talent — researcher (chercheur)", href: url("/france/talent-researcher") });
    expect(headed(fr!)).toEqual([{ kind: "not-yet", count: 5 }]);
    expect(germany!.tally).toMatchObject({
      open: 0, unsettled: 0, withinReach: 0, notYet: 8, openUnknowns: 0, closed: 0, steps: 0, closedTo: null,
    });
    expect(linkIn(germany!.tally)).toBeNull();
  });

  it("the walk that opens a German route reads the open headline, Germany first and open, France's line doing the saying", () => {
    const m = verdictFor(WALKED_TO_A_GERMAN_ROUTE).action.masthead;
    expect(m.announced).toMatch(/^1 route looks open\./);
    expect(m.announced + m.subline).not.toContain("No route we check");
    expect(m.sublineHtml).toBeUndefined();
    const sections = sectionsOf(WALKED_TO_A_GERMAN_ROUTE);
    expect(sections.map((s) => [s.name, s.open])).toEqual([
      ["Germany", true], ["France", false], ["Spain", false], ["Netherlands", false],
    ]);
    expect(sections[1]!.tally.closedTo!.text).toBe(
      "No route we check in France takes a research hosting agreement — Talent — researcher (chercheur) is quoted, not checked.",
    );
    expect(linkIn(sections[1]!.tally)).toEqual({ text: "Talent — researcher (chercheur)", href: url("/france/talent-researcher") });
  });

  it("the other four-country results: the explorer and the offer in Germany keep the dataset's order, open where an arranged answer would open a route; a leading France and a Germany with steps are both open", () => {
    // No offer, transfer or agreement: no country named; only arranged answers would open more.
    const explorer: Profile = {
      destination: "all", situation: "none", citizenship: "TR", qualification: "none", nl_recent_grad: "no", top200_grad: "no",
    };
    // An offer in Germany, nothing met: Germany's routes take an offer, so no written state; no step.
    const readerWithJobOffer: Profile = {
      destination: "all", situation: "offer", situation_country: "de", citizenship: "TR", qualification: "none",
      occupation_shortage: "no", experience_5y: "lt2", experience_7y: "lt3", occupation_it: "no", salary_eur_year: "band_0",
      nl_recent_grad: "no", top200_grad: "no",
    };
    // The researcher with a recognised degree and the funds but no German: France leads; Germany holds the language steps.
    const researcher: Profile = {
      destination: "all", situation: "research", situation_country: "fr", citizenship: "TR", qualification: "degree",
      recognition_de: "recognized", nl_recent_grad: "no", top200_grad: "no", german: "none", english: "none", funds_eur_month: "band_1",
    };
    for (const [name, answers] of Object.entries({ explorer, readerWithJobOffer, researcher })) {
      const { layout } = verdictFor(answers);
      if (layout.kind !== "countries") throw new Error(`${name}: no country sections`);
      expect(layout.strip, name).toMatchObject({ open: 0, withinReach: 0 });
    }
    // The explorer: dataset order. What would open more in Germany and Spain
    // is a transfer or a hosting agreement — arranged answers, no step (#175)
    // — so the nothing-open headline; the two sections where one would open
    // a route open on it (critique #4).
    expect(verdictFor(explorer).action.masthead.announced).toBe(NOTHING_OPEN_HEADLINE);
    expect(sectionsOf(explorer).map((s) => [s.name, s.open])).toEqual([
      ["Germany", true], ["France", false], ["Spain", true], ["Netherlands", false],
    ]);
    expect(sectionsOf(explorer).every((s) => linkIn(s.tally) === null)).toBe(true);
    // The offer in Germany: the same headline, dataset order, Germany's section open on its arranged line.
    expect(verdictFor(readerWithJobOffer).action.masthead.announced).toBe(NOTHING_OPEN_HEADLINE);
    expect(sectionsOf(readerWithJobOffer).map((s) => [s.name, s.open])).toEqual([
      ["Germany", true], ["France", false], ["Spain", false], ["Netherlands", false],
    ]);
    expect(sectionsOf(readerWithJobOffer).every((s) => linkIn(s.tally) === null)).toBe(true);
    // France leads, open, with its sentence; Germany, second, is open on its steps.
    expect(verdictFor(researcher).action.masthead.announced).toBe("No route we check in France takes a research hosting agreement.");
    const [france, germany] = sectionsOf(researcher);
    expect(sectionsOf(researcher).map((s) => [s.name, s.open])).toEqual([
      ["France", true], ["Germany", true], ["Spain", false], ["Netherlands", false],
    ]);
    expect(linkIn(france!.tally)).toEqual({ text: "Talent — researcher (chercheur)", href: url("/france/talent-researcher") });
    expect(germany!.tally.steps).toBeGreaterThan(0);
    expect(headed(germany!).some((h) => h.kind === "steps")).toBe(true);
  });
});

/**
 * The browser: the researcher's four-country walk, at the phone the critique
 * measured and at a desktop, by the buttons — what the live region says, and
 * that the page paints the verdict the cases above read (its headline, its
 * door, France's section leading open, Germany's line). Then the walk that
 * opens a German route, painted the same way. Both walks with the network
 * watched: the privacy walk in `record.test.ts` clicks the first option
 * everywhere and never reaches question 3, so this is the one walk through it
 * that reads what the page sent (Security review of s26).
 */
function why(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}
const skipped = why();
if (skipped)
  process.stderr.write(`\n  !! THE S26 WALK WAS NOT SEEN IN A BROWSER: ${skipped}.\n     Run: npm run build && npm test\n\n`);

const seed = (answers: Record<string, string>) =>
  `localStorage.setItem("permit-rulebook.record.v1", ${JSON.stringify(JSON.stringify({
    version: RECORD_VERSION, answers, history: Object.keys(answers),
  }))})`;

const tap = (value: string) => `document.querySelector(".qcard .opt[data-value=${value}]").click()`;

interface Result {
  state: string; status: string; problems: string[];
  /** Whether the page painted the verdict the walk's answers compose. */
  painted: typeof PAINTED_AS_COMPOSED;
  /** Every answer on the record and every route the screen links, for the wire check. */
  declared: string[]; routes: string[];
  /** What the page sent since the walk began. */
  sent: SentRequest[];
}

/** The results screen, read once it is drawn, against the verdict it should paint. */
const readResult = async (page: BrowserPage, verdict: Verdict): Promise<Result> => ({
  state: await page.evaluate('document.getElementById("app").dataset.state'),
  status: await page.evaluate('document.getElementById("cstatus").textContent'),
  problems: page.problems(),
  painted: JSON.parse(await page.evaluate(paintedAsComposedScript(verdict))),
  declared: JSON.parse(await page.evaluate(
    'JSON.stringify(Object.values(JSON.parse(localStorage.getItem("permit-rulebook.record.v1") || "{}").answers || {}))',
  )),
  routes: JSON.parse(await page.evaluate(
    'JSON.stringify([...document.querySelectorAll("#app a[href]")]'
    + '.map((a) => a.getAttribute("href")).filter((h) => /^[/][a-z-]+[/][a-z0-9-]+[/]?$/.test(h))'
    + '.map((h) => h.replace(/[/]$/, "").split("/").pop()))',
  )),
  sent: page.requests(),
});

/** A walk's taps after France, and the reader its whole record makes. */
interface Walk {
  taps: string[];
  reader: Profile;
}

/** Question 3 answered France by the button, then the walk's answers, one tap
 * each, to the results the reader's whole record composes. */
const walkFrom = async (page: BrowserPage, base: string, walk: Walk): Promise<Result> => {
  const { taps, reader } = walk;
  await page.goto(base);
  await page.evaluate(seed({ destination: "all", situation: "research" }));
  // The walk's own requests: from the load that draws question 3 on.
  page.forgetRequests();
  await page.goto(base);
  for (const value of ["fr", ...taps]) await answerWith(page, value === "TR" ? PICK_TURKEY : tap(value));
  // The last answer left the page at rest: what it sent has been sent.
  return readResult(page, verdictFor(reader));
};

describe.skipIf(skipped !== null)("s26 — in the browser", () => {
  for (const [name, viewport, mobile] of [
    ["390x844", { width: 390, height: 844 }, true],
    ["1280x900", { width: 1280, height: 900 }, false],
  ] as const) {
    it(`${name}: all four → research → France → nothing open reads France's written state, France's section first and open; a German route opening reads the open headline; nothing leaves the device`, async () => {
      const seen = (await walkSite({ site: { folder: dist }, screen: { viewport, mobile }, errorsExpected: true, network: true }, async ({ page, url: addressOf }) => ({
        nothingOpen: await walkFrom(page, addressOf("/"), { taps: ["none", "TR", "no", "no"], reader: WALKED_TO_NOTHING_OPEN }),
        opened: await walkFrom(page, addressOf("/"), {
          taps: ["degree", "TR", "recognized", "no", "no", "a1", "band_1"], reader: WALKED_TO_A_GERMAN_ROUTE,
        }),
        origin: new URL(addressOf("/")).origin,
      }))).returned;

      const { nothingOpen, opened } = seen;
      expect(nothingOpen.problems).toEqual([]);
      expect(nothingOpen.state).toBe("results");
      // The live region says France's written state.
      expect(nothingOpen.status).toBe("No route we check in France takes a research hosting agreement.");
      // The page paints what the verdict composed: the cases above read it.
      expect(nothingOpen.painted).toEqual(PAINTED_AS_COMPOSED);

      expect(opened.problems).toEqual([]);
      expect(opened.state).toBe("results");
      expect(opened.painted).toEqual(PAINTED_AS_COMPOSED);

      // Answers never leave the device — on this path too. The record test's
      // own assertion, over every request the two walks made.
      const { origin } = seen;
      for (const [where, walk] of [["the walk to nothing open", nothingOpen], ["the walk that opens a route", opened]] as const) {
        expect(walk.declared.length, `${where} answered nothing`).toBeGreaterThan(5);
        expect(walk.sent.length, `${where} sent nothing at all`).toBeGreaterThan(0);
        expectNothingLeft(walk.sent, { origin, where, declared: walk.declared, routes: walk.routes });
      }
    }, 180_000);
  }
});
