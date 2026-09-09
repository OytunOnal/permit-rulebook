import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import dataset from "permit-rulebook-data/data/dataset.json";
import { routePages } from "../src/lib/route-page.js";
import { absolute, url } from "../src/lib/site.js";
import type { Dataset } from "permit-rulebook-data";

/**
 * The site has to be correct under any base.
 *
 * GitHub Pages serves a project repository at a subpath —
 * `https://oytunonal.github.io/permit-rulebook/` — and every root-absolute path
 * the site emits lands outside it: the route pages, the favicons, the social
 * card, the call to action, the data door. Astro's `base` comes from SITE_URL's
 * own path, and every internal URL goes through `url()` (2026-09-08).
 *
 * The whole-site half of this is `npm run check:base`, which builds under a
 * base and reads every emitted page back. It is a script and not a case here
 * for a reason worth knowing: a build spawned from inside a Vitest worker
 * ignores SITE_URL and emits a root-based site, with identical argv, cwd and
 * environment to the same command from a shell. A case here would have asserted
 * against a build the runner had quietly changed.
 */

/** The watch run the fingerprint is taken at: a day no dataset here carries. */
const FROZEN_RUN = "1970-01-01";

describe("the root build is what it was", () => {
  /**
   * The TEMPLATE's own output at the root, over a frozen two-route dataset —
   * not the data.
   *
   * It used to hash the live dataset's pages, so every one of the 23 differed
   * in CI the moment the data repository was checked out at its own origin
   * (2026-09-08): a read date moved and the fingerprint called it a template
   * change. The fixture beside this one holds a dataset that never moves, so
   * what this measures is what `route-page.ts` does with it — the markup, the
   * order, and every URL it writes at the root.
   *
   * The footer carries one value that is not the dataset's and moves by
   * itself: the watch's last run. The render takes it as an argument, and this
   * case passes a day no dataset here carries — otherwise the fingerprint
   * fails on every day the watch commits, which is what it did the first time
   * a data change reached the site through the dispatch (CI 2026-09-09), on a
   * build whose template had not changed at all.
   *
   * What it does NOT cover: anything that depends on the live dataset. A value
   * that changes, a route added, a source re-read on a new day — none of those
   * reach this case, and none of them should. `check:base` reads the real built
   * site back, and the rest of this suite renders the real dataset.
   */
  it("the template's own output over a frozen dataset is byte-identical to the fingerprint", () => {
    const fixture = JSON.parse(readFileSync(new URL("fixtures/root-build.json", import.meta.url), "utf8")) as
      { base: string; pages: Record<string, string> };
    const frozen = JSON.parse(readFileSync(new URL("fixtures/frozen-dataset.json", import.meta.url), "utf8")) as Dataset;
    const pages = routePages(frozen, FROZEN_RUN);
    expect(pages.length, "the frozen dataset stopped producing its two routes").toBe(2);
    expect(Object.keys(fixture.pages).length).toBe(pages.length);
    const moved: string[] = [];
    for (const page of pages) {
      const now = createHash("sha256").update(page.html).digest("hex");
      if (fixture.pages[page.path] !== now) moved.push(page.path);
    }
    expect(moved, "the root build changed — regenerate the fixture only on purpose").toEqual([]);
  });

  it("and the helper is the identity at the root, but for the slash a page ends in", () => {
    // A file keeps its name; a page gains the slash the host serves it at
    // (2026-09-08 — every sitemap entry used to answer 301).
    for (const path of ["/", "/favicon.svg", "/germany/x.json"])
      expect(url(path), path).toBe(path);
    expect(url("/germany/eu-blue-card-general")).toBe("/germany/eu-blue-card-general/");
    expect(absolute("/germany/x")).toBe("https://permitrulebook.com/germany/x/");
  });
});

describe("the same paths under a subpath", () => {
  const BASE = "/permit-rulebook";

  it("every internal path is prefixed once, and only once", () => {
    expect(url("/", BASE)).toBe(`${BASE}/`);
    expect(url("/favicon.svg", BASE)).toBe(`${BASE}/favicon.svg`);
    expect(url("/germany/eu-blue-card-general", BASE)).toBe(`${BASE}/germany/eu-blue-card-general/`);
    expect(url("/germany/eu-blue-card-general.json", BASE)).toBe(`${BASE}/germany/eu-blue-card-general.json`);
    // A base Astro hands over with its trailing slash, and a path without a
    // leading one, both land in the same place — no doubled or missing slash.
    expect(url("germany/x", `${BASE}/`)).toBe(`${BASE}/germany/x/`);
    expect(url("/germany/x", `${BASE}/`)).toBe(`${BASE}/germany/x/`);
  });

  it("nothing it returns is root-absolute any more", () => {
    for (const path of ["/", "/favicon.ico", "/social-card.png", "/germany/x", "/status"]) {
      const under = url(path, BASE);
      expect(under.startsWith(`${BASE}/`), `${path} escaped the base`).toBe(true);
      expect(under.includes("//"), `${path} doubled a slash`).toBe(false);
    }
  });

  it("the whole-site check exists and is wired into the build", () => {
    // The case above proves the helper; `npm run check:base` proves the site.
    const scripts = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).scripts;
    expect(scripts["check:base"]).toBe("node scripts/check-base.mjs");
    const workflow = readFileSync(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");
    expect(workflow).toContain("npm run check:base");
  });
});
