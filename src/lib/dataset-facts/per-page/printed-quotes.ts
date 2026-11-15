// @level application
/**
 * Which quotes a route page prints, rule by rule, and the stamps reckoned on
 * them: each route page's, and each country page's from its routes'. The
 * route page's blocks still read the choices through the entry until the
 * route page draws its cards from `DatasetFacts` (#385).
 */
import {
  deriveQuestions, forEachCriterion, isLocalization, isScored, noticeSources, provenancedValuesOf, referencedFields,
  routeStatements, statementSources,
  type Country, type Criterion, type Dataset, type Notice, type ProvenanceEntry, type Route, type UnreadSource,
} from "permit-rulebook-data";

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
export function valuesUnder(c: Criterion): ProvenanceEntry[] {
  const out: ProvenanceEntry[] = [];
  forEachCriterion([c], (x) => out.push(...provenancedValuesOf(x)));
  // One quote, one line: a disjunction whose condition source is restated on a
  // path says the same sentence twice.
  const seen = new Set<string>();
  return out.filter((e) => {
    const key = `${e.value.source_url}#${e.value.quote}#${e.label ?? ""}#${e.amount ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The quotes one rule card prints. */
export function cardValues(c: Criterion, notice?: Notice): ProvenanceEntry[] {
  const values = valuesUnder(c);
  // A closure names the same field and makes the opposite claim, so it is not
  // the audience card and never borrows the free-movement notice's words.
  const isAudience = "field" in c && c.field === "citizenship" && c.op !== "not-in";
  const isUnquotedAudience = isAudience && values.length === 0;
  if (isUnquotedAudience && notice) values.push({ value: notice.source });
  return values;
}

/**
 * The rules, in the order the interview asks them.
 *
 * Two kinds of criterion never become a card. A criterion that only asks WHERE
 * a route applies is answered by the address of the page the reader is on, and
 * printing "Germany as your destination" as a rule on a German page tells a
 * stranger nothing. Anything else is a card.
 */
export function ruleCriteria(dataset: Dataset, route: Route): Criterion[] {
  const order = deriveQuestions(dataset).map((q) => q.field);
  const rank = (c: Criterion): number => {
    const positions = referencedFields(c).map((f) => order.indexOf(f)).filter((i) => i >= 0);
    return positions.length ? Math.min(...positions) : order.length;
  };
  return route.criteria
    .filter((c) => !isLocalization(c))
    .map((c, i) => ({ c, i, rank: rank(c) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.c);
}

/**
 * Every source this page quotes: the pages behind `printedSources`, the same
 * set the stamp is drawn from (s23, F3).
 *
 * The liveness line reads the s11 unread list through this set, so a route
 * page qualifies the daily-check claim only when one of ITS sources went
 * unread. The line used to count the whole list, and on the day one German
 * page did not answer, twenty-seven route pages that cite nothing on it said
 * "the last run did not reach one of them" (v1.1 gate critique, F3).
 */
export function routeSourceUrls(dataset: Dataset, route: Route): Set<string> {
  return new Set(printedSources(dataset, route).map((v) => v.source_url));
}

/** Of the run's unread list, the sources this page quotes. */
export const ownUnread = (dataset: Dataset, route: Route, unread: UnreadSource[]): UnreadSource[] => {
  const own = routeSourceUrls(dataset, route);
  return unread.filter((u) => own.has(u.url));
};

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
export function noticesOn(dataset: Dataset, route: Route): Notice[] {
  return (dataset.notices ?? []).filter((n) => (n.routes ?? []).includes(route.id));
}

/**
 * The notices a route page prints: the ones about it, on a page that scores.
 * A page that does not score carries no results furniture, these blocks
 * included (s9).
 */
export function printedNotices(dataset: Dataset, route: Route): Notice[] {
  return isScored(route) ? noticesOn(dataset, route) : [];
}

/**
 * Every quote a route page prints: its rule cards', its statements' and its
 * notices'. A notice carries more sentences than a route page prints; only
 * the ones printed here count.
 */
function printedSources(dataset: Dataset, route: Route): ProvenanceEntry["value"][] {
  const notice = audienceNotice(dataset);
  const out = ruleCriteria(dataset, route).flatMap((c) => cardValues(c, notice)).map((e) => e.value);
  for (const s of routeStatements(route)) out.push(...statementSources(s));
  for (const n of printedNotices(dataset, route)) out.push(...noticeSources(n));
  return out;
}

/**
 * The stamp one route page carries: the newest read date among the quotes it
 * prints, so a reader finds that day below it. Four surfaces print it (the
 * page, the country index, the data door and the sitemap), so it is one
 * function.
 */
export function pageStamp(dataset: Dataset, route: Route): string {
  return printedSources(dataset, route).map((v) => v.retrieved_at).sort().at(-1) ?? "";
}

/**
 * The stamp one country page carries: the newest of its route pages' stamps,
 * what the head of a page a crawler reads says about when its content last
 * moved. The country page and the sitemap both print it (#323, ruling 7).
 */
export function countryStamp(dataset: Dataset, country: Country): string {
  return country.routes.map((r) => pageStamp(dataset, r)).sort().at(-1) ?? "";
}

/**
 * The one notice that says who a route page is NOT for: an EU, EEA or Swiss
 * passport needs no permit here. It is on the page before the first rule so an
 * Irish reader landing on a German page is told, rather than walked through
 * seven rules and handed a refusal (`tests/s6-edges.test.ts`).
 */
export function audienceNotice(dataset: Dataset): Notice | undefined {
  return (dataset.notices ?? []).find((n) => n.kind === "no-permit-needed");
}
