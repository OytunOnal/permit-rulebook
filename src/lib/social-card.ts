// @level presentation
import type { Dataset } from "permit-rulebook-data";
import type { DatasetFacts } from "./dataset-facts/reckon-dataset-facts.ts";
import { esc } from "./reason.ts";
import { CARD_HEADLINE, CARD_PROMISE, CHECKED_DAILY, RULES_READ, SEAL_LETTERS } from "./copy/frame.ts";

/**
 * The social card, as facts and as a page.
 *
 * It lives beside the site rather than inside the render script for the reason
 * `route-page.ts` does: the script was retyping the tagline, the headline and
 * every colour it drew with, so the card could disagree with the product about
 * what the product says (Standards review, 2026-09-07). The words come from
 * the copy module (`lib/copy/`), the palette from `tokens.css`, and the
 * numbers from the dataset.
 *
 * `docs/roadkeeper/design/s6-identity-a.html`, panel 3, at full size. The card
 * carries no wordmark (human, 2026-09-07): the mark is the name. Two stamps in
 * the same treatment — border, stamp red, mono, uppercase — the PR one larger
 * and tilted the other way, its bottom-right corner landing on the middle of
 * the rules-read stamp's top edge. The name travels in the link's title and
 * description, which the meta on every page carries.
 */

export interface SocialCardFacts {
  /** The countries the dataset covers, in its own order. */
  countries: string[];
  /**
   * How many routes it holds, and how many of them the checker asks about.
   *
   * One total would let the routes the checker does not ask about pass as the
   * others — the card is the first surface a stranger sees, and "29 routes"
   * under "Which work-permit routes could fit?" promises twenty-nine answers
   * where six of them are quotes with no answer in them. The line is the
   * product's words with the dataset's numbers in it, so the sidecar notices
   * a change to either.
   */
  routesLine: string;
  /** The end of the read range — the "Rules read" stamp's own date, as every site-wide page prints it. */
  read: string;
  headline: string;
  tagline: string;
  product: string;
}

/**
 * Everything on the card, read off the dataset, its reckoned `facts` and the
 * product's own words. The counts and the day are the reckoning's, so the card
 * and `/data/` read one scored count rather than each filtering for it (#323,
 * ruling 10).
 *
 * The render script is plain Node with no build step, and Node resolves a
 * specifier literally, so this module keeps its imports few: the words are
 * passed in rather than imported from the copy module (`lib/copy/`), the facts
 * are reckoned by the caller, and its relative imports name their `.ts` files.
 * That keeps it readable by the script, the site and the suite alike.
 */
export function socialCardFacts(
  dataset: Dataset, facts: DatasetFacts,
  words: { product: string; tagline: string; routesLineOf: (total: number, asked: number) => string },
): SocialCardFacts {
  return {
    countries: dataset.countries.map((c) => c.name),
    routesLine: words.routesLineOf(facts.counts.total, facts.counts.scored),
    read: facts.readRange.newest,
    headline: CARD_HEADLINE,
    tagline: words.tagline,
    product: words.product,
  };
}

/**
 * The card as a page, at 1200 × 630, drawn in the token palette.
 *
 * `tokens` is `tokens.css` itself, so every colour and face on the card is the
 * one the site uses. One deliberate departure from the identity mock: the
 * "checked daily" line was painted `--color-met`, which is the criteria-met
 * green — a verdict colour, on the first thing a stranger sees, for a product
 * whose hardest rule is that it never rules on the reader. It is ink now.
 */
export function socialCardHtml(facts: SocialCardFacts, tokens: string): string {
  return `<!doctype html><meta charset="utf-8"><style>
${tokens}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
.og { width: 1200px; height: 630px; background: var(--color-bg); color: var(--color-ink);
      padding: 68px 80px; display: flex; flex-direction: column; justify-content: space-between;
      font: 30px/1.6 var(--font-sans); }
.row { display: flex; justify-content: space-between; align-items: center; gap: 2rem; flex: 1; }
.og h1 { font: 400 3.6rem/1.15 var(--font-serif); margin: 0; }
.og h1 em { font-style: normal; color: var(--color-near); }
.stamps { position: relative; flex: 0 0 404px; width: 404px; height: 400px; }
.stamps .mark { position: absolute; left: 4px; top: 0; width: 224px; height: 224px;
      display: flex; align-items: center; justify-content: center;
      border: 8px solid var(--color-stamp); color: var(--color-stamp);
      font: 700 116px/1 var(--font-mono); letter-spacing: -.04em;
      transform: rotate(calc(-1 * var(--stamp-rotate))); mix-blend-mode: multiply; }
.stamps .stamp { position: absolute; left: 224px; top: 232px; white-space: nowrap;
      font: 600 38px/1.25 var(--font-mono); color: var(--color-stamp);
      border: 6px solid var(--color-stamp); padding: 18px 30px;
      transform: translateX(-50%) rotate(var(--stamp-rotate));
      text-transform: uppercase; letter-spacing: .1em; text-align: center; mix-blend-mode: multiply; }
.foot { display: flex; flex-direction: column; gap: 4px; align-items: flex-start;
      border-top: 6px double var(--color-ink); padding-top: 20px;
      font: 400 26px/1.5 var(--font-mono); color: var(--color-muted); }
/* Ink, not the criteria-met green: no verdict colour appears on this card. */
.foot b { color: var(--color-ink); font-weight: 600; }
</style><div class="og">
  <div class="row">
    <h1>${esc(facts.headline)} <em>${esc(facts.tagline)}</em></h1>
    <span class="stamps"><span class="mark">${esc(SEAL_LETTERS)}</span><span class="stamp">${esc(RULES_READ)}<br>${esc(facts.read)}</span></span>
  </div>
  <div class="foot">
    <span>${esc(facts.countries.join(" · "))}</span>
    <span>${esc(facts.routesLine)}</span>
    <span>${esc(CARD_PROMISE)} · <b>${esc(CHECKED_DAILY)}</b></span>
  </div>
</div>`;
}
