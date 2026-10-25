// @level presentation
/**
 * The one printer every command's entry uses: a report's `err` lines to
 * stderr and its `out` lines to stdout. It never exits: each entry exits with
 * its report's `exitCode` itself, and a report printed as part of a longer
 * run, such as a screen's lines printed as it is measured, carries none.
 */

/** Prints `report`'s lines to the terminal: its `err` lines to stderr, then its `out` lines to stdout. */
export function printReport({ out = [], err = [] }) {
  for (const line of err) console.error(line);
  for (const line of out) console.log(line);
}
