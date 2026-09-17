import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  DESTINATION_FIELD, SITUATION_FIELD, evaluate, fieldOptions, isClosed, situationsAsked, type Dataset, type Profile,
} from "permit-rulebook-data";
import { RECORD_VERSION } from "../src/lib/record.js";
import {
  SITUATION_COUNTRY_FIELD, leadCountry, leads, namedFirst, unscoredTally, unscoredVerdict, type UnscoredVerdict,
} from "../src/lib/situations.js";
import { READ_ITS_RULES, possessive, unscoredNamedRestLine, unscoredRestLine } from "../src/lib/copy.js";
import { url } from "../src/lib/site.js";
import { expectNothingLeft, type Sent } from "./wire.js";

const ds = dataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));

const france = ds.countries.find((c) => c.code === "FR")!;

/** The four-country answers for a situation and the country the reader named at question 3. */
const fourCountry = (situation: string, country: string): Profile =>
  ({ [DESTINATION_FIELD]: "all", [SITUATION_FIELD]: situation, [SITUATION_COUNTRY_FIELD]: country });
/** The direct answers: that country at question 1, the situation at question 2. */
const direct = (situation: string, country: string): Profile =>
  ({ [DESTINATION_FIELD]: country, [SITUATION_FIELD]: situation });

/** The subline in its two sentences: the route line, with the door, and the rest. */
const sentences = (v: UnscoredVerdict): { route: string; rest: string } => {
  const cut = v.subline.indexOf(`${READ_ITS_RULES}. `);
  if (cut < 0) return { route: "", rest: v.subline };
  const end = cut + READ_ITS_RULES.length + 1;
  return { route: v.subline.slice(0, end), rest: v.subline.slice(end + 1) };
};

/** Whether nothing is open anywhere on these answers, the way the results screen counts it. */
const zeroOpen = (answers: Profile): boolean =>
  evaluate(ds, answers).filter((r) => !isClosed(r)).every((r) => r.status === "hold");

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
        const four = unscoredVerdict(ds, fourCountry(s.value, c.value));
        const one = unscoredVerdict(ds, direct(s.value, c.value));
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
        expect(f.rest).toBe(d.rest.replace(/^The\b/, possessive(country.name)));
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
    expect(unscoredNamedRestLine("France", "a job offer or an intra-corporate transfer"))
      .toBe("France's routes below need a job offer or an intra-corporate transfer.");
    // The possessive the route line already uses, for the one country whose name ends in an s.
    expect(unscoredNamedRestLine("Netherlands", "x")).toBe("Netherlands' routes below need x.");
  });

  it("the France researcher, both ways: the same words, the door to the quoted route", () => {
    const four = unscoredVerdict(ds, fourCountry("research", "fr"))!;
    expect(four.headline).toBe("No scored route in France takes a research hosting agreement.");
    expect(four.subline).toBe(
      "France's route for a research hosting agreement — Talent — researcher (chercheur) — is quoted here but not scored: "
      + "read its rules. France's routes below need a job offer or an intra-corporate transfer.",
    );
    expect(four.door).toEqual({ text: READ_ITS_RULES, href: url("/france/talent-researcher") });
    expect(four.lead).toBe("fr");
    // The direct path, as s19 left it.
    expect(unscoredVerdict(ds, direct("research", "fr"))!.subline).toMatch(/ The routes below need /);
  });

  it("is keyed by the named country only where the destination is all four: no country named, or a country that takes the situation, leaves the verdicts as they were", () => {
    expect(unscoredVerdict(ds, { [DESTINATION_FIELD]: "all", [SITUATION_FIELD]: "research" })).toBeNull();
    expect(unscoredVerdict(ds, fourCountry("research", "de"))).toBeNull();
    expect(unscoredVerdict(ds, fourCountry("offer", "fr"))).toBeNull();
    expect(unscoredVerdict(ds, fourCountry("none", "fr"))).toBeNull();
    // A stray country answer under a one-country destination is not a key: the direct path never asks it.
    expect(unscoredVerdict(ds, { ...direct("research", "es"), [SITUATION_COUNTRY_FIELD]: "fr" })).toBeNull();
  });
});

