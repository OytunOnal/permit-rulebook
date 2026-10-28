// @level infrastructure
import { closeChrome, launchChrome, readCpuSlowdown, sweepStaleProfiles } from "../chrome/chrome-launch.mjs";
import { DevToolsConnection } from "../connection/devtools-connection.mjs";
import { owned } from "../exit-register/owned.mjs";
import { openTab } from "../tab/open-tab.mjs";
import { WalkLog } from "./walk-log.mjs";

/**
 * Headless Chrome in a fresh profile, attached over CDP, with one tab open on
 * `viewport`, emulated as a phone when `mobile`: that tab's page, the log its
 * tabs keep across the walk, and the close that ends the browser.
 *
 * The viewport is set through CDP's `Emulation.setDeviceMetricsOverride`,
 * because `--window-size` does not reach a `--dump-dom` render — the first cut
 * of the tap harness reported `innerWidth 500` while claiming 390.
 * `BROWSER_CPU_SLOWDOWN` slows every tab.
 */
export async function openBrowser({ viewport, mobile, network, scrollbars, shiftRegion }) {
  sweepStaleProfiles();
  const cpuSlowdown = readCpuSlowdown();
  const chrome = await launchChrome({ scrollbars });
  const connection = await DevToolsConnection.open(chrome.devToolsUrl);
  const close = owned(() => {
    connection.close();
    closeChrome(chrome);
  });
  const walkLog = new WalkLog();
  const page = await openTab(connection, { viewport, mobile, network, cpuSlowdown, shiftRegion, walkLog });
  walkLog.showTab(page);
  return { page, walkLog, close };
}
