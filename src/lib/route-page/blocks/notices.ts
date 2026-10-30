// @level presentation
import {
  isScored, noticeSources, routeStatements, statementSources,
  type Dataset, type Notice, type ProvenanceEntry, type Route, type UnreadSource,
} from "permit-rulebook-data";
import { type Glossary, glossed } from "../../gloss.js";
import { glossedLearnLinkText, linkLabelOf } from "../../quote.js";
import { esc, escAttr } from "../../reason.js";
import { cardValues, quoteBlock, ruleCriteria, tapInline } from "./rule-card.js";

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
 * A notice, on a page with no reader.
 *
 * Same words as the results card, because they are the same dataset sentences,
 * and every side it stands on gets its quote — this is the block that has to
 * carry an authority disagreeing with another one without the page picking a
 * winner. The link at the foot is the page the notice sends the reader to,
 * never whichever source it leads with: a reader with an Algerian passport
 * needs their own fiche, not the Conseil d'État (s8).
 */
export function noticeSection(n: Notice, seen: Glossary): string {
  const nextUrl = n.learn ? n.learn.url : n.source.source_url;
  // The link's words are drawn where they are read, after the notice's own:
  // the page explains a token on its first use.
  const nextLabel = (): string => (n.learn ? glossedLearnLinkText(n.learn, seen) : linkLabelOf(nextUrl));
  return `
  <section class="notice-block ${escAttr(n.kind)}" aria-labelledby="notice-${escAttr(n.id)}">
    <h2 id="notice-${escAttr(n.id)}">${esc(glossed(n.title, seen))}</h2>
    <p class="plain">${esc(glossed(n.body, seen))}</p>${
    noticeSources(n).map((value) => `
      ${quoteBlock(value, {}, seen)}`).join("")}
    <p class="notice-next"><a ${tapInline()} href="${escAttr(nextUrl)}" target="_blank" rel="noopener">${
    esc(nextLabel())} &#8599;</a></p>
  </section>`;
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
 * The one notice that says who a route page is NOT for: an EU, EEA or Swiss
 * passport needs no permit here. It is on the page before the first rule so an
 * Irish reader landing on a German page is told, rather than walked through
 * seven rules and handed a refusal (`tests/s6-edges.test.ts`).
 */
export function audienceNotice(dataset: Dataset): Notice | undefined {
  return (dataset.notices ?? []).find((n) => n.kind === "no-permit-needed");
}
