// @level presentation
import type { Dataset, WatchState } from "permit-rulebook-data";
import { esc, escAttr } from "./reason.js";
import { framedPageHtml } from "./frame/framed-page.js";
import { countryLinks } from "./slug.js";
import { reckonDatasetFacts } from "./dataset-facts/reckon-dataset-facts.js";
import {
  NOT_FOUND_COUNTRIES_HEADING, NOT_FOUND_HEADLINE, NOT_FOUND_LEDE, NOT_FOUND_START, NOT_FOUND_START_NOTE, NOT_FOUND_TITLE,
} from "./copy/not-found.js";
import { CHECK_YOUR_OWN_SITUATION, TAGLINE } from "./copy/frame.js";
import { url, watchState } from "./site.js";
// One set of elements for the identity the shared CSS places (2026-09-08).
import { rulesRead } from "./identity.js";

/**
 * The page a wrong address lands on.
 *
 * The isolated product critique of 2026-09-08 (B4) requested
 * `/nope-not-here` from the live host and got a body titled "Page not found ·
 * GitHub Pages": another company's branding, no masthead, no way back. A
 * mistyped URL, a shared link that lost a character, a route whose slug
 * changed — all of them ended on someone else's error page, on a domain whose
 * whole promise is that it says where every sentence came from.
 *
 * GitHub Pages serves `/404.html` for any unknown path when the site carries
 * one, so this is that file, in the product's own design: the masthead with the
 * identity pair, one sentence, and the two ways on — the interview, and the
 * four countries. Nothing else; a person who is lost needs a door, not a page.
 *
 * The second door's heading is the sentence the reader sees. It was a hidden
 * h2 over a bold paragraph that opened with the same words — read twice by a
 * screen reader, seen once — so the bold sentence is the h2 now, drawn as the
 * sentence was (`.cta-text`, in the shared sheet), and the section is labelled
 * by it (v1.1 gate critique, P8 — s27).
 *
 * The pair is drawn by `identity.css`, reached through the route page's own
 * stylesheet. This module states none of its geometry, for the reason
 * `tests/identity-written-once.test.ts` gives: a second definition is how one product grows
 * two identities.
 */

export interface NotFoundPage {
  path: string;
  title: string;
  html: string;
}

/** The 404, its stamp and its footer from `state`'s reckoning of the dataset's facts. */
export function notFoundPage(dataset: Dataset, state: WatchState = watchState): NotFoundPage {
  const facts = reckonDatasetFacts(dataset, state);
  const title = NOT_FOUND_TITLE;
  const read = facts.readRange.newest;
  const countries = countryLinks(dataset);

  const content = `<header class="masthead masthead-with-stamps">
    <div>
      <h1>${esc(NOT_FOUND_HEADLINE)} <em>${esc(TAGLINE)}</em></h1>
      <p class="lede">${esc(NOT_FOUND_LEDE)}</p>
    </div>
    ${rulesRead(read)}
  </header>

  <main>
    <nav class="neighbours" aria-labelledby="countries-h">
      <h2 class="label" id="countries-h">${esc(NOT_FOUND_COUNTRIES_HEADING)}</h2>
      <ul>${countries.map((link) => `
        <li><a class="tap-min" href="${escAttr(url(link.path))}">${esc(link.name)}</a></li>`).join("")}
      </ul>
    </nav>

    <section class="cta" aria-labelledby="cta-h">
      <div class="cta-text">
        <h2 id="cta-h">${esc(NOT_FOUND_START)}</h2>
        <p>${esc(NOT_FOUND_START_NOTE)}</p>
      </div>
      <a class="btn tap-min" href="${escAttr(url("/"))}">${esc(CHECK_YOUR_OWN_SITUATION)}</a>
    </section>
  </main>`;

  const html = framedPageHtml(dataset, {
    title, headTags: ['<meta name="robots" content="noindex">'], facts, content,
  });
  return { path: "/404", title, html };
}
