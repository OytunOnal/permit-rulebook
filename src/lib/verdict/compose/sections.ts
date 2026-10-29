// @level presentation
import {
  SITUATION_FIELD, findJobOfferAnswer, phraseOf, subjectOf, type Country, type Dataset, type RouteResult, type RoutesFreedByAJobOffer,
} from "permit-rulebook-data";
import { phraseOfAnswer } from "./answer-phrase.js";
import { closedRowHtml } from "./card-blocks.js";
import {
  composeStepTitle, fullCardHtml, hasLiveUnknown, unlockCardHtml, type CardLook, type VerdictScreen,
} from "./cards.js";
import { seekHintHtml } from "./html.js";
import { notYetGroupOf } from "./not-yet.js";
import { groupedRoutesOf, type Compared, type GroupedRoutes } from "./in-view.js";
import {
  countRoutesOpenedByArrangedAnswers, type ArrangedAnswerCount, type Step,
} from "./steps.js";
import type {
  ArrangedLine, CountrySection, JobOfferLine, RouteCard, Strip, VerdictGroup, VerdictLayout,
} from "./types.js";
import { leadCountry, leads, namedFirst, unscoredTally } from "./unscored.js";

/** A step, with the routes it opens in one section. */
interface SectionStep {
  step: Step;
  routes: RouteResult[];
}

/** What one section holds: the whole screen on the one-country layout, one
 * country's on the other. `results` are the routes the job-search sentence
 * reads; `jobOfferLine` and `arranged` the section's job offer line and arranged line;
 * `chip` whether its cards carry their country's chip. */
interface Section {
  grouped: GroupedRoutes;
  steps: SectionStep[];
  jobOfferLine: JobOfferLine | null;
  arranged: ArrangedLine | null;
  results: RouteResult[];
  chip: CardLook["chip"];
}

const cardsOf = (screen: VerdictScreen, rows: RouteResult[], look: CardLook): RouteCard[] =>
  rows.map((r) => ({ route: r.route.id, html: fullCardHtml(screen, r, look) }));

const routeGroup = (kind: "open" | "unsettled" | "within-reach" | "closed", cards: RouteCard[]): VerdictGroup | null =>
  cards.length ? { kind, cards } : null;

/** The steps block: the job offer line first, then the steps; it stands, with
 * its heading, wherever either is there (#175). */
function stepsGroup(screen: VerdictScreen, s: Section): VerdictGroup | null {
  if (!s.steps.length && !s.jobOfferLine) return null;
  const steps = s.steps.map(({ step, routes }) =>
    ({ title: composeStepTitle(screen, step), html: unlockCardHtml(screen, step, routes) }));
  // The job-search sentence, to the reader it is true of — one with no
  // offer yet — and only under steps (s23, F1a).
  return { kind: "steps", jobOfferLine: s.jobOfferLine, steps, hint: seekHintHtml(screen.ds, s.results, screen.answers) };
}

/** What stands above the not-yet group for its fold to point at: each step,
 * the job offer line, the arranged line. */
const standingAbove = (s: Section): number => s.steps.length + (s.jobOfferLine ? 1 : 0) + (s.arranged ? 1 : 0);

/**
 * The one section policy, for both layouts: open, unsettled, within reach,
 * steps, the arranged line, not yet, not open to your passport, each only
 * where the section has something in it. The groups are built in that order
 * and each card as it is listed, so a screen explains an abbreviation on its
 * first use (human, 2026-09-08).
 */
function groupsOf(screen: VerdictScreen, s: Section): VerdictGroup[] {
  const look: CardLook = { chip: s.chip, badge: "status" };
  const groups = [
    routeGroup("open", cardsOf(screen, s.grouped.met, look)),
    routeGroup("unsettled", cardsOf(screen, s.grouped.unsettled, { ...look, badge: "rules-met" })),
    routeGroup("within-reach", cardsOf(screen, s.grouped.near, look)),
    stepsGroup(screen, s),
    s.arranged ? { kind: "arranged" as const, ...s.arranged } : null,
    notYetGroupOf(screen, s.grouped.hold, standingAbove(s)),
    routeGroup("closed", s.grouped.closed.map((r) => ({ route: r.route.id, html: closedRowHtml(r, screen.glossary) }))),
  ];
  return groups.filter((g): g is VerdictGroup => g !== null);
}

/** One country's arranged line, in the dataset's words, or null where no
 * arranged answer opens a route there. */
function composeArrangedLine(counts: ArrangedAnswerCount[], code: string): ArrangedLine | null {
  if (!counts.length) return null;
  return { country: phraseOf(code), answers: counts.map((c) => ({ answer: phraseOfAnswer(c.answer), routes: c.routes })) };
}

