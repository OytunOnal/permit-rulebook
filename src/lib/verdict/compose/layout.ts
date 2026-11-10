// @level application
import {
  DESTINATION_FIELD, SITUATION_FIELD, liveUnknowns, type Country, type Dataset, type Profile, type RouteResult,
} from "permit-rulebook-data";
import { SITUATION_COUNTRY_FIELD, notScoredFor, type NotScoredMark } from "../../situations.js";
import { EVERY_COUNTRY_ANSWER, groupedRoutesOf, routeIdsOf, type Compared, type GroupedRoutes } from "./in-view.js";
import { measuredCriterionOf } from "./money-shortfall.js";
import { notYetGroupOf } from "./not-yet-group.js";
import { countRoutesOpenedByArrangedAnswers, isExploring, nearestStep, type Step } from "./steps.js";
import type {
  AnsweredDataset, ArrangedLine, ComparedLayout, CountrySection, HeadlineLayout, JobOfferLine, RouteGroupKind,
  StepPlace, Strip, VerdictGroup,
} from "./verdict-layout.js";

/**
 * The results screen's layout, reckoned once (#314): which group each route
 * stands in, which sections open and in what order, what each fold holds,
 * what the strip and each summary row count, and what kind of headline it
 * has. The files that draw word it; none of them decides it.
 */

/** The s19 mark on one country of the four-country result, for the declared
 * situation, or none: the one predicate its tally and its words read. */
export const countryMarkOf = (ds: Dataset, country: Country, situation: string | undefined): NotScoredMark | null =>
  situation === undefined ? null : notScoredFor(ds, country.code.toLowerCase(), situation);

/** Where a written state stands: the answer it is keyed by, the destination
 * answer of the country the reader named at question 3 on the four-country
 * path only — the country whose section leads the result, open (s26); the
 * direct path has no list of countries to lead — the mark, and the situation. */
export interface WrittenStateKey {
  key: string;
  named: string | undefined;
  mark: NotScoredMark;
  situation: string;
}

/** The written state's key for these answers, or none: the one derivation the
 * headline's kind, the lead country and the written state's words read. */
export function writtenStateKeyOf(ds: Dataset, answers: Profile): WrittenStateKey | null {
  const destination = answers[DESTINATION_FIELD];
  const situation = answers[SITUATION_FIELD];
  if (destination === undefined || situation === undefined) return null;
  // Keyed by the named country where the destination is all four, and by the
  // destination itself everywhere else — the direct path never asks question
  // 3, so a country answer under a one-country destination is not a key.
  const named = destination === EVERY_COUNTRY_ANSWER ? answers[SITUATION_COUNTRY_FIELD] : undefined;
  const key = named ?? destination;
  const mark = notScoredFor(ds, key, situation);
  return mark ? { key, named, mark, situation } : null;
}

/** A step's key among the screen's steps:the answer its row is for, and
 * the answer it is qualified by, where it is. */
export function stepKeyOf(step: Step): string {
  const { unlock } = step;
  const own = `${unlock.field}=${unlock.option.value}`;
  return unlock.qualifier ? `${own}+${unlock.qualifier.field}=${unlock.qualifier.option.value}` : own;
}

/** The step a key names among the screen's steps; a key no step has is refused. */
export function stepKeyed(steps: Step[], key: string): Step {
  const step = steps.find((s) => stepKeyOf(s) === key);
  if (!step) throw new Error(`no step is keyed ${key}`);
  return step;
}

/** What one section holds: the whole screen on the one-country layout, one
 * country's on the other. `results` are the routes the job-search sentence
 * reads; `jobOfferLine` and `arranged` the section's job offer line and
 * arranged line. */
interface Section {
  grouped: GroupedRoutes;
  steps: StepPlace[];
  jobOfferLine: JobOfferLine | null;
  arranged: ArrangedLine | null;
  results: RouteResult[];
}

const routeGroup = (kind: RouteGroupKind, rows: RouteResult[]): VerdictGroup | null =>
  rows.length ? { kind, routes: routeIdsOf(rows) } : null;

