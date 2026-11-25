import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveQuestions, evaluate, fieldOptions, remainingQuestions, unlocks, unlockTitleOf,
  type Dataset, type Profile,
} from "permit-rulebook-data";
import { restore, serialize } from "../src/lib/record.js";
import { orAbove, pointsOfNeeded } from "../src/lib/copy/verdict.js";
import { resumedLine } from "../src/lib/copy/interview.js";
import { declarationHtml, questionCardHtml } from "../src/lib/question.js";
import { replayRecord } from "../src/lib/scope.js";
import { blocksIn, drawnRouteOn, stepsIn, verdictFor, verdictOn } from "./verdict-cards.js";
import { FIVE, JOB_OFFER, SEVEN, ds, textOf, withExperience } from "./s25-experience.js";

const src = fileURLToPath(new URL("../src", import.meta.url));

/**
 * s25 — the experience ladder is two questions (v1.1 critique F2).
 *
 * One question with four rungs and a false implication (`y3in7 ⇒ y2in5`)
 * became two: how much related experience in the last five years, and how
 * much in the last seven. The site asks the two as it asks every other
 * question, reads the points table's two-field item through the package's
 * row helpers, and carries no literal of the old answers. A record written
 * before this slice loses its experience answers and is asked again; the
 * resumed line counts what was kept. This file holds the cases read from the
 * dataset, the site's source and the drawn HTML; `s25-walk.test.ts` holds the
 * walks.
 */

/** The result the evaluation of these answers gives the route with this id. */
const resultOf = (profile: Profile, id: string) => evaluate(ds, profile).find((r) => r.route.id === id)!;
/** The points tally on the Opportunity Card the verdict for these answers draws. */
const tallyFor = (profile: Profile): string =>
  blocksIn(drawnRouteOn(verdictFor(profile), "de-chancenkarte"), "ptsline met", "ptsline short");
/** The titles of the steps the verdict for these answers offers. */
const stepTitles = (data: Dataset, answers: Profile): string[] => stepsIn(verdictOn(data, answers)).map((s) => s.title);

describe("no literal of the old ladder survives in the site", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|astro|mjs|css)$/.test(name)) files.push(path);
    }
  };
  walk(src);

  it("src/ names neither y2in5, y3in7, y5in7 nor the retired `experience` field", () => {
    expect(files.length).toBeGreaterThan(10);
    const offenders: string[] = [];
    for (const path of files) {
      const text = readFileSync(path, "utf8");
      if (/\by[235]in[57]\b/.test(text)) offenders.push(`${path}: an old rung`);
      if (/["'`]experience["'`]/.test(text)) offenders.push(`${path}: the retired field id`);
    }
    expect(offenders).toEqual([]);
  });

  it("the dataset itself carries the two fields and not the old one", () => {
    expect(ds.fields.map((f) => f.id)).not.toContain("experience");
    expect(fieldOptions(ds, FIVE).map((o) => o.value)).toEqual(["lt2", "2plus"]);
    expect(fieldOptions(ds, SEVEN).map((o) => o.value)).toEqual(["lt3", "3to5", "5plus"]);
  });
});

/** Checks each experience question's card draws its label and its options as the dataset wrote them. */
function expectEachCardDrawsTheDatasetsLabelAndOptions(): void {
  for (const field of [FIVE, SEVEN]) {
    const def = ds.fields.find((f) => f.id === field)!;
    const question = deriveQuestions(ds).find((q) => q.field === field)!;
    const html = questionCardHtml({
      dataset: ds, question, answers: {}, asked: [], editing: null, total: 10,
    });
    expect(html).toContain(`<h2 class="qlabel">${def.label}</h2>`);
    const buttons = [...html.matchAll(/<button class="opt" data-value="([^"]+)"[^>]*><span class="opt-label">([^<]+)</g)]
      .map((m) => [m[1], m[2]]);
    expect(buttons).toEqual(def.options!.map((o) => [o.value, o.label]));
  }
}

describe("the two questions are asked from the dataset, in order, after recognition", () => {
  it("derive right after recognition_de, five years then seven", () => {
    const order = deriveQuestions(ds).map((q) => q.field);
    const at = order.indexOf("recognition_de");
    expect(at).toBeGreaterThan(-1);
    expect(order.slice(at, at + 3)).toEqual(["recognition_de", FIVE, SEVEN]);
  });

  it("and the interview asks them back to back once recognition is answered", () => {
    // The greedy order agrees with the dataset's here: with recognition not
    // yet, the five-year answer is the next thing that changes a verdict, and
    // the seven-year answer the thing after it. Germany asks `occupation_it`
    // before them since the shortage Blue Card's IT path reads it (#134), so
    // the reader has answered it too.
    const asked = ["destination", "situation", "qualification", "citizenship", "recognition_de", "occupation_it"];
    const partial: Profile = Object.fromEntries(asked.map((f) => [f, JOB_OFFER[f]!]));
    expect(remainingQuestions(ds, partial)[0]!.field).toBe(FIVE);
    expect(remainingQuestions(ds, { ...partial, [FIVE]: "2plus" })[0]!.field).toBe(SEVEN);
  });

  it("each renders its label and its options as the dataset wrote them", () => {
    expectEachCardDrawsTheDatasetsLabelAndOptions();
  });

  it("the declared rows carry the short labels and the chosen labels", () => {
    const answers = withExperience("2plus", "3to5");
    const html = declarationHtml(ds, { answers, asked: [FIVE, SEVEN], currentField: null });
    expect(textOf(html)).toContain("Experience (last 5 years) 2 years or more");
    expect(textOf(html)).toContain("Experience (last 7 years) 3 to under 5 years");
  });
});

