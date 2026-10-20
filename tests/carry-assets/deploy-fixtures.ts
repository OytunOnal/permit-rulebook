import { expect } from "vitest";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pageOf } from "./live-page.js";
import type { Answer } from "./live-site-in-memory.js";

/**
 * A live deploy and the build the carry fills, for the carry's tests: the
 * assets, the digest list published beside them, the page naming them, and a
 * throwaway `dist/` per case.
 */

/** A stylesheet with a multi-byte character and a CRLF: nothing may normalise it. */
export const CSS = Buffer.from("/* ü */\r\n.a{color:red}\n", "utf8");
export const JS = Buffer.from("export const n = 1; // é\n", "utf8");
export const CSS_NAME = "index.AAAAAAAA.css";
export const JS_NAME = "index.BBBBBBBB.js";

export const sha256 = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");

/**
 * The digest list a build publishes for the next deploy to check bytes against.
 * Its name and its two lines are spelled out here rather than imported: it is a
 * PUBLISHED file format, read by a deploy that ran days before the code reading
 * it, so a change to its shape has to go red here and be made deliberately.
 */
export const DIGESTS = "asset-digests.txt";
export const HEADER = "permit-rulebook asset digests v1";
export const digestListBytesOf = (assets: Record<string, Buffer>): Buffer => Buffer.from(
  [HEADER, ...Object.entries(assets).map(([name, bytes]) => `${sha256(bytes)}  ${name}`), ""].join("\n"),
  "utf8",
);

/**
 * The live page, naming its assets the way Astro writes them — root-absolute,
 * under the base the site is served from.
 */
export const pageNaming = (names: string | string[], base = ""): Buffer => pageOf(
  [names].flat().map((n) => `${base}/_astro/${n}`),
);

/**
 * A whole live deploy: the page naming these assets, the digest list the build
 * that published that page wrote beside it, and the assets themselves. The
 * three travel together because on the live host they were published together
 * — a case that wants them to disagree says so by hand.
 */
export function liveDeployAnswers(assets: Record<string, Buffer>, base = ""): Record<string, Answer> {
  const answers: Record<string, Answer> = {
    [`${base}/`]: { type: "text/html; charset=utf-8", body: pageNaming(Object.keys(assets), base) },
    [`${base}/${DIGESTS}`]: { type: "text/plain; charset=utf-8", body: digestListBytesOf(assets) },
  };
  for (const [name, bytes] of Object.entries(assets))
    answers[`${base}/_astro/${name}`] = { type: name.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8", body: bytes };
  return answers;
}

const temporary: string[] = [];

/** A fresh temp directory, swept after the case. */
export function tempDirectory(): string {
  const dir = mkdtempSync(join(tmpdir(), "permit-rulebook-carry-"));
  temporary.push(dir);
  return dir;
}

/** Removes every temp directory the case made; each test file runs it after each case. */
export function sweepTemporary(): void {
  for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true, force: true });
}

/** A `dist/` holding whatever this build already produced. */
export function distHolding(have: Record<string, Buffer> = {}): string {
  const dir = tempDirectory();
  mkdirSync(join(dir, "_astro"), { recursive: true });
  for (const [name, bytes] of Object.entries(have)) writeFileSync(join(dir, "_astro", name), bytes);
  return dir;
}

export const astroFilesIn = (dir: string): string[] => readdirSync(join(dir, "_astro")).sort();

/**
 * The refusal a case is actually about, in the step's own words.
 *
 * Every refusal looks the same from outside: nothing in `_astro/` and the name
 * on a line. So does the step's clock running out — measured, on an origin
 * that sent headers and then went quiet: `could not carry index.AAAAAAAA.css:
 * its body The operation was aborted due to timeout`, exit 0, `_astro/` empty.
 * A case asserting only "nothing carried, and the name is printed" is
 * therefore green either way, and on a starved runner the second route is
 * real. Each refusal names the thing its verdict turns on instead — the digest
 * the build recorded, the ceiling, the word for the shape it refused — so a
 * case that passes because the origin was slow goes red here rather than
 * quietly.
 *
 * `mark` is the assertion and `decision` is only ever a message. The mark is
 * the evidence — a string this step prints on one route and no other — and it
 * is the only half a test can check. The decision is what that string MEANS,
 * and it has no spelling in the output to be compared against: it exists so
 * that the one person who will ever read it, looking at a red run, is told
 * what the case was about.
 */
export const expectRefusedOver = (out: string, mark: string, decision: string): void => {
  expect(out, `nothing was carried, but the step never got as far as ${decision}`).toContain(mark);
};
