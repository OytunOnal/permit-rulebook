import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, type PathLike } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, isAbsolute, join, relative, resolve } from "node:path";
import { chromePath } from "../scripts/browser/browser.mjs";

/**
 * Chrome found on PATH (`chromePath`, from `scripts/browser/browser.mjs`)
 * where its fixed locations miss: only in PATH's absolute folders, since a
 * relative folder names wherever the run happens to stand.
 *
 * This machine's own Chrome sits at one of the fixed locations, so `existsSync`
 * answers only for the case's folders while it runs; everything else reads the
 * real disk. The mock is this file's alone.
 */

const onlyUnder = vi.hoisted(() => ({ folders: [] as string[] }));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const existsSync = (path: PathLike): boolean => {
    if (onlyUnder.folders.length === 0) return actual.existsSync(path);
    const isUnderOne = onlyUnder.folders.some((folder) => resolve(String(path)).startsWith(folder));
    return isUnderOne && actual.existsSync(path);
  };
  return { ...actual, default: { ...actual, existsSync }, existsSync };
});

/** The name the lookup asks PATH for first. */
const CHROME_ON_PATH = "google-chrome";

const saved = { PATH: process.env.PATH, CHROME_PATH: process.env.CHROME_PATH };
let folders: string[] = [];

beforeEach(() => {
  folders = [mkdtempSync(join(tmpdir(), "permit-rulebook-path-")), mkdtempSync(join(tmpdir(), "permit-rulebook-path-"))];
  for (const folder of folders) writeFileSync(join(folder, CHROME_ON_PATH), "");
  onlyUnder.folders = folders;
  delete process.env.CHROME_PATH;
});

afterEach(() => {
  onlyUnder.folders = [];
  process.env.PATH = saved.PATH;
  if (saved.CHROME_PATH === undefined) delete process.env.CHROME_PATH;
  else process.env.CHROME_PATH = saved.CHROME_PATH;
  for (const folder of folders) rmSync(folder, { recursive: true, force: true });
});

describe("Chrome on PATH", () => {
  it("is found in an absolute folder of PATH, and a relative folder before it is skipped", () => {
    const [reachedRelatively, absolute] = folders as [string, string];
    const relativeEntry = relative(process.cwd(), reachedRelatively);
    expect(isAbsolute(relativeEntry), `the temp folder is on another drive: ${relativeEntry}`).toBe(false);
    process.env.PATH = [relativeEntry, absolute].join(delimiter);
    expect(chromePath()).toBe(join(absolute, CHROME_ON_PATH));
  });
});
