/**
 * The fonts the runner has and this machine does not, forced on the page it
 * is evaluated in.
 *
 * CI is ubuntu: no Segoe UI, no Cambria, no Consolas. A case measuring the
 * identity pair runs with the fonts here and again with whatever the machine
 * falls back to, because the pair and the header have now been broken twice
 * by a width this machine could not see (CI, 2026-09-08).
 */
export const FALLBACK_STACK = '(() => { const s = document.createElement("style");'
  + ' s.textContent = ":root{--font-serif:serif;--font-sans:sans-serif;--font-mono:monospace}";'
  + ' document.head.appendChild(s); return "forced"; })()';
