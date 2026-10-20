import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeAssetDigests } from "../../scripts/carry-assets/digest-list.mjs";

/**
 * The digest list's format, as plain calls. What the carry does with a list it
 * reads — what it carries, refuses and says — is `tests/s33.test.ts`'s.
 */

/** A stylesheet with a multi-byte character and a CRLF: nothing may normalise it. */
const CSS = Buffer.from("/* ü */\r\n.a{color:red}\n", "utf8");
const JS = Buffer.from("export const n = 1; // é\n", "utf8");
const CSS_NAME = "index.AAAAAAAA.css";
const JS_NAME = "index.BBBBBBBB.js";

const sha256 = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");

/**
 * The list's name and its first line are spelled out here rather than
 * imported: it is a PUBLISHED file format, read by a deploy that ran days
 * before the code reading it, so a change to its shape has to go red here and
 * be made deliberately.
 */
const DIGESTS = "asset-digests.txt";
const HEADER = "permit-rulebook asset digests v1";

const temporary: string[] = [];

/** A `dist/` holding whatever this build produced, in a temp directory swept after the case. */
function dist(have: Record<string, Buffer> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "permit-rulebook-carry-"));
  temporary.push(dir);
  mkdirSync(join(dir, "_astro"), { recursive: true });
  for (const [name, bytes] of Object.entries(have)) writeFileSync(join(dir, "_astro", name), bytes);
  return dir;
}

afterEach(() => {
  for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("the digest list a build publishes for the next deploy", () => {
  it("publishes the digest list this build's assets will be checked against", () => {
    const out = dist({ [CSS_NAME]: CSS, [JS_NAME]: JS });
    const result = writeAssetDigests(out);
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(readFileSync(join(out, DIGESTS), "utf8")).toBe(
      `${HEADER}\n${sha256(CSS)}  ${CSS_NAME}\n${sha256(JS)}  ${JS_NAME}\n`,
    );
  });
});
