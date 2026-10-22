// @level presentation
import { SITUATION_FIELD, type Country, type RouteResult } from "permit-rulebook-data";
import { closedRowHtml } from "./card-blocks.js";
import { fullCard, hasLiveUnknown, unlockCard, type CardLook, type VerdictScreen } from "./cards.js";
import { notYetGroup } from "./not-yet.js";
import { partOf, type Compared, type Part } from "./reading.js";
import { arrangedLineIn, offerLineIn, seekHintHtml, type Step } from "./steps.js";
import type {
  ArrangedLine, CountrySection, OfferLine, RouteCard, Strip, VerdictGroup, VerdictLayout,
} from "./types.js";
import { leadCountry, leads, namedFirst, unscoredTally } from "./unscored.js";

/** A step, with the routes it opens in one section. */
interface SectionStep {
  step: Step;
  routes: RouteResult[];
}

/** What one section holds: the whole screen on the one-country layout, one
 * country's on the other. `results` are the routes the job-search sentence
 * reads; `offer` and `arranged` the section's offer line and arranged line;
 * `chip` whether its cards carry their country's chip. */
interface Section {
  part: Part;
  steps: SectionStep[];
  offer: OfferLine | null;
  arranged: ArrangedLine | null;
  results: RouteResult[];
  chip: CardLook["chip"];
}

const cardsOf = (screen: VerdictScreen, rows: RouteResult[], look: CardLook): RouteCard[] =>
  rows.map((r) => ({ route: r.route.id, html: fullCard(screen, r, look) }));

const routeGroup = (kind: "open" | "unsettled" | "within-reach" | "closed", cards: RouteCard[]): VerdictGroup | null =>
  cards.length ? { kind, cards } : null;

/** The steps block: the offer line first, then the steps; it stands, with
 * its heading, wherever either is there (#175). */
function stepsGroup(screen: VerdictScreen, s: Section): VerdictGroup | null {
  if (!s.steps.length && !s.offer) return null;
  const steps = s.steps.map(({ step, routes }) => ({ title: step.title, html: unlockCard(screen, step, routes) }));
  // The job-search sentence, to the reader it is true of — one with no
  // offer yet — and only under steps (s23, F1a).
  return { kind: "steps", offer: s.offer, steps, hint: seekHintHtml(screen.ds, s.results, screen.answers) };
}

/** What stands above the not-yet group for its fold to point at: each step,
 * the offer line, the arranged line. */
const standingAbove = (s: Section): number => s.steps.length + (s.offer ? 1 : 0) + (s.arranged ? 1 : 0);

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
    routeGroup("open", cardsOf(screen, s.part.met, look)),
    routeGroup("unsettled", cardsOf(screen, s.part.unsettled, { ...look, badge: "rules-met" })),
    routeGroup("within-reach", cardsOf(screen, s.part.near, look)),
    stepsGroup(screen, s),
    s.arranged ? { kind: "arranged" as const, ...s.arranged } : null,
    notYetGroup(screen, s.part.hold, standingAbove(s)),
    routeGroup("closed", s.part.closed.map((r) => ({ route: r.route.id, html: closedRowHtml(r, screen.glossary) }))),
  ];
  return groups.filter((g): g is VerdictGroup => g !== null);
}

/** One country's offer line and arranged line. */
const linesIn = (screen: VerdictScreen, c: Compared, code: string): Pick<Section, "offer" | "arranged"> =>
  ({ offer: offerLineIn(screen.ds, c.freed, code), arranged: arrangedLineIn(c.arranged, code) });

/** Counted the way the rows read: an unknown on a hard-failed route is moot,
 * and no learn box offers to resolve it (critique #4). */
const openUnknownsIn = (screen: VerdictScreen, rows: RouteResult[]): number =>
  rows.filter((r) => hasLiveUnknown(screen, r)).length;

function stripOf(screen: VerdictScreen, c: Compared): Strip {
  const { whole } = c;
  return {
    open: whole.met.length, withinReach: whole.near.length, unsettled: whole.unsettled.length,
    closed: whole.closed.length, notYet: whole.hold.length, openUnknowns: openUnknownsIn(screen, c.reading.results),
  };
}

/** Single destination: the flat layout, no country chrome. */
function oneCountry(screen: VerdictScreen, c: Compared): VerdictLayout {
  const steps = c.ups.map((step) => ({ step, routes: step.unlock.routes }));
  const lines = linesIn(screen, c, c.reading.visible[0].code);
  const groups = groupsOf(screen, { part: c.whole, steps, ...lines, results: c.reading.results, chip: "country" });
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
 * #4); the offer line, which opens nothing, opens no section — and the
 * country the headline is about leads, open (s26). A country's own closed routes are counted in its
 * tally: a count no summary names is a route the reader never learns exists
 * (s8).
 */
function countrySection(screen: VerdictScreen, c: Compared, at: SectionPlace): CountrySection {
  const code = at.country.code;
  const rs = c.reading.results.filter((r) => r.country === code);
  const part = partOf(rs, c.reading.closed.filter((r) => r.country === code), c.reading.unsettledIds);
  const steps = c.ups
    .map((step) => ({ step, routes: step.unlock.routes.filter((r) => r.country === code) }))
    .filter((x) => x.routes.length);
  const tally = {
    open: part.met.length, unsettled: part.unsettled.length, withinReach: part.near.length, notYet: part.hold.length,
    openUnknowns: openUnknownsIn(screen, rs), closed: part.closed.length, steps: steps.length,
    closedTo: unscoredTally(screen.ds, at.country, screen.answers[SITUATION_FIELD]),
  };
  const hopeful = part.met.length + part.unsettled.length + part.near.length > 0;
  const open = hopeful || (c.zeroOpen && at.wouldOpen.has(code)) || leads(at.country, at.lead);
  const groups = groupsOf(screen, { part, steps, ...linesIn(screen, c, code), results: rs, chip: "none" });
  return { name: at.country.name, open, tally, groups };
}

/** Several destinations: a section per country, the one the headline is
 * about first (s26), the others in the dataset's order. */
function countries(screen: VerdictScreen, c: Compared): VerdictLayout {
  const rows = [...c.ups.map((s) => s.unlock), ...c.arranged];
  const wouldOpen = new Set(rows.flatMap((u) => u.routes.map((r) => r.country)));
  const lead = leadCountry(screen.ds, screen.answers, c.zeroOpen);
  const sections = namedFirst(c.reading.visible, lead)
    .map((country) => countrySection(screen, c, { country, lead, wouldOpen }));
  return { kind: "countries", strip: stripOf(screen, c), sections };
}

export function layoutOf(screen: VerdictScreen, c: Compared): VerdictLayout {
  return c.reading.visible.length === 1 ? oneCountry(screen, c) : countries(screen, c);
}
