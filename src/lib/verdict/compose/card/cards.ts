// @level presentation
import {
  closedBy, learnLinkOf, liveUnknowns, noticeSources, shortLabelOf, unlockMeansOf, unlockProfile, unlockTitleOf,
  type Dataset, type Notice, type Profile, type RouteResult,
} from "permit-rulebook-data";
import type { CardScreen } from "./blocks/card-screen.js";
import { pathLinesHtml, pathsNotTakenOf } from "./blocks/path-line.js";
import { provenanceHtml, sourceLinkHtml, srcLine } from "./blocks/provenance.js";
import { railHtml } from "./blocks/rail.js";
import {
  carveOutHtml, caveatHtml, precondHtml, readingHtml, routeAsStated, scopedHtml,
} from "./blocks/route-statements.js";
import {
  CAME_FROM_LINE, FIND_OUT_YOURSELF, LOWER_THRESHOLD_HINT, POINTS_FIGURE, POINTS_TABLE_HINT, RULES_MET, STATUS_LABEL,
  WOULD_BE_MET, figureGapSentence, orAbove, pointsOfNeeded, shortByPoints, shortOn, shortfallNote, upToTitle,
  withStepHtml, wouldThenBeShortOnly, type PathTakenFrame,
} from "../../../copy/verdict.js";
import { countryOf } from "../../../countries.js";
// A symbol a stranger cannot read is explained the first time a screen uses
// it, on the screen's own memory: the card's citations, statements, readings
// and learn labels are glossed as the route page's are (#151, ruling 8). Each
// block takes the screen's memory; one drawn alone is a screen of its own.
import { type Glossary, glossSection, glossed } from "../../../gloss.js";
import { glossedLearnLinkText } from "../../../quote.js";
import { esc, escAttr, failDetailHtml, whyHtml } from "../../../reason.js";
import { url } from "../../../site.js";
import { routePath } from "../../../slug.js";
import {
  bandOf, figureGapsOf, hasLiveUnknown, type FigureGap, type RouteStanding, type Step,
} from "../../reckon/reckon-verdict.js";
import { printedFigureGapOf, printedShortfallOf } from "../printed-shortfall.js";
import type { VerdictScreen } from "../types.js";

export type { CardScreen } from "./blocks/card-screen.js";

/**
 * The blocks of a card that state what the dataset itself says: what else is
 * required, what the source qualifies, which threshold the person was measured
 * against, and the quotes behind all of it.
 *
 * They live here for the reason `reason.ts` does: what the page renders has to
 * be readable by a test. The orientation year modelled "you have no job offer
 * yet" as a rule and failed people the Dutch immigration service does not fail
 * (2026-09-07); the rail labelled a route met through the €3,122 path with
 * €4,357 and drew the reader's own band below that line, so one card carried a
 * verdict and a picture of the same person failing (2026-09-07). Neither is
 * caught by reading the markup in the page — only by reading the markup.
 */

/** How a full card is drawn, each value named for what it draws. */
export interface CardLook {
  /** The country's chip above the title, or none: a country's own section
   * names its country once, on its summary row. */
  chip: "country" | "none";
  /** The badge: the route's own status, or "Rules met" under "unsettled for
   * your passport", where an open question hangs over a met route. */
  badge: "status" | "rules-met";
}

const routeName = (screen: VerdictScreen, r: RouteResult): string => glossSection(r.route.name, screen.glossary);


/**
 * The route the reader arrived from, marked and findable: the mark is on the
 * card itself, so whichever group it lands in it is the same card the reader
 * was reading a moment ago (isolated v1-gate critique, 2026-09-08, B2).
 */
const cameFromMark = (screen: VerdictScreen, r: RouteResult): string =>
  r.route.id === screen.cameFrom ? ` data-came-from="${escAttr(r.route.id)}"` : "";

/** The line inside the marked card, in the reader's own trail of thought. */
const cameFromNote = (screen: VerdictScreen, r: RouteResult): string =>
  r.route.id === screen.cameFrom ? `<p class="from-here">${esc(CAME_FROM_LINE)}</p>` : "";

