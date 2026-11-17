// @level presentation
/**
 * The tap measure's report: each screen's lines as it is measured, then the
 * total and the exit code, from what `measureTaps` in `measure-taps.mjs`
 * hands over and returns. It reads, runs and prints nothing;
 * `main-measure-taps.mjs` prints what it returns.
 */

/** Whether a drawn screen, named after a result, stopped short of the result screen. */
const isDrawnShortOfResult = (screen) => screen.kind === "drawn" && !screen.isResult;

/** Whether a drawn result compares routes, so draws a Strip, and none was found: only a result a notice answers outright has none. */
const isComparisonWithoutStrip = (screen) => {
  const comparesRoutes = screen.kind === "drawn" && screen.isResult && !screen.isAnsweredByNotice;
  return comparesRoutes && screen.stripLineCounts.length === 0;
};

/** Whether a screen has a control under the floor, scrolls sideways, has a Strip line starting with a dot, is a drawn screen that is not a result, or is a comparison with no Strip. */
const hasProblem = (screen) =>
  screen.bad.length > 0 || screen.isOverflowing || screen.stripLinesStartingWithADot.length > 0
  || isDrawnShortOfResult(screen) || isComparisonWithoutStrip(screen);

/** The ok line's note on how the Strip wrapped, said only where the screen draws one. */
const stripNoteOf = (screen) =>
  screen.stripLineCounts.length === 0 ? "" : `, Strip on ${screen.stripLineCounts.join("+")} line(s), none starting with a dot`;

/** A screen's lines: one `ok`, or a `FAIL` and what put it there. */
export function screenLinesOf(screen) {
  if (!hasProblem(screen))
    return [`ok   ${screen.name} — ${screen.innerWidth}px, ${screen.controls} controls, none under ${screen.floorPx}px, no overflow${stripNoteOf(screen)}`];
  const tapMin = screen.kind === "built" ? ` · --tap-min ${screen.tapMin}` : "";
  return [
    `FAIL ${screen.name}`,
    `     viewport ${screen.innerWidth}px · scrollWidth ${screen.scrollWidth}px · ${screen.controls} controls${tapMin}`,
    ...screen.bad.map((under) => `     under the floor: ${under}`),
    ...(screen.isOverflowing ? [`     horizontal overflow: ${screen.scrollWidth - screen.innerWidth}px`] : []),
    ...screen.stripLinesStartingWithADot.map((lineOpening) => `     Strip line starts with a dot: ${lineOpening}`),
    ...(isDrawnShortOfResult(screen) ? [`     not a result: stops at ${screen.questionAsked ?? "a screen with no question card"}`] : []),
    ...(isComparisonWithoutStrip(screen) ? ["     no Strip on a result that compares routes"] : []),
  ];
}

/**
 * What the command prints once every screen's lines are out, `out` to stdout
 * and `err` to stderr, and the code it exits with: 0 when every screen is
 * clean, 1 when one is not, 2 when there was no `dist/` to measure.
 */
export function tapReportOf(measured) {
  if (!measured.isBuilt) return { out: [], err: ["no dist/ — run npm run build first"], exitCode: 2 };
  const { screens, viewportWidth } = measured;
  const failures = screens.filter(hasProblem).length;
  const overflows = screens.filter((screen) => screen.isOverflowing).length;
  return {
    out: [`\n${screens.length} screens at ${viewportWidth} px — ${failures} with a problem (${overflows} overflowing)`],
    err: [],
    exitCode: failures === 0 ? 0 : 1,
  };
}
