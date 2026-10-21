import { describe, expect, it } from "vitest";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { remainingQuestions, shortLabelOf, type Dataset, type Profile } from "permit-rulebook-data";
import { EDIT_LINE } from "../src/lib/copy.js";
import { STORAGE_KEY, serialize } from "../src/lib/record.js";
import { replayRecord } from "../src/lib/scope.js";
import {
  PHONE, WATCH_SHIFTS, dist, serve, settle, skipReason, warnNotWalked, withBrowser, type BrowserPage,
} from "./browser-walk.js";

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

/** What a screen shows, read from the page: the card or the verdict, the
 * panel, and each answer the set-aside line shows, with the name it shows. */
const SCREEN = `JSON.stringify((() => {
  const label = document.querySelector("#main .qcard .qlabel");
  const meta = document.querySelector("#main .qcard .qmeta");
  return {
    state: document.getElementById("app").dataset.state,
    question: label ? label.textContent.trim() : null,
    meta: meta ? meta.textContent.trim() : null,
    rows: document.querySelectorAll("#decl-list [data-field]").length,
    named: [...document.querySelectorAll("#decl [data-set-aside]")]
      .filter((el) => el.checkVisibility({ visibilityProperty: true, opacityProperty: true }))
      .map((el) => ({ field: el.dataset.setAside, name: el.textContent.trim() })),
  };
})())`;

interface Screen {
  state: string;
  question: string | null;
  meta: string | null;
  rows: number;
  named: { field: string; name: string }[];
}

const screenOf = async (page: BrowserPage) => {
  const s = JSON.parse(await page.evaluate(SCREEN)) as Screen;
  return { ...s, field: s.question === null ? null : (fieldByLabel.get(s.question) ?? null) };
};
type Seen = Awaited<ReturnType<typeof screenOf>>;

/** Run a gesture and wait for the screen it draws, then out the beat. */
async function act(page: BrowserPage, gesture: string): Promise<Seen> {
  const before = await screenOf(page);
  await page.evaluate(gesture);
  return screenAfter(page, before);
}

/** The screen once it differs from `before`, out of its beat. */
async function screenAfter(page: BrowserPage, before: Seen): Promise<Seen> {
  for (let waited = 0; waited < 5000; waited += 100) {
    await settle(100);
    const now = await screenOf(page);
    if (now.state !== before.state || now.question !== before.question || now.meta !== before.meta) break;
  }
  await settle(700);
  return screenOf(page);
}

const PENCIL = (field: string) => `(() => {
  document.getElementById("decl").open = true;
  document.querySelector('#decl-list [data-field="${field}"]').click();
  return "tapped";
})()`;
const TAP = (value: string) => `document.querySelector("#main .qcard .opt[data-value='${value}']").click()`;
const named = (fields: string[]) => fields.map((field) => ({ field, name: shortLabelOf(ds, field) }));

