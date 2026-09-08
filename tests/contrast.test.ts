import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * The lowest-contrast text on the results page was the disclosure that stops a
 * reader over-reading "criteria met" (isolated v1-gate critique, 2026-09-08,
 * F8). `--color-hold` measured 4.21 against the card and 3.82 against the page
 * on eight elements, "Also required — not checked here:" among them.
 *
 * `--color-muted` was raised once for exactly this reason and `--color-hold` was
 * not. This is the case that keeps them both above the line: the tokens are
 * read from the stylesheet, so lightening one again fails here rather than in
 * front of a reader.
 */

const tokens = readFileSync(new URL("../tokens.css", import.meta.url), "utf8").split("\r\n").join("\n");

const valueOf = (name: string): string => {
  const found = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(tokens);
  expect(found, `--${name} is not a six-digit hex in tokens.css`).toBeTruthy();
  return found![1]!;
};

/** WCAG 2.1 relative luminance and contrast ratio. */
const channel = (c: number): number => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

/** Every ground body text is set on. */
const GROUNDS = ["color-bg", "color-card", "color-hold-soft"];

describe("text tokens clear AA on every ground they are set on", () => {
  for (const ink of ["color-hold", "color-muted", "color-ink"])
    it(`--${ink} is at least 4.5:1 everywhere`, () => {
      for (const ground of GROUNDS) {
        const ratio = contrast(valueOf(ink), valueOf(ground));
        expect(
          Math.round(ratio * 100) / 100,
          `--${ink} on --${ground} is ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    });
});
