// @level application
import {
  fieldOptions, isPlacedElsewhere, isStepGated, type Criterion, type Dataset, type RouteResult,
} from "permit-rulebook-data";
import { routeIdsOf } from "./in-view.js";
import type { AnswerRef, AnsweredDataset, Fold, VerdictGroup } from "./verdict-layout.js";

/** The answers a criterion asks for, where it asks for named ones. */
function wantedValues(c: Criterion): string[] {
  if (c.op === "eq") return [c.value];
  if (c.op === "in") return c.values;
  return [];
}

/** The path answers a failed criterion asks for; the fallback answer is never
 * one. */
function pathAnswersAskedBy(ds: Dataset, c: Criterion): AnswerRef[] {
  if (!("field" in c) || ds.fields.find((f) => f.id === c.field)?.kind !== "path") return [];
  const options = fieldOptions(ds, c.field);
  return wantedValues(c).flatMap((v) => {
    const option = options.find((o) => o.value === v);
    return option && !option.is_fallback ? [{ field: c.field, value: v }] : [];
  });
}

/** The path answers a set of gated rows actually asks for, arranged ones
 * included, each once, in the order the rows first ask them. Fixed copy ("a
 * job offer, transfer or hosting agreement") told a user who had declared a
 * transfer that they needed one (review). */
function pathAnswersNamedFor(ds: Dataset, rows: RouteResult[]): AnswerRef[] {
  const asked = new Map<string, AnswerRef>();
  for (const cr of rows.flatMap((r) => r.criteria.filter((c) => c.outcome === "fail")))
    for (const answer of pathAnswersAskedBy(ds, cr.criterion)) asked.set(`${answer.field}=${answer.value}`, answer);
  return [...asked.values()];
}

/**
 * Routes that are simply in another country collapse into one line: a wall
 * of "this route is in Spain" answers a question the reader never asked, on a
 * fact they gave us themselves. One such route keeps its own row.
 */
function elsewhereItems(rows: RouteResult[]): (string | Fold)[] {
  if (rows.length < 2) return routeIdsOf(rows);
  return [{ kind: "elsewhere", country: rows[0]!.country, routes: routeIdsOf(rows) }];
}

/**
 * The not-yet group: each route with its own reason keeps its own row; rows
 * gated on a path answer alone collapse into one fold when there are three or
 * more (one "needs a job offer" row per country was information, sixteen
 * were noise — critique #5); rows placed in another country fold last. The
 * items are listed in the order they are drawn, so the first row to use an
 * abbreviation explains it. `standingAbove` counts what the section draws
 * above the group for the fold to point at: its steps, its job offer line and
 * its arranged line.
 */
export function notYetGroupOf(answeredDataset: AnsweredDataset, rows: RouteResult[], standingAbove: number): VerdictGroup | null {
  if (!rows.length) return null;
  const gated: RouteResult[] = [], elsewhere: RouteResult[] = [], individual: RouteResult[] = [];
  for (const r of rows) {
    if (isPlacedElsewhere(r, answeredDataset.answers)) elsewhere.push(r);
    else if (isStepGated(answeredDataset.ds, r, answeredDataset.answers)) gated.push(r);
    else individual.push(r);
  }
  const items: (string | Fold)[] = routeIdsOf(individual);
  if (gated.length < 3) items.push(...routeIdsOf(gated));
  else {
    const pathAnswers = pathAnswersNamedFor(answeredDataset.ds, gated);
    // Open when it is the only thing on screen: a collapsed group was the
    // whole result for the emptiest profile, and every quote and read date
    // the product exists to show was folded away inside it (F7).
    const alone = individual.length === 0 && elsewhere.length === 0 && standingAbove === 0;
    items.push({ kind: "needs-path-answers", pathAnswers, pointsUp: standingAbove > 0, open: alone, routes: routeIdsOf(gated) });
  }
  items.push(...elsewhereItems(elsewhere));
  return { kind: "not-yet", items, count: rows.length };
}
