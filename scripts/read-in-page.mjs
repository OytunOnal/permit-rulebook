// @level infrastructure
/**
 * A probe run in the page and its answer carried back: the probe is a real
 * function, its source text sent into the page, so it reads nothing from the
 * module that wrote it but the arguments it is handed.
 */

/**
 * Reads what `probe` returns on `page`, called with `args`, each given as its
 * source text; the answer comes back as JSON, so it is a plain value.
 *
 * @param {{ evaluate: (expression: string) => Promise<string> }} page
 * @param {(...args: any[]) => unknown} probe
 * @param {...string} args
 */
export async function readInPage(page, probe, ...args) {
  return JSON.parse(await page.evaluate(`JSON.stringify((${probe})(${args.join(", ")}))`));
}
