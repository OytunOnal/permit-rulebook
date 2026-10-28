// @level infrastructure
import { chromePath } from "./chrome/chrome.mjs";
import { openBrowser } from "./walk/open-browser.mjs";

// The built site's server: every walk takes both it and the browser from this module (#245).
export { serve } from "./static-server/static-server.mjs";
export { DESK, PHONE } from "./walk/screens.mjs";
export { walkSite } from "./walk/walk-site.mjs";

/** @typedef {import("./tab/tab-page.mjs").BrowserPage} BrowserPage */
/** @typedef {import("./walk/screens.mjs").Screen} Screen */
/** @typedef {import("./layout-shifts/layout-shift-reading.mjs").LayoutShifts} LayoutShifts */
/** @typedef {import("./walk/walk-log.mjs").WalkError} WalkError */

/**
 * A real browser over the built site, shared by everything that needs one.
 *
 * Two things here are not optional, and both were learned by getting them
 * wrong. The site is served over HTTP, because a module script does not run
 * from `file://` and the interview would measure as a handful of static links.
 * And the viewport is set through device emulation (`openBrowser` says why).
 *
 * It also collects everything the page throws. `measure:taps` walks elements and
 * saw a completely dead interview as "0 controls under the floor": on
 * 2026-09-07 the client script died on import, no question ever rendered, and
 * nothing in the suite or the harness noticed.
 */

/**
 * Headless Chrome, attached over CDP, handed to `run` as a `BrowserPage`.
 * `shiftRegion`: a selector whose shifts the page's `readLayoutShifts` marks.
 */
export async function withBrowser(run, {
  viewport = { width: 390, height: 844 }, mobile = true, network = false, scrollbars = false,
  shiftRegion = /** @type {string | null} */ (null),
} = {}) {
  const { page, close } = await openBrowser({ viewport, mobile, network, scrollbars, shiftRegion });
  try {
    return await run(page);
  } finally {
    close();
  }
}

export { chromePath };
