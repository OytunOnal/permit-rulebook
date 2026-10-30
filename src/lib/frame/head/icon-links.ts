// @level presentation
import { escAttr } from "../../reason.js";
import { url } from "../../site.js";

/** The icon links, identical in every document's head. */
export function iconLinks(): string {
  return [
    `<link rel="icon" href="${escAttr(url("/favicon.ico"))}" sizes="16x16 32x32 64x64">`,
    `<link rel="icon" href="${escAttr(url("/favicon.svg"))}" type="image/svg+xml">`,
    // A search engine picks the icon it can read at its own size: Google asks
    // for a square that is a multiple of 48px, and the .ico's largest is 64
    // (2026-09-09 — the site was in the results, the mark was not).
    `<link rel="icon" href="${escAttr(url("/favicon-96.png"))}" type="image/png" sizes="96x96">`,
    `<link rel="apple-touch-icon" href="${escAttr(url("/favicon-180.png"))}">`,
  ].join(String.fromCharCode(10));
}
