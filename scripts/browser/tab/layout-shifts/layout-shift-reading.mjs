// @level infrastructure
/**
 * The one layout-shift reading every walk takes: what the page's own timeline
 * holds, read in the page.
 *
 * The observer goes in at the read and asks for `buffered: true`, so it is
 * handed every shift since the navigation, and `takeRecords()` hands them over
 * in the same task: the read needs no beat after it, and leaves no observer
 * behind, so a wait can ask it on every poll.
 *
 * A shift Chrome marks `hadRecentInput` is left out, as the field leaves it,
 * only once an input has reached the page: the page's first input, as its own
 * timeline holds it, came before the shift (#269). Under the harness's mobile
 * emulation Chrome sets each new document's viewport to the phone's in its
 * first moments and counts that change of the viewport's size as input, so the
 * shifts of the page's first half second come marked though the page received
 * none; left out, they would hide from the phone rows the page moving as it
 * first paints.
 *
 * Each source of a counted shift is named the way the field's debug rows name
 * it — a path up to the nearest id — with how far it travelled, so a failure
 * says where to look, and whether it lies in the caller's region.
 */

/**
 * @typedef {object} ReportedShift
 * @property {number} value
 * @property {boolean} markedAsInput Chrome marked it `hadRecentInput`.
 */

/**
 * @typedef {object} ShiftSource
 * @property {string} node The node it moved, as a path up to the nearest id.
 * @property {number} dx How far across it went, in pixels.
 * @property {number} dy How far down it went, in pixels.
 * @property {boolean} inRegion Whether it lies in the region the walk marks; false when the walk names none.
 */

/**
 * @typedef {object} CountedShift
 * @property {number} value
 * @property {number} startTime On the page's clock.
 * @property {ShiftSource[]} sources
 */

/**
 * @typedef {object} LayoutShifts
 * @property {string} address The address of the page they were read on.
 * @property {ReportedShift[]} reported Every shift Chrome reported to the page.
 * @property {CountedShift[]} counted Those the measure counts, as CLS counts them.
 */

/** The reading as a function of the page's, taking the region's selector, so one text serves every region. */
const READ_LAYOUT_SHIFTS = `((region) => {
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
    const records = observer.takeRecords();
    observer.disconnect();
    return records;
  };
  const [firstInput] = recordsOf("first-input");
  const cameAfterAnInput = (e) => firstInput !== undefined && e.startTime >= firstInput.startTime;
  const shifts = recordsOf("layout-shift");
  const reported = shifts.map((e) => ({ value: e.value, markedAsInput: e.hadRecentInput }));
  const counted = shifts
    .filter((e) => !(e.hadRecentInput && cameAfterAnInput(e)))
    .map((e) => ({
      value: e.value,
      startTime: e.startTime,
      sources: (e.sources ?? []).map((s) => {
        const el = elementOf(s.node);
        return {
          node: named(s.node),
          dx: Math.round(s.currentRect.x - s.previousRect.x),
          dy: Math.round(s.currentRect.y - s.previousRect.y),
          inRegion: region !== null && !!el && !!el.closest(region),
        };
      }),
    }));
  return JSON.stringify({ address: location.href, reported, counted });
})`;

/**
 * The expression that reads the page's layout shifts, a `LayoutShifts` as
 * JSON, its sources marked when they lie in `region` (a selector; none given
 * marks none).
 */
export const layoutShiftReadingExpression = (region) => `${READ_LAYOUT_SHIFTS}(${JSON.stringify(region ?? null)})`;
