// @level infrastructure

/**
 * The browser harness's entry. Every browser case, deploy job and live or
 * real-use walk takes its browser from here, as `walkSite` (the browser walk)
 * at `DESK` or `PHONE`; `BrowserPage` is the page a walker is handed.
 *
 * Beside the walk: `chromePath`, Chrome found for a caller that renders with
 * it, and `serve`, the built site's server for a caller that sends plain HTTP
 * and opens no browser (#245). The waits, the gestures, the layout-shift
 * reading and the error log stay inside the module.
 *
 * The site is served over HTTP, because a module script does not run from
 * `file://` and the interview would measure as a handful of static links. The
 * walk fails on the pages' errors, because on 2026-09-07 a dead interview
 * measured as "0 controls under the floor" and nothing noticed.
 */

export { chromePath } from "./chrome/chrome.mjs";
export { serve } from "./static-server/static-server.mjs";
export { DESK, PHONE } from "./walk/screens.mjs";
export { walkSite } from "./walk/walk-site.mjs";

/** @typedef {import("./tab/tab-page.mjs").BrowserPage} BrowserPage */
/** @typedef {import("./walk/screens.mjs").Screen} Screen */
/** @typedef {import("./layout-shifts/layout-shift-reading.mjs").LayoutShifts} LayoutShifts */
/** @typedef {import("./walk/walk-log.mjs").WalkError} WalkError */
