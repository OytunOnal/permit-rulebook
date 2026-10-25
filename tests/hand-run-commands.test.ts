import { describe, expect, it } from "vitest";
import { execFile, execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { skipReason, warnNotWalked } from "./browser-walk.js";

/**
 * The commands a person runs by hand, run the way they run them: `data:pin`,
 * the assets' render, the README's picture and the smoke command (#248). No
 * other case runs them, so these pin what each does today from outside (what
 * it writes, prints and exits with) before their files are split (#247).
 *
 * Each runs the command line `package.json` gives its script, so a split that
 * moves a script's file keeps these cases as they are; `shot` has no script
 * and is run by its file. What a command writes goes into a throwaway folder
 * of the OS temp folder, removed after, never into `public/`, `data.lock` or
 * `docs/media/`, and each case asserts the site's own copy was not touched.
 */

const root = fileURLToPath(new URL("..", import.meta.url));

/** The data clone beside the site, where `package.json`'s `file:` link points. */
const dataClone = join(root, "..", "permit-rulebook-data");

const skipped = skipReason();
if (skipped) warnNotWalked("THE HAND-RUN COMMANDS THAT DRIVE CHROME", skipped);

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

/** `body` run on a fresh folder of the OS temp folder, removed after whatever it did. */
async function inThrowawayFolder(body: (folder: string) => Promise<void>): Promise<void> {
  const folder = mkdtempSync(join(tmpdir(), "permit-rulebook-hand-run-"));
  try {
    await body(folder);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
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

describe("npm run data:pin", () => {
  it("writes the data clone's HEAD and its dataset version into the lock it is given", async () => {
    const siteLock = statSync(join(root, "data.lock")).mtimeMs;
    const head = execFileSync("git", ["-C", dataClone, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const version = JSON.parse(readFileSync(join(dataClone, "data", "dataset.json"), "utf8")).dataset_version;
    await inThrowawayFolder(async (folder) => {
      // The site's lock, copied, its pin moved off the clone so the write shows.
      const lock = join(folder, "data.lock");
      writeFileSync(lock, readFileSync(join(root, "data.lock"), "utf8")
        .replace(/^sha=.*$/m, `sha=${"0".repeat(40)}`).replace(/^dataset_version=.*$/m, "dataset_version=0"));
      const run = await nodeRun([...scriptArgumentsOf("data:pin"), "--lock", lock]);
      expect(run.status, run.out).toBe(0);
      const written = readFileSync(lock, "utf8");
      expect(lockValueOf(written, "sha")).toBe(head);
      expect(lockValueOf(written, "dataset_version")).toBe(version);
    });
    expect(statSync(join(root, "data.lock")).mtimeMs, "the site's data.lock was written").toBe(siteLock);
  }, 60000);
});

describe.skipIf(skipped !== null)("npm run assets", () => {
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
});

describe.skipIf(skipped !== null)("node scripts/shot.mjs <out.png>", () => {
  it("writes a PNG of the frame's size where it is told", async () => {
    const before = writtenTimesIn(join("docs", "media"));
    await inThrowawayFolder(async (folder) => {
      const out = join(folder, "results.png");
      const run = await nodeRun([join("scripts", "shot.mjs"), out]);
      expect(run.status, run.out).toBe(0);
      // The frame is 1100x1400 CSS pixels, drawn at the harness's device scale of 2.
      expect(pngSizeOf(out)).toBe("2200x2800");
    });
    expect(writtenTimesIn(join("docs", "media")), "a file of docs/media/ was written").toEqual(before);
  }, 120000);
});

/** The surfaces a smoke run's output names, each once, in the order it walked them. */
const surfacesNamedIn = (out: string): string[] => [...new Set([...out.matchAll(/\[(dev|dist)\]/g)].map((m) => m[1]!))];

describe.skipIf(skipped !== null)("npm run smoke", () => {
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
