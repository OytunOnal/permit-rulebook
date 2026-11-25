import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { walkSite } from "../scripts/browser/browser.mjs";
import { ABOVE_THE_BOX, shiftsBeforeAndAfterATap } from "./layout-shifts.js";
import { openAtRest } from "./browser-walk.js";
import { HELD_MODULE, VIEWPORTS, detail, dist, readMeasured, skipped } from "./first-paint-measure.js";

/**
 * The first paint, measured the way the field measures it: the HTML on screen
 * before the script lands, because on a loopback the module arrives with the
 * HTML and Chrome paints once, so CLS reads 0. The server holds the module
 * back (s10), and here the HTML too.
 */

/**
 * The same page with its HTML arriving in two pieces, split before the ledger,
 * and the module as late as above. Chrome paints while it waits for the rest:
 * a box parsed before the ledger the grid places first would be drawn in the
 * ledger's place and move when the ledger came, 272 px across at 1280x800 and
 * 105 px down on a phone. Throttling the CPU never paints mid-page here; a
 * network that pauses does. The phone rows see a shift Chrome marks as input
 * because the measure counts one until an input reaches the page; the last
 * rows prove it does, on a page that moves early and on a tap.
 */
describe.skipIf(skipped !== null)("the page arriving in pieces paints where it stays", () => {
  const LEDGER = '<details class="decl"'; // the ledger's opening tag in the built page: the marker the HTML is split before
  for (const screen of VIEWPORTS)
    it(`${screen.name} · /?country=fr, the HTML split before the ledger: nothing moves`, async () => {
      expect(readFileSync(join(dist, "index.html"), "utf8"), "the page has no ledger to split before").toContain(LEDGER);
      const site = { ...HELD_MODULE, htmlInPieces: { before: LEDGER, heldMs: 300 } };
      const { returned: m } = await walkSite({ site, screen, shiftRegion: ABOVE_THE_BOX }, async ({ page, url: addressOf }) => {
        await openAtRest(page, addressOf("/?country=fr"));
        return readMeasured(page);
      });
      expect(m.cls, `CLS ${m.cls} — ${detail(m)}`).toBe(0);
    }, 120000);
  for (const screen of VIEWPORTS.filter((s) => s.mobile))
    it(`${screen.name} · the measure counts a shift Chrome marks as input until a tap reaches the page`, async () => {
      const { returned: { before, after } } = await walkSite({ site: { folder: dist }, screen }, ({ page }) => shiftsBeforeAndAfterATap(page));
      expect(before.every.map((s) => s.markedAsInput), `none marked as input, so no subject: ${JSON.stringify(before)}`).toEqual([true]);
      expect(before.counted, "the page's own shift in its first frames went uncounted").toEqual(before.every.map((s) => s.value));
      expect(after.every.map((s) => s.markedAsInput), `the tap moved nothing: ${JSON.stringify(after)}`).toEqual([true, true]);
      expect(after.counted, "the shift the tap made was counted").toEqual(before.counted);
      expect([before.score, after.score], "the shift score is not what the measure counts").toEqual([before.counted[0], before.counted[0]]);
    }, 120000);
});