/** The job-search sentence stands under the steps for the reader it is true
 * of (s23, F1a): an explorer with an open job-search permit above. */
const drawsSeekHint = (answeredDataset: AnsweredDataset, results: RouteResult[]): boolean =>
  isExploring(answeredDataset.ds, answeredDataset.answers) && results.some((r) => r.route.kind === "seek" && r.status !== "hold");

/** The steps block: the job offer line first, then the steps; it stands, with
 * its heading, wherever either is there (#175). */
function stepsGroup(answeredDataset: AnsweredDataset, s: Section): VerdictGroup | null {
  if (!s.steps.length && !s.jobOfferLine) return null;
  return { kind: "steps", jobOfferLine: s.jobOfferLine, steps: s.steps, hint: drawsSeekHint(answeredDataset, s.results) };
}

/** What stands above the not-yet group for its fold to point at: each step,
 * the job offer line, the arranged line. */
const standingAbove = (s: Section): number => s.steps.length + (s.jobOfferLine ? 1 : 0) + (s.arranged ? 1 : 0);

/**
 * The one section policy, for both layouts: open, unsettled, within reach,
 * steps, the arranged line, not yet, not open to your passport, each only
 * where the section has something in it. The groups are listed in the order
 * they are drawn, and each card as it is listed, so a screen explains an
 * abbreviation on its first use (human, 2026-09-08).
 */
function groupsOf(answeredDataset: AnsweredDataset, s: Section): VerdictGroup[] {
  const groups = [
    routeGroup("open", s.grouped.met),
    routeGroup("unsettled", s.grouped.unsettled),
    routeGroup("within-reach", s.grouped.near),
    stepsGroup(answeredDataset, s),
    s.arranged ? { kind: "arranged" as const, ...s.arranged } : null,
    notYetGroupOf(answeredDataset, s.grouped.hold, standingAbove(s)),
    routeGroup("closed", s.grouped.closed),
  ];
  return groups.filter((g): g is VerdictGroup => g !== null);
}

/** One country's job offer line and arranged line, or null where an offer
 * frees nothing there, or no arranged answer opens a route there. */
function linesIn(c: Compared, code: string): Pick<Section, "jobOfferLine" | "arranged"> {
  const here = c.freed.find((f) => f.country === code);
  const counts = countRoutesOpenedByArrangedAnswers(c.arranged, code);
  return {
    jobOfferLine: here ? { country: code, routes: here.routes.length, fields: here.fieldsLeftOpen } : null,
    arranged: counts.length
      ? { country: code, answers: counts.map((n) => ({ field: n.field, value: n.answer.value, routes: n.routes })) }
      : null,
  };
}

/** Each step, placed in one section with the routes it opens there, under the
 * id its card is drawn by. */
const stepPlacesOf = (steps: Step[], code: string, routesOf: (step: Step) => RouteResult[]): StepPlace[] =>
  steps.map((step) => ({ id: `${code}/${stepKeyOf(step)}`, step: stepKeyOf(step), routes: routeIdsOf(routesOf(step)) }));

/** Whether an unknown on this route is one the reader can still act on: the
 * one predicate the counts and the row that opens on it read. */
export const hasLiveUnknown = (answeredDataset: AnsweredDataset, r: RouteResult): boolean =>
  liveUnknowns(r, answeredDataset.answers).length > 0;

/** Counted the way the rows read: an unknown on a hard-failed route is moot,
 * and no learn box offers to resolve it (critique #4). */
const openUnknownsIn = (answeredDataset: AnsweredDataset, rows: RouteResult[]): number =>
  rows.filter((r) => hasLiveUnknown(answeredDataset, r)).length;

function stripOf(answeredDataset: AnsweredDataset, c: Compared): Strip {
  const { whole } = c;
  return {
    open: whole.met.length, withinReach: whole.near.length, unsettled: whole.unsettled.length,
    closed: whole.closed.length, notYet: whole.hold.length, openUnknowns: openUnknownsIn(answeredDataset, c.inView.results),
  };
}

