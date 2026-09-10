import { describe, expect, it } from "vitest";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { deriveBands, evaluate, fieldOptions, type Dataset, type FieldDef, type Profile } from "permit-rulebook-data";
import { esc, failDetailHtml, whyHtml } from "../src/lib/reason.js";

const dataset = rawDataset as unknown as Dataset;
const ids = dataset.fields.map((f) => f.id);

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function optionValues(def: FieldDef): string[] {
  if (def.type === "money_band") return deriveBands(dataset, def.id).map((b) => b.id);
  return fieldOptions(dataset, def.id).map((o) => o.value);
}

function randomProfile(rand: () => number, answerProb: number): Profile {
  const p: Profile = {};
  for (const def of dataset.fields)
    if (rand() < answerProb) {
      const vals = optionValues(def);
      p[def.id] = vals[Math.floor(rand() * vals.length)];
    }
  return p;
}

/** The markup taken back off — what is left is what a person reads. */
function textOf(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

/** One entry per line as it is read: the card's own line, and each unfolded row. */
function phrasesOf(html: string): string[] {
  const rows = html.match(/<li[^>]*>[\s\S]*?<\/li>/g);
  return (rows ?? [html]).map(textOf).filter((s) => s.length > 0);
}

/** Every reason column the page can draw, drawn. */
function renderedReasons(): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const rand = lcg(4242);
  for (let i = 0; i < 60; i++) {
    const profile = randomProfile(rand, rand() < 0.5 ? 1 : 0.7);
    for (const r of evaluate(dataset, profile)) {
      out.push([`${r.route.id} why`, whyHtml(dataset, r, profile)]);
      out.push([`${r.route.id} detail`, failDetailHtml(dataset, r, profile)]);
    }
  }
  return out;
}

describe("the reason column reads as prose, as rendered (blocker B3)", () => {
  // The permanent form of B3 at THIS layer. `permit-rulebook-data` proves the engine
  // never produces a field id; what this proves is that the page never puts
  // one on screen — over what it actually draws, not over the source text it
  // draws it with. Renaming a table or rewording a fallback cannot satisfy
  // it: only the rendered words are read (review S4).
  const rendered = renderedReasons();
  const identifierShaped = ids.filter((id) => /[_0-9]/.test(id));

  it("draws something to read for the routes that fail", () => {
    expect(rendered.length).toBeGreaterThan(500);
    expect(identifierShaped.length).toBeGreaterThan(10);
    expect(rendered.filter(([where]) => where.endsWith("detail")).some(([, html]) => html.includes("<li"))).toBe(true);
    expect(rendered.every(([where, html]) => where.endsWith("detail") || html.length > 0)).toBe(true);
  });

  it("no identifier-shaped field id survives to the screen", () => {
    const leaks: string[] = [];
    for (const [where, html] of rendered) {
      const text = textOf(html);
      for (const id of identifierShaped) if (text.includes(id)) leaks.push(`${where}: "${text}" leaks ${id}`);
    }
    expect(leaks).toEqual([]);
  });

  it("nor is any rendered line a field id in its own right", () => {
    // The seven ids that are ordinary English words ("situation",
    // "qualification") cannot be caught by substring — a sentence may end in
    // one and still be perfect prose. A whole LINE that IS one is always a
    // leak, and that is the shape B3 shipped in.
    const idSet = new Set(ids);
    const leaks: string[] = [];
    for (const [where, html] of rendered)
      for (const phrase of phrasesOf(html))
        if (idSet.has(phrase.replace(/[.!?]$/, ""))) leaks.push(`${where}: "${phrase}"`);
    expect(leaks).toEqual([]);
  });

  it("every unfolded row is one of the five reasons a route gives", () => {
    // The row class is the engine's `kind`; a sixth one would be the page
    // inventing a verdict of its own. "closed" joined the list with s8 — the
    // French intra-corporate transfer card is closed to an Algerian passport in
    // the fiche's own words — and this test kept the pre-s8 list of four, so it
    // has been red since the day that closure shipped. Corrected here rather
    // than worked around: the engine's own enum is the authority for this list
    // (found while landing s9, 2026-09-10).
    const kinds = new Set<string>();
    for (const [, html] of rendered)
      for (const tag of html.match(/<li class="[^"]*"/g) ?? [])
        kinds.add(tag.slice('<li class="'.length, -1));
    for (const kind of kinds) expect(["moot", "needs", "unknown", "where", "closed"]).toContain(kind);
    // "moot" — "not needed, you already have a job offer" — is unreachable in
    // the shipped dataset since 2026-09-07: no route asks any more for the
    // ABSENCE of a step, the Opportunity Card having been the last one that
    // did (§ 20a conditions nothing on being offerless). The kind stays: it is
    // the engine's answer whenever a route does, and the page must not invent
    // its own then either.
    expect([...kinds].sort()).toEqual(["closed", "needs", "unknown", "where"]);
  });

  it("dataset prose reaches the screen as text, never as markup", () => {
    expect(esc(`<b>o'</b> & "x"`)).toBe(`&lt;b&gt;o'&lt;/b&gt; &amp; "x"`);
    const smuggled: string[] = [];
    for (const [where, html] of rendered)
      for (const phrase of phrasesOf(html))
        if (/<[a-z/]/i.test(phrase)) smuggled.push(`${where}: "${phrase}"`);
    expect(smuggled).toEqual([]);
  });
});
