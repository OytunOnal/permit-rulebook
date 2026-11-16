import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import { routeStatements, type Dataset, type Profile } from "permit-rulebook-data";
import { routePages } from "../src/lib/route-page/route-page.js";
import { routeOf } from "./route-of.js";
import { drawnRouteOn, verdictFor, withoutGlosses } from "./verdict-cards.js";

const ds = dataset as unknown as Dataset;

// The route whose caveat the IND writes about Turkish passports alone.
const ORIENTATION_YEAR = "nl-orientation-year";

/** The orientation year's caveat about Turkish passports, as the dataset
 * writes it. */
const turkishCaveat = (): string =>
  routeStatements(routeOf(ds, ORIENTATION_YEAR))
    .find((s) => s.id === "turkish-citizens-differ")!.text;

/** A graduate of a Dutch university looking for work in the Netherlands,
 * with the passport these answers name, or none declared. */
const graduate = (passport?: string): Profile => ({
  destination: "nl", situation: "offer", nl_recent_grad: "yes",
  ...(passport ? { citizenship: passport } : {}),
});

/** The orientation year's card on this reader's verdict, read without the
 * explainers. */
const cardFor = (answers: Profile): string => withoutGlosses(drawnRouteOn(verdictFor(answers), ORIENTATION_YEAR));

/**
 * A Passport-only statement on the screens a reader sees
 * (OytunOnal/permit-rulebook#407): the IND's caveat about Turkish passports
 * reaches a Turkish reader and a reader who has not said which passport they
 * hold, never a reader who declared another one; the route page, which has no
 * reader, shows it to everyone.
 */
describe("the orientation year's caveat about Turkish passports", () => {
  it("is not on a Brazilian reader's card", () => {
    expect(cardFor(graduate("BR"))).not.toContain(turkishCaveat());
  });

  it("is on a Turkish reader's card", () => {
    expect(cardFor(graduate("TR"))).toContain(turkishCaveat());
  });

  it("is on the card of a reader who has not declared a passport", () => {
    expect(cardFor(graduate())).toContain(turkishCaveat());
  });

  it("is on the orientation-year route page", () => {
    const pages = routePages(ds).filter((p) => p.path.includes("/orientation-year"));
    expect(pages.length).toBe(1);
    expect(withoutGlosses(pages[0]!.html)).toContain(turkishCaveat());
  });
});
