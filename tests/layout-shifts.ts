import type { BrowserPage } from "./browser-walk.js";

/** Everything ABOVE the box: the site's header and the masthead. */
const ABOVE_THE_BOX = ".site-head, .masthead-with-stamps";

/**
 * The observer goes in once the page is at rest and reads `buffered: true`, so
 * it is handed every shift since the navigation, and `takeRecords()` hands
 * them over in the same task: the read needs no beat after it.
 *
 * A shift Chrome marks `hadRecentInput` is left out, as the field leaves it,
 * only once an input has reached the page: the page's first input, as its own
 * timeline holds it, came before the shift. Under the harness's mobile
 * emulation Chrome sets each new document's viewport to the phone's in its
 * first moments and counts that change of the viewport's size as input, so the
 * shifts of the page's first half second come marked though the page received
 * none; leaving those out blinded the phone rows to the page moving as it
 * first paints (#243).
 *
 * It leaves every shift Chrome reported in `window.__shiftsReported`, and those
 * the measure counts in `window.__cls`. Each source is named the way the
 * field's debug rows name it — a path up to the nearest id — with how far it
 * travelled, so a failure says where to look.
 */
export const GATHER_SHIFTS = `(() => {
  const elementOf = (node) => node && (node.nodeType === 1 ? node : node.parentElement);
  const named = (node) => {
    const parts = [];
    const pathCanTake = (el) => el && el !== document.body && parts.length < 4;
    for (let el = elementOf(node); pathCanTake(el); el = el.parentElement) {
      if (el.id) { parts.unshift("#" + el.id); break; }
      parts.unshift(el.tagName.toLowerCase() + (el.classList[0] ? "." + el.classList[0] : ""));
    }
    return parts.join(">") || "?";
  };
  const recordsOf = (type) => {
    const observer = new PerformanceObserver(() => {});
    observer.observe({ type, buffered: true });
    return observer.takeRecords();
  };
  const [firstInput] = recordsOf("first-input");
  const afterAnInput = (e) => firstInput !== undefined && e.startTime >= firstInput.startTime;
  const shifts = recordsOf("layout-shift");
  window.__shiftsReported = shifts.map((e) => ({ value: e.value, markedAsInput: e.hadRecentInput }));
  window.__cls = shifts
    .filter((e) => !(e.hadRecentInput && afterAnInput(e)))
    .map((e) => ({
      value: e.value,
      startTime: e.startTime,
      sources: (e.sources ?? []).map((s) => {
        const el = elementOf(s.node);
        return {
          node: named(s.node),
          dx: Math.round(s.currentRect.x - s.previousRect.x),
          dy: Math.round(s.currentRect.y - s.previousRect.y),
          above: !!el && !!el.closest(${JSON.stringify(ABOVE_THE_BOX)}),
        };
      }),
    }));
})()`;

/**
 * How many layout shifts Chrome keeps for an observer that asks for those
 * before it: the later ones are dropped, so a read that finds this many
 * cannot say none came after.
 */
const SHIFTS_CHROME_BUFFERS = 150;

/** The measure's shifts since `sinceMs` on the page's clock, summed as CLS sums them, and how many Chrome kept. */
const shiftScoreRead = (sinceMs: number) => `(() => {
  ${GATHER_SHIFTS};
  const kept = window.__shiftsReported.length;
  const score = window.__cls.filter((e) => e.startTime >= ${sinceMs}).reduce((sum, e) => sum + e.value, 0);
  return JSON.stringify({ kept, score });
})()`;

/**
 * The shifts the first paint's measure counts on the page since `sinceMs` on
 * the page's clock (0: since the page loaded), summed as CLS sums them: one
 * measure for every case that asserts nothing shifted (#243).
 */
export async function shiftScoreSince(page: Pick<BrowserPage, "evaluate">, sinceMs = 0): Promise<number> {
  const { kept, score } = JSON.parse(await page.evaluate(shiftScoreRead(sinceMs))) as { kept: number; score: number };
  if (kept >= SHIFTS_CHROME_BUFFERS) throw new Error(`Chrome kept ${kept} shifts and dropped any after: the score cannot be read`);
  return score;
}

/**
 * A page that moves twice: in its second frame, with nothing done to it, and
 * in answer to a tap. The first frame is painted before the move, so the move
 * is a shift; it falls in the half second after Chrome sets the phone's
 * viewport, so Chrome marks it as input.
 */
const MOVES_EARLY_AND_ON_A_TAP = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1"><script>
const moveDown = (text) => {
  const block = document.createElement("p");
  block.style.height = "100px";
  block.textContent = text;
  document.body.prepend(block);
};
requestAnimationFrame(() => requestAnimationFrame(() => {
  moveDown("in the first frames");
  window.__movedEarly = true;
}));
addEventListener("click", () => { moveDown("on the tap"); window.__tapped = true; });
</script></head><body><p>above</p><p style="height:400px">below</p></body></html>`;

/** Every shift Chrome reported, and the values of those the measure counts. */
const SHIFTS_SEEN = `(() => {
  ${GATHER_SHIFTS};
  return JSON.stringify({ every: window.__shiftsReported, counted: window.__cls.map((e) => e.value) });
})()`;

export interface ShiftsSeen {
  every: { value: number; markedAsInput: boolean }[];
  counted: number[];
  /** What `shiftScoreSince` reads since the page loaded. */
  score: number;
}

const shiftsSeenOn = async (page: Pick<BrowserPage, "evaluate">): Promise<ShiftsSeen> =>
  ({ ...JSON.parse(await page.evaluate(SHIFTS_SEEN)), score: await shiftScoreSince(page) }) as ShiftsSeen;

/**
 * The page that moves early and on a tap, read once at rest after its own
 * move and again after the tap: what a phone row's measure can see (#243).
 */
export async function shiftsBeforeAndAfterATap(
  page: Pick<BrowserPage, "goto" | "evaluate" | "clickAt" | "waitUntil" | "waitUntilAtRest">,
): Promise<{ before: ShiftsSeen; after: ShiftsSeen }> {
  await page.goto(`data:text/html,${encodeURIComponent(MOVES_EARLY_AND_ON_A_TAP)}`);
  await page.waitUntil("window.__movedEarly === true", "the page never moved in its first frames");
  await page.waitUntilAtRest();
  const before = await shiftsSeenOn(page);
  await page.clickAt(100, 300);
  await page.waitUntil("window.__tapped === true", "the tap never reached the page");
  await page.waitUntilAtRest();
  return { before, after: await shiftsSeenOn(page) };
}
