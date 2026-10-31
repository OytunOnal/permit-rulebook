// @level presentation
import type { Dataset } from "permit-rulebook-data";
import { esc } from "../reason.js";
import { analyticsBeacon, headMeta, type WatchRun } from "../site.js";
import { contentSecurityPolicy } from "./head/csp.js";
import { footerFacts } from "./body/footer-facts.js";
import { FRAME_SHEET, withLineFeedEndings } from "./head/frame-sheet.js";
import { iconLinks } from "./head/icon-links.js";
import { MENU_SCRIPT } from "./body/menu-script.js";
import { navCountries } from "./body/nav-countries.js";
import { siteFooter, type FooterPlace } from "./body/site-footer.js";
import { siteHeader } from "./body/site-header.js";

/**
 * The frame: what every page of the site carries around its own content, the
 * same on every page — the head, the header, the footer and the menu.
 *
 * The six pages built as strings (route, country, data, feedback, 404 and the
 * `/status` redirect) each typed it out on their own, so a change to it was six
 * edits and a page could drift from the others unseen (#142). Here a page
 * hands over what differs and gets back the whole document; the interview,
 * which Astro builds, takes the frame's pieces and places them itself.
 */

/** Where a page stands: it marks the header and the footer, and gives the footer's JSON and check links. */
export type PagePlace = FooterPlace;

/** What a page hands the frame: everything that is its own. */
export interface PageInFrame {
  title: string;
  /** What a link preview says: none on the 404 and the status page. */
  meta?: { description: string; path: string; kind: "article" | "website" };
  /** The page's own head lines, right after the policy: data's ld+json, 404's robots, status's refresh. */
  headTags?: string[];
  /** The page's own style rules, after the frame's. */
  css?: string;
  place?: PagePlace;
  /** The watch run the footer reports; what it leaves out is read from the watch's state. */
  run?: WatchRun;
  /** Everything between the header and the footer, the masthead included. */
  content: string;
  /** Inline scripts beyond the menu: feedback's copy script. */
  scripts?: string[];
}

/** The document's head: the frame's lines with the page's own placed among them. */
function headOf(page: PageInFrame): string {
  return [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${esc(page.title)}</title>`,
    contentSecurityPolicy(),
    ...(page.headTags ?? []),
    iconLinks(),
    ...(page.meta ? [headMeta({ title: page.title, ...page.meta })] : []),
    `<style>${FRAME_SHEET}${withLineFeedEndings(page.css ?? "")}</style>`,
  ].join("\n");
}

/** The header and the footer a page stands between, both marked for where it stands. */
function headerAndFooterOf(dataset: Dataset, place: PagePlace, run?: WatchRun): { header: string; footer: string } {
  const countries = navCountries(dataset);
  return {
    header: siteHeader(countries, place),
    footer: siteFooter(countries, footerFacts(dataset, run), place),
  };
}

/** The document's body: the page's content between the header and the footer, then the scripts. */
function bodyOf(dataset: Dataset, page: PageInFrame): string {
  const { header, footer } = headerAndFooterOf(dataset, page.place ?? {}, page.run);
  const scripts = [MENU_SCRIPT, ...(page.scripts ?? [])].map((source) => `<script>${source}</script>\n`).join("");
  return `<div class="wrap">\n\n  ${header}\n\n  ${page.content}\n\n  ${footer}\n\n</div>\n${scripts}${analyticsBeacon()}`;
}

/** A page built as a string, in the frame: the whole document. */
export function framedPageHtml(dataset: Dataset, page: PageInFrame): string {
  return `<!doctype html>\n<html lang="en">\n<head>\n${headOf(page)}\n</head>\n<body>\n${bodyOf(dataset, page)}\n</body>\n</html>\n`;
}

/** The frame's pieces the interview page places in its own Astro head and body. */
export interface InterviewFrame {
  policy: string;
  icons: string;
  header: string;
  footer: string;
  menuScript: string;
}

/** The interview page's frame: its policy, icon links, header, footer and menu script. */
export function interviewFrameOf(dataset: Dataset): InterviewFrame {
  return {
    policy: contentSecurityPolicy(),
    icons: iconLinks(),
    // The interview stands at the root, where "Check yours" leads.
    ...headerAndFooterOf(dataset, { here: "/" }),
    menuScript: MENU_SCRIPT,
  };
}
