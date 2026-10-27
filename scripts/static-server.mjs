// @level infrastructure
import { existsSync, realpathSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { sendBody } from "./html-in-pieces.mjs";
import { owned } from "./owned.mjs";
import { at, siteBase } from "./site-base.mjs";

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".ico": "image/x-icon", ".map": "application/json", ".txt": "text/plain",
};

/** Whether `file` stays inside `folder`: a `..` step out of it, or another drive, leaves it. */
function isInside(folder, file) {
  const fromFolder = relative(folder, file);
  const leavesIt = fromFolder === ".." || fromFolder.startsWith(`..${sep}`) || isAbsolute(fromFolder);
  return !leavesIt;
}

/** `file`'s real path, every link on the way to it followed; null when there is no such file. */
function realPathOf(file) {
  try { return realpathSync(file); } catch { return null; }
}

/**
 * The file `path` names in `folder`, its `index.html` for a folder; null when
 * there is none inside it. Inside means the path as written and the file's real
 * path both, so a link in the folder that leads out of it reaches nothing.
 */
function fileFor(folder, path) {
  const named = join(folder, path);
  if (!isInside(folder, named)) return null;
  const file = existsSync(named) && statSync(named).isDirectory() ? join(named, "index.html") : named;
  const real = realPathOf(file);
  // A file that is there sits under `folder`, so the folder is there too.
  const staysInside = real !== null && isInside(realpathSync(folder), real);
  return staysInside ? file : null;
}

/** Answers `status` with a word on why, and nothing of any file. */
function refuse(res, status, why) {
  res.writeHead(status);
  res.end(why);
}

/**
 * A static server over a directory, on a port the OS picks, mounted where the
 * build believes it lives.
 *
 * A site built for a subpath asks for its own assets under that subpath. Served
 * at the root it gets 404 for every stylesheet and script, and every measured
 * page comes out unstyled — which is how CI reported the identity pair as
 * missing and the interview as empty (2026-09-08).
 *
 * `delayJsMs` holds every `.js` response back by that many milliseconds while
 * the HTML goes out at once, and `htmlInPieces` sends the HTML in two (its
 * module says how): a phone's network, on a loopback that has none. Neither is
 * on by default: only the first-paint measurement asks, because what it
 * measures (the page rearranging itself) is invisible at local speed (s10, #236).
 *
 * It serves only what is inside `dir`. A request's path is outside text: an
 * escaped `../` (`..%2f`, or `..%5c` on Windows) is not found, nor is a file
 * reached through a link or junction in `dir` that leads out of it, and a path
 * whose escapes cannot be decoded is a bad request, never a thrown error (#245).
 */
export async function serve(dir, { base = siteBase(), delayJsMs = 0, htmlInPieces = /** @type {{ before: string, heldMs: number } | null} */ (null) } = {}) {
  const folder = resolve(dir);
  const server = createServer((req, res) => {
    let path = "";
    try { path = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { refuse(res, 400, "bad request"); return; }
    if (base && (path === base || path.startsWith(`${base}/`))) path = path.slice(base.length) || "/";
    const file = fileFor(folder, path);
    if (!file) { refuse(res, 404, "not found"); return; }
    const send = () => {
      res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
      sendBody(file, res, htmlInPieces);
    };
    if (delayJsMs > 0 && extname(file) === ".js") setTimeout(send, delayJsMs); else send();
  });
  // Port 0: the OS picks a free one. Never a fixed port — a harness that binds
  // 4321 fights the developer's own dev server for it.
  const port = await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
  const close = owned(() => { server.closeAllConnections?.(); server.close(); });
  const origin = `http://127.0.0.1:${port}`;
  return { port, origin, base, url: (path) => at(origin, base, path), close };
}
