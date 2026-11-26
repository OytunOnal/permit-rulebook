import { describe, expect, it } from "vitest";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { remainingQuestions, shortLabelOf, type Dataset, type Profile } from "permit-rulebook-data";
import { EDIT_LINE } from "../src/lib/copy/interview.js";
import { replayRecord } from "../src/lib/scope.js";
import { PHONE, type BrowserPage, type PageOnSite } from "../scripts/browser/browser.mjs";
import { InterviewPage } from "../scripts/interview-page/interview-page.mjs";
import { skipReason, waitUntilPastTheBeat, warnNotWalked, withSite } from "./browser-walk.js";
import { shiftScoreSince } from "./layout-shifts.js";

/**
 * #137 — a change of country names the answers it set aside.
 *
 * A reader who moves the offer country from France to Spain with the pencil
 * loses the answers only France's routes read. The replay reports them, and
 * the declared panel names them on the next screen, question or result, and
 * on no screen after it. The edit line promises only what happens.
 *
 * The walks are France records, found by running the replay on the real
 * dataset: Spain asks neither the French degree nor the innovative employer.
 */
const ds = rawDataset as unknown as Dataset;

interface Walk { answers: Profile; order: string[] }

/** France, finished; Spain sets aside the two French questions and asks one
 * of its own. */
const TO_A_QUESTION: Walk = {
  answers: {
    destination: "fr", situation: "offer", qualification: "degree", fr_degree: "yes",
    citizenship: "TR", fr_innovative_employer: "no", salary_eur_year: "band_1",
  },
  order: ["destination", "situation", "qualification", "fr_degree", "citizenship", "fr_innovative_employer", "salary_eur_year"],
};
/** France, finished; Spain sets aside the innovative employer and asks
 * nothing more. */
const TO_THE_RESULT: Walk = {
  answers: {
    destination: "fr", situation: "offer", qualification: "vocational", experience_7y: "3to5",
    fr_innovative_employer: "yes", citizenship: "TR", salary_eur_year: "band_3",
  },
  order: ["destination", "situation", "qualification", "experience_7y", "fr_innovative_employer", "citizenship", "salary_eur_year"],
};
/** France with no situation to score; Spain reads both answers. */
const NOTHING_SET_ASIDE: Walk = {
  answers: { destination: "fr", situation: "none" },
  order: ["destination", "situation"],
};

describe("the replay reports what it set aside", () => {
  it("France → Spain: the answers only France reads, in asked order, and none it kept", () => {
    const { answers, order } = TO_A_QUESTION;
    const replayed = replayRecord(ds, { ...answers, destination: "es" }, order);
    expect(replayed.setAside).toEqual(["fr_degree", "fr_innovative_employer"]);
    expect(replayed.setAside.filter((f) => replayed.order.includes(f))).toEqual([]);
  });

  it("a change the new scope reads all of sets nothing aside", () => {
    const { answers, order } = NOTHING_SET_ASIDE;
    expect(replayRecord(ds, { ...answers, destination: "es" }, order).setAside).toEqual([]);
  });

  it("the walks are what their names say", () => {
    const after = (w: Walk) => replayRecord(ds, { ...w.answers, destination: "es" }, w.order).answers;
    for (const w of [TO_A_QUESTION, TO_THE_RESULT, NOTHING_SET_ASIDE])
      expect(remainingQuestions(ds, w.answers), "the France record is not finished").toEqual([]);
    expect(remainingQuestions(ds, after(TO_A_QUESTION)).map((q) => q.field)).toEqual(["qualification_recent"]);
    expect(remainingQuestions(ds, after(TO_THE_RESULT))).toEqual([]);
    expect(remainingQuestions(ds, after(NOTHING_SET_ASIDE))).toEqual([]);
  });
});

const skipped = skipReason();
if (skipped) warnNotWalked("THE SET-ASIDE LINE", skipped);

const fieldByLabel = new Map(ds.fields.map((f) => [f.label, f.id]));

/** In the page: what a screen shows beside its question card: the panel, and
 * each answer the set-aside line shows, with the name it shows, as JSON. */
function readScreenBesideTheQuestion(): string {
  return JSON.stringify({
    rows: document.querySelectorAll("#decl-list [data-field]").length,
    named: [...document.querySelectorAll<HTMLElement>("#decl [data-set-aside]")]
      .filter((el) => el.checkVisibility({ visibilityProperty: true, opacityProperty: true }))
      .map((el) => ({ field: el.dataset.setAside, name: (el.textContent ?? "").trim() })),
  });
}

interface Screen {
  state: string;
  question: string;
  /** The card's counter line, or the edit line on a reopened question; "" off a question. */
  meta: string;
  rows: number;
  named: { field: string; name: string }[];
}

/** What a screen shows, read from the page: the card or the verdict, the
 * panel, and each answer the set-aside line shows, with the name it shows. */
