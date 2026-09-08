import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import { deriveBands, evaluate, type Dataset, type Profile, type RouteResult } from "permit-rulebook-data";
import { bandStandsAt, decidingThresholds, railHtml } from "../src/lib/card.js";

/**
 * The results card's salary rail, after the human's walk of 2026-09-08.
 *
 * What he saw on an NL ICT card for a €5,942-or-more answer: six ticks on the
 * bar and one label; the other five said what they were only in a hover
 * `title`, which is nothing on a phone and nothing to a reader who does not
 * hover. And the blue band started about five pixels left of the tick it starts
 * on, because the band's edges and the ticks were rounded differently. His
 * words: the band does not meet the lines, nobody can tell what the lines are,
 * it does not explain anything.
 */

const ds = dataset as unknown as Dataset;

const WALK: Profile = {
  destination: "nl", citizenship: "TR", situation: "ict", salary_eur_month: "band_6",
  nl_recent_grad: "no", top200_grad: "no", age_band: "a30to35",
};

const resultOf = (profile: Profile, id: string): RouteResult =>
  evaluate(ds, profile).find((r) => r.route.id === id)!;

const ticksOf = (html: string) => [...html.matchAll(/class="rail-tick" style="left:([^"]+)"/g)].map((m) => m[1]);
const rowsOf = (html: string) => [...html.matchAll(/<li>([\s\S]*?)<\/li>/g)]
  .map((m) => m[1].replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).join(" "));
const bandLeft = (html: string) => /class="you" style="left:([^;]+);width:([^"]+)"/.exec(html);

/** The band whose lower edge is exactly a given amount. */
const bandAt = (field: string, amount: number) =>
  deriveBands(ds, field).find((b) => b.min === amount)!;

describe("the rail draws only what it names", () => {
  const html = railHtml(ds, resultOf(WALK, "nl-ict"), WALK);

  it("one tick per amount this route asks — no neighbours, no hover titles", () => {
    // Before this change: 6 ticks, 5 of them other routes' thresholds carrying
    // nothing but a `title`.
    expect(ticksOf(html).length).toBe(1);
    expect(html).not.toContain("title=");
    expect(html).not.toContain("a threshold on another route");
    // The route asks one amount here, and the rail draws one.
    expect(decidingThresholds(ds, resultOf(WALK, "nl-ict"), WALK).length).toBe(1);
  });

  it("one line per drawn mark, in reading order, each with its swatch", () => {
    const rows = rowsOf(html);
    expect(rows.length).toBe(2);
    expect(rows[0]).toContain("€5,942/month");
    expect(rows[0]).toContain("what this route asks");
    expect(rows[0]).toContain("30 or older, 2026");
    expect(rows[1]).toContain("your answer");
    expect(rows[1]).toContain("€5,942 or more");
    // A swatch per row, matching the bar's own colours.
    expect((html.match(/class="sw sw-asks"/g) ?? []).length).toBe(ticksOf(html).length);
    expect((html.match(/class="sw sw-you"/g) ?? []).length).toBe(1);
    // Nothing is positioned over the bar any more.
    expect(html).not.toContain('class="lbl');
    expect(html).not.toContain("translateX(-50%)");
  });

  it("one scale and one rounding: a band starting on an amount starts on its tick", () => {
    const band = bandBandMatch(html);
    expect(band, "the band is not drawn").not.toBeNull();
    // The reader answered "€5,942 or more" and the route asks €5,942: the band's
    // left edge and the tick are the same string, not two roundings of one number.
    expect(band![1]).toBe(ticksOf(html)[0]);
    expect(band![1]).toMatch(/^\d+\.\d{2}%$/);
  });

  function bandBandMatch(h: string) { return bandLeft(h); }
});

