// @level presentation
import {
  declaredPlace, fieldOptions, isPlacedElsewhere, isStepGated, type Criterion, type Dataset, type RouteResult,
} from "permit-rulebook-data";
import { countryOf } from "../../countries.js";
import { holdRow, type VerdictScreen } from "./cards.js";
import type { Fold, RouteCard, VerdictGroup } from "./types.js";

/** The answers a criterion asks for, where it asks for named ones. */
function wantedValues(c: Criterion): string[] {
  if (c.op === "eq") return [c.value];
  if (c.op === "in") return c.values;
  return [];
}

/** The path answers a failed criterion asks for, in the dataset's words; the
 * fallback answer is never one. */
function pathAnswersAskedBy(ds: Dataset, c: Criterion): string[] {
  if (!("field" in c) || ds.fields.find((f) => f.id === c.field)?.kind !== "path") return [];
  const options = fieldOptions(ds, c.field);
  return wantedValues(c).flatMap((v) => {
    const option = options.find((o) => o.value === v);
    return option && !option.is_fallback ? [option.short ?? option.label] : [];
  });
}

/** The steps a set of gated rows actually asks for, named by the dataset.
 * Fixed copy ("a job offer, transfer or hosting agreement") told a user who
 * had declared a transfer that they needed one (review). */
function stepNamesFor(ds: Dataset, rows: RouteResult[]): string[] {
  const names = new Set<string>();
  for (const cr of rows.flatMap((r) => r.criteria.filter((c) => c.outcome === "fail")))
    for (const name of pathAnswersAskedBy(ds, cr.criterion)) names.add(name);
  return [...names];
}

const cardOf = (screen: VerdictScreen, r: RouteResult): RouteCard => ({ route: r.route.id, html: holdRow(screen, r) });

/**
 * Routes that are simply in another country collapse into one line: a wall
 * of "this route is in Spain" answers a question the reader never asked, on a
 * fact they gave us themselves. One such route keeps its own row.
 */
function elsewhereItems(screen: VerdictScreen, rows: RouteResult[]): (RouteCard | Fold)[] {
  const cards = rows.map((r) => cardOf(screen, r));
  if (rows.length < 2) return cards;
  const country = countryOf(screen.ds, rows[0].country).name;
  return [{ kind: "elsewhere", country, told: declaredPlace(screen.ds, screen.answers) ?? null, cards }];
}

/**
 * The not-yet group: each route with its own reason keeps its own row; rows
 * gated on a path answer alone collapse into one fold when there are three or
 * more (one "needs a job offer" row per country was information, sixteen
 * were noise — critique #5); rows placed in another country fold last. The
 * rows are drawn in the order they are listed, so the first to use an
 * abbreviation explains it. `stepsAbove` counts the steps the section offers
 * above the group.
 */
export function notYetGroup(screen: VerdictScreen, rows: RouteResult[], stepsAbove: number): VerdictGroup | null {
  if (!rows.length) return null;
  const gated: RouteResult[] = [], elsewhere: RouteResult[] = [], individual: RouteResult[] = [];
  for (const r of rows) {
    if (isPlacedElsewhere(r, screen.answers)) elsewhere.push(r);
    else if (isStepGated(screen.ds, r, screen.answers)) gated.push(r);
    else individual.push(r);
  }
  const items: (RouteCard | Fold)[] = individual.map((r) => cardOf(screen, r));
  if (gated.length < 3) items.push(...gated.map((r) => cardOf(screen, r)));
  else {
    const steps = stepNamesFor(screen.ds, gated);
    // Open when it is the only thing on screen: a collapsed group was the
    // whole result for the emptiest profile, and every quote and read date
    // the product exists to show was folded away inside it (F7).
    const alone = individual.length === 0 && elsewhere.length === 0 && stepsAbove === 0;
    items.push({ kind: "needs-steps", steps, pointsUp: stepsAbove > 0, open: alone, cards: gated.map((r) => cardOf(screen, r)) });
  }
  items.push(...elsewhereItems(screen, elsewhere));
  return { kind: "not-yet", items, count: rows.length };
}
