// @level application
import { digestOf } from "../generation/digest-list.mjs";
import { boundedList, sentenceOfError, short } from "../../log-wording.mjs";
import { MAX_ASSETS, MAX_ASSET_BYTES } from "./ceilings.mjs";

/**
 * What may be written into `dist/_astro/`. A host that has lost a file answers
 * `200` with an HTML page saying so — writing that over a stylesheet would
 * break the very deploy this step exists to save.
 */
const CARRIABLE = /^(?:text\/css|text\/javascript|application\/javascript|application\/ecmascript|text\/ecmascript)$/;

/**
 * The phase that carries: every name the live `page` needs and `digests`
 * attests to, fetched, checked and written into the build's `_astro/` (named
 * only, under `dryRun`). Returns what it carried, and in `problems` why each one
 * left behind was. The ceiling counts what was asked of the origin, not the
 * wins.
 */
export async function carryAttestedAssets(page, digests, run) {
  const carried = [];
  const problems = [];
  let asked = 0;
  const overCeiling = [];
  const overBudget = [];
  for (const name of page.needed.filter((name) => digests.has(name))) {
    if (asked >= MAX_ASSETS) { overCeiling.push(name); continue; }
    if (run.deadline - run.now() <= 0) { overBudget.push(name); continue; }
    asked += 1;
    // Built here, from the origin this run was given — never from the ref.
    const url = new URL(`_astro/${name}`, page.from).href;
    const asset = await attestedAssetOf(url, digests.get(name), run.answerWithinBudget);
    if (!asset.ok) { problems.push(`${name}: ${asset.why}`); continue; }
    if (!run.dryRun) {
      try {
        run.buildDirectory.writeCarriedAsset(name, asset.bytes);
      } catch (e) {
        problems.push(`${name}: it could not be written — ${sentenceOfError(e)}`);
        continue;
      }
    }
    carried.push({ name, bytes: asset.bytes.length, sha256: asset.digest });
  }
  // One line each, however many names are behind them.
  if (overCeiling.length)
    problems.push(`${boundedList(overCeiling)}: this run had already asked the origin for its ceiling of ${MAX_ASSETS} assets`);
  if (overBudget.length) problems.push(`${boundedList(overBudget)}: the run's ${run.budgetMs} ms budget was spent`);
  return { carried, problems };
}

/**
 * The bytes the origin answers at `url`, once its status, its type, its length
 * and its digest have all passed, with that digest — or why they did not.
 *
 * `short` on the type for the same reason as on every reference, one
 * population over: a `content-type` is a string the ORIGIN chose and this
 * step did not write, bounded by nothing but Node's header limit and reachable
 * once per asset, twenty times a run. `oneLine` already means it cannot start
 * a line of its own, so what `short` saves is a deploy log somebody can read.
 *
 * A 0-byte file would publish a 200 that answers nothing under a name the
 * deploy swears by — the defect this step exists to fix, with no console error
 * to find it by. It is refused before it is even hashed.
 */
async function attestedAssetOf(url, recordedDigest, answerWithinBudget) {
  const asset = await answerWithinBudget(url, MAX_ASSET_BYTES);
  if (!asset.ok) return { ok: false, why: asset.why };
  if (asset.status !== 200) return { ok: false, why: `answered ${asset.status}` };
  const type = asset.contentType.split(";")[0].trim().toLowerCase();
  if (!CARRIABLE.test(type)) return { ok: false, why: `answered 200 as ${type ? short(type) : "no content type"}` };
  const body = await asset.readBody();
  if (!body.ok) return { ok: false, why: `its body ${body.why}` };
  if (body.bytes.length === 0) return { ok: false, why: "answered 200 with an empty body" };
  const digest = digestOf(body.bytes);
  if (digest !== recordedDigest)
    return { ok: false, why: `its ${body.bytes.length} bytes are sha256:${digest}, not the sha256:${recordedDigest} the build that published this page recorded` };
  return { ok: true, bytes: body.bytes, digest };
}
