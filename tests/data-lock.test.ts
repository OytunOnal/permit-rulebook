import { describe, expect, it } from "vitest";
import { pinnedLockTextOf, readLock } from "../scripts/data-lock/data-lock.mjs";

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
