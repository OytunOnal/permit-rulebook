import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { type Profile } from "permit-rulebook-data";
import { RECORD_VERSION } from "../src/lib/record.js";
import { NOTHING_OPEN_HEADLINE } from "../src/lib/copy/verdict.js";
import { url } from "../src/lib/site.js";
import type { CountrySection, Verdict, VerdictGroup } from "../src/lib/verdict/verdict.js";
import {
  PAINTED_AS_COMPOSED, countryNamed, paintedAsComposedScript, routeIdsIn, saidLineOf, verdictFor,
} from "./verdict-cards.js";
import { expectNothingLeft } from "./wire.js";
import { walkSite, type BrowserPage, type SentRequest } from "../scripts/browser/browser.mjs";
import { PICK_TURKEY, answerWith, skipReason } from "./browser-walk.js";
import { WALKED_TO_A_GERMAN_ROUTE, WALKED_TO_NOTHING_OPEN } from "./s26-walks.js";

const dist = fileURLToPath(new URL("../dist", import.meta.url));

/**
 * s26 — one reader, one hierarchy.
 *
 * A researcher with a French hosting agreement named France at question 3:
 * the product knows which country their agreement is in, and the headline is
 * that country's. This file holds the results the walks end on, read from the
 * verdict, and the walks in the browser; `s26-headline.test.ts` holds the
 * headline and the order of the sections.
 */

/** A section with its country's name and the s19 sentence its drawn line carries. */
type ReadSection = CountrySection & { name: string; said: { text: string; html: string } | null };
/** The country sections the verdict for these answers draws, each with its name and its line. */
const sectionsOf = (answers: Profile): ReadSection[] => {
  const verdict = verdictFor(answers);
  if (verdict.layout.kind !== "countries") throw new Error("the four-country verdict draws no country sections");
  return verdict.layout.sections.map((s) => ({ ...s, name: countryNamed(s.country), said: saidLineOf(verdict, s) }));
};
/** The link in a country's line, where its line carries one. */
const linkIn = (section: ReadSection): { text: string; href: string } | null => {
  const a = section.said ? /<a href="([^"]*)">([^<]*)<\/a>/.exec(section.said.html) : null;
  return a ? { text: a[2]!, href: a[1]! } : null;
};
/** The count a group's heading prints; the steps heading prints none. */
const countHeaded = (g: VerdictGroup): number | undefined => {
  if (g.kind === "steps") return undefined;
  return g.kind === "not-yet" ? g.count : routeIdsIn(g).length;
};
/** The groups a section draws under a heading, each with the count it
 * prints; the arranged line stands under none. */
const headed = (section: CountrySection) =>
  section.groups.filter((g) => g.kind !== "arranged").map((g) => ({ kind: g.kind, count: countHeaded(g) }));

/** Checks the walk to nothing open reads France's written state, France's
 * section leading open and Germany's line its count. */
function expectNothingOpenWalkReadsFrancesWrittenState(): void {
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
  expect(fr!.said!.text).toBe(
    "No route we check in France takes a research hosting agreement — Talent — researcher (chercheur) is quoted, not checked.",
  );
  expect(linkIn(fr!)).toEqual({ text: "Talent — researcher (chercheur)", href: url("/france/talent-researcher") });
  expect(headed(fr!)).toEqual([{ kind: "not-yet", count: 5 }]);
  expect(germany!.tally).toMatchObject({
    open: 0, unsettled: 0, withinReach: 0, notYet: 8, openUnknowns: 0, closed: 0, steps: 0, mark: null,
  });
  expect(linkIn(germany!)).toBeNull();
}

/** The three other four-country readers: the explorer, the offer in Germany, the researcher with no German. */
function otherFourCountryReaders(): { explorer: Profile; readerWithJobOffer: Profile; researcher: Profile } {
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
  return { explorer, readerWithJobOffer, researcher };
}

/** Checks the other four-country results: the explorer's order, the offer in
 * Germany leading with Germany, and a leading France with a Germany of steps. */