const screenOf = async (page: BrowserPage) => {
  const { screen: state, question, meta } = await new InterviewPage({ page }).readScreen();
  const beside = JSON.parse(await page.evaluate(`(${readScreenBesideTheQuestion})()`)) as Omit<Screen, "state" | "question" | "meta">;
  return { state, question, meta, ...beside, field: fieldByLabel.get(question) ?? null };
};
type Seen = Awaited<ReturnType<typeof screenOf>>;

/**
 * Runs `make`, a gesture that draws a screen, once the beat of the card on the
 * screen is over, and reads the screen it draws once the page is at rest: its
 * beat's fade over, so what it shows is drawn as it stays.
 */
async function screenAfter(page: BrowserPage, make: () => Promise<unknown>): Promise<Seen> {
  await waitUntilPastTheBeat(page);
  await make();
  await page.waitUntilAtRest();
  return screenOf(page);
}

/** In the page: the ledger opened, and the ✎ of `field`'s row tapped. */
function tapPencil(field: string): string {
  (document.getElementById("decl") as HTMLDetailsElement).open = true;
  document.querySelector<HTMLElement>(`#decl-list [data-field="${field}"]`)!.click();
  return "tapped";
}

/** The ✎ of `field`'s row tapped, and the screen it draws. */
const pencil = (page: BrowserPage, field: string): Promise<Seen> =>
  screenAfter(page, () => page.evaluate(`(${tapPencil})(${JSON.stringify(field)})`));
/** `field` answered with `value`, and the screen it draws, at rest. */
async function answerAndRead(site: PageOnSite, field: string, value: string): Promise<Seen> {
  await new InterviewPage(site).answer(field, value);
  return screenOf(site.page);
}
/** `field` answered with `value` by a real tap, as a reader's finger does, and the screen it draws, at rest. */
async function tapAnswerAndRead(site: PageOnSite, field: string, value: string): Promise<Seen> {
  await new InterviewPage(site).answer(field, value, { by: "hand" });
  return screenOf(site.page);
}
const named = (fields: string[]) => fields.map((field) => ({ field, name: shortLabelOf(ds, field) }));

/** Seed the walk's record and open on its verdict. */
async function openOnVerdict(site: PageOnSite, walk: Walk): Promise<Seen> {
  const interview = new InterviewPage(site);
  await interview.seed(walk.answers, { history: walk.order, done: true });
  await interview.open();
  await site.page.waitUntilAtRest();
  return screenOf(site.page);
}

/** Seed the walk's record, open on its verdict, and move its destination. */
async function moveDestination(site: PageOnSite, walk: Walk, to: string) {
  const verdict = await openOnVerdict(site, walk);
  const editing = await pencil(site.page, "destination");
  const next = await answerAndRead(site, "destination", to);
  return { verdict, editing, next };
}

// The width where the declared panel is a sidebar beside the screen, open, not folded.
const DESKTOP = { viewport: { width: 1240, height: 900 }, mobile: false };

/** In the page: on a phone the panel folds to its summary row: whether it is
 * folded, and each set-aside mark that shows, and whether it shows inside that
 * row's box, as JSON. */
function readSummary(): string {
  const decl = document.getElementById("decl") as HTMLDetailsElement;
  const row = decl.querySelector(":scope > summary")!.getBoundingClientRect();
  const isInside = (r: DOMRect) => r.top >= row.top && r.bottom <= row.bottom && r.left >= row.left && r.right <= row.right;
  return JSON.stringify({
    collapsed: !decl.open,
    shown: [...decl.querySelectorAll<HTMLElement>("[data-set-aside]")]
      // A folded panel keeps its rows' boxes; the platform's own check knows
      // they are not rendered.
      .filter((el) => el.checkVisibility({ visibilityProperty: true, opacityProperty: true }))
      .map((el) => ({ field: el.dataset.setAside, inSummary: isInside(el.getBoundingClientRect()) })),
  });
}

/** The read of the folded panel's summary row: the expression the case evaluates. */
const SUMMARY = `(${readSummary})()`;
interface Summary { collapsed: boolean; shown: { field: string; inSummary: boolean }[] }

/** A tap that draws a screen, and the screen it draws, out of its beat. */
const tapToNext = (page: BrowserPage, selector: string): Promise<Seen> => screenAfter(page, () => page.tapOn(selector));

