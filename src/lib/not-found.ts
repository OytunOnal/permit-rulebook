import type { Dataset } from "permit-rulebook-data";
import { esc, escAttr } from "./reason.js";
import { PAGE_CSS } from "./route-page.js";
import { countryLinks, siteReadDate } from "./country-page.js";
import { DISCLAIMER, PRODUCT_NAME, SEAL_LETTERS, TAGLINE } from "./copy.js";
import { url } from "./site.js";
// One set of elements for the identity the shared CSS places (2026-09-08).
import { crumbs, iconLinks, rulesRead } from "./identity.js";

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
 * The pair is drawn by `identity.css`, reached through the route page's own
 * stylesheet. This module states none of its geometry, for the reason
 * `tests/identity.test.ts` gives: a second definition is how one product grows
 * two identities.
 */

export interface NotFoundPage {
  path: string;
  title: string;
  html: string;
}

export function notFoundPage(dataset: Dataset): NotFoundPage {
  const title = `This page does not exist · ${PRODUCT_NAME}`;
  const read = siteReadDate(dataset);
  const countries = countryLinks(dataset);

  const head = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="robots" content="noindex">
${iconLinks()}
<style>${PAGE_CSS}</style>`;

  const body = `<div class="wrap">

  <header class="masthead masthead-with-stamps">
    <div>
      ${crumbs()}
      <h1>This page does not exist. <em>${esc(TAGLINE)}</em></h1>
      <p class="lede">Nothing is published at that address — a link may have lost a character, or a page may have been renamed since it was shared.</p>
    </div>
    ${rulesRead(read)}
  </header>

  <main>
    <nav class="neighbours" aria-labelledby="countries-h">
      <h2 class="label" id="countries-h">Every country we hold rules for</h2>
      <ul>${countries.map((link) => `
        <li><a class="tap-min" href="${escAttr(url(link.path))}">${esc(link.name)}</a></li>`).join("")}
      </ul>
    </nav>

    <section class="cta" aria-labelledby="cta-h">
      <h2 class="visually-hidden" id="cta-h">Start from your own situation</h2>
      <p><strong>Or start from your own situation.</strong> The questions are answered on this device only — nothing is sent anywhere.</p>
      <a class="btn tap-min" href="${escAttr(url("/"))}">Check your own situation</a>
    </section>
  </main>

  <footer>
    <p class="disclaimer">${esc(DISCLAIMER)}</p>
  </footer>

</div>`;

  return {
    path: "/404",
    title,
    html: `<!doctype html>\n<html lang="en">\n<head>\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`,
  };
}
