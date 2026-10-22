import { describe, expect, it } from "vitest";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { DESTINATION_FIELD, SITUATION_FIELD, phraseOf, type Dataset, type Profile } from "permit-rulebook-data";
import { verdictHtml } from "../src/lib/verdict/index.js";
import { plainTextOf, questionCards, walks } from "./reader-pages.js";
import { verdictFor } from "./verdict-cards.js";

/**
 * A phrase built for a place is never handed "there" (#154; #151, ruling 7).
 * On the all-four path the reader has chosen no country, and the situation
 * question's offer read "an employer there itself". Where the reader has
 * declared a country, the phrase names it with the country's phrase; where they
 * have not, it names none.
 */

const ds = rawDataset as unknown as Dataset;

/** The fill ruling 7 forbids: "there" standing for a place nothing named. */
const THERE = /\bthere\b/i;

/** Every country's in-sentence phrase, keyed by its code. */
const PHRASES = ds.countries.map((c) => ({ code: c.code, phrase: phraseOf(c.code) }));

/** The country a reader's answers place them in, or undefined on the all-four
 * path: the offer's country where they placed it, else their destination. */
function declaredCode(answers: Profile): string | undefined {
  const value = answers["situation_country"] ?? answers[DESTINATION_FIELD];
  return value && value !== "all" ? value.toUpperCase() : undefined;
}

/** The text of each element of `cls` in the markup. */
function textsOfClass(html: string, cls: string): string[] {
  return [...html.matchAll(new RegExp(`<(\\w+) class="${cls}"[^>]*>([\\s\\S]*?)</\\1>`, "g"))]
    .map((m) => plainTextOf(m[2]!));
}

/** What each of the situation question's options means, per card drawn. */
const situationMeans = questionCards()
  .filter((card) => card.field === SITUATION_FIELD)
  .map((card) => ({ where: card.where, code: declaredCode(card.before), means: textsOfClass(card.html, "opt-means") }));

describe("the situation question's options", () => {
  it("on the all-four path name no place, and never 'there'", () => {
    const placeless = situationMeans.filter((c) => c.code === undefined);
    const lines = placeless.flatMap((c) => c.means.map((m) => ({ where: c.where, m })));
    expect(lines.length, "the all-four path draws no option that says what it means").toBeGreaterThan(0);
    for (const { where, m } of lines) {
      expect(m, where).not.toMatch(THERE);
      for (const { phrase } of PHRASES) expect(m, where).not.toContain(` ${phrase}`);
    }
  });

  it("on a one-country path name the country with its phrase, and never 'there'", () => {
    const placed = situationMeans.filter((c) => c.code !== undefined);
    expect(placed.length, "no one-country path reaches the situation question").toBeGreaterThan(0);
    for (const { where, code, means } of placed) {
      expect(means.length, where).toBeGreaterThan(0);
      for (const m of means) {
        expect(m, where).toContain(`in ${phraseOf(code!)}`);
        expect(m, where).not.toMatch(THERE);
      }
    }
  });
});

/** Each unlock card's heading and the sentence under it, where it has one. */
function unlockCardsOf(html: string): { head: string; means: string }[] {
  return [...html.matchAll(/<article class="unlock">([\s\S]*?)<\/article>/g)].flatMap((m) => {
    const head = plainTextOf(/<h3>([\s\S]*?)<\/h3>/.exec(m[1]!)?.[1] ?? "");
    const means = textsOfClass(m[1]!, "unlock-means")[0];
    return means ? [{ head, means }] : [];
  });
}

/** The country a card's heading names at its end ("With a job offer in Germany"). */
const headedCode = (head: string): string | undefined =>
  PHRASES.find(({ phrase }) => head.endsWith(` in ${phrase}`))?.code;

describe("an unlock card that fills a place", () => {
  it("carries the country's phrase the card or the walk declares, and never 'there'", () => {
    // The results body each walk ends on, as the verdict composes it.
    const cards = walks().flatMap((walk) =>
      unlockCardsOf(verdictHtml(verdictFor(walk.answers))).map((card) => ({
        where: `results for ${JSON.stringify(walk.answers)}: ${card.head}`, ...card,
        code: headedCode(card.head) ?? declaredCode(walk.answers),
      })));
    const placed = cards.filter((c) => c.code !== undefined);
    // No walk here draws a card forked on a country since a transfer and a
    // hosting agreement left the steps (#175); means.test's explorer still
    // reads one ("a forked step names its country once").
    expect(placed.length, "no unlock card fills a place").toBeGreaterThan(0);
    for (const { where, means } of cards) expect(means, where).not.toMatch(THERE);
    for (const { where, means, code } of placed) expect(means, where).toContain(`in ${phraseOf(code!)}`);
  });
});
