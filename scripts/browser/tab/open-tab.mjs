// @level infrastructure
import { answerPausedRequest, pauseEveryRequest } from "./answered-requests/answered-requests.mjs";
import { TabEvents } from "./page/tab-events.mjs";
import { TabGestures } from "./page/tab-gestures.mjs";
import { TabPage } from "./page/tab-page.mjs";
import { TabWaits } from "./page/tab-waits.mjs";

export { answerRequestsOfWhatThePageOpens } from "./answered-requests/answered-requests.mjs";

/**
 * The tab's entry, the one way into it: `openTab`; `answerRequestsOfWhatThePageOpens`,
 * which gives a tab or worker a page opens the same request handling; and the
 * types a caller reads off what they return.
 *
 * @typedef {import("./page/tab-page.mjs").BrowserPage} BrowserPage
 * @typedef {import("./page/tab-page.mjs").SentRequest} SentRequest
 * @typedef {import("./layout-shifts/layout-shift-reading.mjs").LayoutShifts} LayoutShifts
 * @typedef {import("./answered-requests/answered-requests.mjs").AnsweredRequests} AnsweredRequests
 */

/**
 * Opens a tab in the browser `connection` drives, attached and set up the
 * same way whichever it is, with its own list of requests, and returns its
 * page.
 *
 * `setup`: the `screen`, whether to keep the requests
 * (`network`), the factor every tab is slowed by (`cpuSlowdown`), the
 * region whose shifts are marked (`shiftRegion`, a selector or null), the
 * requests the tab answers itself and the ones it lets go on to the network,
 * refusing the rest (`answeredRequests`, an `AnsweredRequests`),
 * and the browser's `WalkLog`, which every tab's errors and fronting reach.
 */
export async function openTab(connection, setup) {
  const { targetId } = await connection.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await connection.send("Target.attachToTarget", { targetId, flatten: true });
  const sendToTab = (method, params) => connection.send(method, params, sessionId);
  const events = new TabEvents(sendToTab, { network: setup.network, walkLog: setup.walkLog });
  const waits = new TabWaits(sendToTab);
  const gestures = new TabGestures(sendToTab, waits);
  const requestHandling = { sendToTab, answers: setup.answeredRequests, walkLog: setup.walkLog };
  connection.listenToTab(sessionId, (message) => {
    waits.watch(message);
    events.record(message);
    answerPausedRequest(requestHandling, message);
  });
  await setUpTab(sendToTab, setup);
  return new TabPage(sendToTab, {
    waits, gestures, events, openTab: () => openTab(connection, setup), shiftRegion: setup.shiftRegion, walkLog: setup.walkLog,
  });
}

/** Enables the events the tab is read by, pauses every request for it to answer, let go on or refuse, and sets its CPU and its screen. */
async function setUpTab(sendToTab, { screen, cpuSlowdown }) {
  await pauseEveryRequest(sendToTab);
  await sendToTab("Page.enable", {});
  await sendToTab("Runtime.enable", {});
  await sendToTab("Log.enable", {});
  // Every tab's requests are counted, since a page at rest has none in
  // flight; only a case that asks about the network keeps the list of them.
  await sendToTab("Network.enable", {});
  if (cpuSlowdown > 1) await sendToTab("Emulation.setCPUThrottlingRate", { rate: cpuSlowdown });
  await sendToTab("Emulation.setDeviceMetricsOverride", {
    width: screen.viewport.width, height: screen.viewport.height, deviceScaleFactor: 2, mobile: screen.mobile,
  });
}
