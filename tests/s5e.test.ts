import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  deriveBands, evaluate, fieldOptions, hasUnbalancedQuotationMark, quotedSpans, resultProvenance,
  routeReadings, routeStatements,
  type Dataset, type FieldDef, type Profile, type Route, type RouteResult,
} from "permit-rulebook-data";
import { caveatHtml, precondHtml, provenanceHtml, readingHtml } from "../src/lib/card.js";
import { whyHtml } from "../src/lib/reason.js";

const ds = dataset as unknown as Dataset;
const routes = (): Route[] => ds.countries.flatMap((c) => c.routes);
const routeOf = (id: string): Route => routes().find((r) => r.id === id)!;

/**
 * Every block that puts DATASET prose on a card: what else is required, what
 * the source qualifies, what is ours, why the route reached its verdict, and
 * the quotes behind all of it. The gate this file carries is written over
 * these, not over the fields they read — "the field is present" is what the
 * dataset's own note field satisfied for 39 quotes nobody could check (s5e).
 */
const cardProse = (r: RouteResult, answers: Profile): string =>
  whyHtml(ds, r, answers) + precondHtml(r.route) + caveatHtml(r.route) +
  readingHtml(r.route) + provenanceHtml(ds, r);

/** The provenance list — the one place an authority's words may appear. */
const sourceLines = (html: string): string[] =>
  [...html.matchAll(/<div class="src[^"]*">([\s\S]*?)<\/div>/g)].map((m) => m[1]);

/** What a person actually reads: the card with its markup taken away, so the
 * quotation marks left are the ones the page shows, not the ones HTML uses. */
const visible = (html: string): string => html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&");

/**
 * The reader's OWN answers. A verdict quotes the button the person pressed —
 * "you answered “I don't know”" — because the results once reported an "I
 * don't know" for a button that said "I don't know yet" (product-critique
 * v0.7, P4). Nobody is being quoted there but the reader, so provenance is not
 * the question. A closed set: every answer label the dataset defines, and
 * nothing else.
 */
const MINE = new Set(
  ds.fields.flatMap((f) => fieldOptions(ds, f.id).flatMap((o) => [o.label, o.short ?? o.label])),
);

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
const optionValues = (def: FieldDef): string[] =>
  def.type === "money_band"
    ? deriveBands(ds, def.id).map((b) => b.id)
    : fieldOptions(ds, def.id).map((o) => o.value);

function* generatedCards(seed: number, runs: number, answerProb = 0.7) {
  const rand = lcg(seed);
  for (let i = 0; i < runs; i++) {
    const p: Profile = {};
    for (const def of ds.fields)
      if (rand() < answerProb) {
        const vals = optionValues(def);
        p[def.id] = vals[Math.floor(rand() * vals.length)];
      }
    for (const r of evaluate(ds, p)) yield { r, answers: p, html: cardProse(r, p) };
  }
}

describe("s5e — nothing reaches the screen in quotation marks without provenance beside it", () => {
  it("holds over generated profiles, on the rendered card and not on the schema", () => {
    // Every run of words the card puts between quotation marks has to BE
    // something: a sentence the source is shown to have written, or a sentence
    // the card has already told the reader is ours. Nothing else may appear in
    // quotation marks anywhere on a card, in any state.
    const offenders: string[] = [];
    for (const { r, html } of generatedCards(2468, 40)) {
      const said = resultProvenance(r).map((p) => p.value.quote.replace(/\s+/g, " "));
      const ours = routeReadings(r.route).map((s) => s.text.replace(/\s+/g, " "));
      for (const span of quotedSpans(visible(html)))
        if (!said.some((q) => q.includes(span)) && !ours.some((t) => t.includes(span)) && !MINE.has(span))
          offenders.push(`${r.route.id}: “${span.slice(0, 90)}”`);
      // An unbalanced mark is its own offence: a reader cannot read it back.
      // The predicate is the dataset's own — this file re-derived prose.ts's
      // QUOTED_SPAN two lines below importing quotedSpans from it, so a change
      // to what counts as a quoted run would have moved only one of them
      // (review 2026-09-07).
      if (hasUnbalancedQuotationMark(visible(html)))
        offenders.push(`${r.route.id}: a quotation mark that closes nothing`);
    }
    expect([...new Set(offenders)]).toEqual([]);
  });

  it("every quote a card prints carries the host it came from and the day it was read", () => {
    for (const { r, html } of generatedCards(1357, 25))
      for (const line of sourceLines(html)) {
        if (!/["“”]/.test(line)) continue; // the no-numeric-threshold honesty line
        expect(line, r.route.id).toMatch(/read \d{4}-\d{2}-\d{2}/);
        expect(line.replace(/<[^>]+>/g, ""), r.route.id).toMatch(/·\s*[a-z0-9.-]+\.[a-z]{2,}/);
      }
  });
});

describe("s5e — what is ours says so, in words a stranger understands", () => {
  const withReadings = () => routes().filter((r) => routeReadings(r).length > 0);

  it("some routes carry our own reading, and it renders under its own heading", () => {
    expect(withReadings().length).toBeGreaterThan(0);
    const html = readingHtml(withReadings()[0]);
    // "Our reading" is the reader's phrase and belongs here. The dataset's own
    // vocabulary does not: a stranger owes `modelling`, `readings` and
    // `statement` nothing, and they were all names for this block at some
    // point in two days.
    expect(html).toMatch(/Our reading, not the authority's words/i);
    expect(html).not.toMatch(/\bmodelling\b|\breadings\b|\bstatements?\b/i);
  });

  it("a route that offers no reading renders nothing at all", () => {
    expect(readingHtml(routeOf("de-blue-card-general"))).toBe("");
  });

  it("a reading never renders as an authority's words, in any state", () => {
    for (const { r, html } of generatedCards(9753, 30))
      for (const s of routeReadings(r.route)) {
        // Not under "Also required", not under "The official page also says",
        // and never inside the quote list where every other line is somebody
        // else's sentence.
        expect(precondHtml(r.route), `${r.route.id}:${s.id}`).not.toContain(s.text);
        expect(caveatHtml(r.route), `${r.route.id}:${s.id}`).not.toContain(s.text);
        for (const line of sourceLines(html))
          expect(line, `${r.route.id}:${s.id}`).not.toContain(s.text);
        expect(readingHtml(r.route), `${r.route.id}:${s.id}`).toContain(s.text);
      }
  });

  it("a reading is a different construct from a statement, not a labelled one", () => {
    // The type system says what the glossary says: a statement is something a
    // SOURCE says about the route, a reading is ours. Nothing on a route can
    // be both, and no consumer has to read a kind enum to tell them apart.
    for (const r of routes())
      for (const s of routeStatements(r))
        expect(["precondition", "caveat"], `${r.id}:${s.id}`).toContain(s.kind);
  });

  it("dataset prose reaches the page as text, never as markup", () => {
    const route: Route = {
      ...routeOf("de-blue-card-general"),
      readings: [{ id: "x", text: "a & b <em>c</em>" }],
    };
    expect(readingHtml(route)).toContain("a &amp; b &lt;em&gt;c&lt;/em&gt;");
  });

  it("the page renders the block — on the full card and on a collapsed row alike", () => {
    // The seam exists so a rendering decision does not sit in the page; a
    // block the page forgets to call is a block that does not exist.
    const page = readFileSync(new URL("../src/pages/index.astro", import.meta.url), "utf8");
    expect(page.match(/\$\{readingFor\(r\)\}/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});

describe("s5e — the card's source list grew without burying the verdict", () => {
  /** The all-unknown weak profile, in all four countries and across them. */
  const weak = (destination: string): Profile => {
    const p: Profile = { destination };
    for (const def of ds.fields) {
      if (def.id === "destination") continue;
      const unknown = fieldOptions(ds, def.id).find((o) => o.is_unknown);
      if (unknown) p[def.id] = unknown.value;
    }
    return p;
  };

  it("no card shows an empty source block", () => {
    for (const destination of ["de", "fr", "es", "nl", "all"])
      for (const r of evaluate(ds, weak(destination))) {
        const html = provenanceHtml(ds, r);
        expect(html, r.route.id).toContain('class="srcs"');
        expect(html.replace(/<div class="srcs">|<\/div>/g, "").trim().length, r.route.id).toBeGreaterThan(0);
      }
  });

  it("one sentence gets one line, however many claims rest on it", () => {
    // Eight routes quote a sentence twice in the data since s5f — the Dutch
    // Blue Card's `situation` criterion and its "an employment contract that
    // runs for at least six months" line are both answered by the same
    // sentence — and printing it twice is a longer list, not more provenance.
    for (const { r, html } of generatedCards(4826, 30)) {
      const lines = sourceLines(html);
      expect(new Set(lines).size, r.route.id).toBe(lines.length);
    }
    // And the de-duplication is real work on the cards that needed it, not a
    // no-op the test would pass either way.
    const blueCard = evaluate(ds, { destination: "nl", citizenship: "TR", situation: "offer" })
      .find((x) => x.route.id === "nl-blue-card")!;
    expect(resultProvenance(blueCard).map((e) => e.value.quote))
      .toContain("Your employment contract is valid for at least 6 months.");
    expect(resultProvenance(blueCard).filter((e) => e.value.quote === "Your employment contract is valid for at least 6 months.").length)
      .toBe(2);
    expect(sourceLines(provenanceHtml(ds, blueCard))
      .filter((l) => l.includes("valid for at least 6 months")).length).toBe(1);
  });

  it("no card turns into a wall of quotes", () => {
    // Eight until s5f, nine after it, and the extra line was the price of that
    // slice rather than a drift: sourcing the 37 bare preconditions put a
    // quote under sentences that had none, and the Dutch cards carrying the
    // most of them grew by exactly the lines that used to make a claim with
    // nothing behind it. It would have been eleven; eight routes ended up
    // quoting one sentence twice, because a criterion and an "also required"
    // line can honestly rest on the same sentence, and `provenanceHtml` prints
    // an identical line once.
    //
    // Ten since 2026-09-08, on `nl-hsm-under30` alone, and here is the argument
    // the cap demands rather than being raised past.
    //
    // A person whose employer was moving them to its Dutch branch read this
    // route as open to them. The IND says on its own page that a contract with
    // a company outside the EU plus a transfer as a manager, specialist or
    // trainee makes you an intra corporate transferee, with other requirements
    // — the one sentence that tells that reader this card is not theirs. It sat
    // outside the watched slice until the slice was widened for it. A tenth
    // line on one card is a smaller cost than a reader believing a verdict that
    // was never about them, and it is the only line added to any card since
    // s5f. The cap still bites: eleven is news, and has to be argued again.
    for (const { r, html } of generatedCards(4826, 30))
      expect(sourceLines(html).length, r.route.id).toBeLessThanOrEqual(10);
  });

  it("the \"no numeric value\" honesty line still appears where it did", () => {
    // Routes that decide nothing on a number. Their conditions now carry
    // quotes, so the list is no longer empty — but silence about the absence
    // of a threshold would still read as if the promise held (isolated
    // critique #5), and this is the same sentence, still said.
    const NO_THRESHOLD = [
      "de-skilled-academic", "de-skilled-vocational", "de-researcher", "de-ict-card",
      "es-ict", "es-researcher", "nl-orientation-year",
    ];
    for (const destination of ["de", "fr", "es", "nl", "all"])
      for (const r of evaluate(ds, weak(destination))) {
        const html = provenanceHtml(ds, r);
        if (NO_THRESHOLD.includes(r.route.id)) expect(html, r.route.id).toMatch(/no dated value to quote|no salary or points threshold/i);
        else expect(html, r.route.id).not.toMatch(/no dated value to quote|no salary or points threshold/i);
      }
  });

  it("a quoted span on a card is always a span of the quote it sits in", () => {
    // The line reads “…” · host · read date. Whatever is inside the marks is
    // what the source said — never our gloss dressed as theirs.
    for (const { r, html } of generatedCards(8642, 20))
      for (const line of sourceLines(html)) {
        const text = line.replace(/<[^>]+>/g, "");
        for (const span of quotedSpans(text)) expect(span.length, r.route.id).toBeGreaterThan(4);
      }
  });
});
