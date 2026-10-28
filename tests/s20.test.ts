import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { remainingQuestions, type Dataset, type Profile } from "permit-rulebook-data";
import { resumedLine } from "../src/lib/copy/interview.js";
import { questionCardHtml } from "../src/lib/question.js";
import { STORAGE_KEY, serialize } from "../src/lib/record.js";
import { replayRecord } from "../src/lib/scope.js";
import { PHONE, chromePath, type BrowserPage } from "../scripts/browser/browser.mjs";
import { answerWith, evaluateAtRest, openAtRest, withSite } from "./browser-walk.js";

/**
 * s20 — the correction lands on the question and returns to the verdict.
 *
 * On a phone the *You declared* panel sits under a long result. Tapping a
 * row's ✎ drew the question 1,366 px above the viewport and left the focus on
 * `<body>`; answering drew the new verdict 8,000 px above where the reader was
 * standing (v1.1 gate critique, B2, measured at 390). Two smaller things share
 * the cause: the focus fell to `<body>` after every answer (F6), and a
 * returning reader landed on "question 3 of up to 8" with nothing saying they
 * had resumed (F5).
 *
 * The cases below walk the exact steps the critique named, at the critique's
 * own width and at a desktop width, and read the viewport and the active
 * element after each — the numbers, not the intent.
 */
const ds = rawDataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));

/** The critique's persona, answered to the end: an offer in Germany, a
 * Turkish passport, a salary in the band just under the Blue Card line. */
const finished: Profile = {
  destination: "de", situation: "offer", qualification: "degree", citizenship: "TR",
  occupation_shortage: "yes", recognition_de: "recognized", experience_5y: "lt2", experience_7y: "lt3",
  salary_eur_year: "band_4", german: "none", english: "none", funds_eur_month: "band_0",
};
/** A reader four answers in — three of which France keeps (it never asks
 * situation_country), so the line counts three. */
const halfDone: Profile = {
  destination: "fr", citizenship: "TR", situation: "offer", situation_country: "fr",
};

const seed = (profile: Profile | null): string =>
  profile
    ? `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${
      JSON.stringify(serialize(profile, Object.keys(profile)))})`
    : "localStorage.clear()";

describe("the resumed line, as copy and as markup", () => {
  it("counts the answers kept, in the copy module", () => {
    expect(resumedLine(1)).toBe("Continuing where you left off — 1 answer kept.");
    expect(resumedLine(4)).toBe("Continuing where you left off — 4 answers kept.");
  });

  it("the renderer draws it above the question, and only when asked to", () => {
    const question = remainingQuestions(ds, halfDone)[0];
    const asked = Object.keys(halfDone);
    const base = {
      dataset: ds, question, answers: halfDone, asked, editing: null, total: 8, glossary: new Set<string>(),
    };
    const plain = questionCardHtml(base);
    expect(plain).not.toContain("Continuing where you left off");
    const resumed = questionCardHtml({ ...base, resumed: asked.length });
    expect(resumed).toContain(`<p class="resumed">${resumedLine(4)}</p>`);
    // Above the counter and the question, inside the card.
    expect(resumed.indexOf('class="resumed"')).toBeLessThan(resumed.indexOf('class="qmeta"'));
    expect(resumed.indexOf('class="resumed"')).toBeGreaterThan(resumed.indexOf('class="qcard"'));
  });

  it.skipIf(!existsSync(dist))("is not in the cold / HTML: nothing is known before paint", () => {
    const built = readFileSync(`${dist}/index.html`, "utf8");
    expect(built).not.toContain("Continuing where you left off");
    expect(built).not.toContain('class="resumed"');
  });
});

/** The complete record leaves nothing to ask; the half-done one leaves five. */
describe("the two records the walks seed", () => {
  it("are what their names say", () => {
    expect(remainingQuestions(ds, finished)).toEqual([]);
    expect(remainingQuestions(ds, halfDone).length).toBeGreaterThan(0);
  });
});

