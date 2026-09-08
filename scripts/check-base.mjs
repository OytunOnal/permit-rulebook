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
 * It is a script rather than a suite case for a reason worth writing down: a
 * build spawned from inside a Vitest worker ignores SITE_URL and emits a
 * root-based site, with identical argv, cwd and environment to the same command
 * from a shell. Rather than assert against a build the runner had quietly
 * changed, the real check lives here, where it is honest — and CI runs it.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
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

const problems = [];
const dist = mkdtempSync(join(tmpdir(), "permit-rulebook-base-"));

try {
  execFileSync(process.execPath, [join(root, "node_modules", "astro", "bin", "astro.mjs"), "build", "--outDir", dist], {
    cwd: root,
    env: childEnv({ SITE_URL: SITE, ASTRO_TELEMETRY_DISABLED: "1" }),
    stdio: "pipe",
  });

  const files = emitted(dist);
  const html = files.filter((f) => f.endsWith(".html"));
  const json = files.filter((f) => f.endsWith(".json"));
  if (html.length < 25) problems.push(`only ${html.length} pages built`);
  if (json.length < 23) problems.push(`only ${json.length} JSON endpoints built`);

  // 1. Nothing points at the site root instead of the base.
  for (const file of files) {
    if (!/[.](html|json|js|css)$/.test(file)) continue;
    const name = relative(dist, file).split(sep).join("/");
    for (const m of readFileSync(file, "utf8").matchAll(/(?:href|src|content)="([/][^"/][^"]*)"/g)) {
      const target = m[1];
      if (target === BASE || target.startsWith(`${BASE}/`)) continue;
      problems.push(`${name}: root-absolute ${m[0].slice(0, 90)}`);
    }
  }

  // 2. Every internal link resolves to something the build actually emitted.
  const resolves = (p) => {
    const clean = p.replace(/[?#].*$/, "").slice(BASE.length);
    const target = join(dist, clean);
    return (existsSync(target) && statSync(target).isFile()) || existsSync(join(target, "index.html"));
  };
  for (const file of html) {
    const name = relative(dist, file).split(sep).join("/");
    for (const m of readFileSync(file, "utf8").matchAll(/(?:href|src)="([^"]+)"/g)) {
      const target = m[1];
      if (!target.startsWith(BASE)) continue;
      if (!resolves(target)) problems.push(`${name}: ${target} resolves to nothing built`);
    }
  }

  // 3. The meta a link preview reads carries the base too.
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
  for (const [text, needle] of expected) if (!text.includes(needle)) problems.push(`missing from the build: ${needle}`);

  console.log(`built ${html.length} pages and ${json.length} endpoints under ${SITE}`);
} finally {
  rmSync(dist, { recursive: true, force: true });
}

if (problems.length) {
  for (const p of problems.slice(0, 25)) console.log(`  ${p}`);
  if (problems.length > 25) console.log(`  … and ${problems.length - 25} more`);
  console.log(`\n${problems.length} problems under a subpath`);
  process.exit(1);
}
console.log("\nno root-absolute internal URL, and every internal link resolves");