/**
 * What the interview asks of this route, in the plain words the route page
 * shows, and the door to the page itself: the same declared fact in both
 * places (route-page critique B3). An item the card dropped, linked to a path
 * its route did not take (`notTaken`), is not counted (#315, ruling 5).
 */
function scopeFor(screen: VerdictScreen, r: RouteResult, notTaken: ReadonlySet<string> = new Set()): string {
  const href = url(routePath(countryOf(screen.ds, r.country), r.route));
  return scopedHtml(routeAsStated(r.route, notTaken), screen.answers, href);
}

/** A route as a card draws it: the engine's result, and the route's standing
 * the layout carries (#372). */
export interface RouteWithStanding {
  result: RouteResult;
  standing: RouteStanding;
}

/**
 * What a route within reach on money is short of, as its standing says:
 * "Short by up to …" on a bounded gap, or, on a band open at the bottom, the
 * line it asks and the reader's answer. Where the gap is a salary, the hint
 * that a lower threshold may already apply follows either.
 */
function gapNoteHtml(screen: VerdictScreen, standing: RouteStanding): string {
  const money = standing.shortfall;
  if (!money) return "";
  const field = shortLabelOf(screen.ds, money.field).toLowerCase();
  const { lead, rest } = shortfallNote(printedShortfallOf(screen.ds, money), field);
  const hint = money.field === "salary_eur_year" ? ` ${esc(LOWER_THRESHOLD_HINT)}` : "";
  return `<div class="gapnote"><b>${esc(lead)}</b> ${esc(rest)}${hint}</div>`;
}

/** The same, for a route within reach on points. */
function pointsNoteHtml(r: RouteResult): string {
  if (r.status !== "near" || !r.gap_points) return "";
  return `<div class="gapnote"><b>${esc(shortByPoints(r.gap_points))}</b> ${esc(POINTS_TABLE_HINT)}</div>`;
}

/** Each figure gap printed, in the order given. */
const printedFigureGapsOf = (screen: VerdictScreen, gaps: FigureGap[]) =>
  gaps.map((gap) => printedFigureGapOf(screen.ds, gap));

/** What a route within reach is short on, as its badge names it: each amount
 * by its field's short label, then points (ruling 9 on #187). */
function shortOnBadge(screen: VerdictScreen, { result: r, standing }: RouteWithStanding): string {
  const gaps = standing.figureGaps;
  if (!gaps.length) throw new Error(`${r.route.id} is within reach and its standing carries no figure gap`);
  const amounts = gaps.flatMap((g) => (g.kind === "money" ? [shortLabelOf(screen.ds, g.shortfall.field).toLowerCase()] : []));
  const points = gaps.some((g) => g.kind === "points") ? [POINTS_FIGURE] : [];
  return shortOn([...new Set(amounts), ...points]);
}

/** A full card's badge: the class its colour is read from, its words, and
 * the frame its path line is said in, which follows the badge's words (#315,
 * rulings 4 and 18). */
interface BadgeFrame {
  frame: PathTakenFrame;
  cls: string;
  words: string;
}

/** A full card's badge: "Rules met" under "unsettled for your passport", what
 * a route within reach is short on, or the route's own status. */
function badgeFrameOf(screen: VerdictScreen, route: RouteWithStanding, look: CardLook): BadgeFrame {
  const { result: r } = route;
  if (look.badge === "rules-met") return { frame: "rules-met", cls: "unsettled", words: RULES_MET };
  if (r.status === "near") return { frame: "short", cls: r.status, words: shortOnBadge(screen, route) };
  return { frame: r.status === "met" ? "met" : "short", cls: r.status, words: STATUS_LABEL[r.status] };
}

/**
 * The line a full card leads with: the engine's reason, except on a route
 * within reach on points or on no amount it measured, whose engine line names
 * the group's old words; that card says each figure it is short on instead
 * (ruling 9 on #187).
 */