describe("s26 — the named country's section leads", () => {
  /** The critique's walk to nothing open: no qualification, a Turkish passport, no Dutch graduation, no top-200 degree. */
  const walk: Profile = { ...fourCountry("research", "fr"), citizenship: "TR", qualification: "none", nl_recent_grad: "no", top200_grad: "no" };
  /** The same walk with a recognised degree, some German and the funds: Germany's Opportunity Card opens. */
  const opened: Profile = {
    ...fourCountry("research", "fr"), citizenship: "TR", qualification: "degree", recognition_de: "recognized",
    nl_recent_grad: "no", top200_grad: "no", german: "a1", funds_eur_month: "band_1",
  };
  /** An offer in Germany, nothing met: zero open, but Germany's routes take an offer. */
  const offer: Profile = { [DESTINATION_FIELD]: "all", [SITUATION_FIELD]: "offer", [SITUATION_COUNTRY_FIELD]: "de", citizenship: "TR", qualification: "none" };
  /** An explorer: no offer, transfer or agreement, so no country named. */
  const explorer: Profile = { [DESTINATION_FIELD]: "all", [SITUATION_FIELD]: "none", citizenship: "TR", qualification: "none" };

  /** The order the result draws, from the profile alone, the way the page derives it. */
  const order = (answers: Profile): string[] =>
    namedFirst(ds.countries, leadCountry(ds, answers, zeroOpen(answers))).map((c) => c.code);

  it("first, before the others in dataset order, when nothing is open anywhere", () => {
    expect(zeroOpen(walk)).toBe(true);
    const lead = leadCountry(ds, walk, zeroOpen(walk));
    expect(lead).toBe("fr");
    expect(order(walk)).toEqual(["FR", "DE", "ES", "NL"]);
    // The one predicate: the named country leads, and it is the only one that does.
    expect(ds.countries.map((c) => leads(c, lead))).toEqual([false, true, false, false]);
    // Its line keeps s21's sentence and link.
    expect(unscoredTally(ds, france, "research")!.text).toBe(
      "No scored route in France takes a research hosting agreement — Talent — researcher (chercheur) is quoted, not scored.",
    );
  });

  it("dataset order with something open anywhere, and where the named country takes the situation, and with no country named", () => {
    // The headline is the open one; the written state is not drawn, and no country leads.
    expect(zeroOpen(opened)).toBe(false);
    expect(leadCountry(ds, opened, zeroOpen(opened))).toBeUndefined();
    expect(order(opened)).toEqual(["DE", "FR", "ES", "NL"]);
    // Zero open, but no written state for Germany: nothing leads.
    expect(zeroOpen(offer)).toBe(true);
    expect(unscoredVerdict(ds, offer)).toBeNull();
    expect(leadCountry(ds, offer, true)).toBeUndefined();
    expect(order(offer)).toEqual(["DE", "FR", "ES", "NL"]);
    // The explorer: nothing named, nothing leads.
    expect(zeroOpen(explorer)).toBe(true);
    expect(leadCountry(ds, explorer, true)).toBeUndefined();
    expect(order(explorer)).toEqual(["DE", "FR", "ES", "NL"]);
    // And the walk's own lead is nobody's the moment something is open: the decision is the headline's.
    expect(leadCountry(ds, walk, false)).toBeUndefined();
    expect(ds.countries.some((c) => leads(c, undefined))).toBe(false);
    // The order is stable: nothing else moves, and an unknown lead moves nothing.
    expect(namedFirst(ds.countries, "nl").map((c) => c.code)).toEqual(["NL", "DE", "FR", "ES"]);
    expect(namedFirst(ds.countries, "xx").map((c) => c.code)).toEqual(["DE", "FR", "ES", "NL"]);
    expect(namedFirst(ds.countries, "fr")).not.toBe(ds.countries);
  });
});

