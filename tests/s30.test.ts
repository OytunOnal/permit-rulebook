import { describe, expect, it } from "vitest";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { deriveQuestions, type Dataset, type Profile } from "permit-rulebook-data";
import { DESK, PHONE, type BrowserPage, type PageOnSite } from "../scripts/browser/browser.mjs";
import { InterviewPage } from "../scripts/interview-page/interview-page.mjs";
import { QLABEL, answerWith, evaluateAtRest, fieldOnScreen, skipReason, warnNotWalked, withSite } from "./browser-walk.js";
import { TAP_FIRST_AND_READ, expectLanded, where, type Where } from "./question-landing.js";

/**
 * s30 — on a phone the next question comes up to meet the reader.
 *
 * Every question after the first is drawn 445 px down the page on a phone —
 * under the header, the headline, the subline and the stamp — with its first
 * option at 550. At 844 the second option is often out of sight; at 667 a long
 * first option is cut. The reader tapped an answer and had to scroll to find
 * the question they were asked (v1.1 gate critique, P10; measured on the live
 * site 2026-09-17 at 390×844 and 375×667). s20's `reveal` never fired: it
 * scrolls only when the card's *top* is off the screen, and the top was on it.
 *
 * The cases below read the card's top edge against the viewport after each
 * gesture, and compare it with the header's own measured height and the gap
 * the header keeps under itself — never a typed number. Narrow and wide are
 * the site's own breakpoint, `WIDE_QUERY`, as `matchMedia` reads it.
 *
 * Amendment 6 (the human's walk of the trial): once the reader has answered,
 * the ledger line stands above the question on a phone, and it is the line
 * that lands under the header with the question under it; the first question
 * keeps F8's order. And a correction lands too — with the ledger open above
 * the card the reopened question sat below it and s20's reveal did nothing.
 */

const ds = rawDataset as unknown as Dataset;
const skipped = skipReason();
if (skipped) warnNotWalked("THE QUESTION'S LANDING", skipped);

/** The first answer the question on `field` offers, other than `held` where one is held. */
function firstOptionOf(field: string, held?: string): string {
  return deriveQuestions(ds).find((q) => q.field === field)!.options.find((o) => o.value !== held)!.value;
}

/** Answers the question on the screen with its first option — a choice,
 * never the country search, which no path reaches this early. */
async function answerFirstOption(page: BrowserPage): Promise<void> {
  const field = await fieldOnScreen(page);
  await new InterviewPage({ page }).answer(field, firstOptionOf(field));
}

// The screen's Back control, tapped.
const TAP_BACK = 'document.querySelector("#main #back").click()';

/** The screen's Back: a history move, drawn on the browser's turn rather than
 * the tap's, so waited on until the question it leaves is gone, then at rest. */
async function pressBack(page: BrowserPage): Promise<void> {
  const { question: left } = await new InterviewPage({ page }).readScreen();
  await page.evaluate(TAP_BACK);
  await page.waitUntil(`${QLABEL} !== ${JSON.stringify(left)}`, "Back never left the question");
  await page.waitUntilAtRest();
}
/** The reader reads on down the page before answering — a quarter of the
 * viewport, so the card's top is still on the screen and the browser has
 * something of theirs to bring back. */
const READ_ON = 'window.scrollBy({ top: Math.round(window.innerHeight / 4), behavior: "instant" })';

/** In the page: the ledger's ✎ on `field`'s row, found by its field, never by
 * its words — opened first, the way a reader reaches it. */
function openAndTapPencil(field: string): void {
  (document.getElementById("decl") as HTMLDetailsElement).open = true;
  document.querySelector<HTMLElement>(`#decl-list [data-field="${field}"]`)!.click();
}
/** The ledger's ✎ on the first row: the gesture a case evaluates. */
const OPEN_AND_TAP_DESTINATION = `(${openAndTapPencil})("destination")`;

/** Opens the interview on a record of `answers`, or cold where there is none,
 * and reads where the reader is once it is at rest. */
async function openOn(site: PageOnSite, answers: Profile | null, options?: { done: boolean }): Promise<Where> {
  const interview = new InterviewPage(site);
  if (answers) await interview.seed(answers, options);
  await interview.open();
  await site.page.waitUntilAtRest();
  return where(site.page);
}

/** From a cold start: two answers, Back, reading on, a third answer and Back
 * again, and where the reader stood after each. */
