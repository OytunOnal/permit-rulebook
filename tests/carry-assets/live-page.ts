/**
 * Live pages for the carry's tests: HTML naming whatever a case wants it to
 * name, the way Astro writes a reference.
 */

/** The live page, naming whatever a case wants it to name, verbatim. */
export const pageOf = (refs: string[]): Buffer => Buffer.from(
  `<!DOCTYPE html><html><head>${refs
    .map((ref) => (ref.endsWith(".css")
      ? `<link rel="stylesheet" href="${ref}">`
      : `<script type="module" src="${ref}"></script>`))
    .join("")}</head><body></body></html>`,
  "utf8",
);

/**
 * A page of distinct `/_astro/` references, about `bytes` long. Distinct,
 * because the cost a case measures with this is per NAME kept, not per byte
 * scanned.
 */
export const pageOfSize = (bytes: number): string => {
  const refs: string[] = [];
  for (let i = 0, n = 0; n < bytes; i += 1) {
    refs.push(`/_astro/index.${String(i).padStart(8, "0")}.css`);
    n += refs.at(-1)!.length + 30;
  }
  return pageOf(refs).toString("utf8");
};
