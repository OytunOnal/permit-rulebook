// @level infrastructure
import { chromePath } from "./chrome/chrome.mjs";
import { closeChrome, launchChrome, readCpuSlowdown, sweepStaleProfiles } from "./chrome/chrome-launch.mjs";
import { DevToolsConnection } from "./connection/devtools-connection.mjs";
import { owned } from "./exit-register/owned.mjs";
import { openTab } from "./tab/open-tab.mjs";

// The built site's server: every walk takes both it and the browser from this module (#245).
export { serve } from "./static-server/static-server.mjs";

/**
 * A real browser over the built site, shared by everything that needs one.
 *
 * Two things here are not optional, and both were learned by getting them
 * wrong. The site is served over HTTP, because a module script does not run
 * from `file://` and the interview would measure as a handful of static links.
 * And the viewport is set through CDP's `Emulation.setDeviceMetricsOverride`,
 * because `--window-size` does not reach a `--dump-dom` render — the first cut
 * of the tap harness reported `innerWidth 500` while claiming 390.
 *
 * It also collects everything the page throws. `measure:taps` walks elements and
 * saw a completely dead interview as "0 controls under the floor": on
 * 2026-09-07 the client script died on import, no question ever rendered, and
 * nothing in the suite or the harness noticed.
 */

/**
 * Headless Chrome, attached over CDP, handed to `run` as a small page object:
 *
 *   openTab()          a second tab in the same browser
 *   front()            bring this tab to the front
 *   goto(url)          navigate, and return once the new document has drawn
 *   navigate(url)      navigate, and return at once
 *   waitUntil(c, what) read a condition until it holds, return its value
 *   waitUntilAtRest()  wait until nothing animates, scrolls or loads
 *   waitUntilNewDocumentDrawn()  after a gesture that loads a document
 *   evaluate(expr)     run an expression in the page, return its value
 *   emulateMedia(fs)   set a media feature, such as reduced motion
 *   clickAt(x, y)      a mouse click at a point of the viewport, once the page reports it
 *   pressEnter()       Enter pressed and released, once the page reports it
 *   type(text)         text typed into the focused field
 *   back()             the browser's own Back
 *   forward()          the browser's own Forward
 *   screenshot()       the screen as a PNG
 *   problems()         everything the page has thrown or logged as an error
 *   allProblems()      the same, the traffic counter's local noise included
 *   requests()         every request the page made, when asked to watch
 *   forgetRequests()   empty that list
 */
export async function withBrowser(run, {
  viewport = { width: 390, height: 844 }, mobile = true, network = false, scrollbars = false,
} = {}) {
  sweepStaleProfiles();
  const cpuSlowdown = readCpuSlowdown();
  const chrome = await launchChrome({ scrollbars });
  const connection = await DevToolsConnection.open(chrome.devToolsUrl);
  const release = owned(() => {
    connection.close();
    closeChrome(chrome);
  });
  const page = await openTab(connection, { viewport, mobile, network, cpuSlowdown });

  try {
    return await run(page);
  } finally {
    release();
  }
}

export { chromePath };
