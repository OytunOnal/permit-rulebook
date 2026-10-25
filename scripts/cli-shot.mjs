// @level presentation
/**
 * The README picture's command line: where to write it, from the arguments,
 * and the written picture's line, from what `takeShot` in `shot.mjs`
 * returned. It reads, runs and prints nothing; `main-shot.mjs` prints what it
 * returns.
 */

/** `takeShot`'s options from the command's arguments: the first, when given, is where the picture goes. */
export function shotOptionsOf(args) {
  return args[0] === undefined ? {} : { path: args[0] };
}

/** What the command prints to stdout: where the picture went, its size from the PNG's header, and its weight; exit 0. */
export function shotReportOf({ path, png }) {
  return { out: [`${path} — ${png.readUInt32BE(16)}×${png.readUInt32BE(20)}, ${(png.length / 1024).toFixed(0)} KB`], exitCode: 0 };
}
