import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { contentSecurityPolicy, sha256 } from "../src/lib/csp.js";
import { MENU_SCRIPT } from "../src/lib/identity.js";
import { ANALYTICS_BEACON, ANALYTICS_SCRIPT } from "../src/lib/site.js";

/**
 * The traffic counter is the first third-party script this site runs
 * (2026-09-08). A page with no policy would let anything injected into it talk
 * to anywhere, so every page names what may execute and where it may connect.
 *
 * What this cannot do, said out loud: a meta policy carries no
 * `frame-ancestors` and no `report-uri` — both need a response header, and
 * GitHub Pages sets none on a custom domain. HSTS is in the same position.
 * Those are the human's to add at the edge if the site ever moves behind one.
 */

const dist = fileURLToPath(new URL("../dist", import.meta.url));
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

describe("every page states what may run on it", () => {
  const pages = builtPages();

  it("carries the policy, and the same one everywhere", () => {
    expect(pages.length, "nothing is built — run npm run build").toBeGreaterThan(25);
    const expected = contentSecurityPolicy([MENU_SCRIPT]);
    for (const page of pages)
      expect(page.html, `${page.path} has no policy`).toContain(expected);
  });

  it("names the counter's two hosts and nothing else off this site", () => {
    const policy = contentSecurityPolicy([MENU_SCRIPT]);
    expect(policy).toContain(`script-src 'self' ${ANALYTICS_SCRIPT}`);
    expect(policy).toContain(`connect-src 'self' ${new URL(ANALYTICS_BEACON).origin}`);
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("form-action 'none'");
    // No wildcard anywhere, and no unsafe script.
    expect(policy).not.toContain("*");
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it("hashes every inline script a page actually ships", () => {
    const policy = contentSecurityPolicy([MENU_SCRIPT]);
    for (const page of pages) {
      const inline = [...page.html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)]
        .map((m) => m[1]!);
      for (const source of inline)
        expect(policy, `${page.path}: an inline script the policy does not hash`).toContain(sha256(source));
    }
  });

  it("and every script it loads from elsewhere is the counter", () => {
    for (const page of pages)
      for (const src of [...page.html.matchAll(/<script[^>]*\ssrc="([^"]*)"/g)].map((m) => m[1]!))
        if (src.startsWith("http"))
          expect(src, `${page.path}: ${src}`).toBe(ANALYTICS_SCRIPT);
  });
});
