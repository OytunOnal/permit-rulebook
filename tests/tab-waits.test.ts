import { afterEach, describe, expect, it, vi } from "vitest";
import { TabWaits } from "../scripts/browser/browser.mjs";

/**
 * A gesture's wait (`TabWaits`, from `scripts/browser/browser.mjs`) on a
 * stand-in tab that never reports its first input, never leaves its document
 * and is never hidden: what a tap that opens a new tab leaves behind when
 * Chrome never records that input (#453).
 */

/** The document the gesture leaves, as the stand-in tab names it on every read. */
const DOCUMENT_LEFT = "1";

/** A tab that answers every read of the page with "not held", on the document the gesture left. */
function createNeverReportingTab() {
  const tab = {
    reads: 0,
    sendToTab: async (method: string) => {
      if (method !== "Runtime.evaluate") throw new Error(`the stand-in tab answers only Runtime.evaluate, not ${method}`);
      tab.reads++;
      return { result: { value: { held: false, document: DOCUMENT_LEFT } } };
    },
  };
  return tab;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("a gesture's wait on a page that never reports its first input", () => {
  it("ends once the page has opened a tab, and says a tab opened", async () => {
    const tab = createNeverReportingTab();
    // The tab opens once the wait has read the page twice and found no input.
    const hasOpenedATab = () => tab.reads >= 2;
    const ended = await new TabWaits(tab.sendToTab).waitUntilFirstInputReportedOrLeftOrTabOpened(DOCUMENT_LEFT, hasOpenedATab);
    expect(tab.reads).toBeGreaterThanOrEqual(2);
    expect(ended).toBe("tab opened");
  });

  it("runs out at its backstop when the page opens no tab", async () => {
    vi.useFakeTimers();
    const tab = createNeverReportingTab();
    const waiting = new TabWaits(tab.sendToTab).waitUntilFirstInputReportedOrLeftOrTabOpened(DOCUMENT_LEFT, () => false);
    const outcome = expect(waiting).rejects.toThrow(/the page never reported its first input \(waited \d+ ms\)/);
    await vi.runAllTimersAsync();
    await outcome;
  });
});