function leadLineHtml(screen: VerdictScreen, { result: r, standing }: RouteWithStanding): string {
  const { ds, answers } = screen;
  const shortOnMeasuredMoneyAlone = r.gap_points === undefined && standing.measuredOn !== null;
  if (r.status !== "near" || shortOnMeasuredMoneyAlone) return whyHtml(ds, r, answers);
  return esc(printedFigureGapsOf(screen, standing.figureGaps).map(figureGapSentence).join(" "));
}

/**
 * A route that is open, within reach or unsettled, as a whole card. Its first
 * line is the country's chip and the badge, or the badge alone, above the
 * title: one home for the badge at every width and every title length (#95).
 * Under the title, the path it went through (#315); an item linked to a path
 * it did not take is dropped, from its count and its quotes too (ruling 5).
 */
export function fullCardHtml(screen: VerdictScreen, route: RouteWithStanding, look: CardLook): string {
  const { ds } = screen;
  const { result: r, standing } = route;
  const badge = badgeFrameOf(screen, route, look);
  const notTaken = pathsNotTakenOf(r);
  return `
        <article class="route"${cameFromMark(screen, r)}>
          <div class="top">${look.chip === "country" ? `<span class="country">${esc(countryOf(ds, r.country).name)}</span>` : ""}
            <span class="st ${badge.cls}">${esc(badge.words)}</span>
          </div>
          <h3>${esc(routeName(screen, r))}</h3>
          ${pathLinesHtml(screen, r, badge.frame)}
          ${cameFromNote(screen, r)}
          <p class="why">${leadLineHtml(screen, route)}</p>
          ${scopeFor(screen, r, notTaken)}
          ${precondHtml(screen, r.route, notTaken)}
          ${carveOutHtml(screen, r.route)}
          ${caveatHtml(screen, r.route)}
          ${readingHtml(r.route, screen.glossary)}
          ${pointsLineHtml(ds, r)}
          ${r.status !== "hold" ? railHtml(ds, r, standing.measuredOn) : ""}
          ${gapNoteHtml(screen, standing)}
          ${pointsNoteHtml(r)}
          ${learnBoxHtml(screen, r)}
          <div class="foot">${provenanceHtml(screen, r, notTaken)}${sourceLinkHtml(r.route.info_url)}</div>
        </article>`;
}

/**
 * The gap a not-yet row gives before its unknown, where its misses are a
 * figure gap and a live unknown: in the card's words, and the row stays under
 * "Not yet", since the unknown may already meet the route (ruling 10 on #187).
 */
function gapFirstHtml(screen: VerdictScreen, { result: r, standing }: RouteWithStanding): string {
  if (r.hard_fail || !hasLiveUnknown(screen, r)) return "";
  const gaps = printedFigureGapsOf(screen, standing.figureGaps);
  return gaps.length ? `${esc(gaps.map(figureGapSentence).join(" "))} ` : "";
}

/**
 * A not-yet route, as a row that unfolds. It opens by itself only where an
 * unknown still binds — a row opened on a dead route promises an answer that
 * cannot change it (critique #4) — or where it is the route the reader came
 * from.
 */
export function notYetRowHtml(screen: VerdictScreen, route: RouteWithStanding): string {
  const { ds, answers, glossary } = screen;
  const { result: r } = route;
  const short = `${gapFirstHtml(screen, route)}${whyHtml(ds, r, answers).split(". ")[0].replace(/\.$/, "")}`;
  const open = hasLiveUnknown(screen, r) || r.route.id === screen.cameFrom;
  return `
        <details class="route-hold"${cameFromMark(screen, r)}${open ? " open" : ""}>
          <summary><span class="country">${esc(r.country)}</span><span class="hold-name">${esc(routeName(screen, r))}</span><span class="hold-why">${short}</span></summary>
          <div class="hold-body">
            ${cameFromNote(screen, r)}
            ${r.route.summary ? `<p class="why">${esc(glossed(r.route.summary, glossary))}</p>` : ""}
            ${scopeFor(screen, r)}
            ${precondHtml(screen, r.route)}
            ${carveOutHtml(screen, r.route)}
            ${caveatHtml(screen, r.route)}
            ${readingHtml(r.route, glossary)}
            ${pointsLineHtml(ds, r)}
            ${failDetailHtml(ds, r, answers)}
            ${learnBoxHtml(screen, r)}
            <div class="foot">${provenanceHtml(screen, r)}${sourceLinkHtml(r.route.info_url)}</div>
          </div>
        </details>`;
}

