// @level application
import type { CriterionResult, RouteResult, ThresholdCriterion } from "permit-rulebook-data";

/**
 * One figure a route is short on, in no words: an amount, with the criterion
 * it was measured against and the widest gap of the reader's band, or points.
 */
export type FigureGap =
  | { kind: "money"; criterion: ThresholdCriterion; gap: number }
  | { kind: "points"; points: number };

/** A criterion that failed only by a bounded gap, as the figure it is short on. */
function figureGapOf(r: CriterionResult): FigureGap[] {
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
function isNearer(a: FigureGap[], b: FigureGap[]): boolean {
  if (a.length !== b.length) return a.length < b.length;
  const widest = (gaps: FigureGap[]) => Math.max(...gaps.map((g) => (g.kind === "money" ? g.gap : g.points)));
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
function figureGapsIn(results: CriterionResult[]): FigureGap[] {
  return results.flatMap((r) => {
    if (r.criterion.op !== "any") return figureGapOf(r);
    if (r.path) return figureGapsIn(r.path.criteria);
    let nearest: FigureGap[] = [];
    for (const path of r.path_results ?? []) {
      if (!failsOnlyByGaps(path)) continue;
      const gaps = figureGapsIn(path);
      if (!nearest.length || isNearer(gaps, nearest)) nearest = gaps;
    }
    return nearest;
  });
}

/** The figures a route is short on, in the dataset's order; none where it
 * misses by nothing an amount or points can close. */
export const figureGapsOf = (r: RouteResult): FigureGap[] => figureGapsIn(r.criteria);
