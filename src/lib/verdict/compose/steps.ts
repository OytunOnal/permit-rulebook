// @level application
import {
  SITUATION_FIELD, fieldOptions, forEachCriterion, itemRows, routesAJobOfferFrees,
  type Dataset, type FieldOption, type Profile, type RoutesFreedByAJobOffer, type Unlock,
} from "permit-rulebook-data";

/**
 * The unlock steps as the results screen offers them: which rows are steps,
 * which come first, which are one step, and whether the reader is exploring
 * (s23, F1, F4) — and what the two lines beside them stand on: what each
 * arranged answer opens, and the answer that is a job offer (#175). No words:
 * a step's title and the lines' words are made where they are drawn (#183).
 *
 * The engine's `unlocks` answers "what would each other answer open", in
 * dataset order, one row per answer. Read straight onto the screen that put
 * a transfer and a hosting agreement above the one step an offer-holder
 * could actually take, named a transfer as the nearest step to a reader with
 * no employer, and offered three German levels as three steps to the same
 * card (v1.1 gate critique, F1, F4). What the screen does with the rows is
 * decided here, inside the verdict, so a test reads it through the verdict's
 * entry — and derived from the dataset's own shape, never from a list of
 * fields.
 */

/** One step as the screen offers it: the row, and the rungs above it folded into it. */
export interface Step {
  unlock: Unlock;
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
 * rules name the head of the list. The unknown answer is not a rung.
 *
 * A points item is read row by row, whichever form it was written in: the
 * one-field form keys its rows on the item's `field`; the `rows` form names
 * the field on each row, for an item the law spreads over two questions — the
 * Opportunity Card's experience item, two points for two years in the last
 * five and three for five in the last seven (schema 0.8.1, s25). Only the
 * rows on THIS field say whether the table climbs it.
 */
function isLadder(ds: Dataset, field: string): boolean {
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
          const rows = c.table.items.flatMap(itemRows).filter((r) => r.field === field);
          if (!rows.length) return;
          read = true;
          const paid = new Map(rows.map((r) => [r.value, r.points]));
          const scored = rungs.filter((v) => paid.has(v)).map((v) => paid.get(v)!);
          if (rows.some((r) => at(r.value) < 0)) ladder = false;
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
 * Only what the reader can do is a step: a row whose answer the dataset marks
 * arranged — a transfer, a hosting agreement, which the employer or the host
 * decides — is left out, and said apart: counted by
 * `countRoutesOpenedByArrangedAnswers`, whose words `composeArrangedLine`
 * makes (#175).
 *
 * Order: a step within the reader's own situation — recognition, language,
 * experience, funds: the fields the dataset marks `improvable` — before a
 * step that is a different situation than the one they declared — a path
 * answer such as a job offer. Within a group, a step that meets a route beats
 * one that only brings routes within reach, then the one that opens more,
 * then the engine's order — the rank the hero's "Nearest" has always used, so
 * the nearest step is the first card.
 *
 * A ladder: of the rows on one ladder field, the lowest rung that changes a
 * verdict is the step, and every rung above it that
 * opened nothing more is folded into it — the way a money ladder's rungs
 * became one step in v1 (isolated v1-gate critique, B3), derived here from
 * the field being a ladder rather than from its type. A higher rung that
 * opens a route the lower one does not keeps its own row.
 */
export function arrangeSteps(ds: Dataset, rows: Unlock[]): Step[] {
  const rungOf = (u: Unlock) => fieldOptions(ds, u.field).findIndex((o) => o.value === u.option.value);
  const ids = (u: Unlock) => new Set(u.routes.map((r) => r.route.id));
  const stepRows = rows.filter((u) => !u.option.is_arranged);
  // A higher rung on the same ladder that opens nothing the lower one does not.
  const foldsInto = (above: Unlock, u: Unlock): boolean =>
    above !== u && above.field === u.field && !above.qualifier && rungOf(above) > rungOf(u)
    && [...ids(above)].every((id) => ids(u).has(id));
  const steps: Step[] = [];
  const folded = new Set<Unlock>();
  for (const u of stepRows) {
    if (folded.has(u)) continue;
    const step: Step = { unlock: u, folded: [] };
    if (!u.qualifier && isLadder(ds, u.field)) {
      step.folded = stepRows.filter((above) => foldsInto(above, u));
      step.folded.forEach((above) => folded.add(above));
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

/** The rows of the answers the dataset marks arranged, in the engine's order. */
export const arrangedRowsOf = (rows: Unlock[]): Unlock[] => rows.filter((u) => u.option.is_arranged);

/** An arranged answer, and how many routes it opens in one country. */
export interface ArrangedAnswerCount {
  answer: FieldOption;
  routes: number;
}

/**
 * Each arranged answer that opens a route in one country, with how many it
 * opens there; none where none does. The engine keeps an explorer's rows
 * apart per country; one answer's rows are counted together.
 */
export function countRoutesOpenedByArrangedAnswers(arranged: Unlock[], code: string): ArrangedAnswerCount[] {
  const opened = new Map<string, ArrangedAnswerCount>();
  for (const u of arranged) {
    const routes = u.routes.filter((r) => r.country === code).length;
    if (!routes) continue;
    const counted = opened.get(u.option.value) ?? { answer: u.option, routes: 0 };
    opened.set(u.option.value, { ...counted, routes: counted.routes + routes });
  }
  return [...opened.values()];
}

/** Whether the reader is exploring: their situation answer is the one the
 * dataset marks as the fallback — no offer, transfer or hosting agreement. */
export function isExploring(ds: Dataset, answers: Profile): boolean {
  const fallback = fieldOptions(ds, SITUATION_FIELD).find((o) => o.is_fallback)?.value;
  return fallback !== undefined && answers[SITUATION_FIELD] === fallback;
}

/** What a job offer would free, per country, from the engine — for an
 * explorer only: an offer-holder is never told to get what they have. */
export const routesAJobOfferFreesFor = (ds: Dataset, answers: Profile): RoutesFreedByAJobOffer[] =>
  isExploring(ds, answers) ? routesAJobOfferFrees(ds, answers) : [];

/** The situation answer that is a job offer, as the dataset marks it: neither
 * arranged, the fallback nor "I don't know". */
export function findJobOfferAnswer(ds: Dataset): FieldOption {
  const offer = fieldOptions(ds, SITUATION_FIELD).find((o) => !o.is_arranged && !o.is_fallback && !o.is_unknown);
  if (!offer) throw new Error(`"${SITUATION_FIELD}" offers no job offer to name`);
  return offer;
}
