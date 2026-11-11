import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { chromePath } from "../scripts/browser/browser.mjs";
import { dataClonePath } from "../scripts/data-pin.mjs";
import { runGit } from "../scripts/run-git.mjs";
import { skipReason, warnNotWalked } from "./browser-walk.js";
import { commitInThrowaway, initThrowawayRepository, inThrowawayFolder, LF } from "./throwaway-folder.js";

/**
 * The commands a person runs by hand, run the way they run them: `data:pin`,
 * `data:check` (the green's first step), the assets' render, the README's
 * picture and the smoke command. No other case runs them, so these pin what
 * each does from outside: what it writes, prints and exits with.
 * `data:check`'s cases read its decision (the exit code, the remedy, the
 * branch), never its sentence's wording; its throwaway clones are built in
 * the OS temp folder with `git init` and empty commits.
 *
 * Each runs the command line `package.json` gives its script, so a script
 * whose file moves keeps these cases as they are; `shot` has no script and is
 * run by its file. What a command writes goes into a throwaway folder
 * of the OS temp folder, removed after, never into `public/`, `data.lock` or
 * `docs/media/`, and each case asserts the site's own copy was not touched.
 */

const root = fileURLToPath(new URL("..", import.meta.url));

/** The data clone beside the site's main checkout, where `package.json`'s `file:` link points from there. */
const dataClone = dataClonePath();

/** Why the commands that walk the built site cannot run here: no Chrome, or no build. Null when they can. */
const walkSkipReason = skipReason();
if (walkSkipReason) warnNotWalked("THE PICTURE AND THE SMOKE COMMAND", walkSkipReason);

