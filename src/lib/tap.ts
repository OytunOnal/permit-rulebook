// @level presentation
import { escAttr } from "./reason.js";

// ---------------------------------------------------------------------------
// The two ways an interactive element reaches the tap floor
// ---------------------------------------------------------------------------

/**
 * `tap-min` for anything that owns a box — a button, a crumb, a row in the
 * data door. `tap` for a link inside a sentence, where a taller line would
 * open a hole in the prose: it takes the height in vertical padding and gives
 * it back in negative margin.
 *
 * Every `<a>` and `<button>` on a generated page carries exactly one of them,
 * which is what makes the invariant checkable without a browser: the v0.7
 * critique measured 34/22/20 px controls, the token was written for it, and the
 * first mock designed afterwards broke it on seven of sixteen controls.
 */
export const TAP_CLASSES = ["tap", "tap-min"] as const;

export const tapMin = (extra = ""): string => `class="${escAttr(extra ? `${extra} ` : "")}tap-min"`;
export const tapInline = (extra = ""): string => `class="${escAttr(extra ? `${extra} ` : "")}tap"`;