/** Checks the fields the fold knew before still fold as they did, for this explorer. */
function expectTheOldLaddersStillFold(explorer: Profile): void {
  // Read where the verdict shows it: the rungs of a ladder above the lowest
  // one that changes a verdict fold into it, titled "… or above". On the
  // shipped dataset no answer makes two rungs of either experience field
  // open the same routes — the five-year field has one rung above "under 2
  // years", and five years in seven opens the Spanish Blue Card where three
  // does not — so the verdict shows the two fields' fold nowhere; the rows
  // form's reading is held by the case below.
  // The fields the fold knew before still read the same: the German rungs
  // fold into one step, and the two recognition answers stay two.
  const raw = unlocks(ds, explorer);
  const steps = stepTitles(ds, explorer);
  const german = raw.filter((u) => u.field === "german");
  expect(german.length).toBeGreaterThan(1);
  expect(steps).toContain(orAbove(unlockTitleOf(ds, german[0]!, explorer)));
  const recognition = raw.filter((u) => u.field === "recognition_de");
  expect(recognition).toHaveLength(2);
  for (const u of recognition) expect(steps).toContain(unlockTitleOf(ds, u, explorer));
}

/** A one-route dataset whose points item, in the rows form, pays field x's
 * bottom rung more than its top: a descending table. */
function descendingRowsDataset(): Dataset {
  // A page on a host the product lists: the card links its route's page.
  const page = ds.countries[0]!.routes[0]!.info_url;
  return {
    schema_version: "0.8.1", dataset_version: "2026.01.01", notices: [], contradictions: [],
    fields: [{
      id: "x", label: "x?", short_label: "X", type: "enum", kind: "improvable",
      // b and c are the rungs a reader reaches by acting (ruling 28 on #310).
      options: [
        { value: "a", label: "a" }, { value: "b", label: "b", is_attainable: true }, { value: "c", label: "c", is_attainable: true },
      ],
    }],
    countries: [{
      code: "ZZ", name: "Nowhere", routes: [{
        id: "zz-one", name: "One", kind: "work", info_url: page,
        scope: { value: "every-deciding-rule-asked", reason: "r" }, criteria: [
          { field: "x", op: "in", values: ["b", "c"] },
          {
            op: "points", required: { value: 1, unit: "points", source_url: page, quote: "q", retrieved_at: "2026-01-01" },
            table: { source_url: page, quote: "q", retrieved_at: "2026-01-01", items: [
              { rows: [{ field: "x", value: "a", points: 3 }, { field: "y", value: "n", points: 1 }, { field: "x", value: "c", points: 1 }] },
            ] },
          },
        ],
      }],
    }],
  } as unknown as Dataset;
}

/** Checks a rows item that does not climb its field offers each rung its own
 * step, and the same rows climbing offer one step, "… or above". */
function expectDescendingRowsBreakTheLadder(): void {
  // A field two rules read as a tail, and a points item written in the rows
  // form that pays the bottom rung more than the top: not a ladder. The
  // one-field form of the same table already said so; the rows form must
  // say the same, or a two-field item hides a descending table. Read where
  // the verdict shows it: a reader on the bottom rung with the other row's
  // point is offered both rungs above as steps of their own, and on a
  // climbing table as one step, "… or above".
  const synthetic = descendingRowsDataset();
  const reader: Profile = { x: "a", y: "n" };
  const rungsOf = (d: Dataset) => unlocks(d, reader).filter((u) => u.field === "x");
  expect(rungsOf(synthetic).map((u) => u.option.value)).toEqual(["b", "c"]);
  expect(stepTitles(synthetic, reader)).toEqual(rungsOf(synthetic).map((u) => unlockTitleOf(synthetic, u, reader)));
  // The same rows, climbing: a ladder.
  const climbing = JSON.parse(JSON.stringify(synthetic)) as Dataset;
  const item = climbing.countries[0]!.routes[0]!.criteria[1] as { table: { items: { rows: { points: number }[] }[] } };
  item.table.items[0]!.rows[0]!.points = 1;
  item.table.items[0]!.rows[2]!.points = 3;
  expect(stepTitles(climbing, reader)).toEqual([orAbove(unlockTitleOf(climbing, rungsOf(climbing)[0]!, reader))]);
}

