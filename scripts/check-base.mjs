// @level infrastructure
/**
 * Is the site correct under a subpath?
 *
 * GitHub Pages serves a project repository at
 * `https://oytunonal.github.io/permit-rulebook/`, and every root-absolute path
 * the site emits — the route pages, the favicons, the social card, the call to
 * action, the data door — lands outside it. Astro's `base` comes from
 * SITE_URL's own path and every internal URL goes through one helper; this
 * builds the site under a base and checks that nothing escaped it.
 *
 *   npm run check:base
 *
 * `checkBase` returns what it found and prints nothing: the report's lines and
 * exit code are `cli-check-base.mjs`'s, and `main-check-base.mjs` runs the two.
 *
 * It is a script rather than a suite case for a reason worth writing down: a
 * build spawned from inside a Vitest worker ignores SITE_URL and emits a
 * root-based site, with identical argv, cwd and environment to the same command
 * from a shell. Rather than assert against a build the runner had quietly
 * changed, the real check lives here, where it is honest — and CI runs it.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { childEnv } from "./child-env.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const BASE = "/sub";
const SITE = `https://example.org${BASE}/`;

const emitted = (dir) => {
  const out = [];
  (function walk(here) {
    for (const entry of readdirSync(here)) {
      const full = join(here, entry);
      if (statSync(full).isDirectory()) walk(full);
      else out.push(full);
    }
  })(dir);
  return out;
};

const nameOf = (dist, file) => relative(dist, file).split(sep).join("/");
/** Each match of `pattern` in `file` that `isProblem` flags, said as a problem. */
const problemsIn = (dist, file, { pattern, isProblem, problemOf }) =>
  [...readFileSync(file, "utf8").matchAll(pattern)]
    .filter(isProblem)
    .map((m) => `${nameOf(dist, file)}: ${problemOf(m)}`);

/** Builds the site into `dist` under SITE, its environment set as a shell's would be. */
function buildUnderBase(dist) {
  execFileSync(process.execPath, [join(root, "node_modules", "astro", "bin", "astro.mjs"), "build", "--outDir", dist], {
    cwd: root,
    env: childEnv({ SITE_URL: SITE, ASTRO_TELEMETRY_DISABLED: "1" }),
    stdio: "pipe",
  });
}

/** A build too small to be the site: fewer pages or endpoints than it emits. */
function tooFewProblems(html, json) {
  const problems = [];
  if (html.length < 25) problems.push(`only ${html.length} pages built`);
  if (json.length < 23) problems.push(`only ${json.length} JSON endpoints built`);
  return problems;
}

/** 1. Nothing points at the site root instead of the base. */
function rootAbsoluteProblems(dist, files) {
  const rootAbsolute = {
    pattern: /(?:href|src|content)="([/][^"/][^"]*)"/g,
    isProblem: (m) => m[1] !== BASE && !m[1].startsWith(`${BASE}/`),
    problemOf: (m) => `root-absolute ${m[0].slice(0, 90)}`,
  };
  return files.filter((f) => /[.](html|json|js|css)$/.test(f)).flatMap((file) => problemsIn(dist, file, rootAbsolute));
}

/** 2. Every internal link resolves to something the build actually emitted. */
function unresolvedProblems(dist, html) {
  const resolves = (p) => {
    const clean = p.replace(/[?#].*$/, "").slice(BASE.length);
    const target = join(dist, clean);
    return (existsSync(target) && statSync(target).isFile()) || existsSync(join(target, "index.html"));
  };
  const unresolved = {
    pattern: /(?:href|src)="([^"]+)"/g,
    isProblem: (m) => m[1].startsWith(BASE) && !resolves(m[1]),
    problemOf: (m) => `${m[1]} resolves to nothing built`,
  };
  return html.flatMap((file) => problemsIn(dist, file, unresolved));
}

/** 3. The meta a link preview reads carries the base too. */
function missingMetaProblems(dist) {
  const home = readFileSync(join(dist, "index.html"), "utf8");
  const route = readFileSync(join(dist, "germany", "eu-blue-card-general", "index.html"), "utf8");
  const expected = [
    [home, `<link rel="canonical" href="https://example.org${BASE}/"`],
    [home, `content="https://example.org${BASE}/social-card.png"`],
    // A page's address ends in a slash — the one the host serves and the one
    // the canonical names (2026-09-08).
    [route, `href="https://example.org${BASE}/germany/eu-blue-card-general/"`],
    [route, `href="${BASE}/germany/eu-blue-card-general.json"`],
    [route, `href="${BASE}/?route=de-blue-card-general"`],
    [route, `href="${BASE}/favicon.svg"`],
  ];
  return expected.filter(([text, needle]) => !text.includes(needle)).map(([, needle]) => `missing from the build: ${needle}`);
}

/** What the build in `dist` holds: its pages and endpoints counted, and each problem found in it. */
function scanBuild(dist) {
  const files = emitted(dist);
  const html = files.filter((f) => f.endsWith(".html"));
  const json = files.filter((f) => f.endsWith(".json"));
  const problems = [
    ...tooFewProblems(html, json),
    ...rootAbsoluteProblems(dist, files),
    ...unresolvedProblems(dist, html),
    ...missingMetaProblems(dist),
  ];
  return { site: SITE, pageCount: html.length, endpointCount: json.length, problems };
}

/**
 * Builds the site under a subpath into a throwaway folder under `.run/`,
 * scans it, and removes it: the site it was built for, its pages and
 * endpoints counted, and every problem found, an empty list for none.
 */
export function checkBase() {
  // Inside the project, not the OS temp folder: the build moves files from the
  // project into its output with a rename, which cannot cross filesystems, and
  // on GitHub's Ubuntu 26.04 image the temp folder is one of its own (#24).
  mkdirSync(join(root, ".run"), { recursive: true });
  const dist = mkdtempSync(join(root, ".run", "base-"));
  try {
    buildUnderBase(dist);
    return scanBuild(dist);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
}