/**
 * The share of its own amount a route within reach still misses: the
 * engine's money gap over the threshold it was measured against, or the
 * points short over the points required; short on both, the larger. A band
 * open at the bottom is measured from nothing, so its gap is the whole amount.
 */
function shareStillMissingOf(answeredDataset: AnsweredDataset, r: RouteResult): number {
  const shares: number[] = [];
  if (r.gap_max !== undefined) {
    const measured = measuredCriterionOf(answeredDataset.ds, r, answeredDataset.answers);
    if (!measured) throw new Error(`${r.route.id} is short on money against no threshold`);
    shares.push(r.gap_max / measured.threshold.amount);
  }
  if (r.gap_points !== undefined) {
    if (!r.points) throw new Error(`${r.route.id} is short on points with no points required`);
    shares.push(r.gap_points / r.points.required);
  }
  if (!shares.length) throw new Error(`${r.route.id} is within reach with no gap`);
  return Math.max(...shares);
}

/** The route within reach with the smallest share of its amount still
 * missing, ties to the dataset's order (ruling 11 on #187); none where no
 * route is within reach. */
function nearestRouteWithinReach(answeredDataset: AnsweredDataset, near: RouteResult[]): string | null {
  const order = answeredDataset.ds.countries.flatMap((country) => country.routes.map((route) => route.id));
  const ranked = near
    .map((r) => ({ id: r.route.id, share: shareStillMissingOf(answeredDataset, r), at: order.indexOf(r.route.id) }))
    .sort((a, b) => a.share - b.share || a.at - b.at);
  return ranked[0]?.id ?? null;
}

/** The headline's kind with nothing open, none unsettled and none within
 * reach. With steps, the step worth naming is the first the list offers
 * (s23) — an arranged answer or the job offer line is no step, so neither is
 * counted or named (#175); with neither, nothing open, pointing at country
 * sections only where there are some (F7). */
function stepsOrNothingOpenHeadlineOf(c: Compared): HeadlineLayout {
  const nearest = nearestStep(c.steps);
  if (nearest) return { kind: "steps", steps: c.steps.length, nearest: stepKeyOf(nearest) };
  return { kind: "nothing-open", explore: c.inView.visible.length === 1 ? "one-country" : "several-countries" };
}

/**
 * The headline's kind. A situation no scored route in the declared country
 * takes reads its written state (s19) — keyed, on the four-country path, by
 * the country the reader named at question 3 (s26) — in place of the
 * zero-open headlines. Nothing open otherwise: their rules met under an open
 * question is not "nothing open" (human's walk, 2026-09-10), and they lead
 * whatever else is on screen, the route nearest within reach second (ruling
 * 12 on #187). Something open: the open routes, and that nearest route.
 */
function headlineOf(answeredDataset: AnsweredDataset, c: Compared): HeadlineLayout {
  if (c.zeroOpen && writtenStateKeyOf(answeredDataset.ds, answeredDataset.answers)) return { kind: "written-state" };
  const nearest = nearestRouteWithinReach(answeredDataset, c.whole.near);
  const unsettled = c.whole.unsettled.length;
  if (!c.whole.met.length && unsettled) return { kind: "unsettled", routes: unsettled, nearest };
  if (c.zeroOpen) return stepsOrNothingOpenHeadlineOf(c);
  const countries = new Set(c.whole.met.map((r) => r.country)).size;
  return { kind: "open", routes: c.whole.met.length, countries, nearest };
}

/** Single destination: the flat layout, no country chrome. */
function oneCountry(answeredDataset: AnsweredDataset, c: Compared): ComparedLayout {
  const code = c.inView.visible[0]!.code;
  const steps = stepPlacesOf(c.steps, code, (step) => step.unlock.routes);
  const groups = groupsOf(answeredDataset, { grouped: c.whole, steps, ...linesIn(c, code), results: c.inView.results });
  return {
    kind: "one-country", country: code, strip: stripOf(answeredDataset, c), headline: headlineOf(answeredDataset, c), groups,
  };
}

/** Whether this country is the one that leads: the one predicate the order
 * and the section's open state read. */
