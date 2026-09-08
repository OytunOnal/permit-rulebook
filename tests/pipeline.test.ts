import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dataDir, readLock } from "../scripts/data-pin.mjs";

/**
 * The pipeline's own security and the data it builds against (Spine
 * steward-40, and the rollback that could not roll back, 2026-09-08).
 *
 * A workflow that says `actions/checkout@v4` runs whatever that tag points at
 * today; a workflow with repository-wide write runs every step with it. And a
 * site whose sibling floats cannot rebuild its own past: re-running the last
 * green deploy tested old site code against new data and failed.
 */

const root = fileURLToPath(new URL("..", import.meta.url));
const workflows = join(root, ".github", "workflows");
const read = (path: string): string => readFileSync(path, "utf8").split("\r\n").join("\n");

const yamlFiles = (dir: string): string[] =>
  readdirSync(dir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml")).map((f) => join(dir, f));

describe("every action is pinned to a commit, and every job asks for the least it needs", () => {
  const files = yamlFiles(workflows);

  it("no `uses:` names a tag or a branch — all of them name a 40-hex commit", () => {
    expect(files.length, "no workflows to check").toBeGreaterThan(0);
    for (const file of files)
      for (const line of read(file).split("\n")) {
        const used = /uses:\s*(\S+)/.exec(line);
        if (!used) continue;
        const [, ref] = used;
        expect(ref, `${file}: ${line.trim()}`).toMatch(/^[^@]+@[0-9a-f]{40}$/);
        // And the version it was resolved from, so a person can read it.
        expect(line, `${file}: ${line.trim()} has no version comment`).toMatch(/#\s*v[0-9]+\.[0-9]+\.[0-9]+/);
      }
  });

  it("the workflow's floor is contents: read, and only the jobs that need more raise it", () => {
    for (const file of files) {
      const yaml = read(file);
      const top = yaml.slice(0, yaml.indexOf("jobs:"));
      expect(top, `${file}: no top-level permissions block`).toMatch(/^permissions:\s*$/m);
      expect(top, `${file}: the floor is not contents: read`).toMatch(/^permissions:\s*\n\s+contents: read\s*$/m);
      // Nothing above the jobs may hand out a write scope.
      expect(top, `${file}: a write scope above the jobs`).not.toMatch(/^\s+(pages|id-token|issues): write/m);
      // Every job states its own permissions rather than inheriting silently.
      // Jobs only: the keys under `on:` are triggers, not jobs.
      const after = yaml.slice(yaml.indexOf("jobs:"));
      const jobs = [...after.matchAll(/^ {2}([a-z][a-z0-9-]*):\n/gm)].map((m) => m[1]!);
      for (const job of jobs) {
        const block = after.slice(after.indexOf(`  ${job}:\n`));
        const next = block.slice(1).search(/\n {2}[a-z][a-z0-9-]*:\n/);
        const own = next < 0 ? block : block.slice(0, next + 1);
        expect(own, `${file}: job "${job}" states no permissions`).toMatch(/^\s{4}permissions:/m);
      }
    }
  });

  it("no secret is written into a workflow in plain text", () => {
    for (const file of files) {
      const yaml = read(file);
      // A secret reaches a workflow through `secrets.` and nowhere else.
      for (const line of yaml.split("\n")) {
        if (/^\s*#/.test(line)) continue;
        // A permission scope is not a secret: `id-token: write` names a
        // capability, not a value.
        if (/^\s+(pages|id-token|contents|issues|actions|packages):\s/.test(line)) continue;
        const assigned = /(?:TOKEN|SECRET|KEY|PASSWORD)\s*:\s*"?([^"\s]+)/i.exec(line);
        if (!assigned) continue;
        // A token reaches a workflow from the secret store or from the run's
        // own automatic token, and from nowhere else — never as a literal.
        expect(line, `${file}: ${line.trim()}`).toMatch(/\$\{\{\s*(secrets|github)\./);
      }
      // And no 40-hex string outside a `uses:` pin, no PAT prefixes.
      expect(yaml, `${file}: a GitHub token prefix`).not.toMatch(/gh[pousr]_[A-Za-z0-9]{16,}/);
    }
  });
});

/** Which data commit the site is built against, and whether it is real. */
/** A newline, spelled so no editor can eat it. */
const LF = String.fromCharCode(10);

describe("the data commit is pinned, and the pin is a commit that exists", () => {
  const lock = readLock();
  const data = dataDir();
  /** git, with its own failure turned into something a reader can act on. */
  const git = (...args: string[]): { ok: boolean; out: string } => {
    try {
      return { ok: true, out: execFileSync("git", ["-C", data, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim() };
    } catch (e) {
      return { ok: false, out: (e as { stderr?: Buffer }).stderr?.toString().trim() ?? String(e) };
    }
  };

  it("data.lock names a 40-hex sha and the dataset version it carried", () => {
    expect(lock.sha, "data.lock has no sha").toMatch(/^[0-9a-f]{40}$/);
    expect(lock.datasetVersion, "data.lock has no dataset version").toMatch(/^[0-9]{4}\.[0-9]{2}\.[0-9]{2}$/);
  });

  it("the commit exists in the data repository beside this one", () => {
    const type = git("cat-file", "-t", lock.sha);
    expect(
      type.ok && type.out === "commit",
      `data.lock names ${lock.sha}, which is not a commit in ${data} — pull the data repository, or run npm run data:pin`,
    ).toBe(true);
  });

  it("the sibling on this machine is not behind the lock", () => {
    const head = git("rev-parse", "HEAD");
    expect(head.ok, `cannot read the data repository's HEAD in ${data}: ${head.out}`).toBe(true);
    if (head.out === lock.sha) return;
    // Ahead is fine — a developer moves the data first and pins it after. Behind
    // is not: this build would be testing code against data it has never seen.
    // `--is-ancestor` answers with its exit code, so a false answer must read as
    // the sentence below and never as a raw throw (Standards review).
    const merged = git("merge-base", "--is-ancestor", lock.sha, head.out).ok;
    expect(
      merged,
      `data.lock names ${lock.sha}, which the sibling's HEAD ${head.out} does not contain — pull the data repository, or run npm run data:pin`,
    ).toBe(true);
  });

  it("the workflow builds a push against the lock, and the daily runs against the newest", () => {
    const pages = read(join(workflows, "pages.yml"));
    expect(pages).toContain("locked=$(sed -n 's/^sha=//p' data.lock)");
    expect(pages).toContain("ref: ${{ steps.data.outputs.ref }}");
    // The payload is a stranger's string: it arrives through the environment,
    // never interpolated into the script body, and is checked for 40 hex
    // characters before anything is checked out (Security review, 2026-09-08).
    expect(pages).toContain("PAYLOAD_SHA: ${{ github.event.client_payload.sha }}");
    expect(pages).toContain('repository_dispatch:yes) ref="$PAYLOAD_SHA"');
    expect(pages).not.toContain('ref="${{ github.event.client_payload.sha }}"');
    expect(pages).toContain("refusing to check anything out");
  });

  /**
   * A rerun keeps the event name of the run it repeats. A re-run schedule would
   * therefore build against today's data and pin it — the float this lock
   * exists to end, on the trigger that fires every day (Spec review,
   * 2026-09-08).
   */
  it("only a first attempt of the two newest-data triggers may advance the lock", () => {
    const pages = read(join(workflows, "pages.yml"));
    // The build's choice of ref reads the attempt.
    expect(pages).toContain("RUN_ATTEMPT: ${{ github.run_attempt }}");
    expect(pages).toContain('first_attempt=$([ "$RUN_ATTEMPT" = "1" ] && echo yes || echo no)');
    expect(pages).toContain('case "$EVENT_NAME:$first_attempt" in');
    expect(pages).toContain("schedule:yes)");
    // And so does the job that writes it back.
    const job = (name: string) => pages.slice(pages.indexOf(`${LF}  ${name}:`));
    const pin = job("pin").slice(0, job("pin").indexOf(`${LF}  deploy:`));
    expect(pin, "no job writes the lock back").not.toBe("");
    expect(pin).toContain("github.run_attempt == 1");
    expect(pin).toContain("github.event_name == 'schedule' || github.event_name == 'repository_dispatch'");
    expect(pin).toContain("needs.build.outputs.built != needs.build.outputs.locked");
    // It is the only job with a write token, and the build has none.
    expect(pin).toContain("permissions:");
    expect(pin).toContain("contents: write");
    const build = job("build").slice(0, job("build").indexOf(`${LF}  pin:`));
    expect(build, "the build job can write to the repository").not.toMatch(/contents: write/);
  });
});
