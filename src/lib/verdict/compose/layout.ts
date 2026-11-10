// @level application
import {
  DESTINATION_FIELD, SITUATION_FIELD, liveUnknowns, periodOf, type Country, type Dataset, type Profile, type RouteResult,
} from "permit-rulebook-data";
import { SITUATION_COUNTRY_FIELD, notScoredFor, type NotScoredMark } from "../../situations.js";
import { EVERY_COUNTRY_ANSWER, groupedRoutesOf, routeIdsOf, type Compared, type GroupedRoutes } from "./in-view.js";
import { measuredCriterionOf } from "./money-shortfall.js";
import { notYetGroupOf } from "./not-yet-group.js";
import { countRoutesOpenedByArrangedAnswers, isExploring, nearestStep, type Step } from "./steps.js";
import type {
  AnsweredDataset, ArrangedLine, ComparedLayout, CountrySection, HeadlineLayout, JobOfferLine, RouteGroupKind,
  StepPlace, Strip, Tally, VerdictGroup,
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

/** A step's key among the screen's steps: the answer its row is for, and
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
function stepsGroup(answeredDataset: AnsweredDataset, section: Section): VerdictGroup | null {
  if (!section.steps.length && !section.jobOfferLine) return null;
  return {
    kind: "steps", jobOfferLine: section.jobOfferLine, steps: section.steps,
    hint: drawsSeekHint(answeredDataset, section.results),
  };
}

/** What stands above the not-yet group for its fold to point at: each step,
 * the job offer line, the arranged line. */
const standingAbove = (section: Section): number =>
  section.steps.length + (section.jobOfferLine ? 1 : 0) + (section.arranged ? 1 : 0);

/**
 * The one section policy, for both layouts: open, unsettled, within reach,
 * steps, the arranged line, not yet, not open to your passport, each only
 * where the section has something in it. The groups are listed in the order
 * they are drawn, and each card as it is listed, so a screen explains an
 * abbreviation on its first use (human, 2026-09-08).
 */
function groupsOf(answeredDataset: AnsweredDataset, section: Section): VerdictGroup[] {
  const { grouped } = section;
  const groups = [
    routeGroup("open", grouped.met),
    routeGroup("unsettled", grouped.unsettled),
    routeGroup("within-reach", grouped.near),
    stepsGroup(answeredDataset, section),
    section.arranged ? { kind: "arranged" as const, ...section.arranged } : null,
    notYetGroupOf(answeredDataset, grouped.hold, standingAbove(section)),
    routeGroup("closed", grouped.closed),
  ];
  return groups.filter((g): g is VerdictGroup => g !== null);
}

/** One country's job offer line and arranged line, or null where an offer
 * frees nothing there, or no arranged answer opens a route there. */
function linesIn(compared: Compared, code: string): Pick<Section, "jobOfferLine" | "arranged"> {
  const here = compared.freed.find((f) => f.country === code);
  const counts = countRoutesOpenedByArrangedAnswers(compared.arranged, code);
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

function stripOf(answeredDataset: AnsweredDataset, compared: Compared): Strip {
  const { whole } = compared;
  return {
    open: whole.met.length, withinReach: whole.near.length, unsettled: whole.unsettled.length,
    closed: whole.closed.length, notYet: whole.hold.length,
    openUnknowns: openUnknownsIn(answeredDataset, compared.inView.results),
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

/** How many times a year an amount stated per each of the dataset's periods is paid. */
const TIMES_A_YEAR = { year: 1, month: 12 } as const;

/**
 * The amount a route within reach is measured against, per year so a monthly
 * and a yearly line compare: its money threshold. A route short on points
 * alone asks no amount, and ranks after one that does.
 */
function yearlyAmountAskedOf(answeredDataset: AnsweredDataset, r: RouteResult): number {
  if (r.gap_max === undefined) return Infinity;
  const measured = measuredCriterionOf(answeredDataset.ds, r, answeredDataset.answers);
  if (!measured) throw new Error(`${r.route.id} is short on money against no threshold`);
  const period = periodOf(answeredDataset.ds, measured.field);
  if (period === undefined) throw new Error(`${measured.field} is a money question with no period`);
  return measured.threshold.amount * TIMES_A_YEAR[period];
}

/** The route within reach with the smallest share of its amount still
 * missing (ruling 11 on #187); on a tie, the smaller amount, then the
 * dataset's order (ruling 29 on #310); none where no route is within reach. */
function nearestRouteWithinReach(answeredDataset: AnsweredDataset, near: RouteResult[]): string | null {
  const order = answeredDataset.ds.countries.flatMap((country) => country.routes.map((route) => route.id));
  const ranked = near
    .map((r) => ({
      id: r.route.id, share: shareStillMissingOf(answeredDataset, r), amount: yearlyAmountAskedOf(answeredDataset, r),
      at: order.indexOf(r.route.id),
    }))
    .sort((a, b) => a.share - b.share || a.amount - b.amount || a.at - b.at);
  return ranked[0]?.id ?? null;
}

/** The headline's kind with nothing open, none unsettled and none within
 * reach. With steps, the step worth naming is the first the list offers
 * (s23) — an arranged answer or the job offer line is no step, so neither is
 * counted or named (#175); with neither, nothing open, pointing at country
 * sections only where there are some (F7). */
function stepsOrNothingOpenHeadlineOf(compared: Compared): HeadlineLayout {
  const nearest = nearestStep(compared.steps);
  if (nearest) return { kind: "steps", steps: compared.steps.length, nearest: stepKeyOf(nearest) };
  return { kind: "nothing-open", explore: compared.inView.visible.length === 1 ? "one-country" : "several-countries" };
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
function headlineOf(answeredDataset: AnsweredDataset, compared: Compared): HeadlineLayout {
  const { whole } = compared;
  if (compared.zeroOpen && writtenStateKeyOf(answeredDataset.ds, answeredDataset.answers)) return { kind: "written-state" };
  const nearest = nearestRouteWithinReach(answeredDataset, whole.near);
  const unsettled = whole.unsettled.length;
  if (!whole.met.length && unsettled) return { kind: "unsettled", routes: unsettled, nearest };
  if (compared.zeroOpen) return stepsOrNothingOpenHeadlineOf(compared);
  const countries = new Set(whole.met.map((r) => r.country)).size;
  return { kind: "open", routes: whole.met.length, countries, nearest };
}

/** Single destination: the flat layout, no country chrome. */
function oneCountryLayoutOf(answeredDataset: AnsweredDataset, compared: Compared): ComparedLayout {
  const code = compared.inView.visible[0]!.code;
  const steps = stepPlacesOf(compared.steps, code, (step) => step.unlock.routes);
  const groups = groupsOf(answeredDataset, {
    grouped: compared.whole, steps, ...linesIn(compared, code), results: compared.inView.results,
  });
  return {
    kind: "one-country", country: code, strip: stripOf(answeredDataset, compared),
    headline: headlineOf(answeredDataset, compared), groups,
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

/** A country's place among the others: the country, and which country leads. */
interface SectionPlace {
  country: Country;
  lead: string | undefined;
}

/** The routes in one country some arranged answer would open, each counted
 * once, however many answers would open it. */
const countDistinctRoutesOpenedByArrangedAnswers = (compared: Compared, code: string): number =>
  new Set(compared.arranged.flatMap((u) => routeIdsOf(u.routes.filter((r) => r.country === code)))).size;

/** Whether a section holds anything the reader can act on (ruling 6 of
 * #187): an open, unsettled or short-on-a-figure route, a step, an arranged
 * line, a job offer line, or a live unknown. */
const holdsSomethingToActOn = (section: Section, tally: Tally): boolean =>
  tally.open + tally.unsettled + tally.withinReach + tally.openUnknowns + section.steps.length > 0
  || section.jobOfferLine !== null || section.arranged !== null;

/**
 * One country's section: collapsible, with its tally on the summary row. A
 * section opens whenever it holds something the reader can act on — a
 * collapsed France hid what a job offer would check there, and a collapsed
 * Netherlands the reader's own "I don't know" (v1.2.2 critique F8; ruling 6
 * of #187); a section of not-yet rows with nothing to act on stays
 * collapsed, its tally visible. The country the headline is about leads,
 * open (s26). The tally names every action inside: its steps, and the routes
 * its job offer line would check and its arranged line would open (ruling
 * 7). A country's own closed routes are counted in its tally: a count no
 * summary names is a route the reader never learns exists (s8).
 */
function countrySection(answeredDataset: AnsweredDataset, compared: Compared, at: SectionPlace): CountrySection {
  const { country, lead } = at;
  const code = country.code;
  const { inView } = compared;
  const countryResults = inView.results.filter((r) => r.country === code);
  const grouped = groupedRoutesOf(countryResults, inView.closed.filter((r) => r.country === code), inView.unsettledIds);
  const steps = stepPlacesOf(compared.steps, code, (step) => step.unlock.routes.filter((r) => r.country === code))
    .filter((place) => place.routes.length);
  const section: Section = { grouped, steps, ...linesIn(compared, code), results: countryResults };
  const tally: Tally = {
    open: grouped.met.length, unsettled: grouped.unsettled.length, withinReach: grouped.near.length, notYet: grouped.hold.length,
    openUnknowns: openUnknownsIn(answeredDataset, countryResults), closed: grouped.closed.length, steps: steps.length,
    checkedWithJobOffer: section.jobOfferLine?.routes ?? 0,
    openedByArrangedAnswers: countDistinctRoutesOpenedByArrangedAnswers(compared, code),
    situationNotTaken: countryMarkOf(answeredDataset.ds, country, answeredDataset.answers[SITUATION_FIELD]) !== null,
  };
  const open = holdsSomethingToActOn(section, tally) || leads(country, lead);
  return { country: code, open, tally, groups: groupsOf(answeredDataset, section) };
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
function countrySectionsLayoutOf(answeredDataset: AnsweredDataset, compared: Compared): ComparedLayout {
  const { visible } = compared.inView;
  const lead = compared.zeroOpen ? writtenStateKeyOf(answeredDataset.ds, answeredDataset.answers)?.named : undefined;
  const sections = namedFirst(visible, lead).map((country) => countrySection(answeredDataset, compared, { country, lead }));
  return {
    kind: "countries", strip: stripOf(answeredDataset, compared), headline: headlineOf(answeredDataset, compared),
    lead: visible.find((country) => leads(country, lead))?.code ?? null, sections,
  };
}

export function layoutOf(answeredDataset: AnsweredDataset, compared: Compared): ComparedLayout {
  return compared.inView.visible.length === 1
    ? oneCountryLayoutOf(answeredDataset, compared)
    : countrySectionsLayoutOf(answeredDataset, compared);
}
