// @level application
import type { CriterionResult, Dataset, Profile, RouteResult } from "permit-rulebook-data";
import { decideMoneyShortfall, type MoneyGap, type MoneyShortfall } from "./money-shortfall.js";

/**
 * One figure a route is short on as the engine measured it, in no words: an
 * amount, with the criterion it was measured against and the widest gap of
 * the reader's band, or points.
 */
type MeasuredGap = ({ kind: "money" } & MoneyGap) | { kind: "points"; points: number };

/**
 * One figure a route is short on, decided and in no words: an amount, with
 * its shortfall (a bounded gap, or, from a band open at the bottom, the line
 * with the reader's band), or points (#375, ruling 8 on #322).
 */
export type FigureGap = { kind: "money"; shortfall: MoneyShortfall } | { kind: "points"; points: number };

/** A criterion that failed only by a bounded gap, as the figure it is short on. */
function measuredGapOf(r: CriterionResult): MeasuredGap[] {
  if (r.outcome !== "fail") return [];
  if (r.criterion.op === "gte" && r.gap_max !== undefined) return [{ kind: "money", criterion: r.criterion, gap: r.gap_max }];
  if (r.gap_points !== undefined) return [{ kind: "points", points: r.gap_points }];
  return [];
}

/** A path whose every fail is a bounded gap, and which has one. */
const failsOnlyByGaps = (path: CriterionResult[]): boolean => {
  const fails = path.filter((r) => r.outcome === "fail");
  return fails.length > 0 && fails.every((r) => r.gap_max !== undefined || r.gap_points !== undefined);
};

/** Which of two such paths is nearer: one figure before two, then the smaller
 * gap; ties keep the dataset's order, as the engine's own choice does. */
function isNearer(a: MeasuredGap[], b: MeasuredGap[]): boolean {
  if (a.length !== b.length) return a.length < b.length;
  const widest = (gaps: MeasuredGap[]) => Math.max(...gaps.map((g) => (g.kind === "money" ? g.gap : g.points)));
  return widest(a) < widest(b);
}

/**
 * The figures a list of criterion results is short on. A decided disjunction
 * counts its deciding path, as the engine measures it. One nothing has
 * decided yet — its other path waits on an unknown — counts its nearest path
 * that fails only by a bounded gap: Priya's highly-skilled-migrant route is
 * €1,585/month short on its full-salary path while her designated institution
 * is unknown (ruling 10 on #187).
 */
function measuredGapsIn(results: CriterionResult[]): MeasuredGap[] {
  return results.flatMap((r) => {
    if (r.criterion.op !== "any") return measuredGapOf(r);
    if (r.path) return measuredGapsIn(r.path.criteria);
    let nearest: MeasuredGap[] = [];
    for (const path of r.path_results ?? []) {
      if (!failsOnlyByGaps(path)) continue;
      const gaps = measuredGapsIn(path);
      if (!nearest.length || isNearer(gaps, nearest)) nearest = gaps;
    }
    return nearest;
  });
}

/** A measured gap decided on the answers: a money gap's shortfall decided on
 * the reader's band; points as they are. */
const decideFigureGap = (ds: Dataset, gap: MeasuredGap, answers: Profile): FigureGap =>
  (gap.kind === "points" ? gap : { kind: "money", shortfall: decideMoneyShortfall(ds, gap, answers) });

/** The figures a result is short on, on the answers it was evaluated on, each
 * money gap's shortfall decided; in the dataset's order; none where it misses
 * by nothing an amount or points can close. */
export const figureGapsOf = (ds: Dataset, r: RouteResult, answers: Profile): FigureGap[] =>
  measuredGapsIn(r.criteria).map((gap) => decideFigureGap(ds, gap, answers));
