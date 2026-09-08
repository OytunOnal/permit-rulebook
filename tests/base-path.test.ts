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

describe("the root build is what it was", () => {
  /**
   * The 23 route pages, hashed before the base-path change went in. A helper
   * that returns its argument unchanged at the root has to leave every byte
   * where it was; regenerating this fixture is a deliberate act, and it means
   * the root build moved.
   */
  it("every route page is byte-identical to the fingerprint taken before the change", () => {
    const fixture = JSON.parse(readFileSync(new URL("fixtures/root-build.json", import.meta.url), "utf8")) as
      { base: string; pages: Record<string, string> };
    const pages = routePages(dataset as unknown as Dataset);
    expect(Object.keys(fixture.pages).length).toBe(pages.length);
    const moved: string[] = [];
    for (const page of pages) {
      const now = createHash("sha256").update(page.html).digest("hex");
      if (fixture.pages[page.path] !== now) moved.push(page.path);
    }
    expect(moved, "the root build changed — regenerate the fixture only on purpose").toEqual([]);
  });

  it("and the helper is the identity at the root", () => {
    for (const path of ["/", "/favicon.svg", "/germany/eu-blue-card-general", "/germany/x.json"])
      expect(url(path), path).toBe(path);
    expect(absolute("/germany/x")).toBe("https://permitrulebook.com/germany/x");
  });
});

describe("the same paths under a subpath", () => {
  const BASE = "/permit-rulebook";

  it("every internal path is prefixed once, and only once", () => {
    expect(url("/", BASE)).toBe(`${BASE}/`);
    expect(url("/favicon.svg", BASE)).toBe(`${BASE}/favicon.svg`);
    expect(url("/germany/eu-blue-card-general", BASE)).toBe(`${BASE}/germany/eu-blue-card-general`);
    expect(url("/germany/eu-blue-card-general.json", BASE)).toBe(`${BASE}/germany/eu-blue-card-general.json`);
    // A base Astro hands over with its trailing slash, and a path without a
    // leading one, both land in the same place — no doubled or missing slash.
    expect(url("germany/x", `${BASE}/`)).toBe(`${BASE}/germany/x`);
    expect(url("/germany/x", `${BASE}/`)).toBe(`${BASE}/germany/x`);
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
