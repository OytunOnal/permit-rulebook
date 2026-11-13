// @level infrastructure

/**
 * The browser harness's entry. Every browser case, deploy job and live or
 * real-use walk takes its browser from here, as `walkSite` (the browser walk)
 * at `DESK` or `PHONE`; `PageOnSite` is what a walker is handed, `BrowserPage`
 * the page in it, and `SentRequest` a request that page sent. `WidthFailure`
 * is what the walk's page fails with when a page lays out wider or narrower
 * than the screen, so a walker can keep that failure and throw any other.
 * `ERRORS_KEPT` is how many errors a walk keeps; it counts the rest.
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
export { ERRORS_KEPT } from "./walk/walk-log.mjs";
export { WidthFailure, walkSite } from "./walk/walk-site.mjs";

/** @typedef {import("./tab/open-tab.mjs").BrowserPage} BrowserPage */
/** @typedef {import("./tab/open-tab.mjs").SentRequest} SentRequest */
/** @typedef {import("./walk/walk-site.mjs").PageOnSite} PageOnSite */
/** @typedef {import("./walk/screens.mjs").Screen} Screen */
/** @typedef {import("./tab/open-tab.mjs").LayoutShifts} LayoutShifts */
/** @typedef {import("./walk/walk-log.mjs").WalkError} WalkError */