describe("the rail says where the reader stands", () => {
  it("labels every amount on the deciding path, not just one", () => {
    // The Dutch Blue Card states two salaries — the standard one and the
    // reduced one for a recent graduate — as a choice of paths.
    const profile: Profile = {
      destination: "nl", citizenship: "TR", situation: "offer", salary_eur_month: "band_3",
      qualification: "degree", experience: "y2to5", nl_recent_grad: "yes", top200_grad: "no",
      age_band: "a30to35",
    };
    const r = resultOf(profile, "nl-blue-card");
    const thresholds = decidingThresholds(ds, r, profile);
    const html = railHtml(ds, r, profile);
    // However many amounts decide it, that many ticks and that many named rows.
    expect(ticksOf(html).length).toBe(thresholds.length);
    expect(rowsOf(html).length).toBe(thresholds.length + 1);
    for (const t of thresholds)
      expect(html, `${t.threshold.amount} is drawn but not named`)
        .toContain(String(t.threshold.amount).replace(/\B(?=(\d{3})+(?!\d))/g, ","));
  });

  it("says how the band stands against each amount, in the card's own words", () => {
    const field = "salary_eur_month";
    const at5942 = bandAt(field, 5942);
    expect(bandStandsAt(at5942, 5942)).toBe("above the amount");
    // A band wholly below says how far short, the way the gap note does.
    const below = deriveBands(ds, field).find((b) => b.max !== undefined && b.max <= 5942)!;
    expect(bandStandsAt(below, 5942)).toMatch(/^up to €[\d,.]+ short$/);
    // And a band that straddles an amount says that, rather than picking a side.
    const straddles = { id: "x", min: 5000, max: 6500, label: "€5,000 – €6,500" };
    expect(bandStandsAt(straddles, 5942)).toBe("crosses the amount");
  });

  it("a band that crosses an amount is drawn crossing it", () => {
    const profile: Profile = { ...WALK, salary_eur_month: "band_5" };
    const r = resultOf(profile, "nl-ict");
    const html = railHtml(ds, r, profile);
    const band = bandLeft(html)!;
    const left = Number.parseFloat(band[1]);
    const right = left + Number.parseFloat(band[2]);
    const tick = Number.parseFloat(ticksOf(html)[0]);
    // The reader's band ends where the amount begins: the picture and the
    // words agree, and the words come from the same helper.
    expect(right).toBeLessThanOrEqual(tick + 0.01);
    expect(rowsOf(html)[0]).toMatch(/up to €[\d,.]+ short/);
  });

  it("never draws a rail it cannot name", () => {
    // Every route, every band: as many ticks as named amounts, always.
    for (const country of ds.countries)
      for (const route of country.routes) {
        const profile: Profile = { ...WALK, destination: country.code.toLowerCase() };
        const r = evaluate(ds, profile).find((x) => x.route.id === route.id);
        if (!r) continue;
        const html = railHtml(ds, r, profile);
        if (!html) continue;
        const ticks = ticksOf(html).length;
        expect(rowsOf(html).length, `${route.id}: ${ticks} ticks, ${rowsOf(html).length} rows`)
          .toBe(ticks + 1);
        expect(html, `${route.id} still hides a mark in a title`).not.toContain("title=");
      }
  });
});

/**
 * The reason the band missed the lines, kept from coming back.
 *
 * It was never a rounding error. `.tick` already meant the chosen-answer
 * checkmark on the results screen, and its `margin-left:.35rem` moved every
 * line on the bar six pixels off the amount it marks — the same class collision
 * this codebase met with `.country` and wrote a note about.
 */
describe("the rail's marks do not share a class with anything else", () => {
  it("draws rail-tick, never the checkmark's class", () => {
    const html = railHtml(ds, resultOf(WALK, "nl-ict"), WALK);
    expect(html).toContain('class="rail-tick"');
    expect(html).not.toMatch(/class="tick"/);
  });

  it("and the screen styles the two apart", async () => {
    const { readFileSync } = await import("node:fs");
    const page = readFileSync(new URL("../src/pages/index.astro", import.meta.url), "utf8")
      .split("\r\n").join("\n");
    // The checkmark keeps its margin; the rail's mark is a different selector
    // and has none, so nothing can shift it off its amount.
    expect(page).toContain(".tick{color:var(--color-band);font-weight:700;margin-left:.35rem}");
    expect(page).toContain(".rail-tick{position:absolute;");
    expect(/\.rail-tick\{[^}]*margin/.test(page), "the rail's mark must carry no margin").toBe(false);
  });
});