/** Checks each seven-year rung that opens a route of its own keeps its own step, for this reader. */
function expectEachOpeningRungKeepsItsStep(spain: Profile): void {
  // Spain, no qualification: three years opens the highly-qualified permit;
  // five opens the Blue Card as well — two steps, neither titled "or above".
  const raw = unlocks(ds, spain);
  expect(raw.filter((u) => u.field === SEVEN).map((u) => u.option.value)).toEqual(["3to5", "5plus"]);
  const titles = stepTitles(ds, spain);
  for (const u of raw.filter((x) => x.field === SEVEN)) {
    expect(titles).toContain(unlockTitleOf(ds, u, spain));
    expect(titles).not.toContain(orAbove(unlockTitleOf(ds, u, spain)));
  }
}

describe("the ladder fold reads a two-field points item through its rows", () => {
  /** Spain, no qualification: three years in seven opens the highly-qualified
   * permit; five opens the Blue Card as well. */
  const spain: Profile = {
    destination: "es", situation: "offer", situation_country: "es", citizenship: "TR", qualification: "none",
    [FIVE]: "lt2", [SEVEN]: "lt3", salary_eur_year: "band_7", salary_eur_month: "band_7", age_band: "a30to35",
    occupation_it: "no",
  };
  /** An explorer of all four, one point short of the Opportunity Card, with no German. */
  const explorer: Profile = {
    destination: "all", citizenship: "IN", situation: "none", qualification: "degree", recognition_de: "unknown",
    occupation_shortage: "unknown", [FIVE]: "2plus", [SEVEN]: "3to5", german: "none", english: "c1", nl_recent_grad: "no",
    top200_grad: "unknown", funds_eur_month: "band_1", age_band: "u30", de_stay6m: "no", partner_ck: "no",
  };

  it("both experience fields are ladders now: every rule reads a tail, the table climbs", () => {
    expectTheOldLaddersStillFold(explorer);
  });

  it("a rows item whose rows do not climb the field breaks the ladder — the rows are read, not skipped", () => {
    expectDescendingRowsBreakTheLadder();
  });

  it("a higher rung that opens a route the lower one does not keeps its own step", () => {
    expectEachOpeningRungKeepsItsStep(spain);
  });
});

describe("the Opportunity Card's tally names the winning row's field", () => {
  it("2 years or more / 3 to under 5: experienced worker met, +2 for the five-year row", () => {
    const profile = withExperience("2plus", "3to5");
    expect(resultOf(profile, "de-experienced-worker").status).toBe("met");
    const line = textOf(tallyFor(profile));
    expect(line).toContain(pointsOfNeeded(5, 6));
    expect(line).toContain("Experience (last 5 years) +2");
    expect(line).not.toContain("last 7 years");
  });

  it("under 2 years / 3 to under 5: experienced worker not yet, no experience in the tally", () => {
    const profile = withExperience("lt2", "3to5");
    expect(resultOf(profile, "de-experienced-worker").status).toBe("hold");
    const line = textOf(tallyFor(profile));
    expect(line).toContain(pointsOfNeeded(3, 6));
    expect(line).not.toContain("Experience");
  });

  it("2 years or more / 5 years or more: +3 for the seven-year row, never 2 + 3", () => {
    const profile = withExperience("2plus", "5plus");
    expect(resultOf(profile, "de-experienced-worker").status).toBe("met");
    const line = textOf(tallyFor(profile));
    expect(line).toContain(pointsOfNeeded(6, 6));
    expect(line).toContain("Experience (last 7 years) +3");
    expect(line).not.toContain("last 5 years");
  });
});

describe("a record from before this slice loses its experience answers", () => {
  const old = {
    destination: "de", situation: "offer", qualification: "vocational", citizenship: "TR",
    recognition_de: "not_assessed", experience: "y3in7", experience_7y: "yes",
  };
  const known = deriveQuestions(ds);

  it("the retired field is dropped, and so is the retired answer on the field that stayed", () => {
    const kept = restore(serialize(old, Object.keys(old)), known);
    expect(kept.answers).toEqual({
      destination: "de", situation: "offer", qualification: "vocational", citizenship: "TR", recognition_de: "not_assessed",
    });
    expect(kept.history).toEqual(["destination", "situation", "qualification", "citizenship", "recognition_de"]);
  });

  it("the interview asks the two questions again, and the resumed line counts the kept answers", () => {
    const kept = restore(serialize(old, Object.keys(old)), known);
    const replayed = replayRecord(ds, kept.answers, kept.history);
    expect(replayed.order).toHaveLength(5);
    expect(resumedLine(replayed.order.length)).toBe("Continuing where you left off — 5 answers kept.");
    // Both are asked again. Germany asks `occupation_it` before them since the
    // shortage Blue Card's IT path reads it (#134): once it is answered, the
    // five-year question is next.
    const ahead = remainingQuestions(ds, replayed.answers).map((q) => q.field);
    expect(ahead).toContain(FIVE);
    expect(ahead).toContain(SEVEN);
    expect(remainingQuestions(ds, { ...replayed.answers, occupation_it: JOB_OFFER.occupation_it! })[0]!.field).toBe(FIVE);
  });
});
