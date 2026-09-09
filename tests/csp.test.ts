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

  /**
   * The policy as SHIPPED. It is read off a built page rather than recomputed
   * here: the builder returns nothing under `astro dev`, whose own injected
   * scripts it would block, and a test process is a dev environment
   * (2026-09-08).
   */
  const shipped = (): string => {
    const home = pages.find((p) => p.path === "/index.html");
    expect(home, "nothing is built — run npm run build").toBeDefined();
    const found = /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(home!.html);
    expect(found, "the built home page carries no policy").toBeTruthy();
    // What the BROWSER sees: the attribute is escaped on the way out, and
    // entities are decoded on the way in.
    return found![1]!
      .split("&#39;").join("'")
      .split("&quot;").join(String.fromCharCode(34))
      .split("&amp;").join("&");
  };

  it("carries the policy, and the same one everywhere", () => {
    expect(pages.length, "nothing is built — run npm run build").toBeGreaterThan(25);
    // Compared as SHIPPED — the escaped attribute, byte for byte — so a page
    // that ships a different policy fails whatever the entities look like.
    const home = pages.find((p) => p.path === "/index.html")!;
    const asShipped = /<meta http-equiv="Content-Security-Policy" content="[^"]*">/.exec(home.html)![0];
    for (const page of pages)
      expect(page.html, `${page.path} has no policy`).toContain(asShipped);
  });

  it("names the counter's two hosts and nothing else off this site", () => {
    expect(pages.length, "nothing is built — run npm run build").toBeGreaterThan(25);
    const policy = shipped();
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

  /**
   * Every inline script that RUNS is hashed. A `type` the browser does not
   * execute — the data page's `application/ld+json` block, which describes the
   * dataset for a crawler — is not a script at all: the HTML parser calls it a
   * data block, never prepares it, and `script-src` never sees it. Measured
   * rather than assumed: the built data page loads in a real browser with zero
   * console errors and no refusal in the log (`npm run smoke`, 2026-09-09),
   * and hashing it would have put a dataset-dependent hash in every page's
   * policy for a string only one page carries.
   */
  it("hashes every inline script a page actually runs", () => {
    expect(pages.length, "nothing is built — run npm run build").toBeGreaterThan(25);
    const policy = shipped();
    for (const page of pages) {
      const inline = [...page.html.matchAll(/<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/g)];
      for (const [, attributes, source] of inline) {
        const type = /type="([^"]*)"/.exec(attributes ?? "")?.[1];
        if (type && type !== "module" && type !== "text/javascript") {
          // A data block earns its exemption by being one: parseable data, with
          // nothing in it that could run if a browser changed its mind.
          expect(type, `${page.path}: an inline script of an unexpected type`).toBe("application/ld+json");
          expect(() => JSON.parse(source!), `${page.path}: a data block that is not data`).not.toThrow();
          continue;
        }
        expect(policy, `${page.path}: an inline script the policy does not hash`).toContain(sha256(source!));
      }
    }
  });

  it("and every script it loads from elsewhere is the counter", () => {
    expect(pages.length, "nothing is built — run npm run build").toBeGreaterThan(25);
    for (const page of pages)
      for (const src of [...page.html.matchAll(/<script[^>]*\ssrc="([^"]*)"/g)].map((m) => m[1]!))
        if (src.startsWith("http"))
          expect(src, `${page.path}: ${src}`).toBe(ANALYTICS_SCRIPT);
  });
});
