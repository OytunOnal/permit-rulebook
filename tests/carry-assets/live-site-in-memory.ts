/**
 * The live site in memory, for the carry's flow: what each URL answers, as
 * `liveAnswerFor` would hand it over, with no socket anywhere. Each site gets
 * an origin of its own, and `liveAnswerFor` answers for every site a case has
 * opened, so a URL off every open site is one nothing answers — the shape of
 * a host that is down.
 *
 * It keeps the reader's one promise the flow leans on, the byte ceiling: an
 * answer longer than the ceiling the flow passed is refused, as the reader
 * over HTTP refuses it.
 */

/** What the live site answers for one path. */
export type Answer = { status?: number; type?: string; body?: Buffer };

export type LiveAnswer =
  | { ok: true; status: number; contentType: string; bytes: Buffer }
  | { ok: false; why: string };

type OpenSite = { answers: Record<string, Answer>; asked: string[] };

const openSites = new Map<string, OpenSite>();
let sitesOpened = 0;

/**
 * A live site answering exactly what a case tells it to, recording every path
 * asked for, so "it fetched only what was missing" and "it never fetched that
 * at all" are measurements rather than inferences. A path it was not told
 * about answers 404, as a static host does.
 */
export function liveSiteInMemory(answers: Record<string, Answer>): { url: string; asked: string[]; close: () => void } {
  sitesOpened += 1;
  const url = `http://live-${sitesOpened}.test`;
  const asked: string[] = [];
  openSites.set(url, { answers, asked });
  return { url, asked, close: () => { openSites.delete(url); } };
}

/** What the open site at `url`'s origin answers for its path, or why nothing does. */
export async function liveAnswerFor(url: string, { byteCeiling }: { byteCeiling: number; timeoutMs: number }): Promise<LiveAnswer> {
  const at = new URL(url);
  const site = openSites.get(at.origin);
  if (!site) return { ok: false, why: `fetch failed (nothing answers at ${at.host})` };
  site.asked.push(at.pathname);
  const answer = site.answers[at.pathname];
  if (!answer) return { ok: true, status: 404, contentType: "text/html", bytes: Buffer.from("not found") };
  const bytes = answer.body ?? Buffer.alloc(0);
  if (bytes.length > byteCeiling) return { ok: false, why: `its body is over the ${byteCeiling}-byte ceiling` };
  return { ok: true, status: answer.status ?? 200, contentType: answer.type ?? "application/octet-stream", bytes };
}
