// @level presentation
import type {
  ComparedLayout, ReckonedComparison, RouteStanding, Step, StepPlace, VerdictGroup,
} from "../reckon/reckon-verdict.js";

/** A route's standing on a comparison's layout, by its id; a route the
 * layout stands nowhere is refused. */
export function findRouteStanding(layout: ComparedLayout, id: string): RouteStanding {
  const routeStanding = layout.standings[id];
  if (!routeStanding) throw new Error(`the layout gives ${id} no standing`);
  return routeStanding;
}

/** The step a key names on a comparison; a key the comparison holds no step
 * under is refused. */
export function findStep(compared: ReckonedComparison, key: string): Step {
  if (!Object.hasOwn(compared.steps, key)) throw new Error(`no step is keyed ${key}`);
  return compared.steps[key]!;
}

/** The groups of a comparison's layout, in the order drawn: the flat
 * layout's, or each country section's in turn. */
export const listGroups = (layout: ComparedLayout): VerdictGroup[] =>
  (layout.kind === "one-country" ? layout.groups : layout.sections.flatMap((section) => section.groups));

/** The first place a comparison's layout gives the step a key names: whether
 * a step's title is a bounded gap is reckoned the same in every section it is
 * placed in; a step the layout places nowhere is refused. */
export function findFirstPlaceOfStep(layout: ComparedLayout, key: string): StepPlace {
  const place = listGroups(layout).flatMap((g) => (g.kind === "steps" ? g.steps : [])).find((s) => s.step === key);
  if (!place) throw new Error(`the layout places no step keyed ${key}`);
  return place;
}
