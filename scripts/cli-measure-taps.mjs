// @level presentation
/**
 * The tap measure's report: each screen's lines, the total, and the exit code,
 * from what `measureTaps` in `measure-taps.mjs` returned. It reads, runs and
 * prints nothing; `main-measure-taps.mjs` prints what it returns.
 */

/** Whether a screen has a control under the floor or scrolls sideways. */
const hasProblem = (screen) => screen.bad.length > 0 || screen.isOverflowing;

/** A screen's lines: one `ok`, or a `FAIL` and what put it there. */
function screenLines(screen, floorPx) {
  if (!hasProblem(screen))
    return [`ok   ${screen.name} — ${screen.innerWidth}px, ${screen.controls} controls, none under ${floorPx}px, no overflow`];
  const tapMin = screen.kind === "built" ? ` · --tap-min ${screen.tapMin}` : "";
  return [
    `FAIL ${screen.name}`,
    `     viewport ${screen.innerWidth}px · scrollWidth ${screen.scrollWidth}px · ${screen.controls} controls${tapMin}`,
    ...screen.bad.map((under) => `     under the floor: ${under}`),
    ...(screen.isOverflowing ? [`     horizontal overflow: ${screen.scrollWidth - screen.innerWidth}px`] : []),
  ];
}

/**
 * What the command prints, `out` to stdout and `err` to stderr, and the code
 * it exits with: 0 when every screen is clean, 1 when one is not, 2 when there
 * was no `dist/` to measure.
 */
export function tapReportOf(measured) {
  if (!measured.isBuilt) return { out: [], err: ["no dist/ — run npm run build first"], exitCode: 2 };
  const { screens, floorPx, viewportWidth } = measured;
  const failures = screens.filter(hasProblem).length;
  const overflows = screens.filter((screen) => screen.isOverflowing).length;
  return {
    out: [
      ...screens.flatMap((screen) => screenLines(screen, floorPx)),
      `\n${screens.length} screens at ${viewportWidth} px — ${failures} with a problem (${overflows} overflowing)`,
    ],
    err: [],
    exitCode: failures === 0 ? 0 : 1,
  };
}
