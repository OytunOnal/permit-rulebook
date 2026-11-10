// @level presentation
import type { RouteResult } from "permit-rulebook-data";
import {
  closedRowHtml, composeStepTitle, fullCardHtml, notYetRowHtml, stepCardHtml, type CardLook, type VerdictScreen,
} from "./card/cards.js";
import type { Compared } from "./in-view.js";
import { stepKeyed } from "./layout.js";
import type { StepCard } from "./types.js";
import type { StepPlace, VerdictGroup, VerdictLayout } from "./verdict-layout.js";

/** Each card a verdict draws: each route's card or row markup by the route's
 * id, and each step's title and card markup by the id the layout gives it. */
export interface DrawnCards {
  routes: Record<string, string>;
  steps: Record<string, StepCard>;
}

/** What the cards are drawn on: the screen, the comparison the layout was
 * reckoned from, its results by route id, and the cards drawn so far. */
interface Drawing {
  screen: VerdictScreen;
  compared: Compared;
  results: Map<string, RouteResult>;
  cards: DrawnCards;
}

/** A route the layout places, from the comparison; one it does not hold is refused. */
function resultOf(at: Drawing, id: string): RouteResult {
  const r = at.results.get(id);
  if (!r) throw new Error(`the layout places ${id}, which the comparison does not hold`);
  return r;
}

function drawRoute(at: Drawing, id: string, html: (r: RouteResult) => string): void {
  if (Object.hasOwn(at.cards.routes, id)) throw new Error(`the layout places ${id} twice`);
  at.cards.routes[id] = html(resultOf(at, id));
}

/** A step's card, with the routes it opens in its section, in the order its
 * row lists them. */
function drawStep(at: Drawing, place: StepPlace): void {
  if (Object.hasOwn(at.cards.steps, place.id)) throw new Error(`the layout places the step ${place.id} twice`);
  const step = stepKeyed(at.compared.steps, place.step);
  const routes = step.unlock.routes.filter((r) => place.routes.includes(r.route.id));
  at.cards.steps[place.id] = { title: composeStepTitle(at.screen, step), html: stepCardHtml(at.screen, step, routes) };
}

/** One group's cards, as it lists them. */
function drawGroup(at: Drawing, group: VerdictGroup, chip: CardLook["chip"]): void {
  const { screen } = at;
  switch (group.kind) {
    case "open":
    case "within-reach":
      for (const id of group.routes) drawRoute(at, id, (r) => fullCardHtml(screen, r, { chip, badge: "status" }));
      return;
    case "unsettled":
      for (const id of group.routes) drawRoute(at, id, (r) => fullCardHtml(screen, r, { chip, badge: "rules-met" }));
      return;
    case "steps":
      for (const place of group.steps) drawStep(at, place);
      return;
    case "not-yet":
      for (const id of group.items.flatMap((item) => (typeof item === "string" ? [item] : item.routes)))
        drawRoute(at, id, (r) => notYetRowHtml(screen, r));
      return;
    case "closed":
      for (const id of group.routes) drawRoute(at, id, (r) => closedRowHtml(r, screen.glossary));
      return;
    case "arranged":
      return;
  }
}

/**
 * Every card the layout places, drawn in the order the screen lists them, so
 * a screen explains an abbreviation on its first use (human, 2026-09-08). On
 * the one-country layout a card carries its country's chip; a country's own
 * section names its country once, on its summary row.
 */
export function drawnCardsOf(screen: VerdictScreen, compared: Compared, layout: VerdictLayout): DrawnCards {
  const at: Drawing = {
    screen, compared, cards: { routes: {}, steps: {} },
    results: new Map([...compared.inView.results, ...compared.inView.closed].map((r) => [r.route.id, r])),
  };
  if (layout.kind === "one-country") for (const g of layout.groups) drawGroup(at, g, "country");
  if (layout.kind === "countries") for (const section of layout.sections) for (const g of section.groups) drawGroup(at, g, "none");
  return at.cards;
}

/** A route's drawn markup, by its id; one the verdict did not draw is refused. */
export function drawnRouteHtml(cards: DrawnCards, id: string): string {
  if (!Object.hasOwn(cards.routes, id)) throw new Error(`no card is drawn for ${id}`);
  return cards.routes[id]!;
}

/** The drawn markup of each route, by id, in the order given, joined. */
export const drawnRoutesHtml = (cards: DrawnCards, routes: string[]): string =>
  routes.map((id) => drawnRouteHtml(cards, id)).join("");

/** A step's drawn card, by its id; one the verdict did not draw is refused. */
export function drawnStepCard(cards: DrawnCards, id: string): StepCard {
  if (!Object.hasOwn(cards.steps, id)) throw new Error(`no step card is drawn for ${id}`);
  return cards.steps[id]!;
}
