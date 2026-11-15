// @level presentation
import { noticeSources, type Notice } from "permit-rulebook-data";
import { type Glossary, glossed } from "../../gloss.js";
import { glossedLearnLinkText, linkLabelOf } from "../../quote.js";
import { esc, escAttr } from "../../reason.js";
import { quoteBlock, tapInline } from "./rule-card.js";

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
