import type { BrowserPage } from "../scripts/browser/browser.mjs";

/**
 * The colour a text is drawn in, read from a screenshot's pixels at its place
 * (ROADKEEPER_STANDARDS.md, Tests: a visible state is proven by a
 * screenshot's pixels, never by a computed style). The screenshot is decoded
 * in the page that took it, which reads PNG as any browser does.
 */

/** A colour as a screenshot holds it: red, green and blue, each 0 to 255. */
export type Rgb = [number, number, number];

/** What a screenshot shows over a text's box: the colour most of the box is
 * (its ground), and the colour farthest from it (its ink, the glyphs' own
 * colour where their strokes are solid). */
export interface InkOnGround {
  ground: Rgb;
  ink: Rgb;
}

/** A text's box on the screen, in CSS pixels from the viewport's corner. */
export interface TextBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The window property the page's decode writes its reading on, once done. */
const READING = "__inksOnGround";

/** In the page: the box of the text of the first element each selector
 * finds, or null for a selector that finds none, as JSON. */
function readTextBoxes(selectors: string[]): string {
  return JSON.stringify(selectors.map((selector) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const text = document.createRange();
    text.selectNodeContents(element);
    const { left, top, width, height } = text.getBoundingClientRect();
    return { left, top, width, height };
  }));
}

/** The expression that reads the box of the text each selector finds. */
const textBoxesOf = (selectors: string[]): string => `(${readTextBoxes})(${JSON.stringify(selectors)})`;

/** In the page: the ground and the ink over each box of the image `context` holds, its pixels `scale` times the
 * page's. */
function readInksOnGround(context: OffscreenCanvasRenderingContext2D, boxes: TextBox[], scale: number): InkOnGround[] {
  return boxes.map((box) => {
    const { data } = context.getImageData(Math.round(box.left * scale), Math.round(box.top * scale),
      Math.max(1, Math.round(box.width * scale)), Math.max(1, Math.round(box.height * scale)));
    const counts = new Map<string, number>();
    for (let i = 0; i < data.length; i += 4) {
      const key = data[i] + "," + data[i + 1] + "," + data[i + 2];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const ground = [...counts].sort((a, b) => b[1] - a[1])[0]![0].split(",").map(Number) as Rgb;
    let ink = ground;
    let farthest = -1;
    for (let i = 0; i < data.length; i += 4) {
      const away = Math.hypot(data[i]! - ground[0], data[i + 1]! - ground[1], data[i + 2]! - ground[2]);
      if (away > farthest) { farthest = away; ink = [data[i]!, data[i + 1]!, data[i + 2]!]; }
    }
    return { ground, ink };
  });
}

/** In the page: starts decoding `png` (base64) and reading the ground and the ink over each box with `readInks`,
 * at the screenshot's scale; the reading, or the decode's error, is written on the window under `reading` once
 * done. */
function startInkReading(png: string, boxes: TextBox[], { reading, readInks }: {
  reading: string; readInks: typeof readInksOnGround;
}): void {
  const marks = window as unknown as Record<string, string | undefined>;
  marks[reading] = undefined;
  const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
  createImageBitmap(new Blob([bytes], { type: "image/png" })).then((bitmap) => {
    const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    marks[reading] = JSON.stringify(readInks(context, boxes, bitmap.width / innerWidth));
  }, (error) => { marks[reading] = JSON.stringify({ error: String(error) }); });
}

/** The script that starts, in the page, decoding `png` and reading the ground and the ink over each box. */
const inkReadingScript = (png: string, boxes: TextBox[]): string =>
  `(${startInkReading})(${JSON.stringify(png)}, ${JSON.stringify(boxes)}, { reading: ${JSON.stringify(READING)}, readInks: ${readInksOnGround} })`;

/** How far apart two colours are: the straight distance between them in RGB. */
export const distanceBetween = (a: Rgb, b: Rgb): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * The ground and the ink of the text of the first element each selector
 * finds, read from one screenshot of the screen as it stands. Each element is
 * to be on the screen already. Throws, naming it, for a selector that finds
 * nothing, and for a screenshot the page could not decode.
 */
export async function inksOnGroundAt(page: BrowserPage, selectors: string[]): Promise<InkOnGround[]> {
  const boxes = JSON.parse(await page.evaluate(textBoxesOf(selectors))) as (TextBox | null)[];
  const missing = selectors.filter((_, i) => boxes[i] === null);
  if (missing.length) throw new Error(`nothing on the screen for ${missing.join(", ")}`);
  return inksOnGroundIn(page, boxes as TextBox[]);
}

/**
 * The ground and the ink over each box, read from one screenshot of the
 * screen as it stands. Throws for a screenshot the page could not decode.
 */
export async function inksOnGroundIn(page: BrowserPage, boxes: TextBox[]): Promise<InkOnGround[]> {
  const png = (await page.screenshot()).toString("base64");
  await page.evaluate(inkReadingScript(png, boxes));
  const reading = JSON.parse(String(await page.waitUntil(`window.${READING}`, "the screenshot was never read"))) as
    InkOnGround[] | { error: string };
  if (!Array.isArray(reading)) throw new Error(`the page could not decode its screenshot: ${reading.error}`);
  return reading;
}