function why(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}
const skipped = why();
if (skipped)
  process.stderr.write([
    "",
    `  !! THE CORRECTION WAS NOT WALKED IN A BROWSER: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join(String.fromCharCode(10)));

/**
 * Where the reader is, read the way a reader would read it: the card's top
 * edge against the viewport, and what holds the focus. The first control is
 * whatever the card offers first — a button for a choice, the box for a
 * search — and the card's heading where there is neither.
 */
const WHERE = `JSON.stringify((() => {
  const card = document.querySelector("#main .qcard");
  const first = card && (card.querySelector(".opt, #cfilter") || card.querySelector(".qlabel"));
  const head = document.querySelector(".masthead-with-stamps");
  const h1 = document.getElementById("headline");
  const active = document.activeElement;
  const name = (el) => !el ? "" : el.id ? "#" + el.id : el.tagName + "." + (el.className || "").split(" ")[0];
  return {
    state: document.getElementById("app").dataset.state,
    scrollY: Math.round(window.scrollY),
    viewport: window.innerHeight,
    cardTop: card ? Math.round(card.getBoundingClientRect().top) : null,
    headTop: head ? Math.round(head.getBoundingClientRect().top) : null,
    h1Bottom: h1 ? Math.round(h1.getBoundingClientRect().bottom) : null,
    headline: h1 ? h1.textContent.trim() : "",
    live: (document.getElementById("cstatus").textContent || "").trim(),
    active: name(active),
    firstShown: !!first && getComputedStyle(first).visibility === "visible",
    activeIsFirst: !!first && active === first,
    activeInCard: !!card && !!active && card.contains(active),
    resumed: (() => { const p = document.querySelector("#main .resumed"); return p ? p.textContent.trim() : null; })(),
    resumedRestart: (() => {
      const a = document.querySelector("#main .resumed #restart");
      return a ? !a.hidden && getComputedStyle(a).display !== "none" : false;
    })(),
    restartsOnPage: document.querySelectorAll("#restart").length,
  };
})())`;

interface Where {
  state: string;
  scrollY: number;
  viewport: number;
  cardTop: number | null;
  headTop: number | null;
  h1Bottom: number | null;
  headline: string;
  live: string;
  active: string;
  /** Whether that first control can be seen at all — a card drawn under a
   * first-paint cover that outlived its screen had every child invisible. */
  firstShown: boolean;
  activeIsFirst: boolean;
  activeInCard: boolean;
  resumed: string | null;
  resumedRestart: boolean;
  restartsOnPage: number;
}

/**
 * The critique's walk: on a result, open the panel, scroll to the salary
 * row, tap its ✎, answer a different band. The row is found by its field,
 * never by its words.
 */
const TAP_SALARY = `(() => {
  document.getElementById("decl").open = true;
  const row = document.querySelector('#decl-list [data-field="salary_eur_year"]');
  row.scrollIntoView({ block: "center" });
  row.click();
  return "tapped";
})()`;
const ANSWER_ANOTHER_BAND = `(() => {
  const other = document.querySelector("#main .qcard .opt:not(.sel)");
  other.click();
  return other.textContent.trim();
})()`;

async function correction(page: BrowserPage, origin: (p: string) => string) {
  await page.goto(origin("/404.html"));
  await page.evaluate(seed(finished));
  await openAtRest(page, origin("/"));
  const result = JSON.parse(await page.evaluate(WHERE)) as Where;
  await evaluateAtRest(page, TAP_SALARY);
  const onQuestion = JSON.parse(await page.evaluate(WHERE)) as Where;
  await answerWith(page, ANSWER_ANOTHER_BAND);
  const back = JSON.parse(await page.evaluate(WHERE)) as Where;
  return { result, onQuestion, back, problems: page.problems() };
}

describe.skipIf(skipped !== null)("✎ on a result lands on the question and the answer returns to the verdict", () => {
  for (const [name, viewport, mobile] of [
    ["390x1400, the tall phone the critique measured", { width: 390, height: 1400 }, true],
    ["1240x900, where the panel is a sidebar", { width: 1240, height: 900 }, false],
  ] as const)
    it(`at ${name}`, async () => {
      const seen = await withSite(({ page, url }) => correction(page, url), { viewport, mobile });
      expect(seen.problems).toEqual([]);
      expect(seen.result.state, "the finished record did not restore to a result").toBe("results");

      // After ✎: the question is on the screen, from its top, and its first
      // option holds the focus. It was 1,366 px above the viewport with the
      // focus on <body> (B2).
      const q = seen.onQuestion;
      expect(q.state).toBe("questions");
      expect(q.cardTop, `the card's top is at ${q.cardTop} px`).not.toBeNull();
      expect(q.cardTop!, `the card's top is above the viewport (${q.cardTop} px, scrollY ${q.scrollY})`)
        .toBeGreaterThanOrEqual(0);
      expect(q.cardTop!, `the card's top is below the viewport (${q.cardTop} px of ${q.viewport})`)
        .toBeLessThan(q.viewport);
      // The card is drawn with its contents visible. A finished record that
      // restored straight to its verdict left the first-paint cover standing,
      // and the correction drew a card with every child hidden (an s10
      // defect, found by this walk).
      expect(q.firstShown, "the question card's first option is invisible").toBe(true);
      expect(q.activeIsFirst, `the focus is on ${q.active || "nothing"}, not the first option`).toBe(true);

      // After the new band: the verdict's headline is on the screen and the
      // live region says it. It rendered 8,000 px above the reader (B2).
      const r = seen.back;
      expect(r.state).toBe("results");
      expect(r.headline).not.toBe("");
      expect(r.headTop!, `the masthead's top is at ${r.headTop} px (scrollY ${r.scrollY})`).toBeGreaterThanOrEqual(0);
      expect(r.h1Bottom!, `the headline's bottom is at ${r.h1Bottom} px of ${r.viewport}`).toBeLessThanOrEqual(r.viewport);
      expect(r.live, "the live region does not carry the headline").toBe(r.headline);
      expect(r.headline).not.toBe(seen.result.headline);
    }, 180000);
});