async function answerAndGoBack(site: PageOnSite) {
  const { page } = site;
  const cold = await openOn(site, null);
  await answerFirstOption(page);
  const first = await where(page);
  await answerFirstOption(page);
  const second = await where(page);
  await pressBack(page);
  const back = await where(page);
  // The reader reads on down the page, answers, and comes back: the
  // browser restores the scroll they LEFT the entry at, which is not
  // where the question is (Spec review, 2026-09-18: 622, card top
  // -177 at 390).
  await page.evaluate(READ_ON);
  const readOn = await where(page);
  await answerFirstOption(page);
  const third = await where(page);
  await pressBack(page);
  const backFromScrolled = await where(page);
  return { cold, first, second, back, readOn, third, backFromScrolled };
}

describe.skipIf(skipped !== null)("on a phone every question after the first comes up under the header", () => {
  for (const [name, viewport] of [
    ["390x844", { width: 390, height: 844 }],
    ["375x667, where a long first option was cut", { width: 375, height: 667 }],
  ] as const)
    it(`at ${name}: the first answer, the next, and Back`, async () => {
      const seen = await withSite(answerAndGoBack, { viewport, mobile: true });
      expect(seen.cold.wide, "the breakpoint reads this width as wide").toBe(false);
      // The first paint is not a gesture: the cold load scrolls nothing, and
      // with nothing declared the question comes first (F8).
      expect(seen.cold.scrollY).toBe(0);
      expect(seen.cold.cardTop!, "with nothing declared the ledger is above the question").toBeLessThan(seen.cold.declTop);

      expectLanded(seen.first, "after the first answer");
      expect(seen.first.question).not.toBe(seen.cold.question);
      expectLanded(seen.second, "after the second answer");
      expect(seen.second.question).not.toBe(seen.first.question);
      expectLanded(seen.back, "after Back");
      expect(seen.back.question, "Back did not return to the question before").toBe(seen.first.question);

      expect(seen.readOn.scrollY, "reading on did not move the page").toBeGreaterThan(seen.back.scrollY);
      expectLanded(seen.third, "after the answer that followed reading on");
      expectLanded(seen.backFromScrolled, "after Back to an entry the reader had scrolled on");
      expect(seen.backFromScrolled.question).toBe(seen.back.question);

      // The focus behaviour does not change: the first control holds it,
      // and the page moved once to get there.
      for (const [label, step] of [
        ["first answer", seen.first], ["second answer", seen.second], ["Back", seen.back],
        ["third answer", seen.third], ["Back from a scrolled entry", seen.backFromScrolled],
      ] as const)
        expect(step.activeIsFirst, `after the ${label} the focus is on ${step.active || "nothing"}`).toBe(true);
    }, 180000);
});

describe.skipIf(skipped !== null)("on a phone every question after the first comes up under the header", () => {
  it("with reduced motion the landing is instant: final before the browser draws a frame", async () => {
    const seen = await withSite(async (site) => {
      const { page } = site;
      // The feature in CDP's own form (a name and a value, not a query), and
      // then the platform's query for it — spelled the way the page spells it
      // in its script, which declares it as a literal and exports nothing.
      // This only checks the harness applied the preference.
      await page.emulateMedia([{ name: "prefers-reduced-motion", value: "reduce" }]);
      const cold = await openOn(site, null);
      const reduced = await page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches");
      // Read again once the page is at rest: whatever would still move has
      // moved by then, so a landing that kept going is caught.
      const atOnce = JSON.parse(await answerWith(page, TAP_FIRST_AND_READ)) as Omit<Where, "question">;
      const later = await where(page);
      return { cold, reduced, atOnce, later };
    }, PHONE);
    expect(seen.reduced, "the browser did not take the reduced-motion preference").toBe(true);
    expectLanded(seen.atOnce, "in the same task as the tap");
    expect(seen.later.scrollY, "the page kept moving after the instant landing").toBe(seen.atOnce.scrollY);
  }, 180000);
});

describe.skipIf(skipped !== null)("what does not change", () => {
  it("at 1280x900 an answer scrolls nothing: the card sits beside the ledger with room above it", async () => {
    const seen = await withSite(async (site) => {
      const cold = await openOn(site, null);
      await answerFirstOption(site.page);
      const first = await where(site.page);
      await answerFirstOption(site.page);
      const second = await where(site.page);
      return { cold, first, second };
    }, DESK);
    expect(seen.cold.wide, "the breakpoint reads this width as narrow").toBe(true);
    expect(seen.first.state).toBe("questions");
    expect(seen.first.scrollY, "the first answer moved a desktop reader").toBe(0);
    expect(seen.second.scrollY, "the second answer moved a desktop reader").toBe(0);
    expect(seen.first.activeIsFirst, `the focus is on ${seen.first.active || "nothing"}`).toBe(true);
  }, 180000);
});

