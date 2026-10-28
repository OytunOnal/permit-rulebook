import type { BrowserPage } from "../scripts/browser/browser.mjs";

/** Everything ABOVE the box: the site's header and the masthead, the region the browser cases mark. */
export const ABOVE_THE_BOX = ".site-head, .masthead-with-stamps";

/**
 * How many layout shifts Chrome keeps for an observer that asks for those
 * before it: the later ones are dropped, so a read that finds this many
 * cannot say none came after.
 */
const SHIFTS_CHROME_BUFFERS = 150;

/**
 * The shifts the first paint's measure counts on the page since `sinceMs` on
 * the page's clock (0: since the page loaded), summed as CLS sums them: one
 * measure for every case that asserts nothing shifted.
 */
export async function shiftScoreSince(page: Pick<BrowserPage, "readLayoutShifts">, sinceMs = 0): Promise<number> {
  const { reported, counted } = await page.readLayoutShifts();
  if (reported.length >= SHIFTS_CHROME_BUFFERS)
    throw new Error(`Chrome kept ${reported.length} shifts and dropped any after: the score cannot be read`);
  return counted.filter((e) => e.startTime >= sinceMs).reduce((sum, e) => sum + e.value, 0);
}

/**
 * A page that moves twice: once Chrome has reported its first paint to it,
 * with nothing done to it, and in answer to a tap. A frame was presented
 * before that first move, so the move is a shift: a move made before the first
 * paint is no shift at all (#269). It falls in the half second after Chrome
 * sets the phone's viewport, so Chrome marks it as input. It notes in
 * `window.__shiftReported` when Chrome has reported a shift to it, and in
 * `window.__tapped` that a tap reached it; `#below` is the block to tap.
 */
export const MOVES_EARLY_AND_ON_A_TAP = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1"><script>
const moveDown = (text) => {
  const block = document.createElement("p");
  block.style.height = "100px";
  block.textContent = text;
  document.body.prepend(block);
};
new PerformanceObserver((_, observer) => {
  observer.disconnect();
  moveDown("in the first frames");
}).observe({ type: "paint", buffered: true });
new PerformanceObserver(() => { window.__shiftReported = true; }).observe({ type: "layout-shift", buffered: true });
addEventListener("click", () => { moveDown("on the tap"); window.__tapped = true; });
</script></head><body><p>above</p><p id="below" style="height:400px">below</p></body></html>`;

export interface ShiftsSeen {
  every: { value: number; markedAsInput: boolean }[];
  counted: number[];
  /** What `shiftScoreSince` reads since the page loaded. */
  score: number;
}

const shiftsSeenOn = async (page: Pick<BrowserPage, "readLayoutShifts">): Promise<ShiftsSeen> => {
  const { reported, counted } = await page.readLayoutShifts();
  return { every: reported, counted: counted.map((e) => e.value), score: await shiftScoreSince(page) };
};

/** The page that moves early and on a tap, as its steps drive it. */
type MovingPage = Pick<BrowserPage, "waitUntil" | "waitUntilAtRest">;

/** On the page that moves early and on a tap: returns once its own move has been reported as a shift and it is at rest. */
export async function waitUntilItsEarlyMoveIsReported(page: MovingPage): Promise<void> {
  await page.waitUntil("window.__shiftReported === true", "the page's move in its first frames was never reported as a shift");
  await page.waitUntilAtRest();
}

/** On the page that moves early and on a tap: makes `tap`, and returns once the tap has reached the page and it is at rest. */
export async function tapAndWaitUntilAtRest(page: MovingPage, tap: () => Promise<void>): Promise<void> {
  await tap();
  await page.waitUntil("window.__tapped === true", "the tap never reached the page");
  await page.waitUntilAtRest();
}

/**
 * The page that moves early and on a tap, read once at rest after its own
 * move and again after the tap: what a phone row's measure can see.
 */
export async function shiftsBeforeAndAfterATap(
  page: Pick<BrowserPage, "goto" | "readLayoutShifts" | "clickAt"> & MovingPage,
): Promise<{ before: ShiftsSeen; after: ShiftsSeen }> {
  await page.goto(`data:text/html,${encodeURIComponent(MOVES_EARLY_AND_ON_A_TAP)}`);
  await waitUntilItsEarlyMoveIsReported(page);
  const before = await shiftsSeenOn(page);
  await tapAndWaitUntilAtRest(page, () => page.clickAt(100, 300));
  return { before, after: await shiftsSeenOn(page) };
}
