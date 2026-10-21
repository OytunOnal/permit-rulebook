import { describe, expect, it } from "vitest";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { deriveQuestions, shortLabelOf, type Dataset, type Profile } from "permit-rulebook-data";
import { STORAGE_KEY } from "../src/lib/record.js";
import {
  DESK, QLABEL, answer, middleBandOf, settle, skipReason, waitOutTheBeat, walkTo, warnNotWalked, withSite,
  type BrowserPage, type PageOnSite,
} from "./browser-walk.js";

/**
 * #136 — a money question answered with its open unknown (the field's
 * `unknown_label`) is a declaration like any other: its row in the declared panel is answered, has
 * its pencil, and the pencil reopens the question (spec #133, decision 8).
 *
 * The open unknown on a money question is one of its options and none of its
 * bands, so a panel that reads the answer among the bands alone draws the row
 * as unanswered, with no pencil, the one row that cannot be reopened.
 *
 * Walked from a cold start over the built page, answer by answer, until the
 * money question is answered with its open unknown. Each case asserts the row
 * is in the panel before it reads the row's state, and reads the state, never
 * the answer's words.
 */
const ds = rawDataset as unknown as Dataset;

const skipped = skipReason();
if (skipped) warnNotWalked("THE MONEY ROWS", skipped);

/** The open unknown on a money question: the answer that is not a band, the
 * option the question marks `is_unknown`. Its value is what the record holds. */
const UNKNOWN = (() => {
  const money = deriveQuestions(ds).filter((q) => ds.fields.find((f) => f.id === q.field)?.type === "money_band");
  const values = new Set(money.map((q) => q.options.find((o) => o.is_unknown)?.value));
  if (money.length === 0 || values.size !== 1 || values.has(undefined))
    throw new Error("every money question should offer one open unknown");
  return [...values][0]!;
})();

/**
 * One reader, with an answer for every question either walk can reach: a
 * Turkish passport, a vocational qualification not yet recognised in
 * Germany, a job offer in the destination. Only the destination moves.
 */
const readerFor = (destination: "de" | "nl"): Profile => ({
  destination, situation: "offer", situation_country: destination, citizenship: "TR",
  qualification: "vocational", qualification_recent: "no", recognition_de: "not_yet",
  experience_5y: "2plus", experience_7y: "3to5", occupation_shortage: "yes", occupation_it: "no",
  salary_eur_year: middleBandOf("salary_eur_year"), salary_eur_month: middleBandOf("salary_eur_month"),
  funds_eur_month: middleBandOf("funds_eur_month"),
  fr_degree: "no", fr_innovative_employer: "no", fr_local_contract: "no", nl_recent_grad: "no", top200_grad: "no",
  german: "a1", english: "b2", age_band: "a30to35", de_stay6m: "no", partner_ck: "no",
});

const RECORDED = (field: string) =>
  `(JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}) || "{}").answers || {})[${JSON.stringify(field)}] ?? ""`;

/**
 * From a cold start, answers whatever question is on the screen from the
 * reader's profile, and `target` with the open unknown, then stops: the
 * screen after it is the one whose panel the case reads. Hands back the
 * fields asked, in order.
 */
async function walkToUnknown(site: PageOnSite, reader: Profile, target: string): Promise<string[]> {
  const asked = await walkTo(site, reader, target);
  await answer(site.page, target, UNKNOWN);
  return [...asked, target];
}

/** The declared panel's row for a field, found by the short label the
 * dataset gives it, and what state it is drawn in. */
const ROW_OF = (field: string) => `JSON.stringify((() => {
  const short = ${JSON.stringify(shortLabelOf(ds, field))};
  const row = [...document.querySelectorAll("#decl-list > div")]
    .find((r) => (r.querySelector("dt")?.textContent || "").trim() === short);
  if (!row) return null;
  row.scrollIntoView({ block: "center" });
  const box = row.getBoundingClientRect();
  return {
    field: row.dataset.field ?? null,
    editable: row.getAttribute("role") === "button" && row.tabIndex === 0,
    pencil: !!row.querySelector(".pen"),
    unanswered: !!row.querySelector(".pending"),
    at: { x: Math.round(box.left + box.width / 2), y: Math.round(box.top + box.height / 2) },
  };
})())`;

