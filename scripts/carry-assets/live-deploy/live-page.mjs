// @level application
import { readAssetNames } from "../generation/asset-names.mjs";
import { MAX_ASSETS, MAX_PAGE_BYTES } from "./ceilings.mjs";

/**
 * The phase that reads the live page at `pageUrl`: the names it references
 * that are this deploy's assets, which of them this build already has and
 * which it needs, every reference it declined, and whether it got as far as
 * looking.
 *
 * The reasons differ reference by reference, so the declined ones stay lines
 * rather than a folded list — but there is the same bottom to how many a page
 * can print as to how many it can fetch. A reference that resolves off this
 * deploy is reported the same way: it is a reference this step declined, and
 * the line says why, which is what the reader is going to run into. It is
 * also kept apart in `unserved` for the verdict: it resolves under OUR OWN
 * origin to something this deploy does not publish, so it is a request the
 * reader's browser makes to our host and a 404 it gets back. The rest name
 * another host, which answers for itself, or resolve nowhere at all, which is
 * a request no browser makes either.
 */
export async function assetNamesOfLivePage(pageUrl, run) {
  const unread = { names: [], from: pageUrl, unserved: [], alreadyBuilt: [], needed: [], looked: false };
  const page = await run.answerWithinBudget(pageUrl, MAX_PAGE_BYTES);
  if (!page.ok) return { ...unread, problems: [`the live page ${pageUrl}: ${page.why}`] };
  if (page.status !== 200) return { ...unread, problems: [`the live page ${pageUrl}: answered ${page.status}`] };
  const html = await page.readBody();
  if (!html.ok) return { ...unread, problems: [`the live page ${pageUrl}: its body ${html.why}`] };

  const references = readAssetNames(html.bytes.toString("utf8"), pageUrl);
  const declined = [...references.refused, ...references.unserved];
  const problems = declined.slice(0, MAX_ASSETS).map(({ ref, why }) => `${ref}: it ${why}`);
  if (declined.length > MAX_ASSETS)
    problems.push(`the ${declined.length - MAX_ASSETS} further reference(s) this page named: each refused unread`);

  const alreadyBuilt = [];
  const needed = [];
  for (const name of references.names) {
    // Already in this build: no request, so no cost, so no ceiling.
    if (run.buildDirectory.isBuilt(name)) alreadyBuilt.push(name);
    else needed.push(name);
  }
  // `looked`: this run now knows what a reader holding the live page will ask
  // for, so what it says at the end is about those names rather than about not
  // having looked.
  const unserved = [...references.unserved];
  return { names: references.names, from: pageUrl, problems, unserved, alreadyBuilt, needed, looked: true };
}