describe.skipIf(skipped !== null)("what does not change", () => {
  it("at 1280x900 a ✎ correction keeps s20's rule: a card whose top is on the screen is not moved", async () => {
    const seen = await withSite(async (site) => {
      const { page } = site;
      const cold = await openOn(site, null);
      await answerFirstOption(page);
      const answered = await where(page);
      // The reader reads a little way down — the card's top is still on the
      // screen — then reopens the first row from the ledger beside it.
      await page.evaluate(READ_ON);
      const before = await where(page);
      await evaluateAtRest(page, OPEN_AND_TAP_DESTINATION);
      const corrected = await where(page);
      return { cold, answered, before, corrected };
    }, DESK);
    // The ledger is beside the card, before and after an answer: the order
    // the grid gives a wide screen does not change.
    for (const [label, step] of [["cold", seen.cold], ["after an answer", seen.answered]] as const) {
      expect(step.declLeft, `${label}: the ledger is not to the left of the card`).toBeLessThan(step.cardLeft!);
      expect(Math.abs(step.declTop - step.cardTop!), `${label}: the ledger is not beside the card`)
        .toBeLessThan(step.declBottom - step.declTop);
    }
    expect(seen.before.cardTop!).toBeGreaterThan(0);
    expect(seen.before.cardTop!).toBeLessThan(seen.before.viewport);
    expect(seen.corrected.state).toBe("questions");
    expect(seen.corrected.question, "the correction did not reopen the first question").not.toBe(seen.answered.question);
    // s20: the card is revealed only when its top is off the screen. It was
    // on it, so the page stands where the reader left it.
    expect(seen.corrected.scrollY, "a correction moved a card the reader could already see").toBe(seen.before.scrollY);
    expect(seen.corrected.activeIsFirst, `the focus is on ${seen.corrected.active || "nothing"}`).toBe(true);
  }, 180000);
});

describe.skipIf(skipped !== null)("Start over on a phone: the ledger goes back under the first question, the page to its top", () => {
  /** A reader four answers in, the way s20 seeds one: their first screen
   * carries the resumed line, and Start over with it. */
  const halfDone = { destination: "fr", citizenship: "TR", situation: "offer", situation_country: "fr" };

  it("at 390x844", async () => {
    const seen = await withSite(async (site) => {
      const { page } = site;
      const restored = await openOn(site, halfDone);
      // The reader reads a little way down — the card's top stays on the
      // screen — then starts over from the resumed line.
      await page.evaluate(READ_ON);
      const before = await where(page);
      await evaluateAtRest(page, 'document.querySelector("#main .resumed #restart").click()');
      const reset = await where(page);
      return { restored, before, reset };
    }, PHONE);
    // With answers on the device the ledger line is above from the first
    // paint, and the first paint scrolls nothing.
    expect(seen.restored.answered).toBe(true);
    expect(seen.restored.declTop).toBeLessThan(seen.restored.cardTop!);
    expect(seen.restored.scrollY).toBe(0);
    expect(seen.before.cardTop!).toBeGreaterThan(0);
    expect(seen.before.cardTop!).toBeLessThan(seen.before.viewport);
    // Nothing declared any more: the seed is down, the question comes first
    // again (F8), and the page opens at its top, as a first visit does (#56).
    expect(seen.before.scrollY, "precondition: the reader read on").toBeGreaterThan(0);
    expect(seen.reset.answered).toBe(false);
    expect(seen.reset.cardTop!, "the ledger did not go back under the question").toBeLessThan(seen.reset.declTop);
    expect(seen.reset.question).not.toBe(seen.restored.question);
    expect(seen.reset.scrollY, "Start over left the page mid-way").toBe(0);
  }, 180000);
});

describe.skipIf(skipped !== null)("a link the page does not know keeps the first paint's order on a phone", () => {
  it("at 390x844: ?country=zz brings no answer, and the ledger line stays where the head put it", async () => {
    const seen = await withSite(async (site) => {
      const { page } = site;
      await new InterviewPage(site).open("/?country=zz");
      await page.waitUntilAtRest();
      const landed = await where(page);
      const count = await page.evaluate('document.getElementById("decl-count").textContent');
      return { landed, count };
    }, PHONE);
    // The head wrote the seed for a link it cannot check; the module found
    // no answer in it. Its word stands for the first screen: the line above
    // question one says "nothing yet", which is true, and nothing moves
    // after the module lands (s10).
    expect(seen.landed.state).toBe("questions");
    expect(seen.landed.answered).toBe(true);
    expect(seen.landed.declTop).toBeLessThan(seen.landed.cardTop!);
    expect(seen.count).toBe("nothing yet");
  }, 180000);
});

/** s20's finished reader: an offer in Germany, a Turkish passport, the
 * band just under the Blue Card line — a record that says it is done. */
