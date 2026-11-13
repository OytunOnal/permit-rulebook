import { describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PageLoad } from "../scripts/smoke.mjs";

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

const { serve, ERRORS_KEPT } = await import("../scripts/browser/browser.mjs");
const { smoke, CHECKS, DEFAULT_SURFACES } = await import("../scripts/smoke.mjs");
const { notOurDevServer } = await import("../scripts/dev-server.mjs");
const { skipReason, whyNoChrome } = await import("./browser-walk.js");

const dist = fileURLToPath(new URL("../dist", import.meta.url));

const skipped = skipReason();

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

/** A phone's viewport, as every fixture page declares it, so the walk's width check holds. */
const VIEWPORT_META = '<meta name="viewport" content="width=device-width, initial-scale=1">';

/** A quiet fixture page. */
const QUIET = `<!doctype html><html><head>${VIEWPORT_META}</head><body><p>nothing happens here</p></body></html>`;

/** A fixture page that throws `message` as it loads. */
const throwing = (message: string) =>
  `<!doctype html><html><head>${VIEWPORT_META}</head><body><script>throw new Error(${JSON.stringify(message)});</script></body></html>`;

/** Every page smoke's checks open, quiet, by file name, and the icon Chrome asks every site for, so its absence is no error. */
const QUIET_SITE: Record<string, string> = {
  "favicon.ico": "",
  "index.html": QUIET,
  "germany/eu-blue-card-general/index.html": QUIET,
  "germany/index.html": QUIET,
  "data/index.html": QUIET,
};

/** Smoke's results on the `dist` surface over `pages`, served from a folder made for this walk alone and removed after it. */
async function smokeOver(pages: Record<string, string>): Promise<PageLoad[]> {
  const folder = mkdtempSync(join(tmpdir(), "permit-rulebook-smoke-"));
  try {
    for (const [name, html] of Object.entries(pages)) {
      mkdirSync(dirname(join(folder, name)), { recursive: true });
      writeFileSync(join(folder, name), html);
    }
    return await smoke({ dir: folder, surfaces: ["dist"] });
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

const noChrome = whyNoChrome();

describe.skipIf(noChrome !== null)("smoke's results over fixture pages", () => {
  it("a page that throws shows its error in that page's line", async () => {
    const thrown = "the interview broke";
    const results = await smokeOver({ ...QUIET_SITE, "index.html": throwing(thrown) });
    const interview = results.find((r) => r.path === "/");
    expect(interview?.failures.join("\n")).toContain(`the page threw — exception: Error: ${thrown}`);
    expect(results.filter((r) => r.path !== "/").flatMap((r) => r.thrown)).toEqual([]);
  }, 60000);

  it("a page that throws after sending the reader to an address no check opens fails smoke in a line of its own, naming that address and the error", async () => {
    const thrown = "the page the reader was sent to broke";
    // The interview's stand-in line keeps the first page from counting as
    // drawn, so the walk waits on the page it sends the reader to.
    const sendsTheReaderOn = `<!doctype html><html><head>${VIEWPORT_META}<script>location.replace("moved/");</script></head><body><p class="stand-in">…</p></body></html>`;
    const results = await smokeOver({ ...QUIET_SITE, "index.html": sendsTheReaderOn, "moved/index.html": throwing(thrown) });
    const unplaced = results.filter((r) => r.path.endsWith("/moved/"));
    expect(unplaced.map((r) => r.failures.length)).toEqual([1]);
    expect(unplaced[0]?.failures[0]).toContain(`the page threw — exception: Error: ${thrown}`);
    expect(results.filter((r) => !r.path.endsWith("/moved/")).flatMap((r) => r.failures).join("\n")).not.toContain(thrown);
  }, 60000);

  it("errors past the walk's cap fail smoke in a line of their own, saying how many came, placed on no page", async () => {
    expect(ERRORS_KEPT, "the harness's entry gives no cap").toBeGreaterThan(0);
    const pastTheCap = 7;
    const logsPastTheCap = `<!doctype html><html><head>${VIEWPORT_META}</head><body><script>
for (let i = 0; i < ${ERRORS_KEPT + pastTheCap}; i++) console.error("logged error " + i);
</script></body></html>`;
    const results = await smokeOver({ ...QUIET_SITE, "index.html": logsPastTheCap });
    const capLines = results.flatMap((r) => r.failures).filter((f) => f.includes("past the walk's cap"));
    expect(capLines).toEqual([`and ${pastTheCap} more errors past the walk's cap, not placed on any page`]);
  }, 60000);
});

/**
 * The probe's reason for refusing a local server that answers each path in
 * `answers` with a 200 and its body, and every other path with a 404; null
 * when the probe accepts it. The server is closed before this returns.
 */
async function probeRefusalFor(answers: Map<string, string>): Promise<string | null> {
  const { createServer } = await import("node:http");
  const server = createServer((req, res) => {
    const body = answers.get(req.url ?? "");
    res.writeHead(body === undefined ? 404 : 200);
    res.end(body ?? "Cannot GET /");
  });
  const port: number = await new Promise((r) =>
    server.listen(0, "127.0.0.1", () => r((server.address() as { port: number }).port)));
  try {
    return await notOurDevServer(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
  }
}

/**
 * Our name on `/data/` and a Vite client, as a copy of the frame would give,
 * with someone else's `/countries.json`: a bare list of names.
 */
async function lookalikeAnswers(): Promise<Map<string, string>> {
  const { PRODUCT_NAME } = await import("../src/lib/copy/frame.ts");
  return new Map([
    ["/data/", `<h1>${PRODUCT_NAME}</h1>`],
    ["/@vite/client", ""],
    ["/countries.json", JSON.stringify(["Germany", "France"])],
  ]);
}

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
    const reason = await probeRefusalFor(new Map());
    expect(reason).toContain("/countries.json answered 404");
    expect(reason).toContain("serves nothing of this project");
  }, 30000);

  it("rejects the built site served statically — real pages, but not a dev server", async () => {
    if (!existsSync(dist)) return;
    const server = await serve(dist);
    try {
      // The first half of the check passes here: it is our product, with its
      // own /countries.json. Only the second half catches it.
      // The served root, not the bare origin: under a base the origin is not
      // the site, and the check would reject it for the wrong reason.
      expect(await notOurDevServer(server.url("/"))).toContain("@vite/client");
    } finally {
      server.close();
    }
  }, 30000);

  it("rejects a dev server that shows the product's name but not this project's country list", async () => {
    const reason = await probeRefusalFor(await lookalikeAnswers());
    expect(reason).toContain("/countries.json");
    expect(reason).toContain("not this project's country list");
  }, 30000);

  it("rejects a port with nothing on it", async () => {
    expect(await notOurDevServer("http://127.0.0.1:1")).toContain("could not be reached");
  }, 30000);
});