/**
 * The browser: the researcher's four-country walk, at the phone the critique
 * measured and at a desktop — the headline is France's, the door goes to the
 * quoted route, France's section leads open, Germany's line is what it was.
 * Then the walk that opens a German route: the open headline, France's line
 * doing the saying (s21 stands). Both walks with the network watched: the
 * privacy walk in `record.test.ts` clicks the first option everywhere and
 * never reaches question 3, so this is the one walk through it that reads
 * what the page sent (Security review of s26). Then three results the
 * points say are unchanged, seeded and read: the explorer and the offer in
 * Germany keep the dataset's order and the steps rule; and a France that
 * leads beside a Germany that holds steps — both open.
 */
const { chromePath } = await import("../scripts/chrome.mjs");
const { serve, withBrowser } = await import("../scripts/browser.mjs");

function why(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}
const skipped = why();
if (skipped)
  process.stderr.write(`\n  !! THE S26 WALK WAS NOT SEEN IN A BROWSER: ${skipped}.\n     Run: npm run build && npm test\n\n`);

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
  problems(): string[];
  requests(): Sent[];
  forgetRequests(): void;
}

const seed = (answers: Record<string, string>) =>
  `localStorage.setItem("permit-rulebook.record.v1", ${JSON.stringify(JSON.stringify({
    version: RECORD_VERSION, answers, history: Object.keys(answers),
  }))})`;

const LINES = 'JSON.stringify([...document.querySelectorAll(".country-sec")].map((d) => ({'
  + ' name: d.querySelector("summary").firstChild.textContent.trim(), open: d.open,'
  + ' tally: d.querySelector(".tally").textContent.trim(),'
  + ' link: d.querySelector(".tally a") ? { text: d.querySelector(".tally a").textContent, href: d.querySelector(".tally a").getAttribute("href") } : null,'
  + ' heads: [...d.querySelectorAll(".cbody .ghead")].map((h) => h.textContent.trim()) })))';
const tap = (value: string) => `document.querySelector(".qcard .opt[data-value=${value}]").click()`;
const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Result {
  state: string; headline: string; subline: string; door: string | null; doorText: string | null; status: string;
  strip: string; main: string; problems: string[];
  lines: { name: string; open: boolean; tally: string; heads: string[]; link: { text: string; href: string } | null }[];
  /** Every answer on the record and every route the screen links, for the wire check. */
  declared: string[]; routes: string[];
  /** What the page sent since the walk began. */
  sent: Sent[];
}