/** Seed the walk's record and open on its verdict. */
async function openOnVerdict(page: BrowserPage, url: (p: string) => string, walk: Walk): Promise<Seen> {
  await page.goto(url("/404.html"), 300);
  await page.evaluate(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${
    JSON.stringify(serialize(walk.answers, walk.order, true))})`);
  await page.goto(url("/"), 1600);
  return screenOf(page);
}

/** Seed the walk's record, open on its verdict, and move its destination. */
async function moveDestination(page: BrowserPage, url: (p: string) => string, walk: Walk, to: string) {
  const verdict = await openOnVerdict(page, url, walk);
  const editing = await act(page, PENCIL("destination"));
  const next = await act(page, TAP(to));
  return { verdict, editing, next };
}

const DESKTOP = { viewport: { width: 1240, height: 900 }, mobile: false };

/** On a phone the panel folds to its summary row: whether it is folded, and
 * each set-aside mark that shows, and whether it shows inside that row's box. */
const SUMMARY = `JSON.stringify((() => {
  const decl = document.getElementById("decl");
  const row = decl.querySelector(":scope > summary").getBoundingClientRect();
  const inside = (r) => r.top >= row.top && r.bottom <= row.bottom && r.left >= row.left && r.right <= row.right;
  return {
    collapsed: !decl.open,
    shown: [...decl.querySelectorAll("[data-set-aside]")]
      // A folded panel keeps its rows' boxes; the platform's own check knows
      // they are not rendered.
      .filter((el) => el.checkVisibility({ visibilityProperty: true, opacityProperty: true }))
      .map((el) => ({ field: el.dataset.setAside, inSummary: inside(el.getBoundingClientRect()) })),
  };
})())`;
interface Summary { collapsed: boolean; shown: { field: string; inSummary: boolean }[] }

/** A real tap at the centre of the element, scrolled into view first: the
 * platform's own input, which CLS does not count a shift after. */
async function tapOn(page: BrowserPage, selector: string): Promise<void> {
  const at = JSON.parse(await page.evaluate(`JSON.stringify((() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  })())`)) as { x: number; y: number };
  await page.clickAt(at.x, at.y);
}

/** A tap that draws a screen, and the screen it draws, out of its beat. */
async function tapToNext(page: BrowserPage, selector: string): Promise<Seen> {
  const before = await screenOf(page);
  await tapOn(page, selector);
  return screenAfter(page, before);
}

describe.skipIf(skipped !== null)("the set-aside line, walked", () => {
  it("France → Spain to a question: its panel names the French answers, the screen after does not", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        const moved = await moveDestination(page, server.url, TO_A_QUESTION, "es");
        const after = await act(page, TAP("yes"));
        return { ...moved, after, problems: page.problems() };
      }, DESKTOP) as { verdict: Seen; editing: Seen; next: Seen; after: Seen; problems: string[] };
      expect(seen.problems).toEqual([]);
      expect(seen.verdict.state, "the France record did not restore to its verdict").toBe("results");
      expect(seen.editing.field, "the pencil did not reopen the destination").toBe("destination");
      expect(seen.next.field, "Spain did not ask its own question next").toBe("qualification_recent");
      expect(seen.next.rows, "the panel is not drawn").toBeGreaterThan(0);
      expect(seen.next.named).toEqual(named(["fr_degree", "fr_innovative_employer"]));
      expect(seen.after.state, "the answer did not lead to the verdict").toBe("results");
      expect(seen.after.rows, "the panel is not drawn").toBeGreaterThan(0);
      expect(seen.after.named).toEqual([]);
    } finally {
      server.close();
    }
  }, 180_000);

  it("a change that leads straight to the result names the set-aside answers in its panel", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => ({
        ...await moveDestination(page, server.url, TO_THE_RESULT, "es"), problems: page.problems(),
      }), DESKTOP) as { verdict: Seen; editing: Seen; next: Seen; problems: string[] };
      expect(seen.problems).toEqual([]);
      expect(seen.verdict.state, "the France record did not restore to its verdict").toBe("results");
      expect(seen.editing.field, "the pencil did not reopen the destination").toBe("destination");
      expect(seen.next.state, "Spain asked another question").toBe("results");
      expect(seen.next.rows, "the panel is not drawn").toBeGreaterThan(0);
      expect(seen.next.named).toEqual(named(["fr_innovative_employer"]));
    } finally {
      server.close();
    }
  }, 180_000);

  it("a change that sets nothing aside draws no set-aside line", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => ({
        ...await moveDestination(page, server.url, NOTHING_SET_ASIDE, "es"), problems: page.problems(),
      }), DESKTOP) as { verdict: Seen; editing: Seen; next: Seen; problems: string[] };
      expect(seen.problems).toEqual([]);
      expect(seen.verdict.state, "the France record did not restore to its verdict").toBe("results");
      expect(seen.editing.field, "the pencil did not reopen the destination").toBe("destination");
      expect(seen.next.state, "the change did not lead to the verdict").toBe("results");
      expect(seen.next.rows, "the panel is not drawn").toBeGreaterThan(0);
      expect(seen.next.named).toEqual([]);
    } finally {
      server.close();
    }
  }, 180_000);

  it("changing back to France asks the set-aside question again", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        const moved = await moveDestination(page, server.url, TO_A_QUESTION, "es");
        const inSpain = await act(page, TAP("yes"));
        const editing = await act(page, PENCIL("destination"));
        const back = await act(page, TAP("fr"));
        return { moved, inSpain, editing, back, problems: page.problems() };
      }, DESKTOP) as { moved: { next: Seen }; inSpain: Seen; editing: Seen; back: Seen; problems: string[] };
      expect(seen.problems).toEqual([]);
      expect(seen.moved.next.field, "Spain did not ask its own question next").toBe("qualification_recent");
      expect(seen.inSpain.state, "Spain's answer did not lead to the verdict").toBe("results");
      expect(seen.editing.field, "the pencil did not reopen the destination").toBe("destination");
      expect(seen.back.field).toBe("fr_degree");
    } finally {
      server.close();
    }
  }, 180_000);

  it("the edit line's words come from copy.ts", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => ({
        ...await moveDestination(page, server.url, NOTHING_SET_ASIDE, "es"), problems: page.problems(),
      }), DESKTOP) as { editing: Seen; problems: string[] };
      expect(seen.problems).toEqual([]);
      expect(seen.editing.field, "the pencil did not reopen the destination").toBe("destination");
      expect(EDIT_LINE, "copy.ts holds no edit line").toBeTypeOf("string");
      expect(seen.editing.meta).toBe(EDIT_LINE);
    } finally {
      server.close();
    }
  }, 180_000);

  it("on a phone, with the panel folded, the summary row names them, the screen after does not, and nothing shifts", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        const verdict = await openOnVerdict(page, server.url, TO_A_QUESTION);
        await page.evaluate(WATCH_SHIFTS);
        await tapOn(page, "#decl > summary");
        await settle(300);
        const editing = await tapToNext(page, '#decl-list [data-field="destination"]');
        const next = await tapToNext(page, "#main .qcard .opt[data-value='es']");
        const nextRow = JSON.parse(await page.evaluate(SUMMARY)) as Summary;
        const after = await tapToNext(page, "#main .qcard .opt[data-value='yes']");
        const afterRow = JSON.parse(await page.evaluate(SUMMARY)) as Summary;
        const cls = Number(await page.evaluate("window.__cls"));
        return { verdict, editing, next, nextRow, after, afterRow, cls, problems: page.problems() };
      }, PHONE) as {
        verdict: Seen; editing: Seen; next: Seen; nextRow: Summary; after: Seen; afterRow: Summary;
        cls: number; problems: string[];
      };
      expect(seen.problems).toEqual([]);
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
    } finally {
      server.close();
    }
  }, 180_000);
});
