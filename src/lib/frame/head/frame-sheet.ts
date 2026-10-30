// @level presentation
// The token set itself, not a copy of it. It was pasted in — forty values
// retyped from `tokens.css` — which is the one thing the token file exists to
// prevent: "a value that steps outside a token is a greppable deviation", and a
// second copy is a deviation nobody can grep for (Standards review,
// 2026-09-07). Inlined into the page rather than linked because a route page is
// one file a stranger and a crawler both fetch cold.
import TOKENS from "../../../../tokens.css?raw";
// The identity pair, from the one file both screens read. The results page
// links the same stylesheet, so the mark and the stamp cannot drift apart
// into two identities (human, 2026-09-08).
import IDENTITY from "../../../../identity.css?raw";
// The frame's own rules, and the blocks several pages draw: each page's own
// rules are that page's, beside its code, and reach the frame through `css`.
import FRAME_RULES from "./frame.css?raw";
import SHARED_BLOCKS from "./shared-blocks.css?raw";
/**
 * A stylesheet arrives with whatever line endings the checkout gave it.
 *
 * Both files are read from disk and printed into every page, so on a Windows
 * working copy the build emitted CRLF where CI emitted LF: the same commit,
 * two different pages, and the fingerprint that proves the template did not
 * drift went red on the machine the human walks from (2026-09-10). The line
 * ending is the checkout's business; the page is ours.
 */
export const lf = (css: string): string => css.split("\r\n").join("\n");

// ---------------------------------------------------------------------------
// The stylesheet
// ---------------------------------------------------------------------------

/**
 * `docs/roadkeeper/design/s6-route-page.html`, verbatim, plus the two tap rules and
 * the accessibility fixes the critique's F5 asked for (a focus style of the
 * page's own, and a way to give a section a heading a screen reader can find
 * without printing one twice).
 *
 * The tokens are inlined rather than imported: a route page is one file a
 * search engine and a stranger both fetch cold, and a second request for four
 * kilobytes of custom properties buys nothing.
 */
export const FRAME_SHEET = `
${lf(TOKENS)}
${lf(FRAME_RULES)}
${lf(IDENTITY)}
${lf(SHARED_BLOCKS)}`;
