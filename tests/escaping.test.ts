import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import { escAttr } from "../src/lib/reason.js";
import { questionCardHtml, setAsideHtml } from "../src/lib/question.js";
import { routePage } from "../src/lib/route-page.js";
import { routeAddresses } from "../src/lib/slug.js";
import { socialCardFacts, socialCardHtml } from "../src/lib/social-card.js";
import { deriveBands, deriveQuestions, type Dataset, type Profile } from "permit-rulebook-data";

/**
 * A value going into an attribute has to be escaped for an attribute.
 *
 * `esc` leaves quotation marks alone — right in text, wrong between quotes: a
 * name or a URL carrying a `"` closes the attribute and everything after it
 * becomes markup. The route page was fixed for this once (Standards review,
 * 2026-09-07) and the interview was not: eleven positions, the newest of them
 * the "Not sure?" link added the same week (Standards review, 2026-09-08).
 *
 * Nothing in the dataset carries a quotation mark today. That is the reason to
 * pin it, not a reason to leave it.
 */

const ds = dataset as unknown as Dataset;
const src = fileURLToPath(new URL("../src/", import.meta.url));
const dist = fileURLToPath(new URL("../dist/", import.meta.url));

const read = (path: string): string => readFileSync(path, "utf8").split("\r\n").join("\n");

/** Every file that writes markup as a string. */
function emitters(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) emitters(path, out);
    else if (/\.(ts|astro)$/.test(name)) out.push(path);
  }
  return out;
}

/** `="${…}` or `='${…}` — the interpolation, and the helper it opens with. */
const ATTRIBUTE_INTERPOLATION = new RegExp(
  "=([" + String.fromCharCode(34) + String.fromCharCode(39) + "])\\u0024\\{[\\s]*([A-Za-z_\\u0024][\\w\\u0024]*)?", "gs");

/** The two that escape for an attribute. Anything else is a finding. */
const SAFE_HELPERS = ["escAttr", "escXml"];

