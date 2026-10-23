import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import { deriveQuestions, type Dataset, type Profile } from "permit-rulebook-data";
import { countryPages } from "../src/lib/country-page.js";
import { ABBREVIATIONS } from "../src/lib/gloss.js";
import { questionCardHtml } from "../src/lib/question.js";
import { routePages } from "../src/lib/route-page.js";
import { recordSeedScript, skipReason, warnNotWalked, withSite, type PageOnSite } from "./browser-walk.js";

/**
 * #156 (#151, ruling 8): shorthand is explained the first time each page uses
 * it, and not again, through the one gloss — on the route pages, the country
 * pages, every question card and the results screen. Never inside a quote.
 *
 * The set this walk holds every page to is the gloss list itself. A token is
 * explained at its first use in one of the three shapes the gloss writes:
 * its words after it ("MVV (the Dutch entry visa)"), after the bracket it
 * stands in ("(MVV; MVV = the Dutch entry visa)"), or by our own text before
 * it ("the Dutch immigration service (IND)"), which the gloss leaves alone.
 * A route's name is a name and keeps its form (ruling 8), so the walk reads
 * every page with the route names taken out.
 */

const ds = dataset as unknown as Dataset;

/** One page as a reader reads it: our prose, and the quotes it shows. */
interface Page { name: string; prose: string; quotes: string[] }

