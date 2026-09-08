import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Does the site actually run in a browser?
 *
 * On 2026-09-07 the interview rendered nothing at all — the client script threw
 * on import, `/` showed an empty declaration panel and no question — and all
 * 111 tests passed, because they run in Node. `measure:taps` reported "0
 * controls under the floor", because it counts elements and a dead page has
 * none. Nothing in this repository looked at the page.
 *
 * This does. It drives real Chrome over `astro dev` and over `dist/`, and it
 * asserts two things per page: that the reader's own landmarks are on the
 * screen, and that the page threw nothing at all. The dev surface is not
 * optional — that failure appeared only there, because Rollup drops an unused
 * module from the production bundle, so the built site looked healthy while the
 * site a developer opens was dead.
 *
 * It is slow (a browser, a dev server) and it needs Chrome, so it is skipped
 * where Chrome is absent — loudly, and never in CI, where a pipeline that
 * cannot open the site must not report that the site is fine.
 */

const { chromePath } = await import("../scripts/chrome.mjs");
const { smoke, CHECKS, DEFAULT_SURFACES } = await import("../scripts/smoke.mjs");
const { notOurDevServer } = await import("../scripts/dev-server.mjs");

const dist = fileURLToPath(new URL("../dist", import.meta.url));

function why(): string | null {
  try {
    chromePath();
  } catch (e) {
    return (e as Error).message;
  }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}

const skipped = why();

/**
 * Announced on the process's own stderr, before any test runs.
 *
 * Vitest's default reporter hides a passing test's console output, so a warning
 * written the ordinary way is invisible in exactly the run that needs it. This
 * goes straight to the stream: a skipped browser check has to be impossible to
 * miss, because a silent one reports that the site is fine when nothing looked
 * at it.
 */
if (!skipped && !DEFAULT_SURFACES.includes("dev"))
  process.stderr.write([
    "",
    "  note: the dev server surface is a local check and was not walked here.",
    "        CI walks dist/, which is the artifact that deploys.",
    "",
  ].join(String.fromCharCode(10)));

if (skipped)
  process.stderr.write([
    "",
    `  !! THE SITE WAS NOT OPENED IN A BROWSER: ${skipped}.`,
    "     Nothing in this run checked that the interview renders.",
    "     Run: npm run build && npm run smoke",
    "",
    "",
  ].join("\n"));

describe("the site, in a real browser", () => {
  it("never lets a pipeline skip the browser check", () => {
    // On a laptop the notice above is the whole story. In CI it is a failure.
    if (skipped) expect(process.env.CI, `CI cannot skip: ${skipped}`).toBeFalsy();
    else expect(skipped).toBeNull();
  });

  it.skipIf(skipped !== null)(
    "renders the interview and a route page on both surfaces, throwing nothing",
    async () => {
      const results = await smoke();
      // Every check on every surface this run is meant to walk. In CI that is
      // `dist/`, the artifact that actually deploys; locally it is that and
      // the dev server too (human ruling, 2026-09-08). A run that walked fewer
      // than it claims proves less than it claims.
      expect(results.length).toBe(CHECKS.length * DEFAULT_SURFACES.length);
      expect(new Set(results.map((r: { surface: string }) => r.surface)))
        .toEqual(new Set(DEFAULT_SURFACES));
      expect(DEFAULT_SURFACES).toContain("dist");

      const broken = results.filter((r: { failures: string[] }) => r.failures.length);
      expect(broken.map((r: { surface: string; path: string; failures: string[] }) =>
        `[${r.surface}] ${r.path}: ${r.failures.join("; ")}`)).toEqual([]);

      // Said positively too, so a check that stopped checking cannot pass quietly.
      for (const r of results) {
        expect(r.thrown, `[${r.surface}] ${r.path} threw`).toEqual([]);
        // Said positively per page, so a check that stopped checking cannot
        // pass quietly. Four surfaces now: the interview, a route page, a
        // country page and the data page (site map, 2026-09-08).
        if (r.path === "/") {
          expect(r.value.question.length, `[${r.surface}] no question`).toBeGreaterThan(0);
          expect(r.value.options, `[${r.surface}] no answers`).toBeGreaterThan(0);
        } else if (r.path === "/data/") {
          expect(r.value.heading, `[${r.surface}] no heading`).toContain("The data");
          expect(r.value.facts, `[${r.surface}] no facts about the dataset`).toBeGreaterThan(4);
        } else if (r.path === "/germany/") {
          expect(r.value.cards, `[${r.surface}] no route cards`).toBeGreaterThan(7);
          expect(r.value.here, `[${r.surface}] the header marks nothing`).toBe("Germany");
        } else {
          expect(r.value.rules, `[${r.surface}] no rule cards`).toBeGreaterThan(2);
          expect(r.value.stamp, `[${r.surface}] no stamp`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      }
    },
    180000,
  );
});

/**
 * The harness's own guard, pinned.
 *
 * `startDev` used to reuse whatever was listening, on Astro's word that a dev
 * server was "already running" — a claim that comes from a state file, not from
 * the port. When that server had gone and another process held the port, the
 * smoke test walked the stranger and reported the site broken with 404s
 * (coordinator, 2026-09-07). These run without Chrome, so the guard is checked
 * even where the browser walk is skipped.
 */
describe("the harness refuses to walk a process it did not start", () => {
  it("rejects a listener that serves none of this project's routes", async () => {
    const { createServer } = await import("node:http");
    const stranger = createServer((_req, res) => { res.writeHead(404); res.end("Cannot GET /"); });
    const port: number = await new Promise((r) =>
      stranger.listen(0, "127.0.0.1", () => r((stranger.address() as { port: number }).port)));
    try {
      const reason = await notOurDevServer(`http://127.0.0.1:${port}`);
      expect(reason).toContain("/status answered 404");
      expect(reason).toContain("serves no routes of this project");
    } finally {
      stranger.close();
    }
  }, 30000);

  it("rejects the built site served statically — real pages, but not a dev server", async () => {
    if (!existsSync(dist)) return;
    const { serve } = await import("../scripts/browser.mjs");
    const server = await serve(dist);
    try {
      // The first half of the check passes here: it is our product, with its
      // own /status page. Only the second half catches it.
      // The served root, not the bare origin: under a base the origin is not
      // the site, and the check would reject it for the wrong reason.
      expect(await notOurDevServer(server.url("/"))).toContain("@vite/client");
    } finally {
      server.close();
    }
  }, 30000);

  it("rejects a port with nothing on it", async () => {
    expect(await notOurDevServer("http://127.0.0.1:1")).toContain("could not be reached");
  }, 30000);
});
