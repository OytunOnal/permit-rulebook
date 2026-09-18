import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { WIDE_QUERY } from "../src/lib/first-paint.js";
import { STORAGE_KEY, serialize } from "../src/lib/record.js";

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
const dist = fileURLToPath(new URL("../dist", import.meta.url));

const { chromePath } = await import("../scripts/chrome.mjs");
const { serve, withBrowser } = await import("../scripts/browser.mjs");

function why(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}
const skipped = why();
if (skipped)
  process.stderr.write([
    "",
    `  !! THE QUESTION'S LANDING WAS NOT WALKED IN A BROWSER: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join(String.fromCharCode(10)));

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
  emulateMedia(features: { name: string; value: string }[]): Promise<void>;
  problems(): string[];
}

const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Where the reader is, read the way a reader would: the card's top against
 * the viewport, the header's height and the breath it keeps under itself,
 * what holds the focus, and which question is being asked. The page's frame
 * — header, masthead, ledger, main — is on every screen and read straight;
 * only the screen's own parts (the card, the strip) can be absent.
 */
const WHERE = `JSON.stringify((() => {
  const card = document.querySelector("#main .qcard");
  const first = card && (card.querySelector(".opt, #cfilter") || card.querySelector(".qlabel"));
  const head = document.querySelector(".site-head");
  const decl = document.getElementById("decl");
  const declBox = decl.getBoundingClientRect();
  const active = document.activeElement;
  return {
    state: document.getElementById("app").dataset.state,
    wide: matchMedia(${JSON.stringify(WIDE_QUERY)}).matches,
    scrollY: window.scrollY,
    viewport: window.innerHeight,
    cardTop: card ? card.getBoundingClientRect().top : null,
    cardLeft: card ? card.getBoundingClientRect().left : null,
    mainLeft: document.getElementById("main").getBoundingClientRect().left,
    mainTop: document.getElementById("main").getBoundingClientRect().top,
    declTop: declBox.top,
    declBottom: declBox.bottom,
    declLeft: declBox.left,
    declOpen: decl.open,
    answered: document.documentElement.dataset.answered !== undefined,
    mastheadTop: document.querySelector(".masthead-with-stamps").getBoundingClientRect().top,
    mastheadBottom: document.querySelector(".masthead-with-stamps").getBoundingClientRect().bottom,
    stripTop: (() => { const el = document.querySelector("#main .strip"); return el ? el.getBoundingClientRect().top : null; })(),
    headline: (document.getElementById("headline").textContent || "").trim(),
    headerHeight: head.getBoundingClientRect().height,
    gap: parseFloat(getComputedStyle(head).paddingBottom),
    question: card ? (card.querySelector(".qlabel")?.textContent || "").trim() : "",
    activeIsFirst: !!first && active === first,
    active: !active ? "" : active.id ? "#" + active.id : active.tagName + "." + (active.className || "").split(" ")[0],
  };
})())`;

interface Where {
  state: string;
  wide: boolean;
  scrollY: number;
  viewport: number;
  cardTop: number | null;
  cardLeft: number | null;
  mainLeft: number;
  mainTop: number;
  declTop: number;
  declBottom: number;
  declLeft: number;
  declOpen: boolean;
  answered: boolean;
  mastheadTop: number;
  mastheadBottom: number;
  /** The verdict's summary strip, the first thing of the result after the
   * notices; null on a question screen. */
  stripTop: number | null;
  headline: string;
  headerHeight: number;
  gap: number;
  question: string;
  activeIsFirst: boolean;
  active: string;
}

const where = async (page: BrowserPage): Promise<Where> => JSON.parse(await page.evaluate(WHERE)) as Where;

/** The first option of the question on the screen — a choice, never the
 * country search, which no path reaches this early. */
const TAP_FIRST = 'document.querySelector("#main .qcard .opt").click()';
/** The first option, then the reader's position read before the browser has
 * had a frame: what an instant landing leaves, and a smooth one does not. */
const TAP_FIRST_AND_READ = `(() => { ${TAP_FIRST}; return ${WHERE}; })()`;
const TAP_BACK = 'document.querySelector("#main #back").click()';
/** The reader reads on down the page before answering — a quarter of the
 * viewport, so the card's top is still on the screen and the browser has
 * something of theirs to bring back. */
const READ_ON = 'window.scrollBy({ top: Math.round(window.innerHeight / 4), behavior: "instant" })';

/** The question card's top sits one header and one gap under the viewport's
 * top — within the pixel the browser rounds a scroll to — and the ledger line
 * keeps its place above the card — its bottom at or above the card's top (amendment
 * 8: every answer had felt like arriving at *You declared*). */
function expectLanded(step: Where, label: string): void {
  expect(step.state, `${label}: left the interview`).toBe("questions");
  expect(step.cardTop, `${label}: no question card`).not.toBeNull();
  expect(step.declBottom, `${label}: the ledger (bottom ${step.declBottom}) is not above the card (${step.cardTop})`)
    .toBeLessThanOrEqual(step.cardTop!);
  const landing = step.headerHeight + step.gap;
  expect(
    Math.abs(step.cardTop! - landing),
    `${label}: the card's top is at ${step.cardTop} px, the landing is ${landing} px (scrollY ${step.scrollY})`,
  ).toBeLessThanOrEqual(1);
}

