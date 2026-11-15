// @level application
/**
 * Which quotes a route page prints, rule by rule, and the facts reckoned on
 * them: the page's stamp, and the sources the watch's last run could not read
 * of the ones it prints. The route page draws its cards from this one answer,
 * so a page and its stamp cannot disagree (#323, ruling 8).
 */
import {
  deriveQuestions, forEachCriterion, isLocalization, isScored, noticeSources, provenancedValuesOf, referencedFields,
  routeStatements, statementSources, thresholdsUnder,
  type Criterion, type Dataset, type Notice, type ProvenanceEntry, type Route, type UnreadSource,
} from "permit-rulebook-data";
import { newestDayOf } from "../dataset-wide/read-range.ts";

/** One rule card a route page prints. */
export interface PrintedCard {
  /** The rule the card is about. */
  criterion: Criterion;
  /** The quotes the card prints, in its order. */
  quotes: ProvenanceEntry[];
  /** The rules on the card with no quote and no figure: what the card says the checker asks instead. */
  unquoted: Criterion[];
}

/** Which quotes one route page prints. */
export interface PrintedQuotes {
  /** Its rule cards, in the order the interview asks them. */
  cards: PrintedCard[];
  /** The notices it prints. */
  notices: Notice[];
  /** The notice that says who the page is not for, whose words and quote the audience card may borrow. */
  audienceNotice?: Notice;
}

/** What one route page prints, and the facts reckoned on it. */
export interface RouteFacts {
  printed: PrintedQuotes;
  /** The newest read day among the quotes it prints: its stamp, wherever it is printed. */
  stamp: string;
  /** Of the sources the watch's last run could not read, the ones this page quotes. */
  unread: UnreadSource[];
}

// ---------------------------------------------------------------------------
// Small helpers over the dataset
// ---------------------------------------------------------------------------

/**
 * Every provenanced value under one criterion, its paths included.
 *
 * `provenancedValuesOf` answers for a single criterion, and a disjunction's own
 * answer is only its condition source — so a card built on it alone printed the
 * `any` and dropped the two thresholds inside it. That is not a rendering
 * detail: the Spanish Blue Card states both of its salaries inside a
 * disjunction, and the page showed neither amount and neither quote. The
 * invariant caught it (`de-experienced-worker`, `es-blue-card`), which is what
 * the invariant is for.
 */
