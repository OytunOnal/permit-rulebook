/** Everything ABOVE the box: the site's header and the masthead. */
const ABOVE_THE_BOX = ".site-head, .masthead-with-stamps";

/**
 * The observer goes in once the page is at rest and reads `buffered: true`, so
 * it is handed every shift since the navigation, and `takeRecords()` hands
 * them over in the same task: the read needs no beat after it.
 *
 * Each source is named the way the field's debug rows name it — a path up to
 * the nearest id — with how far it travelled, so a failure says where to look.
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
  const observer = new PerformanceObserver(() => {});
  observer.observe({ type: "layout-shift", buffered: true });
  window.__cls = observer.takeRecords()
    .filter((e) => !e.hadRecentInput)
    .map((e) => ({
      value: e.value,
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