/** A field as running text names it: its `subject`. A field with none is
 * refused rather than named by its id. */
function nameFieldBySubject(ds: Dataset, field: string): string {
  if (ds.fields.find((f) => f.id === field)?.subject === undefined)
    throw new Error(`"${field}" has no subject for the job offer line to name it by`);
  return subjectOf(ds, field);
}

/**
 * One country's job offer line, or null where an offer frees nothing there: the
 * job offer by its phrase, the country by its in-sentence phrase, and the
 * questions the freed routes would ask next by their subjects.
 */
function composeJobOfferLine(ds: Dataset, freed: RoutesFreedByAJobOffer[], code: string): JobOfferLine | null {
  const here = freed.find((f) => f.country === code);
  if (!here) return null;
  return {
    jobOffer: phraseOfAnswer(findJobOfferAnswer(ds)), country: phraseOf(code), routes: here.routes.length,
    fields: here.fieldsLeftOpen.map((f) => nameFieldBySubject(ds, f)),
  };
}

/** One country's job offer line and arranged line. */
const linesIn = (screen: VerdictScreen, c: Compared, code: string): Pick<Section, "jobOfferLine" | "arranged"> => ({
  jobOfferLine: composeJobOfferLine(screen.ds, c.freed, code),
  arranged: composeArrangedLine(countRoutesOpenedByArrangedAnswers(c.arranged, code), code),
});

/** Counted the way the rows read: an unknown on a hard-failed route is moot,
 * and no learn box offers to resolve it (critique #4). */
const openUnknownsIn = (screen: VerdictScreen, rows: RouteResult[]): number =>
  rows.filter((r) => hasLiveUnknown(screen, r)).length;

function stripOf(screen: VerdictScreen, c: Compared): Strip {
  const { whole } = c;
  return {
    open: whole.met.length, withinReach: whole.near.length, unsettled: whole.unsettled.length,
    closed: whole.closed.length, notYet: whole.hold.length, openUnknowns: openUnknownsIn(screen, c.inView.results),
  };
}

/** Single destination: the flat layout, no country chrome. */
function oneCountry(screen: VerdictScreen, c: Compared): VerdictLayout {
  const steps = c.steps.map((step) => ({ step, routes: step.unlock.routes }));
  const lines = linesIn(screen, c, c.inView.visible[0].code);
  const groups = groupsOf(screen, { grouped: c.whole, steps, ...lines, results: c.inView.results, chip: "country" });
  return { kind: "one-country", strip: stripOf(screen, c), groups };
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
function countrySection(screen: VerdictScreen, c: Compared, at: SectionPlace): CountrySection {
  const code = at.country.code;
  const rs = c.inView.results.filter((r) => r.country === code);
  const grouped = groupedRoutesOf(rs, c.inView.closed.filter((r) => r.country === code), c.inView.unsettledIds);
  const steps = c.steps
    .map((step) => ({ step, routes: step.unlock.routes.filter((r) => r.country === code) }))
    .filter((x) => x.routes.length);
  const tally = {
    open: grouped.met.length, unsettled: grouped.unsettled.length, withinReach: grouped.near.length, notYet: grouped.hold.length,
    openUnknowns: openUnknownsIn(screen, rs), closed: grouped.closed.length, steps: steps.length,
    closedTo: unscoredTally(screen.ds, at.country, screen.answers[SITUATION_FIELD]),
  };
  const hopeful = grouped.met.length + grouped.unsettled.length + grouped.near.length > 0;
  const open = hopeful || (c.zeroOpen && at.wouldOpen.has(code)) || leads(at.country, at.lead);
  const groups = groupsOf(screen, { grouped, steps, ...linesIn(screen, c, code), results: rs, chip: "none" });
  return { name: at.country.name, open, tally, groups };
}

/** Several destinations: a section per country, the one the headline is
 * about first (s26), the others in the dataset's order. */
function countries(screen: VerdictScreen, c: Compared): VerdictLayout {
  const rows = [...c.steps.map((s) => s.unlock), ...c.arranged];
  const wouldOpen = new Set(rows.flatMap((u) => u.routes.map((r) => r.country)));
  const lead = leadCountry(screen.ds, screen.answers, c.zeroOpen);
  const sections = namedFirst(c.inView.visible, lead)
    .map((country) => countrySection(screen, c, { country, lead, wouldOpen }));
  return { kind: "countries", strip: stripOf(screen, c), sections };
}

export function layoutOf(screen: VerdictScreen, c: Compared): VerdictLayout {
  return c.inView.visible.length === 1 ? oneCountry(screen, c) : countries(screen, c);
}
