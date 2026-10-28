// @level infrastructure
import { serve } from "../static-server/static-server.mjs";
import { at, siteBase } from "../../site-base.mjs";
import { openBrowser } from "./open-browser.mjs";

/**
 * @typedef {import("../tab/tab-page.mjs").BrowserPage} BrowserPage
 * @typedef {import("./screens.mjs").Screen} Screen
 * @typedef {import("./walk-log.mjs").WalkError} WalkError
 * @typedef {import("../layout-shifts/layout-shift-reading.mjs").LayoutShifts} LayoutShifts
 */

/**
 * A site a walk opens: a folder served for the walk (the built site's `dist/`,
 * or fixture pages), with the static server's options; or a live address.
 *
 * @typedef {{ folder: string, delayJsMs?: number, htmlInPieces?: { before: string, heldMs: number } | null }
 *   | { address: string }} Site
 */

/**
 * @typedef {object} Walk
 * @property {Site} site
 * @property {Screen} screen `DESK` or `PHONE`.
 * @property {boolean} [network] Keep the list of the page's requests.
 * @property {boolean} [scrollbars] Show the platform's scrollbars.
 * @property {boolean} [errorsExpected] Return the pages' errors rather than fail on them.
 * @property {string | null} [shiftRegion] A selector whose shifts are marked; a live walk names none.
 */

/**
 * What a walker is handed: the page, and what makes the site's addresses from its paths.
 *
 * @typedef {object} PageOnSite
 * @property {BrowserPage} page
 * @property {(path: string) => string} url
 */

/**
 * @template T
 * @typedef {object} Walked
 * @property {T} returned What the walker returned.
 * @property {LayoutShifts} shifts The shifts of the page on screen when the walk ended, with its address.
 * @property {WalkError[]} errors Every error of the walk, across its navigations and tabs, each with its address.
 */

/** The width a page laid out at, or null on a tab that has opened no page yet. */
const LAID_OUT_WIDTH = 'location.href === "about:blank" ? null : innerWidth';

/** The site `site` names, open for the walk: what makes its addresses, and what closes it. */
async function openSite(site) {
  if ("address" in site) {
    const { origin } = new URL(site.address);
    return { url: (path) => at(origin, siteBase(site.address), path), close: () => {} };
  }
  const { folder, ...serving } = site;
  const server = await serve(folder, serving);
  return { url: server.url, close: server.close };
}

/**
 * The width check of a walk on `screen`, read once: on the first page drawn,
 * or at the walk's end on the page on screen when the walker drew none with
 * `goto`. It answers the failure naming both widths, or null.
 */
function widthCheckOn(screen) {
  let checked = null;
  const failureAt = (width) => (width === null || width === screen.viewport.width ? null
    : new Error(`the page laid out at innerWidth ${width}, not the screen's ${screen.viewport.width}`));
  return (page) => {
    checked ??= page.evaluate(LAID_OUT_WIDTH).then(failureAt);
    return checked;
  };
}

/** `page`, its `goto` failing with `checkWidth`'s failure once the page it opens has drawn. */
function checkingWidthOnDraw(page, checkWidth) {
  return {
    ...page,
    goto: async (url) => {
      await page.goto(url);
      const failure = await checkWidth(page);
      if (failure) throw failure;
    },
  };
}

/** The walk's errors as the lines of a failure, each under its address. */
function errorReport(errors) {
  const listed = errors.map((e) => `  ${e.address}: ${e.message}`).join("\n");
  return `the walk's pages threw or logged ${errors.length} error(s):\n${listed}`;
}

/** Fails with every error of the walk, each under its address, unless there is none. */
function failOnErrors(errors) {
  if (errors.length > 0) throw new Error(errorReport(errors));
}

/**
 * Adds the walk's errors, each under its address, to `failure`'s message: the
 * walker's own failure, or its width check's, would otherwise hide the error
 * that broke the page. The failure keeps its class, so an assertion's diff
 * still shows.
 */
function addTheWalksErrors(failure, errors) {
  if (errors.length > 0 && failure instanceof Error) failure.message += `\n${errorReport(errors)}`;
  return failure;
}

/** What `walker` returns on `site`; its failure carries the errors `walkLog` holds. */
async function returnedBy(walker, site, walkLog) {
  try {
    return await walker(site);
  } catch (failure) {
    throw addTheWalksErrors(failure, walkLog.errors());
  }
}

/** What the walk measured once `walker` has returned `returned`, read from the browser's `walkLog`, after its width and errors are checked. */
async function measuredAtTheEnd(walkLog, returned, { checkWidth, errorsExpected }) {
  const onScreen = walkLog.tabOnScreen();
  const widthFailure = await checkWidth(onScreen);
  const errors = walkLog.errors();
  if (widthFailure) throw addTheWalksErrors(widthFailure, errors);
  if (!errorsExpected) failOnErrors(errors);
  return { returned, shifts: await onScreen.readLayoutShifts(), errors };
}

/** The walk in a browser opened for it, on the site whose addresses `url` makes. */
async function walkInBrowser(walk, url, walker) {
  const { screen, network = false, scrollbars = false, errorsExpected = false, shiftRegion = null } = walk;
  const browser = await openBrowser({ screen, network, scrollbars, shiftRegion });
  try {
    const checkWidth = widthCheckOn(screen);
    const returned = await returnedBy(walker, { page: checkingWidthOnDraw(browser.page, checkWidth), url }, browser.walkLog);
    return await measuredAtTheEnd(browser.walkLog, returned, { checkWidth, errorsExpected });
  } finally {
    browser.close();
  }
}

/**
 * The browser walk: opens `walk.site` at `walk.screen` in a fresh profile,
 * hands `walker` the page and the site's addresses, and returns what it
 * measured. It fails, naming both widths, when the first page drawn is not
 * the screen's width, and, listing them, on the pages' errors unless
 * `walk.errorsExpected`. A failure of the walker's own, or of the width,
 * lists the pages' errors under its message.
 *
 * @template T
 * @param {Walk} walk
 * @param {(site: PageOnSite) => Promise<T>} walker
 * @returns {Promise<Walked<T>>}
 */
export async function walkSite(walk, walker) {
  const opened = await openSite(walk.site);
  try {
    return await walkInBrowser(walk, opened.url, walker);
  } finally {
    opened.close();
  }
}