/** The results screen, read once it is drawn. */
const readResult = async (page: BrowserPage): Promise<Result> => ({
  state: await page.evaluate('document.getElementById("app").dataset.state'),
  headline: await page.evaluate('document.getElementById("headline").textContent.trim()'),
  subline: await page.evaluate('document.getElementById("subline").textContent.trim()'),
  door: await page.evaluate('document.querySelector("#subline a") ? document.querySelector("#subline a").getAttribute("href") : null'),
  doorText: await page.evaluate('document.querySelector("#subline a") ? document.querySelector("#subline a").textContent : null'),
  status: await page.evaluate('document.getElementById("cstatus").textContent'),
  strip: await page.evaluate('document.querySelector(".strip").textContent.replace(/\\s+/g, " ").trim()'),
  main: await page.evaluate('document.getElementById("main").textContent'),
  lines: JSON.parse(await page.evaluate(LINES)),
  problems: page.problems(),
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

/** Question 3 answered France by the button, then the given answers, one tap each. */
const walkFrom = async (page: BrowserPage, base: string, answers: string[]): Promise<Result> => {
  await page.goto(base, 300);
  await page.evaluate(seed({ destination: "all", situation: "research" }));
  // The walk's own requests: from the load that draws question 3 on.
  page.forgetRequests();
  await page.goto(base, 900);
  await page.evaluate(tap("fr"));
  await settle(400);
  for (const value of answers) {
    if (value === "TR") {
      await page.evaluate('(() => { const i = document.querySelector("#cfilter"); i.value = "Turkey"; i.dispatchEvent(new Event("input", { bubbles: true })); })()');
      await settle(300);
      await page.evaluate('document.querySelector(".clist [role=option]").click()');
    } else {
      await page.evaluate(tap(value));
    }
    await settle(400);
  }
  await settle(900);
  return readResult(page);
};

/** A result the record already holds, drawn on arrival. */
const seeded = async (page: BrowserPage, base: string, answers: Record<string, string>): Promise<Result> => {
  await page.goto(base, 300);
  await page.evaluate(seed(answers));
  await page.goto(base, 1400);
  return readResult(page);
};

describe.skipIf(skipped !== null)("s26 — in the browser", () => {
  for (const [name, viewport, mobile] of [
    ["390x844", { width: 390, height: 844 }, true],
    ["1280x900", { width: 1280, height: 900 }, false],
  ] as const) {
    it(`${name}: all four → research → France → nothing open reads France's written state, France's section first and open; a German route opening reads the open headline; nothing leaves the device`, async () => {
      const server = await serve(dist);
      try {
        const seen = await withBrowser(async (page: BrowserPage) => ({
          nothingOpen: await walkFrom(page, server.url("/"), ["none", "TR", "no", "no"]),
          opened: await walkFrom(page, server.url("/"), ["degree", "TR", "recognized", "no", "no", "a1", "band_1"]),
        }), { viewport, mobile, network: true }) as { nothingOpen: Result; opened: Result };

        const { nothingOpen, opened } = seen;
        expect(nothingOpen.problems).toEqual([]);
        expect(nothingOpen.state).toBe("results");
        // The headline is France's written state — the one s19 writes on the France path.
        expect(nothingOpen.headline).toBe("No scored route in France takes a research hosting agreement.");
        expect(nothingOpen.status).toBe("No scored route in France takes a research hosting agreement.");
        expect(nothingOpen.subline).toBe(
          "France's route for a research hosting agreement — Talent — researcher (chercheur) — is quoted here but not scored: "
          + "read its rules. France's routes below need a job offer or an intra-corporate transfer.",
        );
        expect(nothingOpen.doorText).toBe("read its rules");
        expect(nothingOpen.door).toBe(url("/france/talent-researcher"));
        expect(nothingOpen.headline + nothingOpen.subline).not.toContain("Nothing open");
        // The strip stays, and the count is right.
        expect(nothingOpen.strip).toMatch(/^0 open 0 within reach 23 not yet/);
        // France's section leads, open; the others follow in dataset order, collapsed as before.
        expect(nothingOpen.lines.map((l) => [l.name, l.open])).toEqual([
          ["France", true], ["Germany", false], ["Spain", false], ["Netherlands", false],
        ]);
        const [fr, germany] = nothingOpen.lines;
        expect(fr!.tally).toBe(
          "No scored route in France takes a research hosting agreement — Talent — researcher (chercheur) is quoted, not scored.",
        );
        expect(fr!.link).toEqual({ text: "Talent — researcher (chercheur)", href: url("/france/talent-researcher") });
        expect(fr!.heads).toEqual(["Not yet (5)"]);
        expect(germany!.tally).toBe("8 not yet");
        expect(germany!.link).toBeNull();

        // The German Opportunity Card opens: the open headline, and France's line does the saying.
        expect(opened.problems).toEqual([]);
        expect(opened.state).toBe("results");
        expect(opened.headline).toMatch(/^1 route looks open\./);
        expect(opened.headline + opened.subline).not.toContain("No scored route");
        expect(opened.door).toBeNull();
        expect(opened.lines.map((l) => [l.name, l.open])).toEqual([
          ["Germany", true], ["France", false], ["Spain", false], ["Netherlands", false],
        ]);
        expect(opened.lines[1]!.tally).toBe(
          "No scored route in France takes a research hosting agreement — Talent — researcher (chercheur) is quoted, not scored.",
        );
        expect(opened.lines[1]!.link).toEqual({ text: "Talent — researcher (chercheur)", href: url("/france/talent-researcher") });

        // Answers never leave the device — on this path too. The record test's
        // own assertion, over every request the two walks made.
        const origin = server.origin as string;
        for (const [where, walk] of [["the walk to nothing open", nothingOpen], ["the walk that opens a route", opened]] as const) {
          expect(walk.declared.length, `${where} answered nothing`).toBeGreaterThan(5);
          expect(walk.sent.length, `${where} sent nothing at all`).toBeGreaterThan(0);
          expectNothingLeft(walk.sent, { origin, where, declared: walk.declared, routes: walk.routes });
        }
      } finally { server.close(); }
    }, 180_000);
  }

  it("the other four-country results are what they were: the explorer and the offer in Germany keep the dataset's order and the steps rule; a leading France and a Germany with steps are both open", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => ({
        // No offer, transfer or agreement: no country named, steps in Germany and Spain.
        explorer: await seeded(page, server.url("/"), {
          destination: "all", situation: "none", citizenship: "TR", qualification: "none", nl_recent_grad: "no", top200_grad: "no",
        }),
        // An offer in Germany, nothing met: Germany's routes take an offer, so no written state; steps in Germany.
        offer: await seeded(page, server.url("/"), {
          destination: "all", situation: "offer", situation_country: "de", citizenship: "TR", qualification: "none",
          occupation_shortage: "no", experience_5y: "lt2", experience_7y: "lt3", occupation_it: "no", salary_eur_year: "band_0",
          nl_recent_grad: "no", top200_grad: "no",
        }),
        // The researcher with a recognised degree and the funds but no German: France leads; Germany holds the language steps.
        both: await seeded(page, server.url("/"), {
          destination: "all", situation: "research", situation_country: "fr", citizenship: "TR", qualification: "degree",
          recognition_de: "recognized", nl_recent_grad: "no", top200_grad: "no", german: "none", english: "none", funds_eur_month: "band_1",
        }),
      }), { viewport: { width: 1280, height: 900 }, mobile: false }) as { explorer: Result; offer: Result; both: Result };

      const { explorer, offer, both } = seen;
      for (const [name, r] of Object.entries(seen)) {
        expect(r.problems, name).toEqual([]);
        expect(r.state, name).toBe("results");
        expect(r.strip, name).toMatch(/^0 open 0 within reach /);
      }
      // The explorer: the steps headline, dataset order, the two sections holding a step open (critique #4).
      expect(explorer.headline).toMatch(/^Nothing open yet — \d+ steps? would change that\./);
      expect(explorer.lines.map((l) => [l.name, l.open])).toEqual([
        ["Germany", true], ["France", false], ["Spain", true], ["Netherlands", false],
      ]);
      expect(explorer.lines.every((l) => l.link === null)).toBe(true);
      // The offer in Germany: the same headline shape, dataset order, Germany's section open on its steps.
      expect(offer.headline).toMatch(/^Nothing open yet — \d+ steps? would change that\./);
      expect(offer.lines.map((l) => [l.name, l.open])).toEqual([
        ["Germany", true], ["France", false], ["Spain", false], ["Netherlands", false],
      ]);
      expect(offer.lines.every((l) => l.link === null)).toBe(true);
      // France leads, open, with its sentence; Germany, second, is open on its steps.
      expect(both.headline).toBe("No scored route in France takes a research hosting agreement.");
      expect(both.lines.map((l) => [l.name, l.open])).toEqual([
        ["France", true], ["Germany", true], ["Spain", false], ["Netherlands", false],
      ]);
      expect(both.lines[0]!.link).toEqual({ text: "Talent — researcher (chercheur)", href: url("/france/talent-researcher") });
      expect(both.lines[1]!.tally).toMatch(/unlocking steps?$/);
      expect(both.lines[1]!.heads.some((h) => h.startsWith("Steps that would unlock more here"))).toBe(true);
    } finally { server.close(); }
  }, 180_000);
});
