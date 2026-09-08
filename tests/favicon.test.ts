import { describe, expect, it } from "vitest";
import { inflateSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * The tab icon is the stamp, not a cream tile with a stamp on it.
 *
 * Shipped as identity B it carried a full-canvas cream square, which reads as a
 * pale block on a dark tab strip and as a seam on a light one. The human chose
 * option C from the design page on 2026-09-08: the canvas transparent, the
 * tilted frame's inside filled cream, letters and frame in stamp red. The
 * letters and the frame do not change, and neither do the header seal or the
 * social card.
 *
 * The PNGs are rendered from this SVG, so the alpha has to survive the render:
 * a screenshot with a white default background would put the square back and
 * nothing would say so.
 */

const publicDir = fileURLToPath(new URL("../public/", import.meta.url));
const svg = readFileSync(`${publicDir}favicon.svg`, "utf8").split("\r\n").join("\n");

/** The pixels of a PNG, as RGBA rows. Small icons only — no interlacing. */
function pixels(file: string): { width: number; height: number; rgba: Buffer; colourType: number } {
  const png = readFileSync(file);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const colourType = png[25]!;
  const chunks: Buffer[] = [];
  for (let at = 8; at < png.length;) {
    const length = png.readUInt32BE(at);
    const type = png.toString("ascii", at + 4, at + 8);
    if (type === "IDAT") chunks.push(png.subarray(at + 8, at + 8 + length));
    at += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const bpp = colourType === 6 ? 4 : 3;
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  // PNG filters, per scanline: none, sub, up, average, paeth.
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp]! : 0;
      const b = y > 0 ? out[(y - 1) * stride + x]! : 0;
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp]! : 0;
      let value = line[x]!;
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + x] = value & 255;
    }
  }
  return { width, height, rgba: out, colourType };
}

describe("the tab icon is the stamp itself", () => {
  it("has no full-canvas square, and the frame holds the paper", () => {
    expect(svg, "the cream tile is back").not.toMatch(/<rect\s+width="64"\s+height="64"/);
    // The tilted frame is the one filled shape.
    expect(svg).toMatch(/<rect x="4.5" y="4.5" width="55" height="55" fill="#f1eee4" stroke="#8c2b2b"/);
    expect(svg).toContain('stroke-width="3"');
    expect(svg).toContain('fill="#8c2b2b"');
    expect(svg).toContain(">PR</text>");
    expect(svg).toContain("rotate(-6 32 32)");
  });

  for (const size of [16, 32, 64])
    it(`favicon-${size}.png keeps its alpha, and its corners are transparent`, () => {
      const { width, height, rgba, colourType } = pixels(`${publicDir}favicon-${size}.png`);
      expect(width).toBe(size);
      expect(height).toBe(size);
      expect(colourType, "rendered without an alpha channel").toBe(6);
      // A tilted stamp cannot reach a corner: those pixels are the page behind.
      const corners = [
        [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
      ] as const;
      for (const [x, y] of corners) {
        const alpha = rgba[(y * width + x) * 4 + 3]!;
        expect(alpha, `corner ${x},${y} is opaque — the icon was drawn on a background`).toBe(0);
      }
      // And the middle of the stamp is not: the icon still draws something.
      const middle = rgba[((height >> 1) * width + (width >> 1)) * 4 + 3]!;
      expect(middle, "the whole icon is transparent").toBeGreaterThan(200);
    });
});
