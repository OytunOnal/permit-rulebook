import { describe, expect, it } from "vitest";
import { CHOOSE_COMMIT_REFUSALS, isDatasetVersion, lockedShaOf, PIN_REFUSALS, pinnedLockTextOf, readLock } from "../scripts/data-lock/data-lock.mjs";

/**
 * The lock's format, checked against lock texts written here by hand: the
 * independent check on the `data-lock` module's reading and writing. Every
 * other test builds lock text through the module's entry.
 */

/** The commit the hand-written lock names. */
const SHA = "3012f727ec7b14ea98e07edb63c7e71132123953";
/** A commit other than the lock's, for a pin to write over it. */
const OTHER_SHA = "0123456789abcdef0123456789abcdef01234567";

/** A lock as the site keeps it: a comment, then its two lines. */
const LOCK = `# The data commit this site is built against.\n#\nsha=${SHA}\ndataset_version=2026.11.17\n`;

describe("the lock's text is read", () => {
  it("into its sha and its dataset version", () => {
    expect(readLock(LOCK)).toEqual({ sha: SHA, datasetVersion: "2026.11.17" });
  });

  it("with Windows line endings, each value without its carriage return", () => {
    expect(readLock(LOCK.split("\n").join("\r\n"))).toEqual({ sha: SHA, datasetVersion: "2026.11.17" });
  });

  it("with a missing line read as empty", () => {
    expect(readLock("dataset_version=2026.11.17\n")).toEqual({ sha: "", datasetVersion: "2026.11.17" });
    expect(readLock(`sha=${SHA}\n`)).toEqual({ sha: SHA, datasetVersion: "" });
  });
});

describe("the lock's one sha is read, checked", () => {
  it("from a good lock, as it stands", () => {
    expect(lockedShaOf(LOCK)).toBe(SHA);
  });

  it.each([
    ["a second sha= line", `${LOCK}sha=${OTHER_SHA}\n`],
    ["no sha= line", "dataset_version=2026.11.17\n"],
    ["a short sha", `sha=${SHA.slice(1)}\ndataset_version=2026.11.17\n`],
  ])("refused from a lock with %s", (_what, text) => {
    expect(() => lockedShaOf(text)).toThrow(CHOOSE_COMMIT_REFUSALS.lock);
  });
});

describe("a dataset version is checked for its shape", () => {
  it("YYYY.MM.DD is one", () => {
    expect(isDatasetVersion("2026.11.17")).toBe(true);
  });

  it.each<[string, unknown]>([
    ["dashes for dots", "2026-11-17"],
    ["a one-digit day", "2026.11.7"],
    ["a two-digit year", "26.11.17"],
    ["a line after it", "2026.11.17\nsha=" + SHA],
    ["nothing", ""],
    ["a number", 20261117],
    ["a list holding one", ["2026.11.17"]],
    ["no value", undefined],
  ])("%s is not one", (_what, value) => {
    expect(isDatasetVersion(value)).toBe(false);
  });
});

describe("a pinned lock's text is written", () => {
  it("naming the commit and the dataset version, every other line kept", () => {
    expect(pinnedLockTextOf(LOCK, { sha: OTHER_SHA, datasetVersion: "2026.11.18" }))
      .toBe(`# The data commit this site is built against.\n#\nsha=${OTHER_SHA}\ndataset_version=2026.11.18\n`);
  });

  it("read back as what it was written with", () => {
    expect(readLock(pinnedLockTextOf(LOCK, { sha: OTHER_SHA, datasetVersion: "2026.11.18" })))
      .toEqual({ sha: OTHER_SHA, datasetVersion: "2026.11.18" });
  });
});

describe("a pinned lock's text is refused, and none written", () => {
  it.each([
    ["dashes for dots", "2026-11-18"],
    ["a one-digit day", "2026.11.8"],
    ["a two-digit year", "26.11.18"],
    ["a line after it", "2026.11.18\nsha=" + SHA],
    ["nothing", ""],
  ])("for a dataset version not YYYY.MM.DD: %s", (_what, datasetVersion) => {
    expect(() => pinnedLockTextOf(LOCK, { sha: OTHER_SHA, datasetVersion })).toThrow(PIN_REFUSALS.datasetVersion);
  });

  it.each([
    ["upper-case hex", OTHER_SHA.toUpperCase()],
    ["39 characters", OTHER_SHA.slice(1)],
    ["41 characters", `${OTHER_SHA}0`],
    ["a letter past f", `g${OTHER_SHA.slice(1)}`],
    ["nothing", ""],
  ])("for a commit not 40 lower-case hex: %s", (_what, sha) => {
    expect(() => pinnedLockTextOf(LOCK, { sha, datasetVersion: "2026.11.18" })).toThrow(PIN_REFUSALS.commit);
  });
});