function expectOtherFourCountryResults(): void {
  const { explorer, readerWithJobOffer, researcher } = otherFourCountryReaders();
  for (const [name, answers] of Object.entries({ explorer, readerWithJobOffer, researcher })) {
    const { layout } = verdictFor(answers);
    if (layout.kind !== "countries") throw new Error(`${name}: no country sections`);
    expect(layout.strip, name).toMatchObject({ open: 0, withinReach: 0 });
  }
  // The explorer: dataset order. What would open more in Germany and Spain
  // is a transfer or a hosting agreement — arranged answers, no step (#175)
  // — so the nothing-open headline; the two sections where one would open
  // a route open on it (critique #4). France and the Netherlands open on
  // their job offer lines (ruling 6 of #187).
  expect(verdictFor(explorer).action.masthead.announced).toBe(NOTHING_OPEN_HEADLINE);
  expect(sectionsOf(explorer).map((s) => [s.name, s.open])).toEqual([
    ["Germany", true], ["France", true], ["Spain", true], ["Netherlands", true],
  ]);
  expect(sectionsOf(explorer).every((s) => linkIn(s) === null)).toBe(true);
  // The offer in Germany: the same headline, Germany first, open on its arranged line.
  expect(verdictFor(readerWithJobOffer).action.masthead.announced).toBe(NOTHING_OPEN_HEADLINE);
  expect(sectionsOf(readerWithJobOffer).map((s) => [s.name, s.open])).toEqual([
    ["Germany", true], ["France", false], ["Spain", false], ["Netherlands", false],
  ]);
  expect(sectionsOf(readerWithJobOffer).every((s) => linkIn(s) === null)).toBe(true);
  // France leads, open, with its sentence; Germany, second, is open on its steps.
  expect(verdictFor(researcher).action.masthead.announced).toBe("No route we check in France takes a research hosting agreement.");
  const [france, germany] = sectionsOf(researcher);
  expect(sectionsOf(researcher).map((s) => [s.name, s.open])).toEqual([
    ["France", true], ["Germany", true], ["Spain", false], ["Netherlands", false],
  ]);
  expect(linkIn(france!)).toEqual({ text: "Talent — researcher (chercheur)", href: url("/france/talent-researcher") });
  expect(germany!.tally.steps).toBeGreaterThan(0);
  expect(headed(germany!).some((h) => h.kind === "steps")).toBe(true);
}

/**
 * What the browser walks below end on, decided by the verdict's entry: the
 * headline and the subline, the strip, which section leads and which open, and
 * what each country's line and headings say.
 */
describe("s26 — the results the walks end on, from the verdict", () => {
  it("the walk to nothing open reads France's written state; France's section leads, open; Germany's line is its count", () => {
    expectNothingOpenWalkReadsFrancesWrittenState();
  });

  it("the walk that opens a German route reads the open headline, France first and open, its line doing the saying, Germany open second", () => {
    const m = verdictFor(WALKED_TO_A_GERMAN_ROUTE).action.masthead;
    expect(m.announced).toMatch(/^1 route looks open\./);
    expect(m.announced + m.subline).not.toContain("No route we check");
    expect(m.sublineHtml).toBeUndefined();
    const sections = sectionsOf(WALKED_TO_A_GERMAN_ROUTE);
    expect(sections.map((s) => [s.name, s.open])).toEqual([
      ["France", true], ["Germany", true], ["Spain", false], ["Netherlands", false],
    ]);
    expect(sections[0]!.said!.text).toBe(
      "No route we check in France takes a research hosting agreement — Talent — researcher (chercheur) is quoted, not checked.",
    );
    expect(linkIn(sections[0]!)).toEqual({ text: "Talent — researcher (chercheur)", href: url("/france/talent-researcher") });
  });

  it("the other four-country results: the explorer keeps the dataset's order and the offer in Germany leads with Germany, open where an arranged answer would open a route; a leading France and a Germany with steps are both open", () => {
    expectOtherFourCountryResults();
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
const skipped = skipReason();
if (skipped)
  process.stderr.write(`\n  !! THE S26 WALK WAS NOT SEEN IN A BROWSER: ${skipped}.\n     Run: npm run build && npm test\n\n`);

const seed = (answers: Record<string, string>) =>
  `localStorage.setItem("permit-rulebook.record.v1", ${JSON.stringify(JSON.stringify({
    version: RECORD_VERSION, answers, history: Object.keys(answers),
  }))})`;

const tap = (value: string) => `document.querySelector(".qcard .opt[data-value=${value}]").click()`;

interface Result {
  state: string; status: string;
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
      const walk = { site: { folder: dist }, screen: { viewport, mobile }, network: true, trafficCounter: "cloudflare's copy" } as const;
      const seen = (await walkSite(walk, async ({ page, url: addressOf }) => ({
        nothingOpen: await walkFrom(page, addressOf("/"), { taps: ["none", "TR", "no", "no"], reader: WALKED_TO_NOTHING_OPEN }),
        opened: await walkFrom(page, addressOf("/"), {
          taps: ["degree", "TR", "recognized", "no", "no", "a1", "band_1"], reader: WALKED_TO_A_GERMAN_ROUTE,
        }),
        origin: new URL(addressOf("/")).origin,
      }))).returned;

      const { nothingOpen, opened } = seen;
      expect(nothingOpen.state).toBe("results");
      // The live region says France's written state.
      expect(nothingOpen.status).toBe("No route we check in France takes a research hosting agreement.");
      // The page paints what the verdict composed: the cases above read it.
      expect(nothingOpen.painted).toEqual(PAINTED_AS_COMPOSED);

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
