import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  DESTINATION_FIELD, SITUATION_FIELD, fieldOptions, remainingQuestions, situationsAsked, type Country, type Dataset,
} from "permit-rulebook-data";
import { RECORD_VERSION } from "../src/lib/record.js";
import { questionCardHtml } from "../src/lib/question.js";
import {
  SITUATION_COUNTRY_FIELD, markUnder, notScoredFor, notScoredMarkHtml, unscoredTally,
} from "../src/lib/situations.js";
import {
  IS_QUOTED_NOT_SCORED, READ_IT_HERE, notScoredQuotedLine, unscoredHeadline, unscoredTallyLine,
} from "../src/lib/copy.js";
import { url } from "../src/lib/site.js";

const ds = dataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));

const france = ds.countries.find((c) => c.code === "FR")!;
const researcher = france.routes.find((r) => r.id === "fr-talent-chercheur")!;

/** The country question, as the four-country path reaches it: third, after the situation. */
const countryQuestion = () =>
  remainingQuestions(ds, { [DESTINATION_FIELD]: "all", [SITUATION_FIELD]: "research" })[0]!;

/** Question 3, drawn by the one renderer, for a reader on the four-country path who declared this situation. */
const countryScreen = (situation: string): string =>
  questionCardHtml({
    dataset: ds, question: countryQuestion(), answers: { [DESTINATION_FIELD]: "all", [SITUATION_FIELD]: situation },
    asked: [DESTINATION_FIELD, SITUATION_FIELD], editing: null, total: 15, glossary: new Set(),
  });

/** The marks on a drawn screen, keyed by the option they sit under. */
function marksOn(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<small class="opt-mark"[^>]*data-for="([^"]+)"[^>]*>([\s\S]*?)<\/small>/g;
  for (let m = re.exec(html); m; m = re.exec(html)) out[m[1]!] = m[2]!;
  return out;
}

/**
 * s21 — the mark on the country, and on the four-country result.
 *
 * The same researcher on the "Any of these four" path answers research at
 * question 2 (nothing to mark — three destinations score it) and France at
 * question 3, and met "Nothing open on these answers" thirteen questions
 * later, France's line saying "5 not yet" (v1.1 gate critique, N1). The
 * derivation s19 built is keyed by the destination answer; question 3's
 * options ARE destination answers, so the same set answers for it the other
 * way round: the situation is declared, the option is the country.
 */
