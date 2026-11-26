import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { deriveQuestions, remainingQuestions, type Dataset, type Profile } from "permit-rulebook-data";
import { START_OVER, resumedLine } from "../src/lib/copy/interview.js";
import { questionCardHtml } from "../src/lib/question.js";
import { replayRecord } from "../src/lib/scope.js";
import { PHONE, type BrowserPage, type PageOnSite } from "../scripts/browser/browser.mjs";
import { InterviewPage } from "../scripts/interview-page/interview-page.mjs";
import { evaluateAtRest, openAtRest, withSite, skipReason, tapPencil } from "./browser-walk.js";
import { warnBuildNotTested, whyNoBuild } from "./why-no-build.js";

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
/** Why the built page cannot be read here, or null when it can. */
const noBuild = whyNoBuild("dist/");
if (noBuild) warnBuildNotTested("the resumed line in the built cold /", noBuild);

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

/** Opens the interview on a record of `profile`, unfinished, or cold where there is none, once it is at rest. */
async function openOnRecord(site: PageOnSite, profile: Profile | null): Promise<InterviewPage> {
  const interview = new InterviewPage(site);
  if (profile) await interview.seed(profile);
  await interview.open();
  await site.page.waitUntilAtRest();
  return interview;
}

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

  it.skipIf(noBuild !== null)("is not in the cold / HTML: nothing is known before paint", () => {
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

const skipped = skipReason();
if (skipped)
  process.stderr.write([
    "",
    `  !! THE CORRECTION WAS NOT WALKED IN A BROWSER: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join(String.fromCharCode(10)));

/**
 * In the page: where the reader is, read the way a reader would read it, the
 * question card aside: the masthead and the headline against the viewport,
 * the live region, what holds the focus, and the resumed line, as JSON.
 */
function readWhere(): string {
  const head = document.querySelector(".masthead-with-stamps");
  const h1 = document.getElementById("headline");
  const active = document.activeElement;
  const nameOf = (el: Element) => (el.id ? "#" + el.id : el.tagName + "." + (el.className || "").split(" ")[0]);
  const resumed = document.querySelector("#main .resumed");
  const resumedRestart = document.querySelector<HTMLElement>("#main .resumed #restart");
  return JSON.stringify({
    state: document.getElementById("app")!.dataset.state,
    scrollY: Math.round(window.scrollY),
    viewport: window.innerHeight,
    headTop: head ? Math.round(head.getBoundingClientRect().top) : null,
    h1Bottom: h1 ? Math.round(h1.getBoundingClientRect().bottom) : null,
    headline: h1 ? (h1.textContent ?? "").trim() : "",
    live: (document.getElementById("cstatus")!.textContent || "").trim(),
    active: active ? nameOf(active) : "",
    resumed: resumed ? (resumed.textContent ?? "").trim() : null,
    resumedRestart: resumedRestart ? !resumedRestart.hidden && getComputedStyle(resumedRestart).display !== "none" : false,
    restartsOnPage: document.querySelectorAll("#restart").length,
  });
}

/** Where the reader is, read in the page: the card's top edge against the viewport, and whether the focus is on the
 * card's first control, as the interview reads them, beside the rest. The first control is whatever the card offers
 * first — a button for a choice, the box for a search — and the card's heading where there is neither. */
async function where(page: BrowserPage): Promise<Where> {
  const stood = JSON.parse(await page.evaluate(`(${readWhere})()`)) as Omit<Where, "cardTop" | "firstShown" | "activeIsFirst" | "activeInCard">;
  const card = await new InterviewPage({ page }).readCardLayout();
  return {
    ...stood,
    cardTop: card ? Math.round(card.top) : null,
    firstShown: card?.focus.isFirstControlShown ?? false,
    activeIsFirst: card?.focus.isOnFirstControl ?? false,
    activeInCard: card?.focus.isInCard ?? false,
  };
}

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

/** The walk's last step: the first band the salary question offers other than the one held, so the verdict it
 * returns to must change. */
const ANOTHER_BAND = deriveQuestions(ds).find((q) => q.field === "salary_eur_year")!
  .options.find((o) => o.value !== finished.salary_eur_year)!.value;

/** The critique's walk: on a result, the salary row's ✎ tapped, and a different band answered. */
async function correction(site: PageOnSite) {
  const { page } = site;
  const interview = await openOnRecord(site, finished);
  const result = await where(page);
  // The critique's walk, on a result: the panel opened, the salary row scrolled to and its ✎ tapped.
  await tapPencil(page, "salary_eur_year", { scrollToRow: true });
  await page.waitUntilAtRest();
  const onQuestion = await where(page);
  await interview.answer("salary_eur_year", ANOTHER_BAND);
  const back = await where(page);
  return { result, onQuestion, back };
}

describe.skipIf(skipped !== null)("✎ on a result lands on the question and the answer returns to the verdict", () => {
  for (const [name, viewport, mobile] of [
    ["390x1400, the tall phone the critique measured", { width: 390, height: 1400 }, true],
    ["1240x900, where the panel is a sidebar", { width: 1240, height: 900 }, false],
  ] as const)
    it(`at ${name}`, async () => {
      const seen = await withSite(correction, { viewport, mobile });
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
    const seen = await withSite(async (site) => {
      const { page } = site;
      const interview = await openOnRecord(site, null);
      const steps: Where[] = [await where(page)];
      for (let i = 0; i < 3; i++) {
        // A choice: its first button. The country search does not come this
        // early on any path, and the focus rule for it is v0.7's (the caret in
        // the box, its text selected).
        await interview.answerFirstOffered();
        steps.push(await where(page));
      }
      return { steps };
    }, { viewport: { width: 1240, height: 900 }, mobile: false });
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
    await expectHalfDoneRecordSaysResumed();
  }, 180000);

  // A finished record's verdict is the first screen of a return too, and says
  // so over its body (#56, ruling 7).
  for (const [name, record, state, resumes] of [
    ["a cold /", null, "questions", false],
    ["a finished record, which restores to the verdict", finished, "results", true],
  ] as const)
    it(`is ${resumes ? "there, with the one Start over control," : "absent"} on ${name}`, async () => {
      const seen = await withSite(async (site) => {
        await openOnRecord(site, record);
        return where(site.page);
      }, PHONE);
      expect(seen.state).toBe(state);
      expect(seen.resumed !== null, `the resumed line is ${seen.resumed === null ? "missing" : "there"}`).toBe(resumes);
      expect(seen.resumedRestart).toBe(resumes);
      expect(seen.restartsOnPage).toBe(1);
    }, 180000);
});

/** Checks that a half-done record arrives with the resumed line and its count, which go after one answer, and its Start over clears the record. */
async function expectHalfDoneRecordSaysResumed(): Promise<void> {
  const seen = await withSite(async (site) => {
    const { page, url } = site;
    const interview = await openOnRecord(site, halfDone);
    const resumed = await where(page);
    // One answer on: the line was for the arrival, not for the screen after it.
    await interview.answerFirstOffered();
    const next = await where(page);
    // Start over from the resumed line: the same control the panel carries.
    await openAtRest(page, url("/"));
    await evaluateAtRest(page, 'document.querySelector("#main .resumed #restart").click()');
    const restarted = await where(page);
    const stored = await interview.readRecord();
    return { resumed, next, restarted, stored };
  }, PHONE);
  expect(seen.resumed.state).toBe("questions");
  // The count is the ledger's own: what the replay keeps of the record,
  // not what was stored (France never asks situation_country).
  const kept = replayRecord(ds, halfDone, Object.keys(halfDone)).order.length;
  expect(kept).toBe(3);
  expect(seen.resumed.resumed).toBe(`${resumedLine(kept)} ${START_OVER}`);
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
}
