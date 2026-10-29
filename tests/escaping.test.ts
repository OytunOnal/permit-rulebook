import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import { esc, escAttr } from "../src/lib/reason.js";
import { verdictHtml, verdictOf } from "../src/lib/verdict/index.js";
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
const germanyJobOffer = (seen: Dataset): Profile => ({
  destination: "de", citizenship: "IN", situation: "offer", qualification: "degree", qualification_recent: "no",
  recognition_de: "not_assessed", experience_5y: "2plus", experience_7y: "3to5", occupation_shortage: "yes",
  occupation_it: "no", salary_eur_year: middleBandOf(seen, "salary_eur_year"), german: "a1", english: "b2",
  age_band: "a30to35", de_stay6m: "no", partner_ck: "no",
});

/** The asked-for line on the funds question of that walk, or "" where none is drawn. */
function askedForLineOf(seen: Dataset): string {
  const question = deriveQuestions(seen).find((q) => q.field === "funds_eur_month")!;
  const html = questionCardHtml({
    dataset: seen, question, answers: germanyJobOffer(seen), asked: [], editing: null, total: 10, glossary: new Set(),
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

/**
 * The dataset with a tag in every display string the verdict draws from it:
 * each route's and country's name, each field's subject and short label, and
 * each answer's label and short phrase — the offer line names the offer and
 * the fields' subjects, the arranged line the arranged answers.
 */
function wreckedForTheVerdict(): Dataset {
  const wrecked = JSON.parse(JSON.stringify(ds)) as Dataset;
  for (const country of wrecked.countries) {
    country.name = `${country.name} ${TAG}`;
    for (const route of country.routes) route.name = `${route.name} ${TAG}`;
  }
  for (const field of wrecked.fields) {
    field.subject = `${field.subject} ${TAG}`;
    if (field.short_label) field.short_label = `${field.short_label} ${TAG}`;
    for (const option of field.options ?? []) {
      option.label = `${option.label} ${TAG}`;
      if (option.short) option.short = `${option.short} ${TAG}`;
    }
  }
  return wrecked;
}

/** The explorer of s23: all four countries, no offer — the offer line's reader. */
const EXPLORER: Profile = {
  destination: "all", citizenship: "IN", situation: "none", qualification: "degree", recognition_de: "unknown",
  occupation_shortage: "unknown", experience_5y: "2plus", experience_7y: "3to5", german: "none", english: "c1",
  nl_recent_grad: "no", top200_grad: "unknown", funds_eur_month: "band_1", age_band: "u30", de_stay6m: "no",
  partner_ck: "no",
};
/** An offer in Berlin: steps to take, and the arranged line after them. */
const BERLIN_JOB_OFFER: Profile = {
  destination: "de", citizenship: "TR", situation: "offer", situation_country: "de", qualification: "degree",
  recognition_de: "unknown", occupation_shortage: "yes", occupation_it: "yes", experience_5y: "lt2",
  experience_7y: "3to5", german: "a1", english: "c1", funds_eur_month: "band_1", salary_eur_year: "band_5",
  age_band: "a30to35", de_stay6m: "no", partner_ck: "no",
};

describe("nothing from the dataset reaches the verdict's markup unescaped (#167)", () => {
  /** Everything a verdict paints from these answers: its masthead and its body. */
  const paintedOf = (seen: Dataset, answers: Profile): string => {
    const verdict = verdictOf(seen, answers, { cameFrom: null, answered: Object.keys(answers).length });
    const m = verdict.action.masthead;
    return [m.headline, m.sublineHtml ?? esc(m.subline), verdictHtml(verdict)].join("");
  };
  const lineOf = (html: string, cls: string): string =>
    [...html.matchAll(new RegExp(`<p class="${cls}">[\\s\\S]*?</p>`, "g"))].map((m) => m[0]).join("");

  it("the offer line draws the offer and the fields it names as text", () => {
    const html = paintedOf(wreckedForTheVerdict(), EXPLORER);
    const jobOfferLine = lineOf(html, "job-offer-line");
    expect(jobOfferLine, "precondition: the explorer reads an offer line").not.toBe("");
    expect(jobOfferLine).toContain(TAG_AS_TEXT);
    expect(html).not.toContain("<img");
  });

  it("the arranged line draws the arranged answers as text", () => {
    const html = paintedOf(wreckedForTheVerdict(), BERLIN_JOB_OFFER);
    const arranged = lineOf(html, "arranged-line");
    expect(arranged, "precondition: the offer-holder reads an arranged line").not.toBe("");
    expect(arranged).toContain(TAG_AS_TEXT);
    expect(html).not.toContain("<img");
  });
});

describe("nothing from the dataset reaches the social card's markup (#25)", () => {
  it("a country's name with a tag in it is drawn as text", () => {
    const wrecked = JSON.parse(JSON.stringify(ds)) as Dataset;
    wrecked.countries[0]!.name = "<img src=https://example.org/x>";
    const html = socialCardHtml(socialCardFacts(wrecked, "2026-10-19", {
      product: "P", tagline: "T", routesLineOf: (total, asked) => `${total} ${asked}`,
    }), "");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
