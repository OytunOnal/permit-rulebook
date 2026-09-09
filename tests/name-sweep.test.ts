import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset } from "permit-rulebook-data";
import { routePages } from "../src/lib/route-page.js";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DISCLAIMER, PRODUCT_NAME, TAGLINE } from "../src/lib/copy.js";

/**
 * s6 decision 1 — the name changed in one sweep, and nothing user-facing may
 * still say the working name.
 *
 * "Checked by grep, not by eye" is the scenario's own wording, so this is a
 * grep, run over what `git ls-files` tracks in both repositories. What it does
 * NOT read is stated in its name and enforced below, because each exclusion is
 * a decision someone could otherwise quietly widen:
 *
 *   · the ledgers — STATUS.md, KANBAN.md, DECISIONS.md — keep their history
 *     unedited by instruction; they record what happened under the old name;
 *   · `CONTEXT.md` and everything under `docs/spine/**` are the project's own
 *     record of itself, not strings a reader of the product ever sees — which
 *     is where the Turkish notes of the 2026-08-26 design conversation now
 *     live (`docs/spine/notes-pre-genesis.md`), pre-history rather than
 *     product copy (human, 2026-09-08);
 *   · git history itself, which is the point of having it.
 *
 * Everything else — every page, every library, every README, both package
 * manifests, the workflows, the schema, the issue templates — is in scope.
 */

const here = (url: string): string =>
  fileURLToPath(new URL(url, import.meta.url)).replace(/[\\/]+$/, "");

/**
 * The two working copies. The data repository is found the way the site itself
 * finds it — through the `file:` dependency that `npm install` linked — rather
 * than by guessing at a sibling directory: in CI the two are checked out where
 * the workflow puts them, and a test that assumes a sibling directory by name fails
 * there for a reason that has nothing to do with the name.
 */
const REPOS = {
  "permit-rulebook": here(".."),
  "permit-rulebook-data": dirname(fileURLToPath(
    new URL("../node_modules/permit-rulebook-data/package.json", import.meta.url),
  )),
};

/**
 * The paths the sweep does not reach, said once so the exclusion cannot drift.
 * A directory name on disk is not a user-facing string: decision 1 renames the
 * product, and the human renames the repositories on GitHub — so the `file:` path
 * in a package manifest is a path, not a name, and is excluded by that rule
 * rather than by an oversight.
 */
const HISTORY = ["STATUS.md", "KANBAN.md", "DECISIONS.md", "CONTEXT.md"];

/** Directory and filename prefixes that are records of what happened, not
 * strings a reader of the product meets. Each is named in the describe() above;
 * the two lists were allowed to drift apart once already. */
const HISTORY_PREFIXES = ["docs/spine/", "docs/adr/", "data/verify-"];

const isHistory = (file: string): boolean =>
  HISTORY_PREFIXES.some((prefix) => file.startsWith(prefix)) || HISTORY.includes(file);

/**
 * Every file the repository will carry, not only the ones it already carries.
 *
 * `git ls-files` lists the index. Every file this slice added was untracked
 * when the gate ran, so the gate inspected none of them and would have turned
 * red on the commit that added them — a sweep that passes because it looked at
 * nothing (Standards review, 2026-09-07). `--others --exclude-standard` adds
 * what is new and still honours .gitignore, so `node_modules` and `dist` stay
 * out.
 */
const inRepo = (repo: string): string[] =>
  execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: repo, encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
  }).split("\n").map((l) => l.trim()).filter(Boolean);

/** CRLF is not content: the file is matched the way a person reads it. */
const read = (repo: string, file: string): string =>
  readFileSync(`${repo}/${file}`, "utf8").split("\r\n").join("\n");

/** A sentence wrapped across two lines of prose is still the sentence. */
const flowed = (repo: string, file: string): string => read(repo, file).replace(/\s+/g, " ");

const WORKING_NAME = /visa[\s_-]?navigator|visa[\s_-]?rules/i;

/**
 * The directory the data package sits in on disk, read from the manifest that
 * points at it rather than typed here.
 *
 * The folders are not renamed in this slice — decision 1 renames the product,
 * and the repositories on GitHub are the human's — so the dependency path still
 * names the old directory. That is a path, not a name a reader meets, and it is
 * exempt for that reason. Read rather than written because a gate that has to
 * spell the thing it forbids is a gate that reports itself (Standards review,
 * 2026-09-07).
 */
const DEPENDENCY_PATH: string = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).dependencies["permit-rulebook-data"].replace(/^file:/, "");

/** The directory's own name, without the `../`. */
const DEPENDENCY_DIR = DEPENDENCY_PATH.replace(/^(\.\.\/)+/, "");

