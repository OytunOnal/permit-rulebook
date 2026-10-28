// @level infrastructure
import { TabEvents } from "./tab-events.mjs";
import { TabGestures } from "./tab-gestures.mjs";
import { TabPage } from "./tab-page.mjs";
import { TabWaits } from "./tab-waits.mjs";

/**
 * Opens a tab in the browser `connection` drives, attached and set up the
 * same way whichever it is, with its own lists of problems and requests, and
 * returns its page.
 *
 * `setup`: the screen (`viewport`, `mobile`), whether to keep the requests
 * (`network`), and the factor every tab is slowed by (`cpuSlowdown`).
 */
export async function openTab(connection, setup) {
  const { targetId } = await connection.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await connection.send("Target.attachToTarget", { targetId, flatten: true });
  const sendToTab = (method, params) => connection.send(method, params, sessionId);
  const events = new TabEvents(sendToTab, { network: setup.network });
  const waits = new TabWaits(sendToTab, events.forgetProblems);
  const gestures = new TabGestures(sendToTab, waits);
  connection.listenToTab(sessionId, (message) => {
    waits.watch(message);
    events.record(message);
  });
  await setUpTab(sendToTab, setup);
  return new TabPage(sendToTab, { waits, gestures, events, openTab: () => openTab(connection, setup) });
}

/** Enables the events the tab is read by, and sets its CPU and its screen. */
async function setUpTab(sendToTab, { viewport, mobile, cpuSlowdown }) {
  await sendToTab("Page.enable", {});
  await sendToTab("Runtime.enable", {});
  await sendToTab("Log.enable", {});
  // Every tab's requests are counted, since a page at rest has none in
  // flight; only a case that asks about the network keeps the list of them.
  await sendToTab("Network.enable", {});
  if (cpuSlowdown > 1) await sendToTab("Emulation.setCPUThrottlingRate", { rate: cpuSlowdown });
  await sendToTab("Emulation.setDeviceMetricsOverride", {
    width: viewport.width, height: viewport.height, deviceScaleFactor: 2, mobile,
  });
}
