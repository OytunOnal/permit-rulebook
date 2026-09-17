import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  DESTINATION_FIELD, SITUATION_FIELD, evaluate, fieldOptions, isClosed, situationsAsked, type Dataset, type Profile,
} from "permit-rulebook-data";
import { RECORD_VERSION } from "../src/lib/record.js";
import {
  SITUATION_COUNTRY_FIELD, namedFirst, unscoredTally, unscoredVerdict, type UnscoredVerdict,
} from "../src/lib/situations.js";
import { READ_ITS_RULES, possessive, unscoredNamedRestLine, unscoredRestLine } from "../src/lib/copy.js";
import { url } from "../src/lib/site.js";

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

  it("first, before the others in dataset order, when nothing is open anywhere", () => {
    expect(zeroOpen(walk)).toBe(true);
    const lead = unscoredVerdict(ds, walk)!.lead;
    expect(lead).toBe("fr");
    expect(namedFirst(ds.countries, lead).map((c) => c.code)).toEqual(["FR", "DE", "ES", "NL"]);
    // Its line keeps s21's sentence and link.
    expect(unscoredTally(ds, france, "research")!.text).toBe(
      "No scored route in France takes a research hosting agreement — Talent — researcher (chercheur) is quoted, not scored.",
    );
  });

  it("dataset order with something open anywhere, and where the named country takes the situation", () => {
    expect(zeroOpen(opened)).toBe(false);
    // The headline is the open one; the written state is not computed, and no country leads.
    expect(namedFirst(ds.countries, undefined).map((c) => c.code)).toEqual(["DE", "FR", "ES", "NL"]);
    // An offer in Germany, nothing met: zero open, but Germany's routes take an offer — no written state, no lead.
    const offer: Profile = { [DESTINATION_FIELD]: "all", [SITUATION_FIELD]: "offer", [SITUATION_COUNTRY_FIELD]: "de", citizenship: "TR", qualification: "none" };
    expect(unscoredVerdict(ds, offer)).toBeNull();
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
 * doing the saying (s21 stands).
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
});

/** Question 3 answered France by the button, then the given answers, one tap each. */
const walkFrom = async (page: BrowserPage, base: string, answers: string[]): Promise<Result> => {
  await page.goto(base, 300);
  await page.evaluate(seed({ destination: "all", situation: "research" }));
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

describe.skipIf(skipped !== null)("s26 — in the browser", () => {
  for (const [name, viewport, mobile] of [
    ["390x844", { width: 390, height: 844 }, true],
    ["1280x900", { width: 1280, height: 900 }, false],
  ] as const) {
    it(`${name}: all four → research → France → nothing open reads France's written state, France's section first and open; a German route opening reads the open headline`, async () => {
      const server = await serve(dist);
      try {
        const seen = await withBrowser(async (page: BrowserPage) => ({
          closed: await walkFrom(page, server.url("/"), ["none", "TR", "no", "no"]),
          opened: await walkFrom(page, server.url("/"), ["degree", "TR", "recognized", "no", "no", "a1", "band_1"]),
        }), { viewport, mobile }) as { closed: Result; opened: Result };

        const { closed, opened } = seen;
        expect(closed.problems).toEqual([]);
        expect(closed.state).toBe("results");
        // The headline is France's written state — the one s19 writes on the France path.
        expect(closed.headline).toBe("No scored route in France takes a research hosting agreement.");
        expect(closed.status).toBe("No scored route in France takes a research hosting agreement.");
        expect(closed.subline).toBe(
          "France's route for a research hosting agreement — Talent — researcher (chercheur) — is quoted here but not scored: "
          + "read its rules. France's routes below need a job offer or an intra-corporate transfer.",
        );
        expect(closed.doorText).toBe("read its rules");
        expect(closed.door).toBe(url("/france/talent-researcher"));
        expect(closed.headline + closed.subline).not.toContain("Nothing open");
        // The strip stays, and the count is right.
        expect(closed.strip).toMatch(/^0 open 0 within reach 23 not yet/);
        // France's section leads, open; the others follow in dataset order, collapsed as before.
        expect(closed.lines.map((l) => [l.name, l.open])).toEqual([
          ["France", true], ["Germany", false], ["Spain", false], ["Netherlands", false],
        ]);
        const [fr, germany] = closed.lines;
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
      } finally { server.close(); }
    }, 180_000);
  }
});
