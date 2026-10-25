// @level infrastructure
import { createReadStream, readFileSync } from "node:fs";
import { extname } from "node:path";

/**
 * A file's body, sent the way the browser harness's server is asked to send it.
 *
 * `htmlInPieces`, `{ before, heldMs }`, sends an HTML page holding `before` in
 * two pieces: everything up to `before` at once, the rest `heldMs` later — a
 * phone's network pausing mid-page, on a loopback that delivers a page whole.
 * Chrome paints while it waits for the rest, so a page whose parts are placed
 * out of their document order shows what a reader sees in that frame (#236).
 * An HTML page without `before`, and every other file, goes in one piece.
 */
export function sendBody(file, res, htmlInPieces) {
  if (!htmlInPieces || extname(file) !== ".html") { createReadStream(file).pipe(res); return; }
  const page = readFileSync(file);
  const at = page.indexOf(htmlInPieces.before);
  if (at < 0) { res.end(page); return; }
  res.write(page.subarray(0, at));
  setTimeout(() => res.end(page.subarray(at)), htmlInPieces.heldMs);
}
