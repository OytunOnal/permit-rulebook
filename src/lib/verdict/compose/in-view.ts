// @level application
import {
  DESTINATION_FIELD, evaluate, isClosed, notices, type Country, type Dataset, type Notice, type Profile, type RouteResult,
  type RoutesFreedByAnOffer, type Unlock,
} from "permit-rulebook-data";
import { scopedFirst } from "../../scope.js";
import type { Step } from "./steps.js";

/** The results a verdict is drawn from, before any of them is placed. */
export interface ResultsInView {
  /** The countries the destination answer leaves on the screen: the ones
   * it rules out disappear entirely, since their routes fail on a fact the
   * reader chose, which is not information (s5). */
  visible: Country[];
  /** Every scored result in those countries the authority does not close to
   * this passport, the route the reader came from first in its group. */
  results: RouteResult[];
  /** The routes this passport is shut out of: not open, not within reach
   * and above all not "not yet", a heading that invites the reader back with
   * a better salary on a permit that will never be theirs (s8). */
  closed: RouteResult[];
  /** The ids an open question hangs over: their rules are met, and whether
   * the permit is open to the passport at all is the notice's question (s8). */
  unsettledIds: Set<string>;
  notices: Notice[];
}

/** The destination answer that asks about every country at once. */
export const EVERY_COUNTRY_ANSWER = "all";

export function resultsInViewOf(ds: Dataset, answers: Profile, cameFrom: string | null): ResultsInView {
  const dest = answers[DESTINATION_FIELD];
  const everyCountry = dest === undefined || dest === EVERY_COUNTRY_ANSWER;
  const visible = everyCountry ? ds.countries : ds.countries.filter((c) => c.code.toLowerCase() === dest);
  const codes = new Set(visible.map((c) => c.code));
  const scored = scopedFirst(evaluate(ds, answers).filter((r) => codes.has(r.country)), cameFrom);
  const applicable = notices(ds, answers);
  return {
    visible,
    results: scored.filter((r) => !isClosed(r)),
    closed: scored.filter(isClosed),
    unsettledIds: new Set(applicable.filter((n) => n.kind === "open-question").flatMap((n) => n.routes ?? [])),
    notices: applicable,
  };
}

/** One section's routes, sorted into the groups it draws. */
export interface GroupedRoutes {
  /** Met, with no open question over them. */
  met: RouteResult[];
  /** Met, with an open question over them: never counted as open. */
  unsettled: RouteResult[];
  near: RouteResult[];
  hold: RouteResult[];
  closed: RouteResult[];
}

/** The groups of one section — the whole screen, or one country's. */
export function groupedRoutesOf(results: RouteResult[], closed: RouteResult[], unsettledIds: Set<string>): GroupedRoutes {
  const unsettled = results.filter((r) => r.status === "met" && unsettledIds.has(r.route.id));
  return {
    met: results.filter((r) => r.status === "met" && !unsettledIds.has(r.route.id)),
    unsettled,
    near: results.filter((r) => r.status === "near"),
    hold: results.filter((r) => r.status === "hold"),
    closed,
  };
}

/** What a comparison is drawn from: the results in view, the whole screen's
 * groups, whether nothing is open anywhere, the steps in the order the screen
 * offers them (s23), the rows of the arranged answers, and what a job offer
 * would free for an explorer (#175). */
export interface Compared {
  inView: ResultsInView;
  whole: GroupedRoutes;
  zeroOpen: boolean;
  steps: Step[];
  arranged: Unlock[];
  freed: RoutesFreedByAnOffer[];
}
