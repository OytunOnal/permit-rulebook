import {
  SITUATION_FIELD, fieldOptions, forEachCriterion, unlockTitleOf,
  type Dataset, type Profile, type RouteResult, type Unlock,
} from "permit-rulebook-data";
import { SEEK_HINT, orAbove } from "./copy.js";
import { esc } from "./reason.js";

/**
 * The unlock steps as the results screen offers them: which come first,
 * which are one step, and who is told the job-search sentence (s23, F1, F4).
 *
 * The engine's `unlocks` answers "what would each other answer open", in
 * dataset order, one row per answer. Read straight onto the screen that put
 * a transfer and a hosting agreement above the one step an offer-holder
 * could actually take, named a transfer as the nearest step to a reader with
 * no employer, and offered three German levels as three steps to the same
 * card (v1.1 gate critique, F1, F4). What the screen does with the rows is
 * decided here, beside the page, so a test can read it — and derived from the
 * dataset's own shape, never from a list of fields.
 */

/** One step as the screen offers it: the row, its title, and the rungs above it folded into it. */
export interface Step {
  unlock: Unlock;
  title: string;
  /** Rows on the same ladder above this rung that opened nothing more. */
  folded: Unlock[];
}

/**
 * Whether a field's options are rungs — an enum every rule reads as "this
 * rung or above".
 *
 * The dataset carries no flag for it; it carries the rules, and the rules
 * say it. Every `in` on the field names a tail of the option list (A1 and
 * up, B2 and up), every `eq` names the top, and every points table climbs
 * the list in order (A2 +1, B1 +2, B2 +3). Recognition fails the test — its
 * rules name the head of the list — and so do the experience bands, whose
 * rules skip a rung (F2 is that ladder's own scenario). The unknown answer is
 * not a rung.
 */
export function isLadder(ds: Dataset, field: string): boolean {
  let cached = ladderCache.get(ds);
  if (!cached) ladderCache.set(ds, (cached = new Map()));
  const known = cached.get(field);
  if (known !== undefined) return known;

  const def = ds.fields.find((f) => f.id === field);
  const rungs = def?.type === "enum" ? fieldOptions(ds, field).filter((o) => !o.is_unknown).map((o) => o.value) : [];
  const at = (v: string) => rungs.indexOf(v);
  const isTail = (values: string[]) => {
    const from = Math.min(...values.map(at));
    return from >= 0 && values.length === rungs.length - from && new Set(values).size === values.length;
  };
  let ladder = rungs.length > 1;
  let read = false;
  for (const country of ds.countries)
    for (const route of country.routes)
      forEachCriterion(route.criteria, (c) => {
        if (c.op === "points") {
          const item = c.table.items.find((i) => i.field === field);
          if (!item) return;
          read = true;
          const scored = rungs.filter((v) => item.points[v] !== undefined).map((v) => item.points[v]!);
          if (Object.keys(item.points).some((v) => at(v) < 0)) ladder = false;
          for (let i = 1; i < scored.length; i++) if (scored[i]! <= scored[i - 1]!) ladder = false;
          return;
        }
        if (!("field" in c) || c.field !== field) return;
        read = true;
        if (c.op === "in") { if (!isTail(c.values)) ladder = false; }
        else if (c.op === "eq") { if (at(c.value) !== rungs.length - 1) ladder = false; }
        else ladder = false;
      });
  ladder = ladder && read;
  cached.set(field, ladder);
  return ladder;
}
const ladderCache = new WeakMap<Dataset, Map<string, boolean>>();

/**
 * The steps, ordered by what the reader can do, each ladder one step.
 *
 * Order: a step within the reader's own situation — recognition, language,
 * experience, funds: the fields the dataset marks `improvable` — before a
 * step that is a different situation than the one they declared — the
 * fields it marks `path`. Within a group, a step that meets a route beats one
 * that only brings routes within reach, then the one that opens more, then
 * the engine's order — the rank the hero's "Nearest" has always used, so the
 * nearest step is the first card.
 *
 * A ladder: of the rows on one ladder field, the lowest rung that changes a
 * verdict is the step, titled "… or above", and every rung above it that
 * opened nothing more is folded into it — the way a money ladder's rungs
 * became one step in v1 (isolated v1-gate critique, B3), derived here from
 * the field being a ladder rather than from its type. A higher rung that
 * opens a route the lower one does not keeps its own row.
 */
export function arrangeSteps(ds: Dataset, ups: Unlock[], answers: Profile): Step[] {
  const rungOf = (u: Unlock) => fieldOptions(ds, u.field).findIndex((o) => o.value === u.option.value);
  const ids = (u: Unlock) => new Set(u.routes.map((r) => r.route.id));
  const steps: Step[] = [];
  const folded = new Set<Unlock>();
  for (const u of ups) {
    if (folded.has(u)) continue;
    const step: Step = { unlock: u, title: unlockTitleOf(ds, u, answers), folded: [] };
    if (!u.qualifier && isLadder(ds, u.field)) {
      const opened = ids(u);
      for (const above of ups) {
        if (above === u || above.field !== u.field || above.qualifier || rungOf(above) <= rungOf(u)) continue;
        if ([...ids(above)].every((id) => opened.has(id))) { step.folded.push(above); folded.add(above); }
      }
      if (step.folded.length) step.title = orAbove(step.title);
    }
    steps.push(step);
  }
  const kindOf = (u: Unlock) => ds.fields.find((f) => f.id === u.field)?.kind;
  const rank = (s: Step) =>
    (kindOf(s.unlock) === "path" ? 0 : 1e9)
    + (s.unlock.routes.some((r) => r.status === "met") ? 1e6 : 0)
    + s.unlock.routes.length;
  // A stable sort: ties keep the engine's order.
  return steps
    .map((s, i) => ({ s, i }))
    .sort((a, b) => rank(b.s) - rank(a.s) || a.i - b.i)
    .map(({ s }) => s);
}

/** The step the hero names: the first one, in the order above. */
export const nearestStep = (steps: Step[]): Step | undefined => steps[0];

/**
 * The job-search sentence under the steps, for the reader it is true of
 * (s23, F1a): one with no offer, transfer or hosting agreement — the
 * situation answer the dataset marks as the fallback — and an open
 * job-search permit above. It reached an offer-holder for as long as it was
 * keyed on the card alone (v1.1 gate critique, F1).
 */
export function seekHintHtml(ds: Dataset, results: RouteResult[], answers: Profile, hasUnlocks: boolean): string {
  if (!hasUnlocks) return "";
  const fallback = fieldOptions(ds, SITUATION_FIELD).find((o) => o.is_fallback)?.value;
  if (fallback === undefined || answers[SITUATION_FIELD] !== fallback) return "";
  if (!results.some((r) => r.route.kind === "seek" && r.status !== "hold")) return "";
  return `<p class="unlock-hint">${esc(SEEK_HINT)}</p>`;
}
