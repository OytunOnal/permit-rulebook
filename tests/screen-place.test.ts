import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  SCREEN_PLACE_PHRASES, screenPlacePhrasesIn, textsCheckedForScreenPlace, type CheckedText, type Dataset,
} from "permit-rulebook-data";
import { routePages } from "../src/lib/route-page/route-page.js";
import { DEFAULT_PASSPORT, noticePassports, plainTextOf, resultsWhere, unknowingWalks, walks } from "./reader-pages.js";
import { everyDrawnRouteIn, verdictFor, withoutGlosses } from "./verdict-cards.js";

const ds = dataset as unknown as Dataset;

/** Markup a reader is shown, and where it was read. */
interface DrawnMarkup {
  where: string;
  html: string;
}

/** Each phrase of the declared screen-place set the markup carries, by where it was read. */
const screenPlacePhrasesOn = (markup: DrawnMarkup[]): string[] =>
  markup.flatMap(({ where, html }) => screenPlacePhrasesIn(plainTextOf(html)).map((phrase) => `${where}: ${phrase}`));

/** The texts the data's screen-place check reads that `holder` holds. */
const checkedTextsHeldBy = (holder: CheckedText["holder"]): string[] =>
  textsCheckedForScreenPlace(ds).filter((t) => t.holder === holder).map((t) => t.text);

/** The notices and route cards drawn at the end of every destination under
 * every situation: with a passport no Notice names, with each passport a
 * Notice names, and answering "I don't know" wherever a question offers it. */
function resultNoticesAndCards(): DrawnMarkup[] {
  const walksTaken = [...[DEFAULT_PASSPORT, ...noticePassports()].flatMap((passport) => walks(passport)), ...unknowingWalks()];
  return walksTaken.map((walk) => {
    const verdict = verdictFor(walk.answers);
    return { where: resultsWhere(walk), html: verdict.notices + everyDrawnRouteIn(verdict).map((r) => r.html).join("") };
  });
}

/**
 * No sentence a reader is shown points at a place on the screen
 * (OytunOnal/permit-rulebook#409): a route page has no answer, no questions
 * and no routes above or below it, so the dataset's words, drawn there and on
 * a result screen, carry no phrase of the set the data package declares.
 */
describe("the screens a reader sees point at no place on the screen", () => {
  it("finds no phrase of the declared set on any route page", () => {
    expect(SCREEN_PLACE_PHRASES.length, "a set to look for").toBeGreaterThan(0);
    const pages = routePages(ds).map((p) => ({ where: p.path, html: p.html }));
    expect(pages.length, "a page for every route").toBe(ds.countries.flatMap((c) => c.routes).length);
    expect(screenPlacePhrasesOn(pages)).toEqual([]);
  });

  it("finds no phrase of the declared set in the notices and route cards of the walks' results", () => {
    const noticesAndCards = resultNoticesAndCards();
    const drawnText = withoutGlosses(noticesAndCards.map((s) => s.html).join(""));
    expect(checkedTextsHeldBy("notice").filter((t) => !drawnText.includes(t)), "a notice's title or body the results never draw").toEqual([]);
    expect(checkedTextsHeldBy("statement").filter((t) => drawnText.includes(t)).length, "route statements the results draw").toBeGreaterThan(0);
    expect(screenPlacePhrasesOn(noticesAndCards)).toEqual([]);
  });
});
