// @level presentation
import type { RouteResult } from "permit-rulebook-data";
import {
  closedRowHtml, composeStepTitle, fullCardHtml, notYetRowHtml, stepCardHtml, type CardLook, type VerdictScreen,
} from "./card/cards.js";
import { stepKeyed, type Compared, type StepPlace, type VerdictGroup, type VerdictLayout } from "../reckon/reckon-verdict.js";

/** A step as the steps group offers it: its title, and its card's markup. */
export interface StepCard {
  title: string;
  html: string;
}

/** Each card a verdict draws: each route's card or row markup by the route's
 * id, and each step's title and card markup by the id the layout gives it. */
export interface DrawnCards {
  routes: Record<string, string>;
  steps: Record<string, StepCard>;
}

/** What the cards are drawn on: the screen, the comparison the layout was
 * reckoned from, and its results by route id. */
interface Drawing {
  screen: VerdictScreen;
  compared: Compared;
  results: Map<string, RouteResult>;
}

/** One drawn card: the id it is drawn by, and what is drawn. */
type DrawnEntry<T> = [id: string, drawn: T];

/** One group's drawn cards, in the order it lists them. */
interface GroupCards {
  routes: DrawnEntry<string>[];
  steps: DrawnEntry<StepCard>[];
}

/** A route the layout places, from the comparison; one it does not hold is refused. */
function resultOf(at: Drawing, id: string): RouteResult {
  const r = at.results.get(id);
  if (!r) throw new Error(`the layout places ${id}, which the comparison does not hold`);
  return r;
}

const drawRoute = (at: Drawing, id: string, html: (r: RouteResult) => string): DrawnEntry<string> =>
  [id, html(resultOf(at, id))];

/** A step's card, with the routes it opens in its section, in the order its
 * row lists them. */
function drawStep(at: Drawing, place: StepPlace): DrawnEntry<StepCard> {
  const step = stepKeyed(at.compared.steps, place.step);
  const routes = step.unlock.routes.filter((r) => place.routes.includes(r.route.id));
  return [place.id, { title: composeStepTitle(at.screen, step), html: stepCardHtml(at.screen, step, routes) }];
}

/** A group's routes, each drawn by `html`, and no step. */
const routeCards = (at: Drawing, ids: string[], html: (r: RouteResult) => string): GroupCards =>
  ({ routes: ids.map((id) => drawRoute(at, id, html)), steps: [] });

/** One group's cards, as it lists them. */
function drawGroup(at: Drawing, group: VerdictGroup, chip: CardLook["chip"]): GroupCards {
  const { screen } = at;
  switch (group.kind) {
    case "open":
    case "within-reach":
      return routeCards(at, group.routes, (r) => fullCardHtml(screen, r, { chip, badge: "status" }));
    case "unsettled":
      return routeCards(at, group.routes, (r) => fullCardHtml(screen, r, { chip, badge: "rules-met" }));
    case "steps":
      return { routes: [], steps: group.steps.map((place) => drawStep(at, place)) };
    case "not-yet":
      return routeCards(at, group.items.flatMap((item) => (typeof item === "string" ? [item] : item.routes)),
        (r) => notYetRowHtml(screen, r));
    case "closed":
      return routeCards(at, group.routes, (r) => closedRowHtml(r, screen.glossary));
    case "arranged":
      return { routes: [], steps: [] };
  }
}

/** Drawn cards by id; an id the layout places twice is refused with the
 * message `placedTwice` writes for it. */
function cardsById<T>(entries: DrawnEntry<T>[], placedTwice: (id: string) => string): Record<string, T> {
  const byId: Record<string, T> = {};
  for (const [id, drawn] of entries) {
    if (Object.hasOwn(byId, id)) throw new Error(placedTwice(id));
    byId[id] = drawn;
  }
  return byId;
}

/**
 * Every card the layout places, drawn in the order the screen lists them, so
 * a screen explains an abbreviation on its first use (human, 2026-09-08). On
 * the one-country layout a card carries its country's chip; a country's own
 * section names its country once, on its summary row.
 */
export function drawnCardsOf(screen: VerdictScreen, compared: Compared, layout: VerdictLayout): DrawnCards {
  const at: Drawing = {
    screen, compared,
    results: new Map([...compared.inView.results, ...compared.inView.closed].map((r) => [r.route.id, r])),
  };
  const drawn: GroupCards[] = [];
  if (layout.kind === "one-country") drawn.push(...layout.groups.map((g) => drawGroup(at, g, "country")));
  if (layout.kind === "countries")
    drawn.push(...layout.sections.flatMap((section) => section.groups.map((g) => drawGroup(at, g, "none"))));
  return {
    routes: cardsById(drawn.flatMap((g) => g.routes), (id) => `the layout places ${id} twice`),
    steps: cardsById(drawn.flatMap((g) => g.steps), (id) => `the layout places the step ${id} twice`),
  };
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
