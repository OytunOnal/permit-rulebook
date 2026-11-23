// @level infrastructure
/**
 * Refreshes the committed copy of Cloudflare's traffic counter script, the
 * one a walk asking for `trafficCounter: "cloudflare's copy"` is served: it
 * fetches the live script from its one address, writes it over the copy, and
 * rewrites the date on the note beside the copy. Run by hand only; no check
 * compares the copy to the live file.
 *
 * It reads only the counter's address, and writes only the copy and its note.
 * An answer that is not a 200 with a JavaScript body under the ceiling, or a
 * note with no date line to rewrite, is refused, and nothing is written.
 * `refreshTrafficCounterCopy` returns what it did and prints nothing: the
 * words are `cli-refresh-traffic-counter-copy.mjs`'s.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { TRAFFIC_COUNTER_COPY, TRAFFIC_COUNTER_SCRIPT } from "./browser/browser.mjs";
import { fetchLiveAnswerOverHttp } from "./live-site-over-http.mjs";

/** The note beside the copy, which names its source and the day it was fetched. */
const NOTE = join(dirname(TRAFFIC_COUNTER_COPY), "README.md");

/** The note's date line: the one line the refresh rewrites. */
const FETCHED_ON_LINE = /^Fetched on \d{4}-\d{2}-\d{2}\./m;

/** The copy was 31,853 bytes on 2026-11-23; a body past eight times that is not the counter's script. */
const BYTE_CEILING = 256 * 1024;

/** One small file over the network: past half a minute it is not coming. */
const TIMEOUT_MS = 30_000;

/**
 * Why the live answer for the counter's script is not a script to copy, or
 * null when it is: its status, or its type.
 */
function whyNotAScript({ status, contentType }) {
  if (status !== 200) return `${TRAFFIC_COUNTER_SCRIPT} answered ${status}`;
  if (!/javascript/i.test(contentType)) return `${TRAFFIC_COUNTER_SCRIPT} answered ${contentType || "no content type"}, not JavaScript`;
  return null;
}

/**
 * Fetches the counter's live script and writes it over the copy, and today's
 * date (`today`, a `YYYY-MM-DD`) on the note: `{ refreshed: true, bytes }`,
 * or `{ refreshed: false, why }` with nothing written.
 */
export async function refreshTrafficCounterCopy(today) {
  const note = readFileSync(NOTE, "utf8");
  if (!FETCHED_ON_LINE.test(note)) return { refreshed: false, why: `${NOTE} has no "Fetched on <date>." line to rewrite` };
  const answer = await fetchLiveAnswerOverHttp(TRAFFIC_COUNTER_SCRIPT, { byteCeiling: BYTE_CEILING, timeoutMs: TIMEOUT_MS });
  if (!answer.ok) return { refreshed: false, why: `${TRAFFIC_COUNTER_SCRIPT}: ${answer.why}` };
  const refused = whyNotAScript(answer);
  if (refused) return { refreshed: false, why: refused };
  const body = await answer.readBody();
  if (!body.ok) return { refreshed: false, why: `${TRAFFIC_COUNTER_SCRIPT} ${body.why}` };
  writeFileSync(TRAFFIC_COUNTER_COPY, body.bytes);
  writeFileSync(NOTE, note.replace(FETCHED_ON_LINE, `Fetched on ${today}.`));
  return { refreshed: true, bytes: body.bytes.length };
}