interface Row { field: string | null; editable: boolean; pencil: boolean; unanswered: boolean; at: { x: number; y: number } }

const rowOf = async (page: BrowserPage, field: string): Promise<Row | null> =>
  JSON.parse(await page.evaluate(ROW_OF(field))) as Row | null;

/** The precondition, then the state: the row is in the panel, answered, with
 * its pencil, and it is the row the page wires as an edit point. */
function expectAnsweredWithItsPencil(row: Row | null, field: string): asserts row is Row {
  expect(row, `no row for ${field} in the declared panel`).not.toBeNull();
  expect(row!.unanswered, `${field}'s row is drawn as the unanswered row`).toBe(false);
  expect(row!.pencil, `${field}'s row has no pencil`).toBe(true);
  expect(row!.field).toBe(field);
  expect(row!.editable).toBe(true);
}

/** The question on the screen once the pencil has drawn one, read when it is
 * there: the gesture draws its card on its own turn. */
async function questionAfter(page: BrowserPage, before: string): Promise<string> {
  for (let tries = 0; tries < 200; tries++) {
    const now = await page.evaluate(QLABEL);
    if (now && now !== before) return now;
    await settle(10);
  }
  return page.evaluate(QLABEL);
}

const CHOSEN = '(() => { const o = document.querySelector("#main .qcard .opt.sel"); return o ? o.dataset.value : ""; })()';

const WALKS = [
  { field: "funds_eur_month", destination: "de" },
  { field: "salary_eur_year", destination: "de" },
  { field: "salary_eur_month", destination: "nl" },
] as const;

describe.skipIf(skipped !== null)("a money row answered with its open unknown is a declaration like any other (#136)", () => {
  for (const { field, destination } of WALKS) {
    it(`${field} answered with its open unknown draws an answered row with its pencil`, async () => {
      const seen = await withSite(async (site) => {
        const { page } = site;
        await walkToUnknown(site, readerFor(destination), field);
        return { recorded: await page.evaluate(RECORDED(field)), row: await rowOf(page, field), problems: page.problems() };
      }, DESK) as { recorded: string; row: Row | null; problems: string[] };
      expect(seen.problems).toEqual([]);
      expect(seen.recorded, `${field} was not recorded as the open unknown`).toBe(UNKNOWN);
      expectAnsweredWithItsPencil(seen.row, field);
    }, 120_000);

    it(`${field}'s pencil reopens its question, and another answer replaces the open unknown`, async () => {
      const band = middleBandOf(field);
      const seen = await withSite(async (site) => {
        const { page } = site;
        await walkToUnknown(site, readerFor(destination), field);
        const before = await rowOf(page, field);
        // A row with no pencil is no edit point: the case stops on its
        // state rather than on a click that reopens nothing.
        if (!before?.pencil) return { before, reopened: "", chosen: "", recorded: "", after: null, problems: page.problems() };
        const next = await page.evaluate(QLABEL);
        await page.clickAt(before.at.x, before.at.y);
        const reopened = await questionAfter(page, next);
        await waitOutTheBeat(page);
        const chosen = await page.evaluate(CHOSEN);
        await answer(page, field, band);
        return {
          before, reopened, chosen,
          recorded: await page.evaluate(RECORDED(field)), after: await rowOf(page, field), problems: page.problems(),
        };
      }, DESK) as { before: Row | null; reopened: string; chosen: string; recorded: string; after: Row | null; problems: string[] };
      expect(seen.problems).toEqual([]);
      expectAnsweredWithItsPencil(seen.before, field);
      expect(seen.reopened, "the pencil did not reopen the question").toBe(ds.fields.find((f) => f.id === field)!.label);
      expect(seen.chosen, "the reopened question does not hold the answer on file").toBe(UNKNOWN);
      expect(seen.recorded, "another answer did not replace the open unknown").toBe(band);
      expectAnsweredWithItsPencil(seen.after, field);
    }, 120_000);
  }
});
