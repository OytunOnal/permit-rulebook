// @level presentation
/**
 * The one printer every command's entry uses: a report's `err` lines to
 * stderr, its `out` lines to stdout, and, when it carries an `exitCode`, the
 * exit with that code. A report without one is part of a longer run, such as
 * a screen's lines printed as it is measured.
 */

/** Prints `report` to the terminal, then exits with its `exitCode` when it has one. */
export function printReport({ out = [], err = [], exitCode }) {
  for (const line of err) console.error(line);
  for (const line of out) console.log(line);
  if (exitCode !== undefined) process.exit(exitCode);
}
