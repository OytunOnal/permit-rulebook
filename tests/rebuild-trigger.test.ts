import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The published card said "checked daily" and nothing made that true.
 *
 * The route pages bake "RULES READ <date>" and the social card carries "checked
 * daily". Both are claims about the DATA repository, and the daily source watch
 * commits into that repository, not this one — while this repository's Pages
 * workflow ran only on a push here. So the dataset moved, the site did not
 * rebuild, and the promise stayed printed on a card that was no longer true
 * (human decision 2026-09-08).
 *
 * Two triggers now carry it, deliberately redundant: a daily `schedule` timed
 * after the watch, which rebuilds even if every signal fails, and a
 * `repository_dispatch` the watch fires when it actually commits new state,
 * which publishes a real change in minutes. This pins both, and pins the one
 * relationship between the two repositories that a change on either side could
 * silently break: the site's hour has to be AFTER the watch's.
 *
 * The other half of the pair lives in the data repository
 * (`tests/rebuild-dispatch.test.ts` there): that the watch actually sends the
 * event, and that it fails loudly rather than skipping when its token is unset.
 */

const workflowsDir = fileURLToPath(new URL("../.github/workflows/", import.meta.url));

/** CRLF is a checkout detail on Windows, not a fact about the file. */
const read = (path: string): string => readFileSync(path, "utf8").split("\r\n").join("\n");

const pages = read(join(workflowsDir, "pages.yml"));

/** The canonical GitHub Actions bot, said once so the two repositories agree. */
const BOT_NAME = "github-actions[bot]";
const BOT_EMAIL = "41898282+github-actions[bot]@users.noreply.github.com";

/**
 * The data repository is found the way the site itself finds it — through the
 * `file:` dependency `npm install` linked — rather than by guessing at a
 * sibling directory, which is what `tests/name-sweep.test.ts` already does and
 * what the Pages workflow does when it decides where to check the data out.
 */
const dataRepo = dirname(fileURLToPath(
  new URL("../node_modules/permit-rulebook-data/package.json", import.meta.url),
));

/** The first `cron:` of a workflow, as minutes since midnight UTC. */
function cronMinutes(yaml: string): number {
  const match = /-\s*cron:\s*"(\d+)\s+(\d+)\s+\*\s+\*\s+\*"/.exec(yaml);
  expect(match, "no daily `- cron: \"M H * * *\"` line found").not.toBeNull();
  return Number(match![2]) * 60 + Number(match![1]);
}

describe("the site rebuilds when the data moves", () => {
  it("runs on a daily schedule, not only on a push here", () => {
    expect(pages).toMatch(/^on:$/m);
    expect(pages, "the Pages workflow has no `schedule:` trigger").toMatch(/^\s{2}schedule:$/m);
    expect(pages, "the daily cron is no longer 06:40 UTC").toContain('- cron: "40 6 * * *"');
  });

  it("and on a repository_dispatch the data repository can fire", () => {
    expect(pages, "the Pages workflow has no `repository_dispatch:` trigger")
      .toMatch(/^\s{2}repository_dispatch:$/m);
    // The event type is a contract with the other repository's watch workflow:
    // renaming it on one side alone stops the fast path without any error.
    expect(pages).toMatch(/^\s{4}types:\s*\[dataset-updated\]$/m);
  });

  it("and its hour sits comfortably after the watch that feeds it", () => {
    const watch = read(join(dataRepo, ".github", "workflows", "watch.yml"));
    const site = cronMinutes(pages);
    const data = cronMinutes(watch);
    expect(data, "the data watch is no longer at 05:17 UTC").toBe(5 * 60 + 17);
    // The watch installs, builds, fetches every watched source over the network
    // and commits before the site has anything new to read, and GitHub delays
    // scheduled runs under load on both sides. An hour is the floor; anything
    // tighter rebuilds the site against yesterday's state.
    expect(site - data, "the site rebuild no longer sits an hour after the watch")
      .toBeGreaterThanOrEqual(60);
  });
});

describe("automated commits are attributed to the automation", () => {
  /**
   * GitHub maps `<login>@users.noreply.github.com` to whichever account owns
   * that login. `watch@users.noreply.github.com` therefore displayed every bot
   * commit as an unrelated person — the account that owns the login "watch"
   * (human decision 2026-09-08). This repository's workflow configures no git
   * identity today; the case exists so that the next one to need one cannot
   * reintroduce the defect here.
   */
  it("no workflow in this repository claims a stranger's identity", () => {
    const files = readdirSync(workflowsDir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
    expect(files, "the workflow directory is empty — this case would pass vacuously").toContain("pages.yml");
    for (const file of files) {
      const yaml = read(join(workflowsDir, file));
      // Every noreply address a workflow ACTS on is a git identity, and there
      // is exactly one this project is allowed to commit under. Comment lines
      // are prose — YAML's and the shell's alike — and the comment explaining
      // this very defect quotes the address it warns about.
      const acted = yaml.split("\n").filter((line) => !line.trimStart().startsWith("#")).join("\n");
      for (const address of acted.match(/[^\s"']+@users\.noreply\.github\.com/g) ?? [])
        expect(address, `${file} commits as an account this project does not own`).toBe(BOT_EMAIL);
      for (const line of yaml.split("\n")) {
        const user = /git config user\.(name|email)\s+"([^"]*)"/.exec(line);
        if (!user) continue;
        expect(user[2], `${file}: ${line.trim()}`).toBe(user[1] === "name" ? BOT_NAME : BOT_EMAIL);
      }
    }
  });
});
