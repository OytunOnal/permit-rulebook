import { describe, expect, it } from "vitest";
import type { Profile } from "permit-rulebook-data";
import { STORAGE_KEY, serialize } from "../src/lib/record.js";
import {
  DESK, PHONE, fieldOnScreen, settle, skipReason, tapOn, warnNotWalked, withSite, type BrowserPage, type PageOnSite,
} from "./browser-walk.js";

/**
 * #215 — Start over lands at the top and arrives again, and a returned-to
 * verdict says it is from earlier (P8/P9, F11), in a real browser: the scroll,
 * the focus and the drawn lines. What each gesture decides is
 * `interviewAfter`'s, walked in Node (`interview.test.ts`).
 */
const skipped = skipReason();
if (skipped) warnNotWalked("START OVER AND THE RETURN", skipped);

/** s20's finished persona: an offer in Germany, a Turkish passport, every question answered. */
const FINISHED_IN_GERMANY: Profile = {
  destination: "de", situation: "offer", qualification: "degree", citizenship: "TR",
  occupation_shortage: "yes", recognition_de: "recognized", experience_5y: "lt2", experience_7y: "lt3",
  salary_eur_year: "band_4", german: "none", english: "none", funds_eur_month: "band_0",
};
const SEED_FINISHED = `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${
  JSON.stringify(serialize(FINISHED_IN_GERMANY, Object.keys(FINISHED_IN_GERMANY), true))})`;

/** Where the reader stands: the screen, the scroll, the focus, the lines over the body, and the record. */
const WHERE = `JSON.stringify((() => {
  const card = document.querySelector("#main .qcard");
  const first = card && card.querySelector(".opt, #cfilter");
  const stored = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
  return {
    state: document.getElementById("app").dataset.state,
    scrollY: Math.round(window.scrollY),
    focusOnFirst: !!first && document.activeElement === first,
    resumed: !!document.querySelector("#main .resumed"),
    resumedHoldsRestart: !!document.querySelector("#main .resumed #restart"),
    arrivalLine: !!document.querySelector("#main .qcard p.recorded"),
    storedAnswers: stored ? JSON.parse(stored).answers : null,
  };
})())`;

interface Where {
  state: string;
  scrollY: number;
  focusOnFirst: boolean;
  resumed: boolean;
  resumedHoldsRestart: boolean;
  arrivalLine: boolean;
  storedAnswers: Profile | null;
}

const where = async (page: BrowserPage): Promise<Where> => JSON.parse(await page.evaluate(WHERE)) as Where;

/** The page once Start over has drawn a question and the scroll has come to rest, smooth or not. */
async function settledAfterStartOver(page: BrowserPage): Promise<Where> {
  let last = await where(page);
  for (let tries = 0; tries < 40; tries++) {
    await settle(100);
    const now = await where(page);
    if (now.state === "questions" && now.scrollY === last.scrollY) return now;
    last = now;
  }
  throw new Error(`Start over did not come to rest: ${JSON.stringify(last)}`);
}

/** A kept finished record opened at `path`: the verdict, the first screen of a return. */
async function openOnKeptVerdict({ page, url }: PageOnSite, path: string): Promise<Where> {
  await page.goto(url("/404.html"), 300);
  await page.evaluate(SEED_FINISHED);
  await page.goto(url(path), 1200);
  return where(page);
}

/** From the verdict's foot, Start over pressed with the keyboard, where it stands, without scrolling to it. */
const PRESS_START_OVER_FROM_THE_FOOT = `(() => {
  const restart = document.getElementById("restart");
  const fold = restart.closest("details");
  if (fold) fold.open = true;
  window.scrollTo(0, document.documentElement.scrollHeight);
  restart.focus({ preventScroll: true });
  return document.activeElement === restart ? "focused" : "not focused";
})()`;

describe.skipIf(skipped !== null)("Start over lands at the page's top (P8/P9)", () => {
  for (const [name, screen] of [["390", PHONE], ["1280", DESK]] as const)
    it(`at ${name}, from the foot of a verdict: scrollY is 0 and the focus is on the first control`, async () => {
      const seen = await withSite(async (site) => {
        const verdict = await openOnKeptVerdict(site, "/");
        const focused = await site.page.evaluate(PRESS_START_OVER_FROM_THE_FOOT);
        await settle(300);
        const atFoot = await where(site.page);
        await site.page.pressEnter();
        return { verdict, focused, atFoot, after: await settledAfterStartOver(site.page), problems: site.page.problems() };
      }, screen);
      expect(seen.problems).toEqual([]);
      expect(seen.verdict.state, "precondition: the kept record opens on the verdict").toBe("results");
      expect(seen.focused, "precondition: Start over took the focus").toBe("focused");
      expect(seen.atFoot.scrollY, "precondition: the reader stands at the verdict's foot").toBeGreaterThan(0);
      expect(seen.after.scrollY, "Start over left the page mid-way").toBe(0);
      expect(seen.after.focusOnFirst, "the focus is not on the first control").toBe(true);
      expect(seen.after.storedAnswers, "the record outlived Start over").toBeNull();
    }, 120000);
});

describe.skipIf(skipped !== null)("a kept verdict at a country's address, and Start over there (F11)", () => {
  it("from /?country=de: the resumed line is drawn, and Start over asks the question after the destination", async () => {
    const seen = await withSite(async (site) => {
      const returned = await openOnKeptVerdict(site, "/?country=de");
      await tapOn(site.page, "#restart");
      const restarted = await settledAfterStartOver(site.page);
      return { returned, restarted, field: await fieldOnScreen(site.page), problems: site.page.problems() };
    }, DESK);
    expect(seen.problems).toEqual([]);
    expect(seen.returned.state, "precondition: the kept record opens on the verdict").toBe("results");
    expect(seen.returned.resumed, "the returned-to verdict does not say it is from earlier").toBe(true);
    expect(seen.returned.resumedHoldsRestart, "the resumed line does not end in Start over").toBe(true);
    expect(seen.field, "Start over did not arrive again in Germany").toBe("situation");
    expect(seen.restarted.arrivalLine, "the arrival line is missing").toBe(true);
    expect(seen.restarted.resumed).toBe(false);
    expect(seen.restarted.storedAnswers, "the record before Start over outlived it").toEqual({ destination: "de" });
  }, 120000);
});
