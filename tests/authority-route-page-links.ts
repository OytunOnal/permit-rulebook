import { thisRouteOn } from "../src/lib/copy/quotes.js";
import { hostOf } from "../src/lib/quote.js";
import { esc, escAttr } from "../src/lib/reason.js";

/** A link to a route's Authority's route page (GLOSSARY) found in markup:
 * its markup, and where in the markup it starts. */
export interface AuthorityRoutePageLink {
  markup: string;
  at: number;
}

/** Each link in `html` to `authorityRoutePageUrl` in the copy module's words
 * for a link to a route's Authority's route page. */
export const authorityRoutePageLinksIn = (html: string, authorityRoutePageUrl: string): AuthorityRoutePageLink[] =>
  [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([^<]*)<\/a>/g)]
    .filter((m) => m[1] === escAttr(authorityRoutePageUrl) && m[2] === esc(thisRouteOn(hostOf(authorityRoutePageUrl))))
    .map((m) => ({ markup: m[0], at: m.index }));
