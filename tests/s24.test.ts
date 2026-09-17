import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset } from "permit-rulebook-data";
import { sitemapEntries, sitemapXml } from "../src/lib/sitemap.js";
import { absolute } from "../src/lib/site.js";

/**
 * s24 — the deploy tells Bing what changed (IndexNow).
 *
 * Bing reads the sitemap on its own clock; the site rebuilds daily and takes
 * several slices a week. IndexNow is the protocol Bing accepts for "these
 * addresses changed": a public key file at the root and one POST after each
 * deploy. No account, no secret — so the whole slice is a committed file, one
 * job in the Pages workflow, and the record of what is sent and to whom.
 *
 * Every case here reads what ships: the file in `public/`, the workflow text,
 * the built `dist/`, and the two documents that say it out loud.
 */

const root = fileURLToPath(new URL("..", import.meta.url));
const publicDir = join(root, "public");
const dist = join(root, "dist");
const ds = dataset as unknown as Dataset;

/** CRLF is a checkout detail on Windows, not a fact about the file. */
const read = (path: string): string => readFileSync(path, "utf8").split("\r\n").join("\n");

const pages = read(join(root, ".github", "workflows", "pages.yml"));

/** One job's text: from its name to the next job at the same indent; "" if absent. */
const jobOf = (name: string): string => {
  const start = pages.indexOf(`\n  ${name}:\n`);
  if (start < 0) return "";
  const rest = pages.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[a-z][a-z0-9-]*:\n/);
  return next < 0 ? rest : rest.slice(0, next + 1);
};

/** The key file's name IS the key: 32 lowercase hex characters, `.txt`. */
const KEY_FILE = /^([0-9a-f]{32})\.txt$/;
const keyFiles = readdirSync(publicDir).filter((f) => KEY_FILE.test(f));

describe("a key file at the root (point 1)", () => {
  it("exactly one public/<32 lowercase hex>.txt", () => {
    expect(keyFiles, "no IndexNow key file in public/ — generate one: 32 lowercase hex").toHaveLength(1);
  });

  it("whose content is the key — the same string as its name", () => {
    const [file] = keyFiles;
    const key = KEY_FILE.exec(file!)![1]!;
    const content = readFileSync(join(publicDir, file!), "utf8");
    // A trailing newline is tolerated by the protocol; a carriage return or a
    // second line is not the key.
    expect(content).toMatch(/^[0-9a-f]{32}\n?$/);
    expect(content.trim()).toBe(key);
  });

  it.skipIf(!existsSync(dist))("and the build serves it verbatim at the root", () => {
    const [file] = keyFiles;
    expect(existsSync(join(dist, file!)), `dist/${file} — public/ is not being copied`).toBe(true);
    expect(readFileSync(join(dist, file!), "utf8")).toBe(readFileSync(join(publicDir, file!), "utf8"));
  });
});

