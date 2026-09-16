import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { INTRO_SUBLINE, SHORT_SUBLINE } from "../src/lib/screen.js";

/**
 * s17 — the comparison has no subject called "Code".
 *
 * The home masthead said "Code compares your answers against published rules
 * — …" and the results screen "Code compared your 3 answers against 4
 * published rule sets. …". A sentence whose subject is "Code" read oddly to
 * the human (raised 2026-09-15 and withdrawn the same hour; raised again on
 * the s16 walk, 2026-09-16: "bu code hala duruyor"). Of three forms — "We
 * compared…", the passive, "The rules compared…" — they chose the passive: the
 * subject leaves the sentence, the claim (a comparison by code, not a
 * judgement by a person) stays.
 *
 * The sentences themselves are asserted beside `mastheadFor` in
 * `screen.test.ts`. What is asserted here is that the old subject is gone from
 * everything a reader meets — the built site — and from everything that
 * writes it, so it cannot come back through a page this slice did not read.
 */

const here = (url: string): string => fileURLToPath(new URL(url, import.meta.url));
const dist = here("../dist");
const read = (path: string): string => readFileSync(path, "utf8").split("\r\n").join("\n");

function builtPages(): { path: string; html: string }[] {
  const out: { path: string; html: string }[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const at = join(dir, name);
      if (statSync(at).isDirectory()) walk(at);
      else if (name.endsWith(".html")) out.push({ path: at.slice(dist.length).split("\\").join("/"), html: read(at) });
    }
  };
  if (existsSync(dist)) walk(dist);
  return out;
}

/** What a reader would read, with the markup gone and the whitespace folded. */
const readerSees = (html: string): string =>
  html.replace(/<[^>]*>/g, "").split(/\s+/).join(" ").split(String.fromCharCode(160)).join(" ").trim();

/** The subject this slice removes, in either tense. */
const CODE_AS_SUBJECT = /\bCode compar/;

describe("the comparison has no subject called \"Code\" (s17)", () => {
  it("nothing under src/ writes \"Code compar\" — the sweep the scenario names, as a case", () => {
    // `grep -n "Code compar"` over `src/` finds nothing after (scenario point
    // 4). Run over what git tracks and what is new, the way the name sweep of
    // s6 does, so a file added by this slice is inspected too.
    const root = here("..");
    const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "src"], {
      cwd: root, encoding: "utf8",
    }).split("\n").map((l) => l.trim()).filter(Boolean);
    expect(files.length, "src/ has no files").toBeGreaterThan(5);
    const carrying = files.filter((f) => CODE_AS_SUBJECT.test(read(join(root, f))));
    expect(carrying).toEqual([]);
  });

  it("neither standing promise on a question screen has \"Code\" as its subject", () => {
    expect(INTRO_SUBLINE).not.toMatch(CODE_AS_SUBJECT);
    expect(SHORT_SUBLINE).not.toMatch(CODE_AS_SUBJECT);
    expect(INTRO_SUBLINE).not.toMatch(/^Code\b/);
    expect(SHORT_SUBLINE).not.toMatch(/^Code\b/);
  });
});

describe.skipIf(!existsSync(dist))("the built site, as a reader meets it (s17)", () => {
  const pages = builtPages();

  it("no built page carries \"Code compar\"", () => {
    expect(pages.length, "no pages were built").toBeGreaterThan(20);
    const carrying = pages.filter((p) => CODE_AS_SUBJECT.test(readerSees(p.html)) || CODE_AS_SUBJECT.test(p.html));
    expect(carrying.map((p) => p.path)).toEqual([]);
  });

  it("the cold / carries the new promise in its first paint — the masthead is server-rendered", () => {
    // Both standing forms are painted by the build and the pre-paint script
    // picks one (s10), so the HTML itself has to say the new sentences: a
    // module that swapped them in afterwards would be the s10 defect again.
    const home = pages.find((p) => p.path === "/index.html");
    expect(home, "no /index.html was built").toBeDefined();
    const words = readerSees(home!.html);
    expect(words).toContain(INTRO_SUBLINE);
    expect(words).toContain(SHORT_SUBLINE);
    expect(words).toContain("Your answers are compared against published rules");
  });
});