/** One route a step opens, and how: met, or short only on the figures it
 * would still miss by, measured on the answers as they would stand with the
 * step taken, each as a bound (ruling 9 on #187). */
function unlockedRouteHtml(screen: VerdictScreen, r: RouteResult, taken: Profile): string {
  if (r.status === "met") return `<li>${esc(routeName(screen, r))} — <b>${esc(WOULD_BE_MET)}</b></li>`;
  // For now: the step's place carries these once #378 lands (ruling 5 on #322).
  const gaps = printedFigureGapsOf(screen, figureGapsOf(screen.ds, r, taken));
  if (!gaps.length) throw new Error(`a step lists ${r.route.id}, which it neither meets nor leaves short on a figure`);
  return `<li>${esc(routeName(screen, r))} — <i>${esc(wouldThenBeShortOnly(gaps))}</i></li>`;
}

/** Whether a step's title is a distance on a money field from a band with a
 * floor, "€304.20/year more": the reader sits anywhere in their band, so the
 * distance is a bound. From a band open at the bottom the title is the line
 * itself, "at least €45,630/year", and no distance. */
function titlesABoundedGap(screen: VerdictScreen, step: Step): boolean {
  const { field } = step.unlock;
  if (screen.ds.fields.find((f) => f.id === field)?.type !== "money_band") return false;
  const fromFloor = bandOf(screen.ds, field, screen.answers)?.min !== undefined;
  return fromFloor && bandOf(screen.ds, field, unlockProfile(step.unlock, screen.answers))?.min !== undefined;
}

/** A step's title, as its card, the steps group and the headline's Nearest
 * say it: the row's own, "up to …" on a bounded gap (ruling 1 on #187,
 * leftover 2), "… or above" where higher rungs folded into it. */
export function composeStepTitle(screen: VerdictScreen, step: Step): string {
  const row = unlockTitleOf(screen.ds, step.unlock, screen.answers);
  const title = titlesABoundedGap(screen, step) ? upToTitle(row) : row;
  return step.folded.length ? orAbove(title) : title;
}

/** A step, and the routes it opens on this section. */
export function stepCardHtml(screen: VerdictScreen, step: Step, routes: RouteResult[]): string {
  const means = unlockMeansOf(screen.ds, step.unlock, screen.answers);
  const taken = unlockProfile(step.unlock, screen.answers);
  return `
        <article class="unlock">
          <h3>${withStepHtml(esc(composeStepTitle(screen, step)))}</h3>
          ${means ? `<p class="unlock-means">${esc(means)}</p>` : ""}
          <ul>${routes.map((r) => unlockedRouteHtml(screen, r, taken)).join("")}
          </ul>
        </article>`;
}

/**
 * A route the authority closes to this reader's passport.
 *
 * It is not a verdict the rules computed and it is not a shortfall, so it gets
 * neither a card nor a "not yet" row: "not yet" invites a reader back with a
 * better salary, and this permit will never be theirs however the rest of the
 * interview goes. What the row owes them is the two things the product exists
 * for — what the authority decided, and the sentence it decided it in.
 *
 * The words are the dataset's. A closure is the one criterion whose reason
 * cannot be composed from the answers it names, so it carries its own sentence
 * and this prints it (s8).
 */
export function closedRowHtml(r: RouteResult, seen: Glossary = new Set()): string {
  const closures = closedBy(r);
  if (!closures.length) return "";
  return `
        <article class="closed">
          <h3><span class="country">${esc(r.country)}</span> ${esc(r.route.name)}</h3>
          ${closures.map((cr) => {
    const c = cr.criterion;
    if (c.op !== "not-in") return "";
    return `<p class="why">${esc(glossed(c.text, seen))}</p>${srcLine(c.source, seen)}`;
  }).join("")}
          <div class="foot">${sourceLinkHtml(r.route.info_url)}</div>
        </article>`;
}

