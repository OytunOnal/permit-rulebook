import { isScored, type Dataset } from "permit-rulebook-data";

/**
 * The social card, as facts and as a page.
 *
 * It lives beside the site rather than inside the render script for the reason
 * `route-page.ts` does: the script was retyping the tagline, the headline and
 * every colour it drew with, so the card could disagree with the product about
 * what the product says (Standards review, 2026-09-07). The words come from
 * `copy.ts`, the palette from `tokens.css`, and the numbers from the dataset.
 *
 * `docs/spine/design/s6-identity-a.html`, panel 3, at full size. The card
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
   * How many routes it holds, of each kind.
   *
   * One total let the second kind pass as the first — the card is the first
   * surface a stranger sees, and "28 routes" under "Which work-permit routes
   * could fit?" promises twenty-eight answers where five of them are quotes
   * with no answer in them. `data-page.ts` had already written the rule down;
   * the card was the one place still breaking it (Standards review,
   * 2026-09-10).
   */
  scored: number;
  quotedOnly: number;
  /** The newest read date across every value — the stamp's own date. */
  read: string;
  headline: string;
  tagline: string;
  product: string;
}

export const CARD_HEADLINE = "Which work-permit routes could fit?";

/**
 * Everything on the card, read off the dataset and the product's own words.
 *
 * The words are passed in rather than imported so this module has no runtime
 * import at all: the render script is plain Node, and Node resolves a `.js`
 * specifier literally. One module with no dependencies is readable by the
 * script, the site and the suite alike.
 */
export function socialCardFacts(
  dataset: Dataset, newestReadDate: string, words: { product: string; tagline: string },
): SocialCardFacts {
  return {
    countries: dataset.countries.map((c) => c.name),
    scored: dataset.countries.flatMap((c) => c.routes).filter(isScored).length,
    quotedOnly: dataset.countries.flatMap((c) => c.routes).filter((r) => !isScored(r)).length,
    read: newestReadDate,
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
    <h1>${facts.headline} <em>${facts.tagline}</em></h1>
    <span class="stamps"><span class="mark">PR</span><span class="stamp">Rules read<br>${facts.read}</span></span>
  </div>
  <div class="foot">
    <span>${facts.countries.join(" · ")} · ${facts.scored} routes scored${facts.quotedOnly ? ` · ${facts.quotedOnly} quoted` : ""}</span>
    <span>every value with its official sentence · <b>checked daily</b></span>
  </div>
</div>`;
}