describe("s21 — question 3 marks a country the declared situation cannot use", () => {
  it("the country question is the third on the four-country path, and its options are the destination answers", () => {
    expect(countryQuestion().field).toBe(SITUATION_COUNTRY_FIELD);
    const destinations = new Set(fieldOptions(ds, DESTINATION_FIELD).map((o) => o.value));
    for (const o of countryQuestion().options) expect(destinations.has(o.value), o.value).toBe(true);
  });

  it("one derivation, keyed either way: the mark under a country option is the s19 mark for that country and the declared situation", () => {
    const answers = { [DESTINATION_FIELD]: "all", [SITUATION_FIELD]: "research" };
    expect(markUnder(ds, SITUATION_COUNTRY_FIELD, "fr", answers)).toEqual(notScoredFor(ds, "fr", "research"));
    expect(markUnder(ds, SITUATION_COUNTRY_FIELD, "de", answers)).toBeNull();
    // Question 2 keeps its own key: the option is the situation, the destination is declared.
    expect(markUnder(ds, SITUATION_FIELD, "research", { [DESTINATION_FIELD]: "fr" })).toEqual(notScoredFor(ds, "fr", "research"));
    // With no situation on the record there is nothing to mark a country against.
    expect(markUnder(ds, SITUATION_COUNTRY_FIELD, "fr", { [DESTINATION_FIELD]: "all" })).toBeNull();
    // And no other question is ever marked.
    expect(markUnder(ds, "qualification", "degree", answers)).toBeNull();
  });

  it("over every situation × country, the mark is exactly where situationsAsked says", () => {
    const asked = situationsAsked(ds);
    const countries = countryQuestion().options.map((o) => o.value);
    for (const s of fieldOptions(ds, SITUATION_FIELD)) {
      const marked = Object.keys(marksOn(countryScreen(s.value)));
      const expected = s.is_fallback || s.is_unknown ? [] : countries.filter((c) => !asked.get(c)!.has(s.value));
      expect(marked, s.value).toEqual(expected);
    }
    // Which is one country under one answer in the whole dataset today.
    const all = fieldOptions(ds, SITUATION_FIELD).flatMap((s) =>
      Object.keys(marksOn(countryScreen(s.value))).map((c) => `${s.value}:${c}`));
    expect(all).toEqual(["research:fr"]);
  });

  it("draws the s19 mark under France — same words, same link — and the option stays a button", () => {
    const html = countryScreen("research");
    const marks = marksOn(html);
    expect(Object.keys(marks)).toEqual(["fr"]);
    expect(marks.fr!.replace(/<[^>]+>/g, "")).toBe(notScoredQuotedLine(france.name, researcher.name));
    expect(marks.fr).toContain(`<a href="${url("/france/talent-researcher")}">${READ_IT_HERE}</a>`);
    expect(html.match(/<button class="opt"/g)!.length).toBe(4);
    // After its button, never inside it.
    expect(html).toMatch(/<button class="opt" data-value="fr"[^>]*>[\s\S]*?<\/button><small class="opt-mark"/);
  });

  it("the mark is announced: it has an id, its option is described by it, and no other option is", () => {
    const html = countryScreen("research");
    const mark = html.match(/<small class="opt-mark"([^>]*)>/)![1]!;
    const id = mark.match(/ id="([^"]+)"/)?.[1];
    expect(id, "the mark has no id").toBeTruthy();
    expect(html.match(new RegExp(` id="${id}"`, "g"))!.length).toBe(1);
    const button = html.match(/<button class="opt" data-value="fr"([^>]*)>/)![1]!;
    expect(button).toContain(` aria-describedby="${id}"`);
    expect(html.match(/aria-describedby/g)!.length).toBe(1);
    // Question 2 for France, the same way (the s19 mark, announced too).
    const q2 = questionCardHtml({
      dataset: ds, question: remainingQuestions(ds, { [DESTINATION_FIELD]: "fr" }).find((q) => q.field === SITUATION_FIELD)!,
      answers: { [DESTINATION_FIELD]: "fr" }, asked: [DESTINATION_FIELD], editing: null, total: 12, glossary: new Set(),
    });
    const q2id = q2.match(/<small class="opt-mark"[^>]* id="([^"]+)"/)?.[1];
    expect(q2id).toBeTruthy();
    expect(q2).toMatch(new RegExp(`<button class="opt" data-value="research"[^>]* aria-describedby="${q2id}"`));
  });

  it("the mark's link is internal and says so: no out class", () => {
    expect(notScoredMarkHtml(notScoredFor(ds, "fr", "research")!)).not.toMatch(/class="[^"]*\bout\b/);
    expect(countryScreen("research")).not.toMatch(/class="[^"]*\bout\b/);
  });
});

describe("s21 — the four-country result says it in the country's line", () => {
  it("France's line: the s19 headline, then the quoted route as the link", () => {
    const line = unscoredTally(ds, france, "research");
    expect(line).not.toBeNull();
    expect(line!.text).toBe(
      "No scored route in France takes a research hosting agreement — Talent — researcher (chercheur) is quoted, not scored.",
    );
    expect(line!.html).toBe(
      "No scored route in France takes a research hosting agreement — "
      + `<a href="${url("/france/talent-researcher")}">Talent — researcher (chercheur)</a> ${IS_QUOTED_NOT_SCORED}.`,
    );
    expect(line!.html).not.toMatch(/class="[^"]*\bout\b/);
  });

  it("is the s19 sentence and the s19 words — one copy, in copy.ts", () => {
    expect(unscoredTallyLine("France", "a research hosting agreement", "Talent — researcher (chercheur)")).toBe(
      `${unscoredHeadline("France", "a research hosting agreement").replace(/\.$/, "")} — Talent — researcher (chercheur) ${IS_QUOTED_NOT_SCORED}.`,
    );
    // Without a quoted route the line is the headline alone.
    expect(unscoredTallyLine("France", "a research hosting agreement")).toBe(unscoredHeadline("France", "a research hosting agreement"));
    expect(unscoredTally(ds, { code: "XX", name: "Nowhere", routes: [] }, "research")).toBeNull();
    // The question-2 mark reads the same clause.
    expect(notScoredQuotedLine("France", "R")).toContain(IS_QUOTED_NOT_SCORED);
  });

  it("only a country closed to the declared situation: the other three, the other answers and no answer leave the tally alone", () => {
    for (const c of ds.countries.filter((c) => c.code !== "FR")) expect(unscoredTally(ds, c, "research"), c.code).toBeNull();
    expect(unscoredTally(ds, france, "offer")).toBeNull();
    expect(unscoredTally(ds, france, "none")).toBeNull();
    expect(unscoredTally(ds, france, undefined)).toBeNull();
  });

  it("escapes the names it prints", () => {
    // France and its researcher route, renamed; the rules untouched.
    const renamed = (c: Country): Country => c.code !== "FR" ? c
      : { ...c, name: "A & B", routes: c.routes.map((r) => (r.id === researcher.id ? { ...r, name: "<x>" } : r)) };
    const doctored = { ...ds, countries: ds.countries.map(renamed) } as Dataset;
    const line = unscoredTally(doctored, renamed(france), "research");
    expect(line).not.toBeNull();
    expect(line!.text).toBe("No scored route in A & B takes a research hosting agreement — <x> is quoted, not scored.");
    expect(line!.html).toContain("A &amp; B");
    expect(line!.html).toContain(">&lt;x&gt;</a>");
    expect(line!.html).not.toContain("<x>");
  });

  /**
   * The headline on that path (scenario point 3). The branch the page takes is
   * the existing headline: the other branch — every visible country closed to
   * the situation — cannot occur on the dataset today, because the "all"
   * answer's set is the union of the four countries' and every offered
   * situation is taken by a scored route somewhere. This pins that: the day it
   * stops being true, the branch is reachable and needs a written state of
   * its own, which nothing has drawn.
   */
  it("every situation the interview offers is taken by a scored route in some country", () => {
    const asked = situationsAsked(ds);
    for (const s of fieldOptions(ds, SITUATION_FIELD)) {
      if (s.is_unknown) continue;
      expect(asked.get("all")!.has(s.value), s.value).toBe(true);
      expect(ds.countries.some((c) => unscoredTally(ds, c, s.value) === null), s.value).toBe(true);
    }
  });
});

