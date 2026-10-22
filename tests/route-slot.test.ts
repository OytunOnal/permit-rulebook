import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  deriveQuestions, fillRouteSlots, hostKindOf, type Dataset, type Profile,
} from "permit-rulebook-data";
import { consolidatedTextOn } from "../src/lib/copy.js";
import { questionCardHtml } from "../src/lib/question.js";
import { routePage } from "../src/lib/route-page.js";
import { routeAddresses } from "../src/lib/slug.js";
import { builtPages, headingsOf, questionCards } from "./reader-pages.js";
import { blocksIn, cardOn, verdictOn } from "./verdict-cards.js";

const ds = dataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));

/**
 * #159 — a question names a route through its slot, which says what the route is.
 *
 * The dataset writes `{route:<route id>}` where a question names a route, and
 * the data package fills it. Wherever the site prints a question's label, help
 * or subject, it prints the filled text: the reader reads the route's country,
 * its name and what it is, and never the slot.
 */

/** The written form of a route slot, as the contract declares it. */
const SLOT_OPENING = "{route:";

/** The spouse question, which names the Opportunity Card. */
const SPOUSE = "partner_ck";

/** The spouse question's card, drawn by the renderer every question card is
 * drawn with: no walk of `questionCards` reaches the spouse question, so it
 * is drawn here on its own. */
const spouseCard = (): string => questionCardHtml({
  dataset: ds, question: deriveQuestions(ds).find((q) => q.field === SPOUSE)!,
  answers: {}, asked: [], editing: null, total: 10,
});

describe("the spouse question's card", () => {
  it("shows the slot filled", () => {
    const label = ds.fields.find((f) => f.id === SPOUSE)!.label;
    expect(label, "the spouse question names no route through a slot").toContain(SLOT_OPENING);
    expect(headingsOf(spouseCard())).toContain(fillRouteSlots(label, ds));
  });

  it("draws its learn link to the card's own page with its host's label", () => {
    const learn = ds.fields.find((f) => f.id === SPOUSE)!.learn!;
    const link = /<p class="qlearn">[\s\S]*?<a href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/.exec(spouseCard());
    expect(link, "the spouse card draws no learn link").not.toBeNull();
    expect(link![1]).toBe(learn.url);
    // An authority's page: the label as written, and no consolidated-text kind after it.
    expect(hostKindOf(learn.url)).toBe("authority");
    expect(link![2]).toBe(fillRouteSlots(learn.label, ds));
    expect(link![2]).not.toContain(consolidatedTextOn(new URL(learn.url).host.replace(/^www\./, "")));
  });
});

describe("no reader sees a route slot", () => {
  it("on any question card a walk meets", () => {
    const cards = questionCards();
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) expect(card.html, card.where).not.toContain(SLOT_OPENING);
  });

  it.skipIf(!existsSync(dist))("on any page the build draws", () => {
    for (const page of builtPages()) expect(page.html, page.where).not.toContain(SLOT_OPENING);
  });
});

/**
 * A written dataset whose shortage question names a route in its label and in
 * its help. The help is printed on the question card, in a results card's
 * learn box and on the route page's asks block; the label on the card and the
 * asks block.
 */
const SHORTAGE = "occupation_shortage";
const SLOT = `${SLOT_OPENING}de-chancenkarte}`;

function datasetWithShortageSlots(): Dataset {
  const slotted = JSON.parse(JSON.stringify(ds)) as Dataset;
  const field = slotted.fields.find((f) => f.id === SHORTAGE)!;
  field.label = `Is your occupation on the shortage list, which ${SLOT} does not read?`;
  field.learn!.label = `Check the shortage groups, which ${SLOT} does not read`;
  return slotted;
}

/** Deniz, unsure whether his occupation is on Germany's shortage list. */
const UNSURE: Profile = {
  destination: "de", citizenship: "TR", situation: "offer", situation_country: "de", qualification: "degree",
  recognition_de: "recognized", occupation_it: "no", occupation_shortage: "unknown", experience_5y: "lt2",
  experience_7y: "lt3", salary_eur_year: "band_0", german: "none", english: "none", funds_eur_month: "band_0",
  age_band: "a30to35", de_stay6m: "no", partner_ck: "no",
};

describe("a slot in a question's label or help is drawn filled", () => {
  const filled = fillRouteSlots(SLOT, ds);

  it("on its question card", () => {
    const slotted = datasetWithShortageSlots();
    const question = deriveQuestions(slotted).find((q) => q.field === SHORTAGE)!;
    const html = questionCardHtml({ dataset: slotted, question, answers: {}, asked: [], editing: null, total: 10 });
    expect(html).not.toContain(SLOT_OPENING);
    expect(html.split(filled).length - 1, "the label and the help, each filled").toBe(2);
  });

  it("in a results card's learn box", () => {
    const slotted = datasetWithShortageSlots();
    const html = blocksIn(cardOn(verdictOn(slotted, UNSURE), "de-blue-card-shortage"), "learn");
    expect(html, "the shortage card draws no learn box").not.toBe("");
    expect(html).not.toContain(SLOT_OPENING);
    expect(html).toContain(filled);
  });

  it("on the route page's asks block", () => {
    const slotted = datasetWithShortageSlots();
    const address = routeAddresses(slotted).find((a) => a.route.id === "de-blue-card-shortage")!;
    const { html } = routePage(slotted, address);
    expect(html).not.toContain(SLOT_OPENING);
    expect(html).toContain(filled);
  });
});