const leads = (country: { code: string }, lead: string | undefined): boolean =>
  lead !== undefined && country.code.toLowerCase() === lead;

/**
 * The country sections of the four-country result, the named country's
 * first (s26): the section the headline is about leads the list, and the
 * others keep the dataset's order. `sort` is stable, so nothing else moves;
 * with no country to lead, or one the list does not hold, the order is the
 * dataset's.
 */
function namedFirst<T extends { code: string }>(countries: readonly T[], lead: string | undefined): T[] {
  return [...countries].sort((a, b) => Number(leads(b, lead)) - Number(leads(a, lead)));
}

/** A country's place among the others: which country leads, and which
 * countries some step or arranged answer would open a route in. */
interface SectionPlace {
  country: Country;
  lead: string | undefined;
  wouldOpen: Set<string>;
}

/**
 * One country's section: collapsible, with its tally on the summary row.
 * Hopeful countries open; all-hold ones fold with the tally visible. With
 * nothing open anywhere, every section where a step or an arranged answer
 * would open a route opens — announcing "6 steps" and hiding two inside
 * folded sections is the withholding the headline exists to end (critique
 * #4); the job offer line, which opens nothing, opens no section — and the
 * country the headline is about leads, open (s26). A country's own closed
 * routes are counted in its tally: a count no summary names is a route the
 * reader never learns exists (s8).
 */
function countrySection(answeredDataset: AnsweredDataset, c: Compared, at: SectionPlace): CountrySection {
  const code = at.country.code;
  const rs = c.inView.results.filter((r) => r.country === code);
  const grouped = groupedRoutesOf(rs, c.inView.closed.filter((r) => r.country === code), c.inView.unsettledIds);
  const steps = stepPlacesOf(c.steps, code, (step) => step.unlock.routes.filter((r) => r.country === code))
    .filter((place) => place.routes.length);
  const tally = {
    open: grouped.met.length, unsettled: grouped.unsettled.length, withinReach: grouped.near.length, notYet: grouped.hold.length,
    openUnknowns: openUnknownsIn(answeredDataset, rs), closed: grouped.closed.length, steps: steps.length,
    situationNotTaken: countryMarkOf(answeredDataset.ds, at.country, answeredDataset.answers[SITUATION_FIELD]) !== null,
  };
  const hopeful = grouped.met.length + grouped.unsettled.length + grouped.near.length > 0;
  const open = hopeful || (c.zeroOpen && at.wouldOpen.has(code)) || leads(at.country, at.lead);
  const groups = groupsOf(answeredDataset, { grouped, steps, ...linesIn(c, code), results: rs });
  return { country: code, open, tally, groups };
}

/**
 * Several destinations: a section per country, the one the headline is about
 * first (s26), the others in the dataset's order. Which country leads — the
 * one the reader named at question 3, when nothing is open anywhere and its
 * scored routes do not take the declared situation — is the headline's
 * decision: the written state is drawn only on a zero-open result, and the
 * country it names is the country that leads; with something open anywhere,
 * or a written state for nobody, the sections keep the dataset's order.
 */
function countries(answeredDataset: AnsweredDataset, c: Compared): ComparedLayout {
  const rows = [...c.steps.map((s) => s.unlock), ...c.arranged];
  const wouldOpen = new Set(rows.flatMap((u) => u.routes.map((r) => r.country)));
  const lead = c.zeroOpen ? writtenStateKeyOf(answeredDataset.ds, answeredDataset.answers)?.named : undefined;
  const sections = namedFirst(c.inView.visible, lead)
    .map((country) => countrySection(answeredDataset, c, { country, lead, wouldOpen }));
  return {
    kind: "countries", strip: stripOf(answeredDataset, c), headline: headlineOf(answeredDataset, c),
    lead: c.inView.visible.find((country) => leads(country, lead))?.code ?? null, sections,
  };
}

export function layoutOf(answeredDataset: AnsweredDataset, c: Compared): ComparedLayout {
  return c.inView.visible.length === 1 ? oneCountry(answeredDataset, c) : countries(answeredDataset, c);
}