/**
 * The browser: the walk the critique took, with the mark where it was missing
 * and the sentence where "5 not yet" was.
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
  process.stderr.write(`\n  !! THE S21 WALK WAS NOT SEEN IN A BROWSER: ${skipped}.\n     Run: npm run build && npm test\n\n`);

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
  problems(): string[];
}

const seed = (answers: Record<string, string>) =>
  `localStorage.setItem("permit-rulebook.record.v1", ${JSON.stringify(JSON.stringify({
    version: RECORD_VERSION, answers, history: Object.keys(answers),
  }))})`;

const MARKS = 'JSON.stringify([...document.querySelectorAll(".qcard .opt-mark")].map((m) => ({'
  + ' under: m.dataset.for, id: m.id, text: m.textContent.trim(),'
  + ' href: m.querySelector("a") ? m.querySelector("a").getAttribute("href") : null,'
  + ' glyph: m.querySelector("a") ? getComputedStyle(m.querySelector("a"), "::after").content : null })))';
const DESCRIBED = 'JSON.stringify([...document.querySelectorAll(".qcard .opt")].map((b) => ({'
  + ' value: b.dataset.value, by: b.getAttribute("aria-describedby"),'
  + ' resolves: b.getAttribute("aria-describedby") ? !!document.getElementById(b.getAttribute("aria-describedby")) : null })))';
const LINES = 'JSON.stringify([...document.querySelectorAll(".country-sec")].map((d) => ({'
  + ' name: d.querySelector("summary").firstChild.textContent.trim(),'
  + ' tally: d.querySelector(".tally").textContent.trim(),'
  + ' link: d.querySelector(".tally a") ? { text: d.querySelector(".tally a").textContent, href: d.querySelector(".tally a").getAttribute("href"),'
  + '   glyph: getComputedStyle(d.querySelector(".tally a"), "::after").content, out: d.querySelector(".tally a").classList.contains("out") } : null,'
  + ' heads: [...d.querySelectorAll(".cbody .ghead")].map((h) => h.textContent.trim()),'
  + ' body: d.querySelector(".cbody").textContent })))';
const tap = (value: string) => `document.querySelector(".qcard .opt[data-value=${value}]").click()`;
const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe.skipIf(skipped !== null)("s21 — in the browser", () => {
  it("question 3 is never in the cold HTML; the mark is drawn from the two answers before it", () => {
    const cold = readFileSync(`${dist}/index.html`, "utf8");
    expect(cold).not.toContain("opt-mark");
    expect(cold).not.toContain("aria-describedby");
    expect(cold).not.toContain(countryQuestion().label);
  });

  it("all four → research: France is marked at question 3, announced, with an internal link; the walk ends with the sentence on France's line", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/"), 300);
        await page.evaluate(seed({ destination: "all", situation: "research" }));
        await page.goto(server.url("/"), 900);
        const q3 = {
          question: await page.evaluate('document.querySelector(".qlabel").textContent.trim()'),
          marks: JSON.parse(await page.evaluate(MARKS)),
          described: JSON.parse(await page.evaluate(DESCRIBED)),
          problems: page.problems(),
        };
        // France, by the button — then the quickest profile to a result that
        // contradicts nothing: no qualification, a Turkish passport, no Dutch
        // graduation, no top-200 degree. Seven answers; nothing open, as the
        // critique's walk ended, with the France line now saying why.
        await page.evaluate(tap("fr"));
        await settle(400);
        const q4 = await page.evaluate('document.querySelector(".qlabel").textContent.trim()');
        await page.evaluate(tap("none"));
        await settle(400);
        await page.evaluate('(() => { const i = document.querySelector("#cfilter"); i.value = "Turkey"; i.dispatchEvent(new Event("input", { bubbles: true })); })()');
        await settle(300);
        await page.evaluate('document.querySelector(".clist [role=option]").click()');
        await settle(400);
        await page.evaluate(tap("no"));
        await settle(400);
        await page.evaluate(tap("no"));
        await settle(900);
        const result = {
          state: await page.evaluate('document.getElementById("app").dataset.state'),
          headline: await page.evaluate('document.getElementById("headline").textContent.trim()'),
          subline: await page.evaluate('document.getElementById("subline").textContent.trim()'),
          status: await page.evaluate('document.getElementById("cstatus").textContent'),
          lines: JSON.parse(await page.evaluate(LINES)),
          main: await page.evaluate('document.getElementById("main").textContent'),
          problems: page.problems(),
        };
        return { q3, q4, result };
      }, { viewport: { width: 1100, height: 1200 }, mobile: false }) as {
        q3: {
          question: string; problems: string[];
          marks: { under: string; id: string; text: string; href: string | null; glyph: string | null }[];
          described: { value: string; by: string | null; resolves: boolean | null }[];
        };
        q4: string;
        result: {
          state: string; headline: string; subline: string; status: string; main: string; problems: string[];
          lines: { name: string; tally: string; heads: string[]; body: string;
            link: { text: string; href: string; glyph: string; out: boolean } | null }[];
        };
      };

      const { q3, q4, result } = seen;
      expect(q3.problems).toEqual([]);
      expect(q3.question).toBe(countryQuestion().label);
      expect(q3.marks).toEqual([{
        under: "fr",
        id: q3.marks[0]?.id,
        text: "Not scored for France yet — Talent — researcher (chercheur) is quoted, not scored: read it here.",
        href: url("/france/talent-researcher"),
        glyph: "none",
      }]);
      expect(q3.marks[0]!.id).toBeTruthy();
      expect(q3.described).toEqual([
        { value: "de", by: null, resolves: null },
        { value: "fr", by: q3.marks[0]!.id, resolves: true },
        { value: "es", by: null, resolves: null },
        { value: "nl", by: null, resolves: null },
      ]);
      expect(q4).toBe("Your highest completed qualification?");

      expect(result.problems).toEqual([]);
      expect(result.state).toBe("results");
      expect(result.main).not.toContain("Both cannot be true");
      // The headline this walk ended on was "Nothing open on these answers."
      // when s21 built it — the France line did the saying, third in the
      // list. s26 gave the headline to the country the reader named at
      // question 3 and led with its section; tests/s26 pins those two, and
      // what this case keeps is s21's own: the mark at question 3, and the
      // sentence with its link on France's line.
      expect(result.headline).toBe("No scored route in France takes a research hosting agreement.");
      expect(result.lines.map((l) => l.name)).toEqual(["France", "Germany", "Spain", "Netherlands"]);
      const [fr, germany, spain, netherlands] = result.lines;
      expect(fr!.tally).toBe(
        "No scored route in France takes a research hosting agreement — Talent — researcher (chercheur) is quoted, not scored.",
      );
      expect(fr!.link).toEqual({
        text: "Talent — researcher (chercheur)", href: url("/france/talent-researcher"), glyph: "none", out: false,
      });
      // The body stays: the not-yet cards, as before.
      expect(fr!.heads).toEqual(["Not yet (5)"]);
      // (One of the five also lacks the degree and is listed on its own; the other four group.)
      expect(fr!.body).toContain("4 routes need a job offer or an intra-corporate transfer");
      expect(fr!.body).toContain("Needs a job offer and a university degree");
      // The other three lines, unchanged.
      expect(germany!.tally).toBe("8 not yet");
      expect(germany!.link).toBeNull();
      expect(spain!.tally).toBe("4 not yet");
      expect(netherlands!.tally).toBe("6 not yet");
      // The critique's four strings, absent from the whole page then, present now.
      for (const word of ["chercheur", "researcher", "talent-researcher", "research hosting"])
        expect(result.main + fr!.link!.href, word).toContain(word);
    } finally { server.close(); }
  }, 120_000);
});