describe.skipIf(skipped !== null)("every answer moves the focus to the next question's first control (F6)", () => {
  it("three questions in a row, from a cold /", async () => {
    const seen = await withSite(async ({ page, url }) => {
      await page.goto(url("/404.html"));
      await page.evaluate(seed(null));
      await openAtRest(page, url("/"));
      const steps: Where[] = [JSON.parse(await page.evaluate(WHERE))];
      for (let i = 0; i < 3; i++) {
        // A choice: its first button. The country search does not come this
        // early on any path, and the focus rule for it is v0.7's (the caret in
        // the box, its text selected).
        await answerWith(page, 'document.querySelector("#main .qcard .opt").click()');
        steps.push(JSON.parse(await page.evaluate(WHERE)));
      }
      return { steps, problems: page.problems() };
    }, { viewport: { width: 1240, height: 900 }, mobile: false });
    expect(seen.problems).toEqual([]);
    // The cold first paint is left alone: nothing takes the focus from a
    // reader who has not touched anything yet.
    expect(seen.steps[0].activeInCard, `the first paint focused ${seen.steps[0].active}`).toBe(false);
    for (const [i, step] of seen.steps.slice(1).entries()) {
      expect(step.state, `answer ${i + 1} left the interview`).toBe("questions");
      expect(step.activeIsFirst, `after answer ${i + 1} the focus is on ${step.active || "nothing"}`).toBe(true);
    }
  }, 180000);
});

describe.skipIf(skipped !== null)("a resumed interview says so (F5)", () => {
  it("a half-done record: the line, its count, and the one Start over control", async () => {
    const seen = await withSite(async ({ page, url }) => {
      await page.goto(url("/404.html"));
      await page.evaluate(seed(halfDone));
      await openAtRest(page, url("/"));
      const resumed = JSON.parse(await page.evaluate(WHERE)) as Where;
      // One answer on: the line was for the arrival, not for the screen after it.
      await answerWith(page, 'document.querySelector("#main .qcard .opt").click()');
      const next = JSON.parse(await page.evaluate(WHERE)) as Where;
      // Start over from the resumed line: the same control the panel carries.
      await openAtRest(page, url("/"));
      await evaluateAtRest(page, 'document.querySelector("#main .resumed #restart").click()');
      const restarted = JSON.parse(await page.evaluate(WHERE)) as Where;
      const stored = await page.evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`);
      return { resumed, next, restarted, stored, problems: page.problems() };
    }, PHONE);
    expect(seen.problems).toEqual([]);
    expect(seen.resumed.state).toBe("questions");
    // The count is the ledger's own: what the replay keeps of the record,
    // not what was stored (France never asks situation_country).
    const kept = replayRecord(ds, halfDone, Object.keys(halfDone)).order.length;
    expect(kept).toBe(3);
    expect(seen.resumed.resumed).toBe(`${resumedLine(kept)} Start over`);
    expect(seen.resumed.resumedRestart, "Start over is not in the line, or not shown").toBe(true);
    expect(seen.resumed.restartsOnPage, "a second Start over control").toBe(1);
    // The first paint does not take the focus: the reader has not acted.
    expect(seen.resumed.activeInCard, `the first paint focused ${seen.resumed.active}`).toBe(false);
    // The line is the arrival's; the next screen is a question like any other.
    expect(seen.next.resumed).toBeNull();
    expect(seen.next.restartsOnPage, "Start over went with the line").toBe(1);
    expect(seen.next.activeIsFirst).toBe(true);
    // Start over from the line does what Start over does.
    expect(seen.restarted.resumed).toBeNull();
    expect(seen.stored).toBeNull();
    expect(seen.restarted.restartsOnPage).toBe(1);
  }, 180000);

  // A finished record's verdict is the first screen of a return too, and says
  // so over its body (#56, ruling 7).
  for (const [name, record, state, resumes] of [
    ["a cold /", null, "questions", false],
    ["a finished record, which restores to the verdict", finished, "results", true],
  ] as const)
    it(`is ${resumes ? "there, with the one Start over control," : "absent"} on ${name}`, async () => {
      const seen = await withSite(async ({ page, url }) => {
        await page.goto(url("/404.html"));
        await page.evaluate(seed(record));
        await openAtRest(page, url("/"));
        return JSON.parse(await page.evaluate(WHERE)) as Where;
      }, PHONE);
      expect(seen.state).toBe(state);
      expect(seen.resumed !== null, `the resumed line is ${seen.resumed === null ? "missing" : "there"}`).toBe(resumes);
      expect(seen.resumedRestart).toBe(resumes);
      expect(seen.restartsOnPage).toBe(1);
    }, 180000);
});
