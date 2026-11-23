// @level infrastructure
import { closeChrome, launchChrome, readCpuSlowdown, sweepStaleProfiles } from "../../chrome/chrome-launch.mjs";
import { DevToolsConnection } from "../../connection/devtools-connection.mjs";
import { owned } from "../../exit-register/owned.mjs";
import { openTab } from "../../tab/open-tab.mjs";
import { answersForTheTrafficCounter } from "../traffic-counter/traffic-counter.mjs";
import { WalkLog } from "../walk-log/walk-log.mjs";

/**
 * The requests a walk's tabs answer, let go on or refuse: the traffic
 * counter's answered as `trafficCounter` asks, the walked site's own origin
 * `siteOrigin` let go on, and every other address refused.
 *
 * @returns {import("../../tab/open-tab.mjs").AnsweredRequests}
 */
function answersOnTheSite(trafficCounter, siteOrigin) {
  return { ...answersForTheTrafficCounter(trafficCounter), goesOut: (url) => new URL(url).origin === siteOrigin };
}

/**
 * Headless Chrome in a fresh profile, attached over CDP, with one tab open on
 * `screen`: that tab's page, the log its tabs keep across the walk, and the
 * close that ends the browser. Every tab answers the traffic counter's
 * requests itself, as `trafficCounter` asks, lets requests to the walked
 * site's origin `siteOrigin` go on, and refuses any other, naming it among
 * the walk's errors.
 *
 * The viewport is set through CDP's `Emulation.setDeviceMetricsOverride`,
 * because `--window-size` does not reach a `--dump-dom` render — the first cut
 * of the tap harness reported `innerWidth 500` while claiming 390.
 * `BROWSER_CPU_SLOWDOWN` slows every tab.
 */
export async function openBrowser({ screen, network, scrollbars, shiftRegion, trafficCounter, siteOrigin }) {
  const answeredRequests = answersOnTheSite(trafficCounter, siteOrigin);
  sweepStaleProfiles();
  const cpuSlowdown = readCpuSlowdown();
  const chrome = await launchChrome({ scrollbars });
  const connection = await DevToolsConnection.open(chrome.devToolsUrl);
  const close = owned(() => {
    connection.close();
    closeChrome(chrome);
  });
  const walkLog = new WalkLog();
  const page = await openTab(connection, { screen, network, cpuSlowdown, shiftRegion, answeredRequests, walkLog });
  walkLog.showTab(page);
  return { page, walkLog, close };
}