/** The ledger's ✎ on the first row, found by its field, never by its words —
 * opened first, the way a reader reaches it. */
const OPEN_AND_TAP_DESTINATION = `(() => {
  document.getElementById("decl").open = true;
  document.querySelector('#decl-list [data-field="destination"]').click();
})()`;

async function coldStart(page: BrowserPage, origin: (p: string) => string, settleMs = 1200): Promise<Where> {
  await page.goto(origin("/404.html"), 300);
  await page.evaluate("localStorage.clear()");
  await page.goto(origin("/"), settleMs);
  return where(page);
}

describe.skipIf(skipped !== null)("on a phone every question after the first comes up under the header", () => {
  for (const [name, viewport] of [
    ["390x844", { width: 390, height: 844 }],
    ["375x667, where a long first option was cut", { width: 375, height: 667 }],
  ] as const)
    it(`at ${name}: the first answer, the next, and Back`, async () => {
      const server = await serve(dist);
      try {
        const seen = await withBrowser(async (page: BrowserPage) => {
          const cold = await coldStart(page, server.url);
          await page.evaluate(TAP_FIRST);
          await settle(900);
          const first = await where(page);
          await page.evaluate(TAP_FIRST);
          await settle(900);
          const second = await where(page);
          await page.evaluate(TAP_BACK);
          await settle(900);
          const back = await where(page);
          // The reader reads on down the page, answers, and comes back: the
          // browser restores the scroll they LEFT the entry at, which is not
          // where the question is (Spec review, 2026-09-18: 622, card top
          // -177 at 390).
          await page.evaluate(READ_ON);
          const readOn = await where(page);
          await page.evaluate(TAP_FIRST);
          await settle(900);
          const third = await where(page);
          await page.evaluate(TAP_BACK);
          await settle(900);
          const backFromScrolled = await where(page);
          return { cold, first, second, back, readOn, third, backFromScrolled, problems: page.problems() };
        }, { viewport, mobile: true });
        expect(seen.problems).toEqual([]);
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
      } finally {
        server.close();
      }
    }, 180000);

  it("with reduced motion the landing is instant: final before the browser draws a frame", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        // The feature in CDP's own form (a name and a value, not a query), and
        // then the platform's query for it — spelled the way the page spells it
        // in its script, which declares it as a literal and exports nothing.
        // This only checks the harness applied the preference.
        await page.emulateMedia([{ name: "prefers-reduced-motion", value: "reduce" }]);
        const cold = await coldStart(page, server.url);
        const reduced = await page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches");
        const atOnce = JSON.parse(await page.evaluate(TAP_FIRST_AND_READ)) as Where;
        await settle(900);
        const later = await where(page);
        return { cold, reduced, atOnce, later, problems: page.problems() };
      }, { viewport: { width: 390, height: 844 }, mobile: true });
      expect(seen.problems).toEqual([]);
      expect(seen.reduced, "the browser did not take the reduced-motion preference").toBe(true);
      expectLanded(seen.atOnce, "in the same task as the tap");
      expect(seen.later.scrollY, "the page kept moving after the instant landing").toBe(seen.atOnce.scrollY);
    } finally {
      server.close();
    }
  }, 180000);
});

