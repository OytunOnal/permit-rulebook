// @level presentation
/**
 * The tap measure's report: each screen's lines as it is measured, then the
 * total and the exit code, from what `measureTaps` in `measure-taps.mjs`
 * hands over and returns. It reads, runs and prints nothing;
 * `main-measure-taps.mjs` prints what it returns.
 */
import { REQUIRED_CONTROLS } from "./required-controls.mjs";

/** Whether a drawn screen, named after a result, stopped short of the result screen. */
const isDrawnShortOfResult = (screen) => screen.kind === "drawn" && !screen.isResult;

/** Whether a drawn result compares routes, so draws a Strip, and none was found: only a result a notice answers outright has none. */
const isComparisonWithoutStrip = (screen) => {
  const comparesRoutes = screen.kind === "drawn" && screen.isResult && !screen.isAnsweredByNotice;
  return comparesRoutes && screen.stripLineCounts.length === 0;
};

/** The names of the controls a result was seeded to draw and drew none of, so they went unmeasured. */
const missingRequiredControlsOf = (screen) =>
  screen.requiredControls.filter((name) => screen.requiredControlCounts[name] === 0);

/** Whether a screen has a control under the floor, scrolls sideways, has a Strip line starting with a dot, is a drawn screen that is not a result, is a comparison with no Strip, or is missing a control it was seeded to draw. */
const hasProblem = (screen) =>
  screen.bad.length > 0 || screen.isOverflowing || screen.stripLinesStartingWithADot.length > 0
  || isDrawnShortOfResult(screen) || isComparisonWithoutStrip(screen) || missingRequiredControlsOf(screen).length > 0;

/** The ok line's note on how the Strip wrapped, said only where the screen draws one. */
const stripNoteOf = (screen) =>
  screen.stripLineCounts.length === 0 ? "" : `, Strip on ${screen.stripLineCounts.join("+")} line(s), none starting with a dot`;

/** The ok line's note on each control a seed can require, said only for the ones the screen draws. */
const requiredControlsNoteOf = (screen) => REQUIRED_CONTROLS
  .filter(({ name }) => screen.requiredControlCounts[name] > 0)
  .map(({ name, note }) => `, ${screen.requiredControlCounts[name]} ${note} among them`)
  .join("");

/** A screen's lines: one `ok`, or a `FAIL` and what put it there. */
export function screenLinesOf(screen) {
  if (!hasProblem(screen))
    return [`ok   ${screen.name} — ${screen.innerWidth}px, ${screen.controls} controls${requiredControlsNoteOf(screen)}, none under ${screen.floorPx}px, no overflow${stripNoteOf(screen)}`];
  const tapMin = screen.kind === "built" ? ` · --tap-min ${screen.tapMin}` : "";
  return [
    `FAIL ${screen.name}`,
    `     viewport ${screen.innerWidth}px · scrollWidth ${screen.scrollWidth}px · ${screen.controls} controls${tapMin}`,
    ...screen.bad.map((under) => `     under the floor: ${under}`),
    ...(screen.isOverflowing ? [`     horizontal overflow: ${screen.scrollWidth - screen.innerWidth}px`] : []),
    ...screen.stripLinesStartingWithADot.map((lineOpening) => `     Strip line starts with a dot: ${lineOpening}`),
    ...(isDrawnShortOfResult(screen) ? [`     not a result: stops at ${screen.questionAskedIfAny ?? "a screen with no question card"}`] : []),
    ...(isComparisonWithoutStrip(screen) ? ["     no Strip on a result that compares routes"] : []),
    ...missingRequiredControlsOf(screen).map((name) => `     no ${name} on a result seeded to draw one`),
  ];
}

/**
 * What the command prints once every screen's lines are out, `out` to stdout
 * and `err` to stderr, and the code it exits with: 0 when every screen is
 * clean, 1 when one is not, 2 when there was no `dist/` to measure.
 */
export function tapReportOf(measured) {
  if (!measured.isBuilt) return { out: [], err: ["run npm run build first: no dist/ to measure"], exitCode: 2 };
  const { screens, viewportWidth } = measured;
  const failures = screens.filter(hasProblem).length;
  const overflows = screens.filter((screen) => screen.isOverflowing).length;
  return {
    out: [`\n${screens.length} screens at ${viewportWidth} px — ${failures} with a problem (${overflows} overflowing)`],
    err: [],
    exitCode: failures === 0 ? 0 : 1,
  };
}
