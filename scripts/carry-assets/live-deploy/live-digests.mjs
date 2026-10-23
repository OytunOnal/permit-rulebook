// @level application
import { DIGESTS_NAME, readAssetDigests } from "../generation/digest-list.mjs";
import { boundedList } from "../../log-wording.mjs";
import { MAX_LIST_BYTES } from "./ceilings.mjs";

/**
 * The live deploy's digest list, or the reason this run will carry nothing.
 *
 * One request, and only when there is something to carry: a deploy that
 * changed neither asset has nothing to check, and spending a request to learn
 * that is a request too many.
 */
async function liveAssetDigests(answerWithinBudget, url) {
  const answer = await answerWithinBudget(url, MAX_LIST_BYTES);
  if (!answer.ok) return { ok: false, why: `${DIGESTS_NAME}: ${answer.why}` };
  if (answer.status !== 200)
    return { ok: false, why: `${DIGESTS_NAME}: answered ${answer.status} — the live deploy published no digest list for this one to check bytes against` };
  const body = await answer.readBody();
  if (!body.ok) return { ok: false, why: `${DIGESTS_NAME}: its body ${body.why}` };
  const list = readAssetDigests(body.bytes.toString("utf8"));
  return list.ok ? list : { ok: false, why: `${DIGESTS_NAME}: it ${list.why}` };
}

/**
 * The phase that reads the digest list beside the live `page`: its digests,
 * when the list describes that page, with `problems` naming the needed names
 * it does not carry — or null, with `problems` saying why there is nothing to
 * check a byte against.
 *
 * Two questions, asked of two different sets. Whether the page and the list
 * describe the same deploy is asked of the page's WHOLE reference set: they
 * are published together, so a list naming not one of the names its page
 * references is not that page's list — a proxy holding one of them, or a
 * deploy that landed between these two requests — and there is then nothing
 * to check ANY byte against. Asked of what is left to carry instead, it would
 * make an ordinary deploy a disagreement: both real names are already built on
 * a deploy that changed neither, so one stray reference would be the whole of
 * `needed`.
 *
 * Whether one name can be carried is asked of that name alone: nothing here
 * can say what the bytes of a name the list does not carry should be. A page
 * reference `/_astro/../../pwn.css` normalises to `pwn.css`, which no list of
 * ours will ever carry, and refusing the run over it would leave every real
 * asset behind — one attribute in a page this step does not own, turning the
 * step off.
 */
export async function liveDigestsMatchingPage(page, run) {
  const list = await liveAssetDigests(run.answerWithinBudget, new URL(DIGESTS_NAME, page.from).href);
  if (!list.ok) return { digests: null, problems: [`anything: ${list.why}`] };
  const { names } = page;
  if (!names.some((name) => list.digests.has(name))) {
    const problem = `anything: ${DIGESTS_NAME} names none of the ${names.length} asset(s) this page references (${boundedList(names)})`
      + " — the page and the list are from different deploys, so there is nothing to check these bytes against";
    return { digests: null, problems: [problem] };
  }
  const problems = [];
  const unlisted = page.needed.filter((name) => !list.digests.has(name));
  if (unlisted.length) {
    problems.push(
      `${boundedList(unlisted)}: ${DIGESTS_NAME} does not name ${unlisted.length === 1 ? "it" : "them"},`
      + " so there is nothing to check those bytes against",
    );
  }
  return { digests: list.digests, problems };
}