/**
 * A notice, on the results screen.
 *
 * It is drawn here for the reason every other block is: a test reads the
 * markup, and a notice has more to get wrong than a title and a body. A
 * notice may stand on several authorities —
 * the Algerian talent question reports two of them disagreeing and a third
 * page saying what the reader gets instead — so every side is printed, each
 * quote framed with its own language, and the link at the foot is the page the
 * notice sends the reader to rather than whichever source it leads with (s8).
 */
export function noticeHtml(n: Notice, seen: Glossary = new Set()): string {
  const title = esc(glossed(n.title, seen));
  const body = esc(glossed(n.body, seen));
  const sources = noticeSources(n).map((value) => srcLine(value, seen)).join("");
  const next = n.learn
    ? `<a class="next" href="${escAttr(n.learn.url)}" target="_blank" rel="noopener">${
      esc(glossedLearnLinkText(n.learn, seen))}</a>`
    : sourceLinkHtml(n.source.source_url);
  return `
        <article class="notice ${escAttr(n.kind)}">
          <h3>${title}</h3>
          <p class="why">${body}</p>
          <div class="foot">
            <div class="srcs">${sources}</div>
            ${next}
          </div>
        </article>`;
}

/**
 * The points tally, on every card that scores one (s23, F4).
 *
 * The open Opportunity Card printed "6 points — 6 needed · English +1 …" and
 * the not-yet one printed nothing: the reader nearest to a verdict could not
 * see how near (v1.1 gate critique, F4). The engine attaches the tally to a
 * not-yet result as readily as to a met one — the points path stays open
 * while its unknowns are — so the line is a function of the result, rendered
 * here once, and the two cards cannot differ on it.
 */
function pointsLineHtml(ds: Dataset, r: RouteResult): string {
  const p = r.points;
  if (!p) return "";
  const items = p.items.length
    ? " · " + p.items.map((i) => `${esc(shortLabelOf(ds, i.field))} +${i.points}`).join(" · ")
    : "";
  // The met colour only where the points are met: on a not-yet card the
  // tally is a count, and the verdict colour would say otherwise.
  return `<div class="ptsline ${p.scored >= p.required ? "met" : "short"}"><b>${
    esc(pointsOfNeeded(p.scored, p.required))}</b>${items}</div>`;
}

/**
 * The way to look an unknown up, on the card it still binds — the dataset's
 * own `learn` link, never hardcoded (s3).
 *
 * Only where the unknown still binds: on a hard-failed route finding out
 * changes nothing, and the link sends the reader down a path that cannot open
 * (critique #4). The box ends on the link, with no full stop after it: the
 * link is a tap-height box the line it sits on cannot break inside (its own
 * label wraps within it), so on a phone a stop
 * after it wraps onto a line of its own (v1.1 gate critique, P5), as the
 * route page's own box has it.
 *
 * The label is the text of the link: a link says what the reader does there.
 * It is glossed like the rest of the card's words, on the screen's memory
 * (#151, ruling 8); the dataset's contract keeps citations out of it, whose
 * explainer would make a sentence underlined end to end (s28). Where the page
 * is a consolidated text, the glossed label is followed by what the page is
 * (#158). Any route the label names is said in full (#159).
 */
function learnBoxHtml(screen: CardScreen, r: RouteResult): string {
  const { ds, answers, glossary: seen = new Set() } = screen;
  const links = liveUnknowns(r, answers)
    .map((f) => learnLinkOf(ds, f))
    .filter((l): l is { label: string; url: string } => !!l);
  if (!links.length) return "";
  return `<div class="learn">${esc(FIND_OUT_YOURSELF)} ${links
    .map((l) => `<a href="${escAttr(l.url)}" target="_blank" rel="noopener">${
      esc(glossedLearnLinkText(l, seen))}</a>`)
    .join(" · ")}</div>`;
}