describe.skipIf(skipped !== null)("the set-aside line, walked", () => {
  it("France → Spain to a question: its panel names the French answers, the screen after does not", async () => {
    const seen = await withSite(async (site) => {
      const moved = await moveDestination(site, TO_A_QUESTION, "es");
      const after = await answerAndRead(site, "qualification_recent", "yes");
      return { ...moved, after };
    }, DESKTOP) as { verdict: Seen; editing: Seen; next: Seen; after: Seen };
    expect(seen.verdict.state, "the France record did not restore to its verdict").toBe("results");
    expect(seen.editing.field, "the pencil did not reopen the destination").toBe("destination");
    expect(seen.next.field, "Spain did not ask its own question next").toBe("qualification_recent");
    expect(seen.next.rows, "the panel is not drawn").toBeGreaterThan(0);
    expect(seen.next.named).toEqual(named(["fr_degree", "fr_innovative_employer"]));
    expect(seen.after.state, "the answer did not lead to the verdict").toBe("results");
    expect(seen.after.rows, "the panel is not drawn").toBeGreaterThan(0);
    expect(seen.after.named).toEqual([]);
  }, 180_000);

  it("a change that leads straight to the result names the set-aside answers in its panel", async () => {
    const seen = await withSite((site) => moveDestination(site, TO_THE_RESULT, "es"), DESKTOP);
    expect(seen.verdict.state, "the France record did not restore to its verdict").toBe("results");
    expect(seen.editing.field, "the pencil did not reopen the destination").toBe("destination");
    expect(seen.next.state, "Spain asked another question").toBe("results");
    expect(seen.next.rows, "the panel is not drawn").toBeGreaterThan(0);
    expect(seen.next.named).toEqual(named(["fr_innovative_employer"]));
  }, 180_000);

  it("a change that sets nothing aside draws no set-aside line", async () => {
    const seen = await withSite((site) => moveDestination(site, NOTHING_SET_ASIDE, "es"), DESKTOP);
    expect(seen.verdict.state, "the France record did not restore to its verdict").toBe("results");
    expect(seen.editing.field, "the pencil did not reopen the destination").toBe("destination");
    expect(seen.next.state, "the change did not lead to the verdict").toBe("results");
    expect(seen.next.rows, "the panel is not drawn").toBeGreaterThan(0);
    expect(seen.next.named).toEqual([]);
  }, 180_000);
});

describe.skipIf(skipped !== null)("the set-aside line, walked", () => {
  it("changing back to France asks the set-aside question again", async () => {
    const seen = await withSite(async (site) => {
      const moved = await moveDestination(site, TO_A_QUESTION, "es");
      const inSpain = await answerAndRead(site, "qualification_recent", "yes");
      const editing = await pencil(site.page, "destination");
      const back = await answerAndRead(site, "destination", "fr");
      return { moved, inSpain, editing, back };
    }, DESKTOP) as { moved: { next: Seen }; inSpain: Seen; editing: Seen; back: Seen };
    expect(seen.moved.next.field, "Spain did not ask its own question next").toBe("qualification_recent");
    expect(seen.inSpain.state, "Spain's answer did not lead to the verdict").toBe("results");
    expect(seen.editing.field, "the pencil did not reopen the destination").toBe("destination");
    expect(seen.back.field).toBe("fr_degree");
  }, 180_000);

  it("the edit line's words come from the copy module", async () => {
    const seen = await withSite((site) => moveDestination(site, NOTHING_SET_ASIDE, "es"), DESKTOP);
    expect(seen.editing.field, "the pencil did not reopen the destination").toBe("destination");
    expect(EDIT_LINE, "the copy module holds no edit line").toBeTypeOf("string");
    expect(seen.editing.meta).toBe(EDIT_LINE);
  }, 180_000);
});

describe.skipIf(skipped !== null)("the set-aside line, walked", () => {
  it("on a phone, with the panel folded, the summary row names them, the screen after does not, and nothing shifts", async () => {
    const seen = await withSite(async (site) => {
      const { page } = site;
      const verdict = await openOnVerdict(site, TO_A_QUESTION);
      await page.tapOn("#decl > summary");
      await page.waitUntilAtRest();
      const editing = await tapToNext(page, '#decl-list [data-field="destination"]');
      const next = await tapAnswerAndRead(site, "destination", "es");
      const nextRow = JSON.parse(await page.evaluate(SUMMARY)) as Summary;
      const after = await tapAnswerAndRead(site, "qualification_recent", "yes");
      const afterRow = JSON.parse(await page.evaluate(SUMMARY)) as Summary;
      const cls = await shiftScoreSince(page);
      return { verdict, editing, next, nextRow, after, afterRow, cls };
    }, PHONE) as {
      verdict: Seen; editing: Seen; next: Seen; nextRow: Summary; after: Seen; afterRow: Summary;
      cls: number;
    };
    expect(seen.verdict.state, "the France record did not restore to its verdict").toBe("results");
    expect(seen.editing.field, "the pencil did not reopen the destination").toBe("destination");
    expect(seen.next.field, "Spain did not ask its own question next").toBe("qualification_recent");
    expect(seen.nextRow.collapsed, "the panel is open, not folded to its summary row").toBe(true);
    expect(seen.nextRow.shown).toEqual(
      ["fr_degree", "fr_innovative_employer"].map((field) => ({ field, inSummary: true })));
    expect(seen.after.state, "the answer did not lead to the verdict").toBe("results");
    expect(seen.afterRow.collapsed, "the panel is open, not folded to its summary row").toBe(true);
    expect(seen.afterRow.shown).toEqual([]);
    expect(seen.cls, "the summary row's line shifted the page").toBe(0);
  }, 180_000);
});
