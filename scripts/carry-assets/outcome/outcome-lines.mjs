// @level domain
import { boundedList, oneLine } from "../../log-wording.mjs";

/**
 * What the step says about one run, each line through `oneLine`: what it
 * carried, what it could not, the counted line, and the verdict.
 *
 * WHEN THIS STEP ENDS QUIET — the rule, in the one place it is decided.
 * Nothing downstream reads this step's output, so the run summary is where a
 * reader's broken page is predicted or nowhere.
 *
 * THREE OUTCOMES, and they are the whole of what this step says about the page
 * a reader is holding: nothing to do · could not look · looked and something
 * is still missing. It ends quiet only on the first. The third has three
 * shapes, each its own line because each is a different thing that page needs
 * and does not have — a file this build lacks, a URL this deploy does not
 * publish, or any evidence at all that what answered was a page this site
 * published. Three lines, one outcome; a page can be wrong in more than one of
 * these ways at once and each is worth saying.
 *
 * Anything but the first is a `::warning::` on the run summary, as the
 * IndexNow step already uses for "nothing sent", and each says which it is.
 * The failed digest publish is annotated where it happens, in the entry's
 * `digestListLines`, and is not one of these three because it is not about
 * this page at all — its subject is the NEXT deploy, which without a list has
 * nothing to check a carried byte against.
 */
export function logLinesOf(record, { dryRun }) {
  const lines = [];
  for (const { name, bytes, sha256 } of record.carried) {
    lines.push(oneLine(`${dryRun ? "would carry" : "carried"} ${name}  ${bytes} bytes  sha256:${sha256}`));
  }
  for (const problem of record.problems) lines.push(oneLine(`could not carry ${problem}`));
  // Where the page came from, and only ever the parse: `where` is `from` — set
  // the moment `new URL` succeeds — whenever there is one, so this names a host
  // exactly when a request was built for one. With no parse there is no
  // address to report, so what is printed is the phrase the bail that ended
  // the run chose for itself; the lines above have already said why.
  lines.push(oneLine(
    `${record.carried.length} asset(s) ${dryRun ? "would be carried" : "carried"} `
    + `from ${record.where}, `
    + `${record.alreadyBuilt.length} already in this build, ${record.problems.length} left behind`,
  ));
  return [...lines, ...verdictLinesOf(record)];
}

/** The annotations that say which of the three outcomes happened; none on the quiet one. */
function verdictLinesOf(record) {
  if (!record.looked) {
    return [oneLine(
      "::warning::could not read the live page, so this deploy does not know whether a reader holding it"
      + ` still finds its assets: ${record.problems.at(-1) ?? "no reason was given"}`,
    )];
  }
  const lines = [];
  const missing = record.needed.filter((name) => !record.carried.some((asset) => asset.name === name));
  const unserved = record.unserved.map(({ ref }) => ref);
  // A page whose every reference is unserved raises the first of these AND the
  // third, and that is the intended reading of two true things rather than one
  // predicate being loose. Counting `unserved` in with `alreadyBuilt` and
  // `needed` would still fire on a proxy notice, because a page referencing
  // nothing has no unserved reference either; what it would cost is this page,
  // which would then report only that one URL 404s and withhold the other
  // half, that NOTHING on it matched this deploy, which is the evidence that
  // the page answering may not be ours at all. Two questions, two answers, and
  // neither answers the other.
  if (record.alreadyBuilt.length + record.needed.length === 0) {
    lines.push(oneLine(
      "::warning::the live page answered 200 and references none of this deploy's assets"
      + " — every page of ours that is cached names them, so nothing here was checked against a page this site published",
    ));
  }
  if (missing.length) {
    lines.push(oneLine(
      `::warning::the live page references ${boundedList(missing)}, which this build does not have`
      + ` — a reader holding that page asks for ${missing.length === 1 ? "it" : "them"} and gets a 404`,
    ));
  }
  if (unserved.length) {
    lines.push(oneLine(
      `::warning::the live page references ${boundedList(unserved)}, which ${unserved.length === 1 ? "does" : "do"} not resolve to this deploy's assets`
      + ` — a reader holding that page asks for ${unserved.length === 1 ? "that URL" : "those URLs"} and gets a 404, and this step does not carry ${unserved.length === 1 ? "it" : "them"}`,
    ));
  }
  return lines;
}
