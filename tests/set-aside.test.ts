import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { remainingQuestions, shortLabelOf, type Dataset, type Profile } from "permit-rulebook-data";
import { EDIT_LINE } from "../src/lib/copy.js";
import { STORAGE_KEY, serialize } from "../src/lib/record.js";
import { replayRecord } from "../src/lib/scope.js";

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
const dist = fileURLToPath(new URL("../dist", import.meta.url));

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

const { chromePath } = await import("../scripts/chrome.mjs");
const { serve, withBrowser } = await import("../scripts/browser.mjs");

function why(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}
const skipped = why();
if (skipped)
  process.stderr.write(`\n  !! THE SET-ASIDE LINE WAS NOT WALKED IN A BROWSER: ${skipped}.\n     Run: npm run build && npm test\n\n`);

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
  problems(): string[];
}

const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fieldByLabel = new Map(ds.fields.map((f) => [f.label, f.id]));

/** What a screen shows, read from the page: the card or the verdict, the
 * panel, and each answer the set-aside line names with the name it shows. */
const SCREEN = `JSON.stringify((() => {
  const label = document.querySelector("#main .qcard .qlabel");
  const meta = document.querySelector("#main .qcard .qmeta");
  return {
    state: document.getElementById("app").dataset.state,
    question: label ? label.textContent.trim() : null,
    meta: meta ? meta.textContent.trim() : null,
    rows: document.querySelectorAll("#decl-list [data-field]").length,
    named: [...document.querySelectorAll("#decl [data-set-aside]")]
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

/** Seed the walk's record, open on its verdict, and move its destination. */
async function moveDestination(page: BrowserPage, url: (p: string) => string, walk: Walk, to: string) {
  await page.goto(url("/404.html"), 300);
  await page.evaluate(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${
    JSON.stringify(serialize(walk.answers, walk.order, true))})`);
  await page.goto(url("/"), 1600);
  const verdict = await screenOf(page);
  const editing = await act(page, PENCIL("destination"));
  const next = await act(page, TAP(to));
  return { verdict, editing, next };
}

const DESKTOP = { viewport: { width: 1240, height: 900 }, mobile: false };

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
});