const finished = {
  destination: "de", situation: "offer", qualification: "degree", citizenship: "TR",
  occupation_shortage: "yes", recognition_de: "recognized", experience_5y: "lt2", experience_7y: "lt3",
  salary_eur_year: "band_4", german: "none", english: "none", funds_eur_month: "band_0",
};

/** The finished reader's verdict, ✎ on the salary row from it, and another band answered: where the reader stood
 * after each. */
async function verdictWalk(site: PageOnSite) {
  const { page } = site;
  const verdict = await openOn(site, finished, { done: true });
  await evaluateAtRest(page, `(${openAndTapPencil})("salary_eur_year")`);
  const corrected = await where(page);
  await new InterviewPage(site).answer("salary_eur_year", firstOptionOf("salary_eur_year", finished.salary_eur_year));
  const returned = await where(page);
  return { verdict, corrected, returned };
}

/** The line under the masthead and above the strip: the way back to any
 * answer is at the top of the verdict, not after every card. */
function expectLedgerAboveResult(step: Where, label: string): void {
  expect(step.state, `${label}: not a verdict`).toBe("results");
  expect(step.stripTop, `${label}: no summary strip`).not.toBeNull();
  expect(step.declTop, `${label}: the ledger (${step.declTop}) is not under the masthead (bottom ${step.mastheadBottom})`)
    .toBeGreaterThanOrEqual(step.mastheadBottom);
  expect(step.declBottom, `${label}: the ledger (bottom ${step.declBottom}) is not above the strip (${step.stripTop})`)
    .toBeLessThanOrEqual(step.stripTop!);
}

describe.skipIf(skipped !== null)("on a phone the ledger line sits above the result too (amendment 7)", () => {
  for (const [name, viewport] of [
    ["390x844", { width: 390, height: 844 }],
    ["375x667", { width: 375, height: 667 }],
  ] as const)
    it(`at ${name}: the verdict, ✎ from it, and the way back`, async () => {
      const seen = await withSite(verdictWalk, { viewport, mobile: true });
      expect(seen.verdict.answered).toBe(true);
      expectLedgerAboveResult(seen.verdict, "on arrival");
      // ✎ from the verdict: the correction landing (amendment 6).
      expect(seen.corrected.declOpen).toBe(false);
      expectLanded(seen.corrected, "after ✎ from the verdict");
      expect(seen.corrected.activeIsFirst, `the focus is on ${seen.corrected.active || "nothing"}`).toBe(true);
      // The new band: the verdict re-drawn, on its masthead (s20's return),
      // the ledger still above the result. Whether the band changes the
      // headline is the dataset's business, not this test's.
      expect(seen.returned.state).toBe("results");
      expect(seen.returned.headline).not.toBe("");
      // Rounded the way s20's own reading is: `scrollIntoView` lands a
      // sub-pixel short of the edge at 2x.
      expect(Math.round(seen.returned.mastheadTop), `the masthead's top is at ${seen.returned.mastheadTop} (scrollY ${seen.returned.scrollY})`)
        .toBeGreaterThanOrEqual(0);
      expectLedgerAboveResult(seen.returned, "after the answer");
    }, 180000);

  it("at 1280x900 the ledger stays beside the result", async () => {
    const seen = await withSite(verdictWalk, DESK);
    for (const [label, step] of [["on arrival", seen.verdict], ["after the answer", seen.returned]] as const) {
      expect(step.state, label).toBe("results");
      expect(step.declLeft, `${label}: the ledger is not to the left of the result`).toBeLessThan(step.mainLeft);
      expect(Math.abs(step.declTop - step.mainTop), `${label}: the ledger is not level with the result`)
        .toBeLessThan(step.declBottom - step.declTop);
    }
  }, 180000);
});

describe.skipIf(skipped !== null)("on a phone a correction lands too (amendment 6)", () => {
  for (const [name, viewport] of [
    ["390x844", { width: 390, height: 844 }],
    ["375x667", { width: 375, height: 667 }],
  ] as const)
    it(`at ${name}: the ledger opened, ✎ tapped — the ledger closes and lands, the question under it`, async () => {
      const seen = await withSite(async (site) => {
        const { page } = site;
        await openOn(site, null);
        await answerFirstOption(page);
        const answered = await where(page);
        await evaluateAtRest(page, OPEN_AND_TAP_DESTINATION);
        const corrected = await where(page);
        return { answered, corrected };
      }, { viewport, mobile: true });
      expect(seen.corrected.question, "the correction did not reopen the first question").not.toBe(seen.answered.question);
      expect(seen.corrected.declOpen, "the ledger stayed open above the reopened question").toBe(false);
      expectLanded(seen.corrected, "after ✎");
      expect(seen.corrected.activeIsFirst, `the focus is on ${seen.corrected.active || "nothing"}`).toBe(true);
    }, 180000);
});
