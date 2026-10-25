import { describe, expect, it } from "vitest";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { fieldOptions, type Dataset, type Profile } from "permit-rulebook-data";
import {
  PHONE, QLABEL, fieldOnScreen, openCold, skipReason, tapOn, waitUntilPastTheBeat, warnNotWalked, withSite,
  type BrowserPage, type PageOnSite,
} from "./browser-walk.js";

/**
 * Every verdict is one entry in the browser's history (#177, ruling 4 on #55).
 *
 * The question screens write one entry each, and the verdict writes its own on
 * top of the last: Back from it lands on the last question answered, where the
 * reader can change it, and Forward returns to the verdict — on every layout.
 * Each layout is walked with the platform's own taps and keys, from a cold
 * start, so the history holds what a reader's does.
 */
const ds = rawDataset as unknown as Dataset;

const skipped = skipReason();
if (skipped) warnNotWalked("BACK AND FORWARD AROUND THE VERDICT", skipped);

/** An offer in Germany, answered to the end: the one-country layout. */
const oneCountry: Profile = {
  destination: "de", situation: "offer", qualification: "degree", citizenship: "TR",
  occupation_shortage: "yes", recognition_de: "recognized", experience_5y: "lt2", experience_7y: "lt3",
  salary_eur_year: "band_4", german: "none", english: "none", funds_eur_month: "band_0",
};
/** An explorer looking at all four: the several-country layout. */
const severalCountries: Profile = {
  destination: "all", situation: "none", qualification: "degree", citizenship: "TR",
  recognition_de: "recognized", nl_recent_grad: "no", top200_grad: "no", experience_5y: "lt2",
  experience_7y: "lt3", german: "none", english: "none", funds_eur_month: "band_0",
};
/** An EU passport: the notice answers the reader outright. */
const answeredOutright: Profile = {
  destination: "de", situation: "offer", qualification: "degree", citizenship: "IT",
};

const STATE = 'document.getElementById("app").dataset.state';
const ON_SEARCH = '!!document.querySelector("#main .qcard #cfilter")';

/** Answers the question on the screen as a reader does: a tap on the option,
 * or the option's name typed into the search and Enter. */
async function answerByHand(page: BrowserPage, field: string, value: string): Promise<void> {
  await waitUntilPastTheBeat(page);
  if (await page.evaluate(ON_SEARCH)) {
    const name = fieldOptions(ds, field).find((o) => o.value === value)?.label;
    if (!name) throw new Error(`${field} offers no ${value}`);
    await page.type(name);
    await page.pressEnter();
  } else {
    await tapOn(page, `#main .qcard .opt[data-value='${value}']`);
  }
  await page.waitUntilAtRest();
}

/** From a cold start, answers by hand until the verdict is drawn. Hands back
 * the fields answered, in order. */
async function walkToTheVerdict(site: PageOnSite, reader: Profile): Promise<string[]> {
  const { page } = site;
  await openCold(site);
  const asked: string[] = [];
  for (let i = 0; i < 30; i++) {
    if ((await page.evaluate(STATE)) === "results") return asked;
    const field = await fieldOnScreen(page);
    const value = reader[field];
    if (value === undefined) throw new Error(`the reader has no answer for ${field}`);
    await answerByHand(page, field, value);
    asked.push(field);
  }
  throw new Error(`the verdict never came; asked ${asked.join(", ")}`);
}

interface AroundTheVerdict {
  lastAnswered: string;
  afterBack: { state: string; field: string };
  afterForward: { state: string };
  problems: string[];
}

/** Which screen the interview is on, and its question. */
const SCREEN = `${STATE} + " " + ${QLABEL}`;

/** The screen a history move draws: once the browser has taken its turn and
 * the screen is another, at rest. */
async function screenAfterMove(page: BrowserPage, move: () => Promise<void>): Promise<{ state: string; field: string }> {
  const before = await page.evaluate(SCREEN);
  await move();
  await page.waitUntil(`${SCREEN} !== ${JSON.stringify(before)}`, `the history move left "${before}" on the screen`);
  await page.waitUntilAtRest();
  const state = await page.evaluate(STATE);
  return { state, field: state === "questions" ? await fieldOnScreen(page) : "" };
}

async function backAndForward(reader: Profile): Promise<AroundTheVerdict> {
  return withSite(async (site) => {
    const { page } = site;
    const asked = await walkToTheVerdict(site, reader);
    const afterBack = await screenAfterMove(page, () => page.back());
    const afterForward = await screenAfterMove(page, () => page.forward());
    return { lastAnswered: asked.at(-1)!, afterBack, afterForward, problems: page.problems() };
  }, PHONE);
}

function expectBackLandsOnTheLastAnswer(seen: AroundTheVerdict): void {
  expect(seen.problems).toEqual([]);
  expect(seen.afterBack.state, "Back left the verdict for no question").toBe("questions");
  expect(seen.afterBack.field, "Back skipped the last question answered").toBe(seen.lastAnswered);
  expect(seen.afterForward.state, "Forward did not return to the verdict").toBe("results");
}

describe.skipIf(skipped !== null)("every verdict is one history entry (#177)", () => {
  it("on one country, Back lands on the last question answered and Forward returns to the verdict", async () => {
    expectBackLandsOnTheLastAnswer(await backAndForward(oneCountry));
  }, 180000);

  it("on several countries, Back lands on the last question answered and Forward returns to the verdict", async () => {
    expectBackLandsOnTheLastAnswer(await backAndForward(severalCountries));
  }, 180000);

  it("on a notice that answers outright, Back lands on the last question answered and Forward returns to it", async () => {
    expectBackLandsOnTheLastAnswer(await backAndForward(answeredOutright));
  }, 180000);
});
