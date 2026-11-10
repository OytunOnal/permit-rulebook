// @level presentation
import {
  answerLabel, criterionPhrase, decidingCriteria, subjectOf, type CriterionResult, type RouteResult,
} from "permit-rulebook-data";
import {
  otherPathNeedsLine, otherPathUnknownLine, pathTakenLine, type PathTakenFrame, type UnmetRule,
} from "../../../../copy/verdict.js";
import { glossed } from "../../../../gloss.js";
import { esc } from "../../../../reason.js";
import type { CardScreen } from "./card-screen.js";

/**
 * The path a full card went through (#315, ruling 3 on #187): one line for
 * each criterion whose paths the dataset names (`subject`), saying the
 * deciding path and then why each other path did not count, in the reader's
 * own answers. The engine's deciding path is what it reads; nothing here
 * decides a path. Where nothing has decided, nothing is said (GLOSSARY,
 * **Deciding path**).
 */

/** One path of a named criterion a path has decided: its words, and its
 * results as the engine judged them. */
interface NamedPath {
  subject: string;
  results: CriterionResult[];
}

/** A named criterion a path has decided: the path taken, and every other. */
interface DecidedNamedPaths {
  taken: string;
  others: NamedPath[];
}

/** A decided criterion's paths, each with its words, or none where its
 * paths carry no words. An evaluated disjunction always carries every
 * path's results; one without them is refused by name. */
function namedPathsOf(cr: CriterionResult): NamedPath[] {
  const { criterion } = cr;
  if (criterion.op !== "any") return [];
  const subjects = criterion.paths.flatMap((p) => (p.subject === undefined ? [] : [p.subject]));
  if (subjects.length !== criterion.paths.length) return [];
  const results = cr.path_results;
  if (results === undefined) throw new Error(`"${criterion.label}" was decided with no path results to name its paths by`);
  return subjects.map((subject, i) => ({ subject, results: results[i] }));
}

/** Each criterion of these results whose paths carry words and whose path
 * is decided, in order, a deciding path's own criteria walked in turn. */
function decidedNamedPathsOf(results: CriterionResult[]): DecidedNamedPaths[] {
  return results.flatMap((cr): DecidedNamedPaths[] => {
    if (!cr.path) return [];
    const taken = cr.path.index;
    const paths = namedPathsOf(cr);
    const own = paths.length ? [{ taken: paths[taken].subject, others: paths.filter((_, i) => i !== taken) }] : [];
    return [...own, ...decidedNamedPathsOf(cr.path.criteria)];
  });
}

/**
 * The words of each path a decided criterion of this route did not take. An
 * "Also required" item linked to one of them does not bind this reader: a
 * full card drops it (ruling 5 on #187).
 */
export function pathsNotTakenOf(r: RouteResult): Set<string> {
  return new Set(decidedNamedPathsOf(r.criteria).flatMap((d) => d.others.map((p) => p.subject)));
}

/** A path's results as a reason names them: a nested criterion with paths
 * by its own deciding path's rules, an undecided one by none. */
const namedRulesOf = (results: CriterionResult[]): CriterionResult[] =>
  results.flatMap((cr) => (cr.criterion.op === "any" ? decidingCriteria([cr]) : [cr]));

/**
 * Why a path that did not count did not: its unmet rules in the not-yet
 * row's form, then each answer of "I don't know" it still turns on, in the
 * unknown row's form. A path with nothing unmet says nothing — where it is
 * met as well, only the path taken is named.
 */
function otherPathSentences(screen: CardScreen, path: string, results: CriterionResult[]): string[] {
  const { ds, answers } = screen;
  const rules = namedRulesOf(results);
  const unmet: UnmetRule[] = rules.filter((cr) => cr.outcome === "fail").map((cr) => {
    const { criterion } = cr;
    const asks = criterionPhrase(ds, criterion);
    return "field" in criterion ? { asks, declared: answerLabel(ds, criterion.field, answers[criterion.field]) } : { asks };
  });
  const unknown = rules.flatMap((cr) => {
    const { criterion } = cr;
    if (cr.outcome !== "unknown" || !("field" in criterion)) return [];
    const { field } = criterion;
    const answered = answers[field] !== undefined;  // an unasked question is no answer of "I don't know"
    return answered ? [otherPathUnknownLine(path, answerLabel(ds, field, answers[field]), subjectOf(ds, field))] : [];
  });
  return [...(unmet.length ? [otherPathNeedsLine(path, unmet)] : []), ...unknown];
}

/** The path lines of a full card, in the frame its badge sets, glossed on the
 * screen's memory like the rest of the card's words. */
export function pathLinesHtml(screen: CardScreen, r: RouteResult, frame: PathTakenFrame): string {
  const seen = screen.glossary ?? new Set();
  return decidedNamedPathsOf(r.criteria).map((d) => {
    const others = d.others.flatMap((p) => otherPathSentences(screen, p.subject, p.results));
    const said = [pathTakenLine(frame, d.taken), ...others].join(" ");
    return `<div class="path">${esc(glossed(said, seen))}</div>`;
  }).join("");
}