/** Why the assets' render cannot draw here: it needs Chrome alone, no build. Null when it can. */
function chromeMissingReason(): string | null {
  try {
    chromePath();
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}
const renderSkipReason = chromeMissingReason();
if (renderSkipReason) warnNotWalked("THE ASSETS' RENDER", renderSkipReason);

type CommandRun = { status: number; out: string };

/** What `npm run <name>` hands node: the script's words after `node`. */
function scriptArgumentsOf(name: string): string[] {
  const scripts = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts;
  const words = String(scripts[name] ?? "").split(" ").filter(Boolean);
  expect(words[0], `package.json's script ${name} is not a node command`).toBe("node");
  return words.slice(1);
}

/** A child's exit code from execFile's error: 0 for none, 1 when it never gave a number (not started, killed). */
function exitCodeOf(error: Error | null): number {
  if (!error) return 0;
  const code = (error as { code?: unknown }).code;
  return typeof code === "number" ? code : 1;
}

/**
 * node run on `args` from the site's root, its exit code and everything it
 * printed. Asynchronous, so a run that takes minutes holds no event loop.
 */
function nodeRun(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<CommandRun> {
  return new Promise((resolve) => {
    execFile(process.execPath, args, { cwd: root, encoding: "utf8", env, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({ status: exitCodeOf(error), out: `${stdout}${stderr}` });
    });
  });
}

/** When each file of the site's `folder` was last written, so a case can say none was. */
const writtenTimesIn = (folder: string): Record<string, number> =>
  Object.fromEntries(readdirSync(join(root, folder)).map((name) => [name, statSync(join(root, folder, name)).mtimeMs]));

/** A PNG's width and height, from its header. */
function pngSizeOf(file: string): string {
  const png = readFileSync(file);
  expect(png.subarray(1, 4).toString("latin1"), `${file} is not a PNG`).toBe("PNG");
  return `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
}

/** The value a lock's `key=` line holds. */
const lockValueOf = (text: string, key: string): string | undefined =>
  new RegExp(`^${key}=(.+)$`, "m").exec(text)?.[1]?.trim();

/** `body` run, then the site's own `data.lock` asserted unwritten by it. */
async function expectSiteLockUnwrittenBy(body: () => Promise<void>): Promise<void> {
  const siteLock = statSync(join(root, "data.lock")).mtimeMs;
  await body();
  expect(statSync(join(root, "data.lock")).mtimeMs, "the site's data.lock was written").toBe(siteLock);
}

describe("npm run data:pin", () => {
  it("writes the data clone's HEAD and its dataset version into the lock it is given", async () => {
    const head = runGit(dataClone, "rev-parse", "HEAD");
    const version = JSON.parse(readFileSync(join(dataClone, "data", "dataset.json"), "utf8")).dataset_version;
    await expectSiteLockUnwrittenBy(() => inThrowawayFolder(async (folder) => {
      // The site's lock, copied, its pin moved off the clone so the write shows.
      const lock = join(folder, "data.lock");
      writeFileSync(lock, readFileSync(join(root, "data.lock"), "utf8")
        .replace(/^sha=.*$/m, `sha=${"0".repeat(40)}`).replace(/^dataset_version=.*$/m, "dataset_version=0"));
      const run = await nodeRun([...scriptArgumentsOf("data:pin"), "--lock", lock]);
      expect(run.status, run.out).toBe(0);
      const written = readFileSync(lock, "utf8");
      expect(lockValueOf(written, "sha")).toBe(head);
      expect(lockValueOf(written, "dataset_version")).toBe(version);
    }));
  }, 60000);
});

/** A throwaway data clone at `clone` on master, with `count` empty commits; their shas, oldest first. */
function cloneWithCommits(clone: string, count: number): string[] {
  initThrowawayRepository(clone);
  return Array.from({ length: count }, (_, n) => {
    commitInThrowaway(clone, "--allow-empty", "-m", `commit ${n + 1}`);
    return runGit(clone, "rev-parse", "HEAD");
  });
}

/** The site's lock copied into `folder`, naming `sha`; its path. */
function lockNaming(folder: string, sha: string): string {
  const lock = join(folder, "data.lock");
  writeFileSync(lock, readFileSync(join(root, "data.lock"), "utf8").replace(/^sha=.*$/m, `sha=${sha}`));
  return lock;
}

type CheckReport = { level: string; remedy?: string; branch?: string };
type CheckRun = { status: number; report: CheckReport; out: string };

/** `npm run data:check` run with its words after it, its exit code and the report line it printed. */
async function dataCheckRun(...args: string[]): Promise<CheckRun> {
  const run = await nodeRun([...scriptArgumentsOf("data:check"), ...args]);
  const reportLine = run.out.split(LF).filter((line) => line.startsWith("{")).at(-1);
  expect(reportLine, `data:check printed no report line: ${run.out}`).toBeDefined();
  return { status: run.status, report: JSON.parse(reportLine!), out: run.out };
}

/**
 * `body` run on a throwaway data clone with `count` commits, its path and
 * shas; the site's own lock is asserted unwritten after.
 */
async function onThrowawayClone(count: number, body: (clone: string, shas: string[]) => Promise<void>): Promise<void> {
  await expectSiteLockUnwrittenBy(() => inThrowawayFolder(async (folder) => {
    const clone = join(folder, "permit-rulebook-data");
    await body(clone, cloneWithCommits(clone, count));
  }));
}

/** The exit code and report of data:check on the clone at `checkedPath`, against a lock beside `clone` naming `lockSha`. */
const checkAgainst = (clone: string, lockSha: string, checkedPath = clone) =>
  dataCheckRun("--lock", lockNaming(dirname(clone), lockSha), "--clone", checkedPath);

/** The report of a data:check run that must stop, its exit code asserted 1. */
async function stoppedReportOf(run: Promise<CheckRun>): Promise<CheckReport> {
  const { status, report, out } = await run;
  expect(status, out).toBe(1);
  return report;
}

describe("npm run data:check passes", () => {
  it("when the clone's HEAD is the lock's commit", async () => {
    await onThrowawayClone(2, async (clone, [, second]) => {
      const run = await checkAgainst(clone, second!);
      expect([run.status, run.report.level], run.out).toEqual([0, "info"]);
    });
  }, 60000);

  it("when the clone is ahead of the lock", async () => {
    await onThrowawayClone(2, async (clone, [first]) => {
      const run = await checkAgainst(clone, first!);
      expect([run.status, run.report.level], run.out).toEqual([0, "info"]);
    });
  }, 60000);

  it("on the real data clone against the site's own lock", async () => {
    await expectSiteLockUnwrittenBy(async () => {
      const run = await dataCheckRun();
      expect([run.status, run.report.level], run.out).toEqual([0, "info"]);
    });
  }, 60000);
});

describe("npm run data:check stops, naming one remedy", () => {
  it("behind the lock on master: pull", async () => {
    await onThrowawayClone(2, async (clone, [, second]) => {
      runGit(clone, "reset", "--quiet", "--hard", "HEAD~1");
      expect((await stoppedReportOf(checkAgainst(clone, second!))).remedy).toBe("pull");
    });
  }, 60000);

  it("behind the lock on a data branch: merge the data master into that branch", async () => {
    await onThrowawayClone(2, async (clone, [first, second]) => {
      runGit(clone, "switch", "--quiet", "--create", "data-slice", first!);
      expect(await stoppedReportOf(checkAgainst(clone, second!))).toMatchObject({ remedy: "merge-master", branch: "data-slice" });
    });
  }, 60000);

  it("without the lock's commit, on master: pull", async () => {
    await onThrowawayClone(2, async (clone) => {
      // A well-formed sha no commit of the throwaway clone has.
      expect((await stoppedReportOf(checkAgainst(clone, "1".repeat(40)))).remedy).toBe("pull");
    });
  }, 60000);

  it("with no clone at the path: clone it", async () => {
    await onThrowawayClone(1, async (clone, [first]) => {
      expect((await stoppedReportOf(checkAgainst(clone, first!, join(dirname(clone), "no-clone-here")))).remedy).toBe("clone");
    });
  }, 60000);

  it("on no branch, behind the lock: switch to master", async () => {
    await onThrowawayClone(2, async (clone, [first, second]) => {
      runGit(clone, "switch", "--quiet", "--detach", first!);
      expect((await stoppedReportOf(checkAgainst(clone, second!))).remedy).toBe("switch-to-master");
    });
  }, 60000);
});

describe("npm run data:check stops on a clone with no commit yet, or diverged, naming one remedy", () => {
  it("with no commit yet, on master: pull", async () => {
    await onThrowawayClone(0, async (clone) => {
      expect(await stoppedReportOf(checkAgainst(clone, "1".repeat(40)))).toMatchObject({ remedy: "pull", branch: "master" });
    });
  }, 60000);

  it("diverged from the lock's commit on master, neither ahead of it nor behind it: merge the data master", async () => {
    await onThrowawayClone(2, async (clone, [first, second]) => {
      runGit(clone, "reset", "--quiet", "--hard", first!);
      commitInThrowaway(clone, "--allow-empty", "-m", "a commit of its own");
      expect(await stoppedReportOf(checkAgainst(clone, second!))).toMatchObject({ remedy: "merge-master", branch: "master" });
    });
  }, 60000);

  it("without the lock's commit, on a master holding a commit its origin/master lacks: merge the data master", async () => {
    await onThrowawayClone(2, async (clone, [first]) => {
      // A paired slice's data master merged locally, its push refused: origin/master, read offline, is one commit behind.
      runGit(clone, "update-ref", "refs/remotes/origin/master", first!);
      expect(await stoppedReportOf(checkAgainst(clone, "1".repeat(40)))).toMatchObject({ remedy: "merge-master", branch: "master" });
    });
  }, 60000);
});

describe.skipIf(renderSkipReason !== null)("npm run assets", () => {
  it("writes the icons, the .ico, the social card at 1200x630 and its sidecar", async () => {
    const before = writtenTimesIn("public");
    await inThrowawayFolder(async (folder) => {
      const run = await nodeRun([...scriptArgumentsOf("assets"), "--out", folder]);
      expect(run.status, run.out).toBe(0);
      expect(readdirSync(folder).sort()).toEqual([
        "favicon-16.png", "favicon-180.png", "favicon-32.png", "favicon-64.png", "favicon-96.png",
        "favicon.ico", "social-card.json", "social-card.png",
      ]);
      for (const size of [16, 32, 64, 96, 180]) expect(pngSizeOf(join(folder, `favicon-${size}.png`))).toBe(`${size}x${size}`);
      // An .ico's header: reserved 0, type 1 (an icon), then how many images it holds; the tab's three.
      const ico = readFileSync(join(folder, "favicon.ico"));
      expect([ico.readUInt16LE(0), ico.readUInt16LE(2), ico.readUInt16LE(4)]).toEqual([0, 1, 3]);
      expect(pngSizeOf(join(folder, "social-card.png"))).toBe("1200x630");
      const sidecar = JSON.parse(readFileSync(join(folder, "social-card.json"), "utf8"));
      expect(Object.keys(sidecar).sort()).toEqual(["countries", "headline", "product", "read", "routesLine", "tagline"]);
    });
    expect(writtenTimesIn("public"), "a file of public/ was written").toEqual(before);
  }, 180000);

  it("renders into a folder given relative to the folder it runs in", async () => {
    const before = writtenTimesIn("public");
    await inThrowawayFolder(async (folder) => {
      const run = await nodeRun([...scriptArgumentsOf("assets"), "--out", relative(root, folder)]);
      expect(run.status, run.out).toBe(0);
      expect(readdirSync(folder).sort()).toEqual([
        "favicon-16.png", "favicon-180.png", "favicon-32.png", "favicon-64.png", "favicon-96.png",
        "favicon.ico", "social-card.json", "social-card.png",
      ]);
    });
    expect(writtenTimesIn("public"), "a file of public/ was written").toEqual(before);
  }, 180000);
});

describe.skipIf(walkSkipReason !== null)("node scripts/main-shot.mjs <out.png>", () => {
  it("writes a PNG of the frame's size where it is told", async () => {
    const before = writtenTimesIn(join("docs", "media"));
    await inThrowawayFolder(async (folder) => {
      const out = join(folder, "results.png");
      const run = await nodeRun([join("scripts", "main-shot.mjs"), out]);
      expect(run.status, run.out).toBe(0);
      // The frame is 1100x1400 CSS pixels, drawn at the harness's device scale of 2.
      expect(pngSizeOf(out)).toBe("2200x2800");
    });
    expect(writtenTimesIn(join("docs", "media")), "a file of docs/media/ was written").toEqual(before);
  }, 120000);
});

/** The surfaces a smoke run's output names, each once, in the order it walked them. */
const surfacesNamedIn = (out: string): string[] => [...new Set([...out.matchAll(/\[(dev|dist)\]/g)].map((m) => m[1]!))];

describe.skipIf(walkSkipReason !== null)("npm run smoke", () => {
  it("walks dist/ alone under --dist, exits 0 on the healthy build and non-zero on a broken page", async () => {
    const healthy = await nodeRun([...scriptArgumentsOf("smoke"), "--dist"]);
    expect(healthy.status, healthy.out).toBe(0);
    expect(surfacesNamedIn(healthy.out)).toEqual(["dist"]);
    // The build walked under a base it was not built for: a route page's call
    // to action then leads out of the site, a broken page by the walk's own
    // checks, with nothing written into dist/.
    const broken = await nodeRun([...scriptArgumentsOf("smoke"), "--dist"],
      { ...process.env, SITE_URL: "https://example.org/a-base-the-build-never-saw/" });
    expect(surfacesNamedIn(broken.out), broken.out).toEqual(["dist"]);
    expect(broken.status, broken.out).not.toBe(0);
  }, 180000);

  // The dev surface is a local developer check (human ruling, 2026-09-08), so
  // CI, which walks the deployable dist/, does not start a dev server here either.
  it.skipIf(Boolean(process.env.CI))("walks the dev server alone under smoke:dev", async () => {
    const dev = await nodeRun(scriptArgumentsOf("smoke:dev"));
    expect(dev.status, dev.out).toBe(0);
    expect(surfacesNamedIn(dev.out)).toEqual(["dev"]);
  }, 180000);
});
