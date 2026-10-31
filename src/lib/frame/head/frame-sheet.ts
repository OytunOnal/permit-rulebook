// @level presentation
// The token set itself, read from `tokens.css`, never a copy of it: a value
// retyped here would step outside the tokens where no grep for them finds it.
import TOKENS from "../../../../tokens.css?raw";
// The identity pair, from the one file the interview links too, so the mark
// and the stamp cannot drift apart into two identities.
import IDENTITY from "../../../../identity.css?raw";
// The frame's own rules, and the blocks several pages draw: each page's own
// rules are that page's, beside its code, and reach the frame through `css`.
import FRAME_RULES from "./frame.css?raw";
import SHARED_BLOCKS from "./shared-blocks.css?raw";
/**
 * A stylesheet with line-feed line endings, whatever the checkout gave it.
 *
 * Every sheet the frame prints into a page, its own four and the page's own,
 * is read from disk, so on a Windows working copy it carries CRLF where CI's
 * carries LF: the same commit would build two different pages, and the
 * fingerprint that proves the template did not drift would go red on one
 * machine. The line ending is the checkout's business; the page is ours.
 */
export const withLineFeedEndings = (css: string): string => css.split("\r\n").join("\n");

// ---------------------------------------------------------------------------
// The stylesheet
// ---------------------------------------------------------------------------

/**
 * The frame's stylesheet, before a page's own rules: the tokens, the frame's
 * own rules, the identity and the blocks several pages draw, in that order.
 *
 * Inlined rather than linked: a page built as a string is one file a search
 * engine and a stranger both fetch cold, and a second request for its rules
 * buys nothing.
 */
export const FRAME_SHEET = `
${withLineFeedEndings(TOKENS)}
${withLineFeedEndings(FRAME_RULES)}
${withLineFeedEndings(IDENTITY)}
${withLineFeedEndings(SHARED_BLOCKS)}`;