function valuesUnder(criterion: Criterion): ProvenanceEntry[] {
  const out: ProvenanceEntry[] = [];
  forEachCriterion([criterion], (x) => out.push(...provenancedValuesOf(x)));
  // One quote, one line: a disjunction whose condition source is restated on a
  // path says the same sentence twice.
  const seen = new Set<string>();
  return out.filter((entry) => {
    const key = `${entry.value.source_url}#${entry.value.quote}#${entry.label ?? ""}#${entry.amount ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The quotes one rule card prints. */
function cardQuotes(criterion: Criterion, notice?: Notice): ProvenanceEntry[] {
  const quotes = valuesUnder(criterion);
  // A closure names the same field and makes the opposite claim, so it is not
  // the audience card and never borrows the free-movement notice's words.
  const isAudience = "field" in criterion && criterion.field === "citizenship" && criterion.op !== "not-in";
  const isUnquotedAudience = isAudience && quotes.length === 0;
  if (isUnquotedAudience && notice) quotes.push({ value: notice.source });
  return quotes;
}

/** A rule with no quote and no figure under it, its paths included. */
const isUnquoted = (criterion: Criterion): boolean =>
  valuesUnder(criterion).length === 0 && thresholdsUnder(criterion).length === 0;

/**
 * The unquoted rules inside a quoted card's disjunction, which the card lists
 * as it lists an unquoted card's own: a quote on one path (the shortage Blue
 * Card's IT path) does not quote the rules of another (its degree path, where
 * the shortage list's door belongs). A disjunction that carries its own quote
 * speaks for its paths, so nothing under it is unquoted.
 */
function unquotedInPaths(criterion: Criterion): Criterion[] {
  if (criterion.op !== "any" || criterion.source) return [];
  return criterion.paths.flatMap((p) => p.criteria.flatMap((pc) => (isUnquoted(pc) ? [pc] : unquotedInPaths(pc))));
}

/**
 * The rules, in the order the interview asks them.
 *
 * Two kinds of criterion never become a card. A criterion that only asks WHERE
 * a route applies is answered by the address of the page the reader is on, and
 * printing "Germany as your destination" as a rule on a German page tells a
 * stranger nothing. Anything else is a card.
 */
function ruleCriteria(dataset: Dataset, route: Route): Criterion[] {
  const order = deriveQuestions(dataset).map((q) => q.field);
  const rank = (criterion: Criterion): number => {
    const positions = referencedFields(criterion).map((f) => order.indexOf(f)).filter((i) => i >= 0);
    return positions.length ? Math.min(...positions) : order.length;
  };
  return route.criteria
    .filter((c) => !isLocalization(c))
    .map((criterion, index) => ({ criterion, index, rank: rank(criterion) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((ranked) => ranked.criterion);
}

/**
 * One rule's card: its quotes, and the rules on it that print none. A card
 * with no evidence and no scale is one sentence restating its own heading; it
 * says instead what the interview will ask. A quoted card says it for the
 * unquoted rules inside its paths.
 */
function printedCard(criterion: Criterion, notice?: Notice): PrintedCard {
  const quotes = cardQuotes(criterion, notice);
  const isBare = quotes.length === 0 && thresholdsUnder(criterion).length === 0;
  return { criterion, quotes, unquoted: isBare ? [criterion] : unquotedInPaths(criterion) };
}

/**
 * The notices this route's page carries — the ones the dataset says are about
 * this permit.
 *
 * A route page has no reader, so nothing on it can match a notice's `when`.
 * Without this the unsettled question about an Algerian passport and the four
 * French talent cards would have stood on the results card and been silent on
 * the four pages that raise it: a page would have been quieter than a card
 * (s8).
 */
function noticesOn(dataset: Dataset, route: Route): Notice[] {
  return (dataset.notices ?? []).filter((n) => (n.routes ?? []).includes(route.id));
}

/**
 * The notices a route page prints: the ones about it, on a page that scores.
 * A page that does not score carries no results furniture, these blocks
 * included (s9).
 */
function printedNotices(dataset: Dataset, route: Route): Notice[] {
  return isScored(route) ? noticesOn(dataset, route) : [];
}

/**
 * The one notice that says who a route page is NOT for: an EU, EEA or Swiss
 * passport needs no permit here. It is on the page before the first rule so an
 * Irish reader landing on a German page is told, rather than walked through
 * seven rules and handed a refusal (`tests/s6-edges.test.ts`).
 */
function audienceNoticeOf(dataset: Dataset): Notice | undefined {
  return (dataset.notices ?? []).find((n) => n.kind === "no-permit-needed");
}

/** Which quotes `route`'s page prints, rule by rule. */
function printedQuotesOf(dataset: Dataset, route: Route): PrintedQuotes {
  const audienceNotice = audienceNoticeOf(dataset);
  return {
    cards: ruleCriteria(dataset, route).map((c) => printedCard(c, audienceNotice)),
    notices: printedNotices(dataset, route),
    audienceNotice,
  };
}

/**
 * Every quote a route page prints: its rule cards', its statements' and its
 * notices'. A notice carries more sentences than a route page prints; only
 * the ones printed here count.
 */
function printedSources(route: Route, printed: PrintedQuotes): ProvenanceEntry["value"][] {
  const out = printed.cards.flatMap((card) => card.quotes).map((e) => e.value);
  for (const statement of routeStatements(route)) out.push(...statementSources(statement));
  for (const notice of printed.notices) out.push(...noticeSources(notice));
  return out;
}

/**
 * What `route`'s page prints, and the facts reckoned on it.
 *
 * The stamp is the newest read date among the quotes the page prints, so a
 * reader finds that day below it. Four surfaces print it (the page, the
 * country index, the data door and the sitemap), so it is reckoned once.
 *
 * Of `unread`, the run's list, only the sources this page quotes are its own,
 * so a route page qualifies the daily-check claim only when one of ITS sources
 * went unread. The line used to count the whole list, and on the day one
 * German page did not answer, twenty-seven route pages that cite nothing on it
 * said "the last run did not reach one of them" (v1.1 gate critique, F3).
 */
export function reckonRouteFacts(dataset: Dataset, route: Route, unread: UnreadSource[]): RouteFacts {
  const printed = printedQuotesOf(dataset, route);
  const sources = printedSources(route, printed);
  const printedUrls = new Set(sources.map((v) => v.source_url));
  return {
    printed,
    stamp: newestDayOf(sources.map((v) => v.retrieved_at)),
    unread: unread.filter((u) => printedUrls.has(u.url)),
  };
}