const ENTITIES: Readonly<Record<string, string>> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'", "&nbsp;": " ",
};
const decode = (s: string): string =>
  s.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (e) => ENTITIES[e]!)
    .replace(/&#([0-9]+);/g, (_, n: string) => String.fromCodePoint(Number(n)));

/** Every route's name, longest first, so a name inside another goes with it. */
const ROUTE_NAMES = ds.countries.flatMap((c) => c.routes.map((r) => r.name)).sort((a, b) => b.length - a.length);

/** The page's text with the apostrophe our sentences and the list spell two ways made one. */
const plain = (s: string): string => s.replace(/’/g, "'").replace(/\s+/g, " ");

function pageOf(name: string, prose: string, quotes: string[]): Page {
  let text = prose;
  for (const n of ROUTE_NAMES) text = text.split(n).join(" ¶ ");
  return { name, prose: plain(text), quotes: quotes.map(plain) };
}

/** A page drawn as markup: its body's text, its `<q>` quotes taken out of it. */
function markupPage(name: string, html: string): Page {
  const at = html.indexOf("<body");
  const body = at >= 0 ? html.slice(at) : html;
  const quotes: string[] = [];
  const rest = body
    .replace(/<script\b[\s\S]*?<\/script>/g, " ")
    .replace(/<style\b[\s\S]*?<\/style>/g, " ")
    .replace(/<q\b[^>]*>([\s\S]*?)<\/q>/g, (_, q: string) => {
      quotes.push(decode(q.replace(/<[^>]*>/g, "")));
      return " ";
    });
  return pageOf(name, decode(rest.replace(/<[^>]*>/g, " ")), quotes);
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** What the gloss adds after a token: its words in a bracket, or "TOKEN = words" after a bracket's run. */
const addedPattern = (token: string, words: string): RegExp =>
  new RegExp(`\\b${escapeRe(token)} \\(${escapeRe(plain(words))}\\)|\\b${escapeRe(token)} = ${escapeRe(plain(words))}`, "g");

/** Each way a page breaks the rule, said with the words around it. */
function findingsOn(page: Page): string[] {
  const out: string[] = [];
  const text = page.prose;
  const around = (i: number): string => text.slice(Math.max(0, i - 70), i + 70);
  for (const [token, words] of ABBREVIATIONS) {
    // A use is the token as a word, not the one an act's "X = words" restates.
    const uses = [...text.matchAll(new RegExp(`\\b${escapeRe(token)}\\b(?! = )`, "g"))].map((m) => m.index!);
    const added = [...text.matchAll(addedPattern(token, words))].map((m) => m.index!);
    if (!uses.length) continue;
    const first = uses[0]!;
    const ours = new RegExp(`${escapeRe(plain(words))} \\($`, "i").test(text.slice(0, first));
    const attached = added.length > 0 && added[0]! >= first && (uses.length < 2 || added[0]! < uses[1]!);
    if (!ours && !attached)
      out.push(`${page.name}: ${token} is not explained at its first use: "…${around(first)}…"`);
    if (added.length !== (ours ? 0 : 1))
      out.push(`${page.name}: ${token} is explained ${added.length + (ours ? 1 : 0)} times: "…${
        around(added[ours ? 0 : 1] ?? first)}…"`);
  }
  for (const quote of page.quotes)
    for (const [token, words] of ABBREVIATIONS)
      if (addedPattern(token, words).test(quote)) out.push(`${page.name}: a quote is glossed: "${quote}"`);
  return out;
}

/** Every page the build draws from the shipped dataset with no reader on it. */
const READERLESS: Page[] = [
  ...routePages(ds, { lastRun: "1970-01-01", unread: [] }).map((p) => markupPage(p.path, p.html)),
  ...countryPages(ds).map((p) => markupPage(p.path, p.html)),
  ...deriveQuestions(ds).map((question) => markupPage(`question ${question.field}`, questionCardHtml({
    dataset: ds, question, answers: {}, asked: [], editing: null, total: 10, glossary: new Set(),
  }))),
];

/** The names #151 adds to the list. */
const ADDED_BY_151 = ["MVV", "IELTS", "Schengen", "ISCO-08"];

describe("shorthand is explained on first use, on every page (#156)", () => {
  it("the four names #151 adds are on the gloss list, and each is met on a page the walk draws", () => {
    expect(ABBREVIATIONS.map(([token]) => token)).toEqual(expect.arrayContaining(ADDED_BY_151));
    for (const token of ADDED_BY_151)
      expect(READERLESS.some((p) => new RegExp(`\\b${escapeRe(token)}\\b`).test(p.prose)), `${token} is on no page`).toBe(true);
  });

  it("every route page, country page and question card explains each token on the list at its first use, and not again; no quote is glossed", () => {
    expect(READERLESS.length).toBeGreaterThan(30);
    expect(READERLESS.flatMap(findingsOn)).toEqual([]);
  });
});

/** The results screen is drawn in the browser, from a record on the device. */
const skipped = skipReason();
if (skipped) warnNotWalked("the results screen's shorthand", skipped);

/** Three readers whose results carry the list's tokens: German citations and
 * the shortage door, the Dutch statements, and all four countries at once. */
const READERS: Record<string, Profile> = {
  germany: {
    destination: "de", citizenship: "IN", situation: "offer", qualification: "degree", recognition_de: "recognized",
    occupation_it: "no", occupation_shortage: "unknown", experience_5y: "2plus", experience_7y: "3to5",
    salary_eur_year: "band_4", german: "b1", english: "b2", age_band: "a30to35", de_stay6m: "no", partner_ck: "no",
    funds_eur_month: "band_1",
  },
  netherlands: {
    destination: "nl", citizenship: "TR", situation: "offer", qualification: "degree", experience_7y: "3to5",
    occupation_it: "no", salary_eur_month: "band_6", age_band: "a30to35", nl_recent_grad: "no", top200_grad: "no",
  },
  everywhere: {
    destination: "all", citizenship: "US", situation: "none", qualification: "degree", recognition_de: "not_recognised",
    experience_5y: "2plus", experience_7y: "5plus", occupation_it: "no", occupation_shortage: "unknown",
    nl_recent_grad: "no", top200_grad: "unknown", german: "a2", english: "c1", age_band: "u30",
    de_stay6m: "no", partner_ck: "no", funds_eur_month: "band_1",
  },
};

/** The results screen's text, every block apart and the quotes taken out. */
const READ_RESULTS = `(() => {
  const root = document.getElementById("main").cloneNode(true);
  const quotes = [...root.querySelectorAll(".src i, q")].map((e) => { const t = e.textContent; e.remove(); return t; });
  root.querySelectorAll("*").forEach((e) => e.append(" "));
  return JSON.stringify({ state: document.getElementById("app").dataset.state, prose: root.textContent, quotes });
})()`;

describe.skipIf(skipped !== null)("the results screen explains its shorthand the same way (#156)", () => {
  it("each reader's results explain each token on the list at first use, a citation as the route page does; no quote is glossed", async () => {
    const read = await withSite(async ({ page, url }: PageOnSite) => {
      const out: Record<string, { state: string; prose: string; quotes: string[] }> = {};
      for (const [name, answers] of Object.entries(READERS)) {
        await page.goto(url("/"), 300);
        await page.evaluate(recordSeedScript(answers));
        await page.goto(url("/"), 1400);
        out[name] = JSON.parse(await page.evaluate(READ_RESULTS));
        await page.evaluate("localStorage.clear()");
      }
      return out;
    }, { viewport: { width: 1100, height: 1200 }, mobile: false });

    for (const [name, r] of Object.entries(read)) expect(r.state, `${name} did not reach a result`).toBe("results");
    const pages = Object.entries(read).map(([name, r]) => pageOf(`results: ${name}`, r.prose, r.quotes));
    // The German reader's cards cite the Residence Act, and the shortage door is open on one.
    const act = ABBREVIATIONS.find(([token]) => token === "AufenthG")!;
    expect(pages[0]!.prose).toMatch(addedPattern(...act));
    expect(pages[0]!.prose).toMatch(/\bISCO-08\b/);
    expect(pages.flatMap(findingsOn)).toEqual([]);
  }, 240000);
});
