// @level presentation
/**
 * The assets command's arguments and report: `--check` and `--out <dir>` as
 * what is asked, and the render's or the check's report line and exit code,
 * from what `renderAssets` or `checkAssets` in `render-assets.mjs` returned.
 * It reads, runs and prints nothing; `main-render-assets.mjs` prints what it
 * returns.
 */
import { findOptionValue } from "./find-option-value.mjs";

/**
 * What the arguments ask for: `isCheck` for `--check`, and `outDir`, the
 * folder after `--out`, undefined when none is named, so the render writes
 * `public/`. Throws when `--out` names no folder.
 */
export function assetsAskedBy(argv) {
  const outDir = findOptionValue(argv, "--out", "--out names no folder: npm run assets -- --out <dir>");
  return { isCheck: argv.includes("--check"), outDir };
}

/** The render's report: one line naming the files written and the facts drawn, and exit 0. */
export function renderReportOf(rendered, facts) {
  return {
    out: [JSON.stringify({ level: "info", msg: "assets rendered", files: rendered.files, routes: facts.routesLine, read: facts.read })],
    exitCode: 0,
  };
}

/** Why the check fails, one message, or undefined when the committed assets are present and true. */
function checkFailureOf(checked) {
  if (checked.missing.length > 0) return `public/${checked.missing.join(", public/")} missing — run: npm run assets`;
  const { size, wantedSize, isWantedSize } = checked.card;
  if (!isWantedSize)
    return `social-card.png is ${size.width}x${size.height}, must be ${wantedSize.width}x${wantedSize.height}`;
  if (checked.differences.length === 0) return undefined;
  const lines = checked.differences.map(({ fact, drawn, today }) =>
    `${fact}: the image says ${JSON.stringify(drawn)}, the dataset says ${JSON.stringify(today)}`);
  return `social-card.png no longer tells the truth — run: npm run assets\n  ${lines.join("\n  ")}`;
}

/** The check's report: one line saying the assets are present and true and exit 0, or why not on stderr and exit 1. */
export function checkReportOf(checked, facts) {
  const failure = checkFailureOf(checked);
  if (failure !== undefined) return { err: [failure], exitCode: 1 };
  const { width, height } = checked.card.size;
  return {
    out: [JSON.stringify({ level: "info", msg: "assets present and true", social_card: `${width}x${height}`, routes: facts.routesLine, read: facts.read })],
    exitCode: 0,
  };
}