describe("nothing reaches an attribute unescaped", () => {
  it("every interpolated attribute value goes through escAttr, in every file that emits markup", () => {
    const offenders: string[] = [];
    for (const file of emitters(src)) {
      const text = read(file);
      // An interpolation that opens immediately after `="` is an attribute
      // value; `esc` there is the defect this case exists for.
      // The whole file, not line by line: a template wraps, and the helper
      // often sits on the line after the `${` that opens the attribute.
      for (const opened of text.matchAll(ATTRIBUTE_INTERPOLATION)) {
        if (SAFE_HELPERS.includes(opened[2] ?? "")) continue;
        const at = text.slice(0, opened.index).split(String.fromCharCode(10)).length;
        offenders.push(`${file.slice(src.length)}:${at}: ${
          text.slice(opened.index, opened.index + 60).split(String.fromCharCode(10)).join(" ")}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("escapes the character that closes an attribute", () => {
    const hostile = 'https://example.org/a"b?q=\'c\'&d=1';
    expect(escAttr(hostile)).not.toContain('"');
    expect(escAttr(hostile)).toContain("&quot;");
    expect(escAttr(hostile)).toContain("&#39;");
    expect(escAttr(hostile)).toContain("&amp;");
  });

  it("a hostile value survives a rendered page without escaping the attribute", () => {
    // The dataset with a quotation mark in the places a page puts in an
    // attribute: the route's name, and the URL a link points at.
    const wrecked = JSON.parse(JSON.stringify(ds)) as Dataset;
    const country = wrecked.countries[0]!;
    const route = country.routes[0]!;
    route.name = 'A "quoted" route';
    route.info_url = 'https://example.org/a"b';
    const html = routePage(wrecked, routeAddresses(wrecked)[0]!).html;
    for (const attr of html.matchAll(/(?:href|src|content|title|value|aria-label|datetime)="([^"]*)"/g))
      expect(attr[1], attr[0]).not.toContain("<");
    expect(html).not.toContain('href="https://example.org/a"b"');
    expect(html).toContain("&quot;");
  });

  it("and no built page carries a broken attribute", () => {
    const pages: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (name.endsWith(".html")) pages.push(path);
      }
    };
    try { walk(dist); } catch { /* no dist yet */ }
    if (!pages.length) return;
    for (const path of pages) {
      const html = read(path);
      // An attribute whose value runs into markup is what an unescaped quote
      // produces; nothing in a value may open a tag.
      for (const attr of html.matchAll(/(?:href|src|content|title|value|aria-label)="([^"]*)"/g))
        expect(attr[1], `${path}: ${attr[0].slice(0, 80)}`).not.toMatch(/<[a-zA-Z/]/);
    }
  });
});

/** A tag a dataset value could carry, and what it reads as once escaped. */
const TAG = "<img src=https://example.org/x>";
const TAG_AS_TEXT = "&lt;img src=https://example.org/x&gt;";

/** A German job offer that leaves the Opportunity Card open beside the work
 * routes: its funds question is asked for that one route (asked-for.test.ts). */
const middleBandOf = (seen: Dataset, field: string): string => {
  const bands = deriveBands(seen, field);
  return bands[Math.floor(bands.length / 2)]!.id;
};
const germanyOffer = (seen: Dataset): Profile => ({
  destination: "de", citizenship: "IN", situation: "offer", qualification: "degree", qualification_recent: "no",
  recognition_de: "not_assessed", experience_5y: "2plus", experience_7y: "3to5", occupation_shortage: "yes",
  occupation_it: "no", salary_eur_year: middleBandOf(seen, "salary_eur_year"), german: "a1", english: "b2",
  age_band: "a30to35", de_stay6m: "no", partner_ck: "no",
});

/** The asked-for line on the funds question of that walk, or "" where none is drawn. */
function askedForLineOf(seen: Dataset): string {
  const question = deriveQuestions(seen).find((q) => q.field === "funds_eur_month")!;
  const html = questionCardHtml({
    dataset: seen, question, answers: germanyOffer(seen), asked: [], editing: null, total: 10, glossary: new Set(),
  });
  return /<p class="asked-for"[^>]*>[\s\S]*?<\/p>/.exec(html)?.[0] ?? "";
}

describe("nothing from the dataset reaches the asked-for line's or the set-aside line's markup", () => {
  it("a route's name and a country's name with a tag in them are drawn as text in the asked-for line", () => {
    const wrecked = JSON.parse(JSON.stringify(ds)) as Dataset;
    const germany = wrecked.countries.find((c) => c.code === "DE")!;
    germany.name = TAG;
    germany.routes.find((r) => r.id === "de-chancenkarte")!.name = TAG;
    const line = askedForLineOf(wrecked);
    // The line names the route, so both values are in it to be escaped.
    expect(line, "the walk draws no asked-for line").toContain('data-route="de-chancenkarte"');
    expect(line).not.toContain("<img");
    expect(line).toContain(TAG_AS_TEXT);
  });

  it("a field's short label with a tag in it is drawn as text in the set-aside line", () => {
    const wrecked = JSON.parse(JSON.stringify(ds)) as Dataset;
    wrecked.fields.find((f) => f.id === "fr_degree")!.short_label = TAG;
    const html = setAsideHtml(wrecked, ["fr_degree"]);
    expect(html, "no set-aside line drawn").toContain('data-set-aside="fr_degree"');
    expect(html).not.toContain("<img");
    expect(html).toContain(TAG_AS_TEXT);
  });
});

describe("nothing from the dataset reaches the social card's markup (#25)", () => {
  it("a country's name with a tag in it is drawn as text", () => {
    const wrecked = JSON.parse(JSON.stringify(ds)) as Dataset;
    wrecked.countries[0]!.name = "<img src=https://example.org/x>";
    const html = socialCardHtml(socialCardFacts(wrecked, "2026-10-19", { product: "P", tagline: "T" }), "");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
