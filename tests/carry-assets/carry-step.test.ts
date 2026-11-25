import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { readAssetNames } from "../../scripts/carry-assets/carry.mjs";
import { whyNoBuild } from "../browser-walk.js";
import { LF } from "../throwaway-folder.js";
import { pagesYaml as pages, readText } from "../workflow-text.js";

const root = fileURLToPath(new URL("../..", import.meta.url));

/**
 * s33 — the step that carries the previous generation's assets forward. Why it
 * exists is written in `scripts/carry-assets/carry.mjs`'s own header; what is
 * pinned here is what the step has to cover and where it sits in the job.
 *
 * That it cannot fail the deploy is proved by running it, in
 * `tests/carry-assets/` — a workflow file cannot show that, and neither can
 * reading the script's source.
 */
const dist = join(root, "dist");
const missing = whyNoBuild("dist/");

/**
 * The carrier reads ONE live page, so the whole exposure has to be one page.
 * The day a second page gains a bundle of its own this case goes red, and the
 * step has to widen to read that page too — which is the point of pinning it
 * rather than assuming it (s33, point 4).
 */
function expectOneBuiltPageReferencingAstro(): void {
  const htmlPages: string[] = [];
  (function walk(here: string): void {
    for (const entry of readdirSync(here, { withFileTypes: true })) {
      const full = join(here, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".html") && readText(full).includes("/_astro/"))
        htmlPages.push(relative(dist, full).split(sep).join("/"));
    }
  })(dist);
  expect(htmlPages.sort()).toEqual(["index.html"]);
}

/**
 * The other half of the same assumption, and the one nothing was watching.
 *
 * The carrier reads references out of HTML with a pattern, not with a
 * browser, and `scripts/carry-assets/generation/asset-names.mjs`'s "What shapes this
 * reads" writes down why: honouring what a browser resolves means
 * `<base href>`, character references, `srcset` and CSS `url()`, and half a
 * browser reads strings no reader asks for while still missing the ones it
 * cannot parse. So the pattern reads what Astro emits — measured, round 7,
 * it is blind to `/_ASTRO/x.css`, `/_astro%2Fx.css`, a bare relative
 * `_astro/x.css`, `/_astro\x.css` and a reference with a tab in it, and
 * three of those five a browser resolves to one of this deploy's real
 * assets.
 *
 * What that costs the day Astro emits one of them is the step reading fewer
 * names than the page holds and saying NOTHING about it — no request, no
 * problem line, no annotation, which is the silent window s33 exists to
 * close. A comment cannot notice that; this can. Every file the build put in
 * `_astro/` is a file the page references, so the reader finding all of them
 * is the check, and it goes red on the shape as well as on the count.
 */
function expectReaderFindsEveryBuiltAsset(): void {
  const { names, refused, unserved } = readAssetNames(
    readText(join(dist, "index.html")),
    "https://permitrulebook.com/",
  );
  expect(names.sort(), "a built asset the carrier's reader cannot see in the page that names it")
    .toEqual(readdirSync(join(dist, "_astro")).sort());
  // And our own page holds nothing this step would decline, in either sense.
  expect(refused).toEqual([]);
  expect(unserved).toEqual([]);
}

/**
 * All three of point 4's clauses, as one verbatim block.
 *
 * This used to read the step through a hand-written YAML parser, which is a
 * second thing to be wrong: it only ever saw keys at exactly eight spaces,
 * so a nested `env:` under this step — `SITE_URL: https://evil.example/` —
 * passed every assertion while the step fetched a foreign host, and its `|`
 * branch was unreachable, so five of this job's fifteen steps parsed as
 * `{"run":"|"}` (Standards and Security review, round 3). Pinning the block
 * as text deletes the parser, its dead branch and its blind spot together.
 *
 * Over-pinning a deploy step is the trade this case wants. Every clause of
 * point 4 falls out of the one string, including the two that a reading of
 * the step's keys could not carry: that the step's exit code is the
 * carrier's own — one command, no `&&`, no `||`, no second line, no
 * `continue-on-error`, nothing appended (appending
 * `&& test -f dist/_astro/index.css` took the deploy down while every other
 * test stayed green — Spec review, 2026-09-23) — and that it is the last
 * thing before the artifact is sealed, because the block ends where the
 * upload begins. An edit to this step then goes through a deliberate edit
 * here, which is the point of a step nobody may quietly change.
 *
 * The `run:` takes NO arguments, and that clause is load-bearing: the script
 * reads any `--name value` as a flag, so a repository variable spliced into
 * this command line is a way to turn the mechanism off while every deploy
 * stays green. Why that is so is `scripts/carry-assets.mjs`'s header, "Where
 * the address comes from"; what this case does about it is pin the empty
 * command line and the environment value beside the rest of the block.
 */
function expectCarryVerbatimLastBeforeUpload(): void {
  // The build job's own text: the carrier has to be in THIS job, where
  // `dist/` is on disk and the artifact is made. Both ends are asserted
  // before the slice, because `slice(i, -1)` is a legal call that spans to
  // the end of the file: renaming the `pin:` job used to make the end index
  // `-1`, and this case went on passing while it no longer checked the one
  // thing its name claims (Standards review, round 4 — the one mutation of
  // thirteen that stayed green).
  const from = pages.indexOf(`${LF}  build:${LF}`);
  const to = pages.indexOf(`${LF}  pin:${LF}`);
  expect(from, "the build job is not where it was").toBeGreaterThanOrEqual(0);
  expect(to, "the pin job is not where it was, so this case can no longer tell which job the carrier is in")
    .toBeGreaterThan(from);
  const build = pages.slice(from, to);
  // Why it sits here rather than anywhere else is the comment beside it in
  // `pages.yml`, which owns that reason.
  expect(
    build,
    "the carrier step in pages.yml is not the block this case pins. Every clause of point 4 is in that"
    + " one string, so a diff of a 200-character literal is the wrong place to read this: compare the step"
    + " in pages.yml with the literal below, line by line. Its name, its working directory, the origin"
    + " arriving as an environment value rather than as argv, a `run:` of one command with nothing"
    + " appended, and the upload immediately after it are each load-bearing — and each is a deliberate"
    + " edit here when the step is meant to change.",
  ).toContain(
    `      - name: Carry the live site's assets forward, so a cached page still finds them${LF}`
    + `        if: github.event_name != 'pull_request'${LF}`
    + `        working-directory: site${LF}`
    + `        env:${LF}`
    + `          CARRY_ORIGIN: \${{ env.SITE_URL }}${LF}`
    + `        run: node scripts/carry-assets.mjs${LF}`
    + LF
    + "      - uses: actions/upload-pages-artifact@",
  );
}

describe("a cached page still finds its assets", () => {
  it("never lets a pipeline skip the built site", () => {
    if (missing) expect(process.env.CI, `CI cannot skip: ${missing}`).toBeFalsy();
    else expect(missing).toBeNull();
  });
  it.skipIf(missing)("exactly one built page references /_astro/", expectOneBuiltPageReferencingAstro);
  it.skipIf(missing)("the carrier's reader finds every asset this build published", expectReaderFindsEveryBuiltAsset);
  it("the build job runs it, verbatim, as the last step before the upload", expectCarryVerbatimLastBeforeUpload);
});
