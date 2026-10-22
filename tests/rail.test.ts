import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import { deriveBands, evaluate, forEachCriterion, type Dataset, type Profile } from "permit-rulebook-data";
import { blocksIn, everyCardIn, placed, verdictFor } from "./verdict-cards.js";

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

/** The rail a route's card draws on the verdict these answers read, or "" where
 * the card draws none. */
const railFor = (profile: Profile, id: string): string => {
  const card = placed(verdictFor(profile), id);
  if (!card) throw new Error(`${id} is not on this verdict`);
  return blocksIn(card.html, "rail");
};

const ticksOf = (html: string) => [...html.matchAll(/class="rail-tick" style="left:([^"]+)"/g)].map((m) => m[1]);
const rowsOf = (html: string) => [...html.matchAll(/<li>([\s\S]*?)<\/li>/g)]
  .map((m) => m[1].replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).join(" "));
const asksRowsOf = (html: string) => rowsOf(html).filter((row) => row.includes("what this route asks"));
const bandLeft = (html: string) => /class="you" style="left:([^;]+);width:([^"]+)"/.exec(html);

describe("the rail draws only what it names", () => {
  const html = railFor(WALK, "nl-ict");

  it("one tick per amount this route asks — no neighbours, no hover titles", () => {
    // Before this change: 6 ticks, 5 of them other routes' thresholds carrying
    // nothing but a `title`.
    expect(ticksOf(html).length).toBe(1);
    expect(html).not.toContain("title=");
    expect(html).not.toContain("a threshold on another route");
    // The route asks one amount here, and the rail draws one.
    expect(asksRowsOf(html).length).toBe(1);
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
    // A band with two edges is drawn as a bar; this one starts on the one
    // amount the German experienced worker's route asks of this reader.
    const answers: Profile = {
      destination: "de", citizenship: "NG", situation: "offer", situation_country: "de", qualification: "none",
      occupation_it: "yes", experience_5y: "2plus", salary_eur_year: "band_4",
    };
    const band = deriveBands(ds, "salary_eur_year").find((b) => b.id === answers.salary_eur_year)!;
    expect(band.max, "precondition: a band with two edges").toBeDefined();
    const rail = railFor(answers, "de-experienced-worker");
    const drawn = bandLeft(rail);
    expect(drawn, "the band is not drawn").not.toBeNull();
    expect(ticksOf(rail).length, "precondition: the route asks one amount").toBe(1);
    expect(rail).toContain(`€${band.min!.toLocaleString("en-US")}/year`);
    // The band's left edge and the tick are the same string, not two roundings
    // of one number.
    expect(drawn![1]).toBe(ticksOf(rail)[0]);
    expect(drawn![1]).toMatch(/^\d+\.\d{2}%$/);
  });
});

describe("the rail says where the reader stands", () => {
  it("labels every amount on the deciding path, not just one", () => {
    // The Dutch Blue Card states two salaries — the standard one and the
    // reduced one for a recent graduate — as a choice of paths.
    const profile: Profile = {
      destination: "nl", citizenship: "TR", situation: "offer", salary_eur_month: "band_3",
      qualification: "degree", experience_5y: "2plus", experience_7y: "3to5", nl_recent_grad: "yes", top200_grad: "no",
      age_band: "a30to35",
    };
    const r = evaluate(ds, profile).find((x) => x.route.id === "nl-blue-card")!;
    expect(r.status, "a not-yet row draws no rail").not.toBe("hold");
    // The amounts the route states on the salary it is measured on, from the dataset.
    const amounts = new Set<number>();
    forEachCriterion(r.route.criteria, (c) => {
      if (c.op === "gte" && c.field === "salary_eur_month") amounts.add(c.threshold.amount);
    });
    expect(amounts.size).toBeGreaterThan(1);
    const html = railFor(profile, "nl-blue-card");
    // However many amounts decide it, that many ticks and that many named rows,
    // each naming one of the route's own amounts.
    const asks = asksRowsOf(html);
    expect(asks.length).toBeGreaterThan(0);
    expect(ticksOf(html).length).toBe(asks.length);
    expect(rowsOf(html).length).toBe(asks.length + 1);
    const named = (amount: number) => `€${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}/month`;
    for (const row of asks)
      expect([...amounts].some((amount) => row.includes(named(amount))), `${row} names no amount the route asks`).toBe(true);
  });

  it("says how the band stands against each amount, in the card's own words", () => {
    // The reader who answered the band that starts on the route's amount.
    expect(deriveBands(ds, "salary_eur_month").find((b) => b.id === WALK.salary_eur_month)!.min).toBe(5942);
    expect(asksRowsOf(railFor(WALK, "nl-ict"))[0]).toContain("above the amount");
    // A band wholly below says how far short, the way the gap note does.
    const below: Profile = { ...WALK, salary_eur_month: "band_5" };
    expect(deriveBands(ds, "salary_eur_month").find((b) => b.id === below.salary_eur_month)!.max).toBeLessThanOrEqual(5942);
    expect(asksRowsOf(railFor(below, "nl-ict"))[0]).toMatch(/ · up to €[\d,.]+\/month short$/);
    // A band that straddles one of the route's own amounts would say "crosses
    // the amount"; through the verdict no answer reaches it, because every
    // band is cut at every amount the dataset states.
  });

  it("a band that crosses an amount is drawn crossing it", () => {
    const profile: Profile = { ...WALK, salary_eur_month: "band_5" };
    const html = railFor(profile, "nl-ict");
    const band = bandLeft(html)!;
    const left = Number.parseFloat(band[1]);
    const right = left + Number.parseFloat(band[2]);
    const tick = Number.parseFloat(ticksOf(html)[0]);
    // The reader's band ends where the amount begins: the picture and the
    // words agree, and the words come from the same helper.
    expect(right).toBeLessThanOrEqual(tick + 0.01);
    expect(rowsOf(html)[0]).toMatch(/up to €[\d,.]+\/month short/);
  });

  it("never draws a rail it cannot name", () => {
    // Every route, every band: as many ticks as named amounts, always.
    let drawn = 0;
    for (const country of ds.countries)
      for (const card of everyCardIn(verdictFor({ ...WALK, destination: country.code.toLowerCase() }))) {
        const html = blocksIn(card.html, "rail");
        if (!html) continue;
        drawn++;
        const ticks = ticksOf(html).length;
        expect(rowsOf(html).length, `${card.route}: ${ticks} ticks, ${rowsOf(html).length} rows`)
          .toBe(ticks + 1);
        expect(html, `${card.route} still hides a mark in a title`).not.toContain("title=");
      }
    expect(drawn, "no card on these verdicts draws a rail").toBeGreaterThan(0);
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
    const html = railFor(WALK, "nl-ict");
    expect(html).toContain('class="rail-tick"');
    expect(html).not.toMatch(/class="tick"/);
  });

  it("and the screen styles the two apart", async () => {
    const { readFileSync } = await import("node:fs");
    const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8").split("\r\n").join("\n");
    // The page styles the question card's checkmark; the verdict's own
    // stylesheet styles its rail.
    const page = read("../src/pages/index.astro");
    const verdict = read("../src/lib/verdict/verdict.css");
    // The checkmark keeps its margin; the rail's mark is a different selector
    // and has none, so nothing can shift it off its amount.
    expect(page).toContain(".tick{color:var(--color-band);font-weight:700;margin-left:.35rem}");
    expect(verdict).toContain(".rail-tick{position:absolute;");
    for (const sheet of [page, verdict])
      expect(/\.rail-tick\{[^}]*margin/.test(sheet), "the rail's mark must carry no margin").toBe(false);
  });
});
