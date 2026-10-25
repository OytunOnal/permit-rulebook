// @level infrastructure
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { childEnv } from "./child-env.mjs";
import { at, siteBase } from "./site-base.mjs";

/**
 * `astro dev`, owned by this process and proved before it is used.
 *
 * The smoke test needs it because the production build is not where a
 * module-graph failure shows. On 2026-09-07 a module in the data package
 * imported the filesystem at its top level; the interview died on import and
 * rendered no question — but only under `astro dev`, which serves the module
 * graph unbundled. Rollup drops the same module from the production bundle as
 * unused, so `dist/` looked healthy while the site a developer opens was dead.
 *
 * Two things this file will not do again.
 *
 * It will not hand the work to Astro 7's background daemon. The first cut ran
 * `npx astro dev`, which registers a managed background server; one of those
 * outlived its run, resolved a root that was not the site, and answered 404 to
 * every path while `astro dev status` called it healthy. `--ignore-lock` keeps
 * us out of that lock file entirely, the child is a foreground process this
 * harness spawns and kills, and the port is one the OS just told us is free.
 *
 * And it will not reuse a listener it did not start. The second cut trusted
 * Astro's "already running at <url>" claim, which comes from a state file
 * rather than from the port, and walked a stranger's process (coordinator,
 * 2026-09-07). There is no reuse path any more: we start our own or we fail.
 */

const SITE_ROOT = fileURLToPath(new URL("..", import.meta.url));
const ASTRO_BIN = join(SITE_ROOT, "node_modules", "astro", "bin", "astro.mjs");

/** A port nothing is listening on, chosen by the OS. */
async function freePort() {
  const probe = createServer();
  return new Promise((resolve, reject) => {
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

/** Whether `address` answers with a page yet. */
async function isAnswering(address) {
  try {
    const res = await fetch(address, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false; // not up yet: the caller asks again until its deadline
  }
}

/**
 * Why `body` is not this project's country list, or null when it is: JSON
 * whose `countries` is an array, as `src/pages/countries.json.ts` builds it.
 */
function notOurCountryList(body) {
  let list;
  try {
    list = JSON.parse(body);
  } catch (e) {
    return `not this project's country list (not JSON: ${e.message})`;
  }
  return Array.isArray(list?.countries) ? null : "not this project's country list";
}

/**
 * Is this origin serving THIS project?
 *
 * `/countries.json` is a fact of this build, so a 200 whose body is this
 * project's country list answers both halves of the question at once:
 * something is there, and it is us. A dev server with the wrong root answers
 * 404 here while looking perfectly healthy to its own manager — which is
 * exactly the failure this check exists for. `/@vite/client` is asked as well,
 * because a built `dist/` served by accident would pass the first test.
 *
 * Returns the reason it is not usable, or null when it is.
 */
export async function notOurDevServer(origin) {
  // Everything is asked for under the served root, base included.
  const root = origin.endsWith("/") ? origin : origin + "/";
  try {
    const countries = await fetch(`${root}countries.json`, { signal: AbortSignal.timeout(5000) });
    if (!countries.ok) return `${root}countries.json answered ${countries.status} — it serves nothing of this project`;
    const notOurs = notOurCountryList(await countries.text());
    if (notOurs) return `${root}countries.json answered ${notOurs}`;
    const client = await fetch(`${root}@vite/client`, { signal: AbortSignal.timeout(5000) });
    if (!client.ok) return `${root}@vite/client answered ${client.status} — not a dev server`;
    return null;
  } catch (e) {
    return `${root} could not be reached — ${e.message}`;
  }
}

/**
 * Start a dev server this process owns. `close` is safe to call twice, and the
 * child is killed on the way out of any failure, so no run leaves a listener.
 */
export async function startDev({ timeoutMs = 90000 } = {}) {
  if (!existsSync(ASTRO_BIN)) throw new Error(`astro is not installed at ${ASTRO_BIN}`);
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  // The dev server serves ONLY under its base. Probing the bare origin gets a
  // 404 for ever, which is exactly how CI waited ninety seconds for a dev
  // server that had been up the whole time (2026-09-08).
  const base = siteBase();
  const home = at(origin, base, "/");
  const output = [];

  const child = spawn(process.execPath,
    [ASTRO_BIN, "dev", "--port", String(port), "--host", "127.0.0.1", "--ignore-lock"],
    {
      // The site root, explicitly. A dev server started with the wrong root
      // answers 404 to every path while its own manager calls it healthy, which
      // is what the leaked daemon turned out to be.
      cwd: SITE_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
            // Astro 7 detects an agent environment and silently daemonises `astro
      // dev`. This is the CLI's own opt-out from that detection, and with no
      // `--background` flag the result is a plain foreground child. Together
      // with `--ignore-lock` no lock file is written or read, so this server is
      // invisible to `astro dev status` and dies with the process that started
      // it — which is the point.
      env: childEnv({ ASTRO_DEV_BACKGROUND: "0" }),
    });
  child.stdout.on("data", (c) => output.push(c.toString()));
  child.stderr.on("data", (c) => output.push(c.toString()));

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    try { child.kill(); } catch { /* already gone */ }
  };
  let exited = null;
  child.on("exit", (code) => { exited = code; });

  try {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      if (exited !== null)
        throw new Error(`astro dev exited (${exited}) before serving:\n${output.join("")}`);
      if (Date.now() > deadline)
        throw new Error(`astro dev did not serve ${home} in ${timeoutMs}ms:\n${output.join("")}`);
      if (await isAnswering(home)) break;
      await new Promise((r) => setTimeout(r, 300));
    }

    // Answering is not the same as serving this project.
    const wrong = await notOurDevServer(home);
    if (wrong)
      throw new Error(
        `the dev server this harness started is not serving the site: ${wrong}\n` +
        `  cwd was ${SITE_ROOT}\n${output.join("")}`,
      );

    return { origin, base, url: (path) => at(origin, base, path), close };
  } catch (e) {
    close();
    throw e;
  }
}