describe.skipIf(skipped !== null)("what does not change", () => {
  it("at 1280x900 an answer scrolls nothing: the card sits beside the ledger with room above it", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        const cold = await coldStart(page, server.url);
        await page.evaluate(TAP_FIRST);
        await settle(900);
        const first = await where(page);
        await page.evaluate(TAP_FIRST);
        await settle(900);
        const second = await where(page);
        return { cold, first, second, problems: page.problems() };
      }, { viewport: { width: 1280, height: 900 }, mobile: false });
      expect(seen.problems).toEqual([]);
      expect(seen.cold.wide, "the breakpoint reads this width as narrow").toBe(true);
      expect(seen.first.state).toBe("questions");
      expect(seen.first.scrollY, "the first answer moved a desktop reader").toBe(0);
      expect(seen.second.scrollY, "the second answer moved a desktop reader").toBe(0);
      expect(seen.first.activeIsFirst, `the focus is on ${seen.first.active || "nothing"}`).toBe(true);
    } finally {
      server.close();
    }
  }, 180000);

  it("at 1280x900 a ✎ correction keeps s20's rule: a card whose top is on the screen is not moved", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        const cold = await coldStart(page, server.url);
        await page.evaluate(TAP_FIRST);
        await settle(900);
        const answered = await where(page);
        // The reader reads a little way down — the card's top is still on the
        // screen — then reopens the first row from the ledger beside it.
        await page.evaluate(READ_ON);
        const before = await where(page);
        await page.evaluate(OPEN_AND_TAP_DESTINATION);
        await settle(900);
        const corrected = await where(page);
        return { cold, answered, before, corrected, problems: page.problems() };
      }, { viewport: { width: 1280, height: 900 }, mobile: false });
      expect(seen.problems).toEqual([]);
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
    } finally {
      server.close();
    }
  }, 180000);
});

describe.skipIf(skipped !== null)("Start over on a phone: the ledger goes back under the first question, the page stays", () => {
  /** A reader four answers in, the way s20 seeds one: their first screen
   * carries the resumed line, and Start over with it. */
  const halfDone = { destination: "fr", citizenship: "TR", situation: "offer", situation_country: "fr" };
  const SEED = `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${
    JSON.stringify(serialize(halfDone, Object.keys(halfDone)))})`;

  it("at 390x844", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/404.html"), 300);
        await page.evaluate(SEED);
        await page.goto(server.url("/"), 1600);
        const restored = await where(page);
        // The reader reads a little way down — the card's top stays on the
        // screen — then starts over from the resumed line.
        await page.evaluate(READ_ON);
        const before = await where(page);
        await page.evaluate('document.querySelector("#main .resumed #restart").click()');
        await settle(900);
        const reset = await where(page);
        return { restored, before, reset, problems: page.problems() };
      }, { viewport: { width: 390, height: 844 }, mobile: true });
      expect(seen.problems).toEqual([]);
      // With answers on the device the ledger line is above from the first
      // paint, and the first paint scrolls nothing.
      expect(seen.restored.answered).toBe(true);
      expect(seen.restored.declTop).toBeLessThan(seen.restored.cardTop!);
      expect(seen.restored.scrollY).toBe(0);
      expect(seen.before.cardTop!).toBeGreaterThan(0);
      expect(seen.before.cardTop!).toBeLessThan(seen.before.viewport);
      // Nothing declared any more: the flag is down, the question comes first
      // again (F8), and the page stands where the reader left it — s20's
      // reveal, the card's top being on the screen.
      expect(seen.reset.answered).toBe(false);
      expect(seen.reset.cardTop!, "the ledger did not go back under the question").toBeLessThan(seen.reset.declTop);
      expect(seen.reset.question).not.toBe(seen.restored.question);
      expect(seen.reset.scrollY, "Start over moved a page the reader could already see").toBe(seen.before.scrollY);
    } finally {
      server.close();
    }
  }, 180000);
});

describe.skipIf(skipped !== null)("a link the page does not know keeps the first paint's order on a phone", () => {
  it("at 390x844: ?country=zz brings no answer, and the ledger line stays where the head put it", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/404.html"), 300);
        await page.evaluate("localStorage.clear()");
        await page.goto(server.url("/?country=zz"), 1600);
        const landed = await where(page);
        const count = await page.evaluate('document.getElementById("decl-count").textContent');
        return { landed, count, problems: page.problems() };
      }, { viewport: { width: 390, height: 844 }, mobile: true });
      expect(seen.problems).toEqual([]);
      // The head wrote the flag for a link it cannot check; the module found
      // no answer in it. Its word stands for the first screen: the line above
      // question one says "nothing yet", which is true, and nothing moves
      // after the module lands (s10).
      expect(seen.landed.state).toBe("questions");
      expect(seen.landed.answered).toBe(true);
      expect(seen.landed.declTop).toBeLessThan(seen.landed.cardTop!);
      expect(seen.count).toBe("nothing yet");
    } finally {
      server.close();
    }
  }, 180000);
});