/**
 * The two lines that may name the directory on disk, each because it IS the
 * path and not a name a reader meets — and no others.
 *
 * It used to be forgiven on any line at all: every mention of the dependency's
 * directory was stripped before the pattern ran, which is a blanket exemption
 * wearing the shape of a rule (Standards review, 2026-09-08). These two are
 * named, and the folder rename that would end them is the human's.
 */
const isTheDependencyPath = (file: string, line: string): boolean => {
  const bare = line.split(DEPENDENCY_PATH).join(" ").split(DEPENDENCY_DIR).join(" ");
  if (WORKING_NAME.test(bare)) return false;
  // The manifest's own `file:` dependency — the one fact that fixes the
  // directory's name for everything else — and the lock file npm derives from
  // it, which nobody writes by hand.
  if (file === "package.json" && /"permit-rulebook-data":\s*"file:/.test(line)) return true;
  if (file === "package-lock.json") return true;
  // This file states the rule, so it has to be able to describe it.
  if (file === "tests/name-sweep.test.ts") return true;
  // The README's clone command, which has to put the data repository where the
  // manifest expects to find it.
  return file === "README.md" && line.startsWith("git clone ");
};

/**
 * Exact lines that may keep the old name, each for a reason that is not "we
 * missed it". The list is exact strings rather than a pattern on purpose:
 * widening it is a visible edit to this file, and a pattern would quietly
 * forgive the next thing that looks like it.
 */
/**
 * The one line that may still carry the old name, identified by where it lives
 * and what it declares — never by quoting it, which would put the name in this
 * file and make the gate report itself.
 *
 * It is the browser key a record was written under before the rename. It is
 * read once, migrated on the first save and then removed, so a person who
 * answered questions yesterday still finds their record today; a name tidied at
 * the cost of a thirteen-question interview is not a tidier product.
 */
const isTheMigratedKey = (file: string, line: string): boolean =>
  file === "src/lib/record.ts" && /^export const LEGACY_STORAGE_KEY = /.test(line.trim());

describe("s6 — the working name is gone from everything a reader can see (ledgers, CONTEXT.md, docs/spine, docs/adr, data/verify-* and git history excluded by name)", () => {
  for (const [name, repo] of Object.entries(REPOS))
    it(`${name}: no tracked file outside the excluded history carries the working name`, () => {
      const offenders: string[] = [];
      for (const file of inRepo(repo)) {
        if (isHistory(file)) continue;
        let text: string;
        try { text = read(repo, file); } catch { continue; }
        for (const line of text.split("\n")) {
          if (!WORKING_NAME.test(line)) continue;
          if (isTheDependencyPath(file, line)) continue;
          if (isTheMigratedKey(file, line)) continue;
          offenders.push(`${file}: ${line.trim().slice(0, 120)}`);
        }
      }
      expect(offenders).toEqual([]);
    });

  it("and the new name is actually there, in the places decision 1 names", () => {
    const site = REPOS["permit-rulebook"];
    const data = REPOS["permit-rulebook-data"];
    expect(JSON.parse(read(site, "package.json")).name).toBe("permit-rulebook");
    expect(JSON.parse(read(data, "package.json")).name).toBe("permit-rulebook-data");
    expect(flowed(site, "README.md")).toContain("Permit Rulebook");
    expect(flowed(site, "README.md")).toContain("Every route, quoted and dated.");
    expect(flowed(data, "README.md")).toContain("Permit Rulebook");
    expect(flowed(data, "README.md")).toContain("Every route, quoted and dated.");
    // What the build actually produces, not which identifier the template
    // happens to use: a page could import PRODUCT_NAME and print nothing.
    const built = new URL("../dist/index.html", import.meta.url);
    if (existsSync(built)) {
      const html = readFileSync(built, "utf8").split("\r\n").join("\n");
      expect(/<title>([^<]*)<\/title>/.exec(html)?.[1]).toContain(PRODUCT_NAME);
      expect(html).not.toMatch(WORKING_NAME);
    }
    // And the route pages, which the suite renders without a build.
    const page = routePages(dataset as unknown as Dataset)[0];
    expect(page.title).toContain(PRODUCT_NAME);
    expect(page.html).not.toMatch(WORKING_NAME);
    expect(JSON.parse(read(data, "schema/ruleset.schema.json")).title).toBe("Permit Rulebook dataset");
  });

  it("the tagline and the disclaimer have one source, and both READMEs quote it", () => {
    const site = REPOS["permit-rulebook"];
    const data = REPOS["permit-rulebook-data"];
    const disclaimer =
      "Permit Rulebook makes no immigration decision and no authority is bound by these results";
    // The one source, read as the product reads it — the sentence is composed
    // from the name, so the file does not contain the literal and should not.
    expect(DISCLAIMER).toContain(disclaimer);
    expect(TAGLINE).toBe("Every route, quoted and dated.");
    expect(flowed(site, "README.md")).toContain(disclaimer);
    expect(flowed(data, "README.md")).toContain(disclaimer);
  });
});