describe("one job after a green deploy (points 2 and 3)", () => {
  const job = jobOf("indexnow");

  it("runs after both the build and the deploy, and never fails the run", () => {
    expect(job, "pages.yml has no job \"indexnow\"").not.toBe("");
    expect(job).toMatch(/^\s{4}needs: \[build, deploy\]$/m);
    // A notification must never fail a deploy: the job as a whole is allowed
    // to fail, and the step exits 0 whatever Bing answers.
    expect(job).toMatch(/^\s{4}continue-on-error: true$/m);
  });

  it("asks for the least it needs, explicitly", () => {
    expect(job).toMatch(/^\s{4}permissions:\n\s{6}contents: read$/m);
    expect(job).not.toMatch(/: write/);
  });

  it("fires only on a real deploy — a first attempt of push, schedule or dispatch", () => {
    expect(job).toContain("success()");
    expect(job).toContain("github.run_attempt == 1");
    for (const event of ["push", "schedule", "repository_dispatch"])
      expect(job, `the ${event} deploy is not announced`).toContain(`github.event_name == '${event}'`);
    // Neither a manual preview nor a re-run that deployed nothing.
    expect(job).not.toContain("workflow_dispatch");
    // The data-commit condition belongs to the lock, not to the announcement.
    expect(job).not.toContain("needs.build.outputs.built");
  });

  it("posts once to IndexNow with curl, and prints the status", () => {
    expect(job).toContain("https://api.indexnow.org/indexnow");
    expect(job).toMatch(/curl .*-X POST/);
    expect(job).toContain("Content-Type: application/json; charset=utf-8");
    expect(job).toMatch(/-w '%\{http_code\}'/);
    // No action does the talking — the step is a shell and curl.
    expect(job).not.toMatch(/uses: (?!actions\/checkout@)/);
  });

  it("sends the four fields the protocol names", () => {
    for (const field of ["host", "key", "keyLocation", "urlList"])
      expect(job, `the body has no "${field}"`).toMatch(new RegExp(`--arg(?:json)? ${field} `));
  });

  it("reads the key from the committed file and types it nowhere", () => {
    // The file is found by the shape of its name, and the name is the key.
    expect(job).toContain("public/");
    expect(job).toContain("[0-9a-f]{32}");
    // The whole workflow carries no 32-hex literal: the key lives in one
    // place, and `keyLocation` is spelled from the same filename.
    expect(pages).not.toMatch(/(?<![0-9a-f])[0-9a-f]{32}(?![0-9a-f])/);
    expect(job).toContain('"${SITE_URL%/}/${key}.txt"');
  });

  it("announces the addresses the build read from dist/sitemap.xml", () => {
    const build = jobOf("build");
    expect(build).toContain("dist/sitemap.xml");
    expect(build).toMatch(/^\s{6}urls: \$\{\{ steps\.\w+\.outputs\.urls \}\}$/m);
    // Through the environment, never interpolated into the script body.
    expect(job).toContain("URLS: ${{ needs.build.outputs.urls }}");
    expect(job).not.toContain("$URLS: ${{");
  });
});

/**
 * The extraction is the workflow's own `grep | sed`, run over a real sitemap,
 * against the list the site builds it from. Needs a POSIX shell with grep and
 * sed: the CI runner has one; on Windows, Git's own bash serves, if present.
 */
const bash = (() => {
  const candidates = ["C:\\Program Files\\Git\\bin\\bash.exe", "bash"];
  for (const candidate of candidates) {
    try {
      if (execFileSync(candidate, ["-c", "echo ok"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() === "ok")
        return candidate;
    } catch { /* try the next */ }
  }
  return null;
})();

describe.skipIf(!bash)("the workflow's own extraction reads every <loc> and nothing else", () => {
  it("grep | sed over the built sitemap yields exactly the sitemap's addresses", () => {
    const line = pages.split("\n").find((l) => l.includes("grep -o '<loc>"));
    expect(line, "the build job does not extract <loc> from the sitemap").toBeDefined();
    // The expression up to the JSON step, which needs jq and is not what is
    // under test here: the shell half is where a quote goes wrong.
    const expression = line!.trim().replace(/^\w+=\$\(/, "").split("| jq")[0]!.replace("dist/sitemap.xml", "sitemap.xml");
    const dir = mkdtempSync(join(tmpdir(), "s24-"));
    writeFileSync(join(dir, "sitemap.xml"), sitemapXml(ds));
    const out = execFileSync(bash!, ["-c", expression], { cwd: dir, encoding: "utf8" }).trim().split("\n");
    expect(out).toEqual(sitemapEntries(ds).map((e) => absolute(e.path)));
    expect(out.length).toBeGreaterThan(20);
  });
});

describe("recorded where a reader can see it (point 4)", () => {
  it("README says what is sent and to whom", () => {
    const readme = read(join(root, "README.md"));
    expect(readme).toContain("IndexNow");
    expect(readme).toMatch(/Bing/);
  });

  it("the threat model accepts the public key in one row", () => {
    const threats = read(join(root, "docs", "spine", "threats.md"));
    const row = threats.split("\n").find((l) => l.startsWith("|") && l.includes("IndexNow"));
    expect(row, "threats.md has no IndexNow row").toBeDefined();
    expect(row).toMatch(/\*\*Accepted, because\*\*/);
    expect(row).toMatch(/public/);
  });
});