describe.skipIf(skipped !== null)("on a phone the ledger line sits above the result too (amendment 7)", () => {
  /** s20's finished reader: an offer in Germany, a Turkish passport, the
   * band just under the Blue Card line — a record that says it is done. */
  const finished = {
    destination: "de", situation: "offer", qualification: "degree", citizenship: "TR",
    occupation_shortage: "yes", recognition_de: "recognized", experience_5y: "lt2", experience_7y: "lt3",
    salary_eur_year: "band_4", german: "none", english: "none", funds_eur_month: "band_0",
  };
  const SEED = `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${
    JSON.stringify(serialize(finished, Object.keys(finished), true))})`;
  const OPEN_AND_TAP_SALARY = `(() => {
    document.getElementById("decl").open = true;
    document.querySelector('#decl-list [data-field="salary_eur_year"]').click();
  })()`;
  const ANSWER_ANOTHER_BAND = 'document.querySelector("#main .qcard .opt:not(.sel)").click()';

  async function verdictWalk(page: BrowserPage, origin: (p: string) => string) {
    await page.goto(origin("/404.html"), 300);
    await page.evaluate(SEED);
    await page.goto(origin("/"), 1600);
    const verdict = await where(page);
    await page.evaluate(OPEN_AND_TAP_SALARY);
    await settle(900);
    const corrected = await where(page);
    await page.evaluate(ANSWER_ANOTHER_BAND);
    await settle(900);
    const returned = await where(page);
    return { verdict, corrected, returned, problems: page.problems() };
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

  for (const [name, viewport] of [
    ["390x844", { width: 390, height: 844 }],
    ["375x667", { width: 375, height: 667 }],
  ] as const)
    it(`at ${name}: the verdict, ✎ from it, and the way back`, async () => {
      const server = await serve(dist);
      try {
        const seen = await withBrowser((page: BrowserPage) => verdictWalk(page, server.url), { viewport, mobile: true });
        expect(seen.problems).toEqual([]);
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
      } finally {
        server.close();
      }
    }, 180000);

  it("at 1280x900 the ledger stays beside the result", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser((page: BrowserPage) => verdictWalk(page, server.url), { viewport: { width: 1280, height: 900 }, mobile: false });
      expect(seen.problems).toEqual([]);
      for (const [label, step] of [["on arrival", seen.verdict], ["after the answer", seen.returned]] as const) {
        expect(step.state, label).toBe("results");
        expect(step.declLeft, `${label}: the ledger is not to the left of the result`).toBeLessThan(step.mainLeft);
        expect(Math.abs(step.declTop - step.mainTop), `${label}: the ledger is not level with the result`)
          .toBeLessThan(step.declBottom - step.declTop);
      }
    } finally {
      server.close();
    }
  }, 180000);
});

describe.skipIf(skipped !== null)("on a phone a correction lands too (amendment 6)", () => {
  for (const [name, viewport] of [
    ["390x844", { width: 390, height: 844 }],
    ["375x667", { width: 375, height: 667 }],
  ] as const)
    it(`at ${name}: the ledger opened, ✎ tapped — the ledger closes and lands, the question under it`, async () => {
      const server = await serve(dist);
      try {
        const seen = await withBrowser(async (page: BrowserPage) => {
          await coldStart(page, server.url);
          await page.evaluate(TAP_FIRST);
          await settle(900);
          const answered = await where(page);
          await page.evaluate(OPEN_AND_TAP_DESTINATION);
          await settle(900);
          const corrected = await where(page);
          return { answered, corrected, problems: page.problems() };
        }, { viewport, mobile: true });
        expect(seen.problems).toEqual([]);
        expect(seen.corrected.question, "the correction did not reopen the first question").not.toBe(seen.answered.question);
        expect(seen.corrected.declOpen, "the ledger stayed open above the reopened question").toBe(false);
        expectLanded(seen.corrected, "after ✎");
        expect(seen.corrected.activeIsFirst, `the focus is on ${seen.corrected.active || "nothing"}`).toBe(true);
      } finally {
        server.close();
      }
    }, 180000);
});
