// @level presentation
import { WIDE_FROM_PX, WIDE_QUERY } from "./first-paint.js";

/**
 * The site's one narrow/wide breakpoint, written once (#388).
 *
 * A stylesheet cannot import, so the width the first paint reads,
 * `WIDE_FROM_PX`, was typed again by hand in every sheet that turns with it,
 * and a missed copy would split the page at two widths (#69). Each sheet now
 * writes a name for the side it draws, `@media (--narrow)` or
 * `@media (--wide)`, and this step writes the first paint's width in its
 * place, before any other step reads the sheet.
 */
const QUERY_OF_NAME: Readonly<Record<string, string>> = {
  "(--narrow)": `(max-width: ${WIDE_FROM_PX - 1}px)`,
  "(--wide)": WIDE_QUERY,
};

/** `text` with every breakpoint name written as the first paint's width. */
const withBreakpointWidths = (text: string): string =>
  Object.entries(QUERY_OF_NAME).reduce((written, [name, query]) => written.split(name).join(query), text);

/** A stylesheet's id in the build: a sheet a module imports, or the text of one it inlines through `?raw`. */
const SHEET_ID = /\.css(\?|$)/;

/** The step, as the build and the suite each load it: a Vite plugin that runs before Vite's own. */
interface SheetStep {
  name: string;
  enforce: "pre";
  transform(code: string, id: string): string | null;
}

/**
 * The build step that writes the breakpoint's width into every stylesheet,
 * loaded by the site's build (`astro.config.mjs`) and by the suite
 * (`vitest.config.ts`) alike, so a page the suite draws carries the same
 * sheets the reader gets. A sheet a module imports is rewritten before Vite
 * reads it as CSS; a sheet inlined through `?raw` arrives as a module holding
 * its text, where the name is the same string.
 */
export const breakpointWidthsStep = (): SheetStep => ({
  name: "breakpoint-widths",
  enforce: "pre",
  transform: (code, id) => (SHEET_ID.test(id) ? withBreakpointWidths(code) : null),
});
