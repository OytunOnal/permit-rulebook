/**
 * Abbreviations a stranger cannot be expected to know, expanded the first time
 * each page uses one (scenario step 1: no abbreviation goes unexplained on
 * first use). `AufenthG` appears twice in the German source lines and `BeschV`
 * in the experienced-worker route's; to a searcher outside German-speaking
 * legal culture they are opaque tokens dressed as authority (route-page
 * critique F8).
 *
 * The symbol itself is one of them. A reader on a phone asked what "§" means
 * (human walk, 2026-09-08) — it is in the name of every German route, so it
 * greets a stranger before any prose does.
 *
 * The gloss is appended, never substituted into the citation: "§ 18g AufenthG"
 * stays the citation a reader can search for, and gains the words after it. It
 * runs over OUR text only — a route's own name, a citation, the licence name —
 * never over a quote, which is verbatim by contract.
 *
 * One module, so the route page and the results card explain a symbol the same
 * way, and each page keeps its own memory of what it has already said.
 */

/** One page's memory of which abbreviations it has already explained. */
export type Glossary = Set<string>;

export const ABBREVIATIONS: ReadonlyArray<readonly [token: RegExp, gloss: string]> = [
  [/\bAufenthG\b/, "AufenthG (the Residence Act)"],
  [/\bBeschV\b/, "BeschV (the Employment Ordinance)"],
  [/\bTFEU\b/, "TFEU (the Treaty on the Functioning of the European Union)"],
  [/\bUGE\b/, "UGE (Spain's large-companies unit)"],
  [/\bIND\b/, "IND (the Dutch immigration service)"],
  [/\bCNO-2011\b/, "CNO-2011 (Spain's occupation classification)"],
];

/**
 * A section citation: the symbol, its number, and — where the citation carries
 * one — the act it belongs to. The act is matched with it so the first use
 * spends one parenthetical instead of two abutting ones.
 */
const SECTION = /\u00a7[\u00a0\u202f ]?([0-9]+[a-z]?)( (?:AufenthG|BeschV))?/;
const SECTION_KEY = "section-sign";

/** The acts a section number can belong to, in the words the gloss uses. */
const ACTS: Readonly<Record<string, string>> = {
  AufenthG: "the Residence Act",
  BeschV: "the Employment Ordinance",
};

/**
 * The citation a reader would copy, and where the gloss may go without breaking
 * it.
 *
 * A route's name already parenthesises its citation ("Skilled worker — academic
 * (§ 18b)"), and some name two at once ("Experienced worker (§ 19c / § 6
 * BeschV)"). Splitting that run — "(§ 19c, section 19c / § 6 BeschV)" — breaks
 * the string a person would paste into a search box, which is the one thing a
 * citation is for (Spec review, 2026-09-08). So inside a bracket the words go
 * after the whole run, and outside one they bring their own bracket.
 */
function bracketRun(text: string, at: number): { open: number; close: number } | null {
  const open = text.lastIndexOf("(", at);
  if (open < 0) return null;
  const closed = text.slice(open, at).includes(")");
  if (closed) return null;
  const close = text.indexOf(")", at);
  return { open, close: close < 0 ? text.length : close };
}

/** "section 19c" — or, for a run that cites several, "sections 19c and 6". */
function sectionWords(numbers: string[], act?: string): string {
  const named = act ? ACTS[act.trim()] : undefined;
  if (numbers.length === 1) return `section ${numbers[0]}${named ? ` of ${named}` : ""}`;
  const last = numbers[numbers.length - 1]!;
  return `sections ${numbers.slice(0, -1).join(", ")} and ${last}`;
}

/**
 * The section symbol, said in words the first time a page uses it. Safe on a
 * name: it expands nothing but the symbol, so a route keeps the name it is
 * known by — and it never lands inside a citation, only after it.
 */
export function glossSection(text: string, seen: Glossary): string {
  if (seen.has(SECTION_KEY)) return text;
  const first = SECTION.exec(text);
  if (!first) return text;
  seen.add(SECTION_KEY);

  const at = first.index;
  const act = first[2];
  // The act's own gloss is spent here too, or one breath would explain the same
  // abbreviation twice.
  const spendAct = (which: string | undefined) => {
    if (!which) return;
    const entry = ABBREVIATIONS.find(([token]) => token.test(which));
    if (entry) seen.add(entry[0].source);
  };

  const run = bracketRun(text, at);
  if (!run) {
    spendAct(act);
    return `${text.slice(0, at)}${first[0]} (${sectionWords([first[1]!], act)})${text.slice(at + first[0].length)}`;
  }

  // Every citation the bracket holds, in the order it holds them: the gloss
  // follows the run rather than cutting into it.
  const inside = text.slice(run.open, run.close);
  const numbers: string[] = [];
  let onlyAct: string | undefined;
  for (const m of inside.matchAll(new RegExp(SECTION.source, "g"))) {
    numbers.push(m[1]!);
    if (m[2]) onlyAct = numbers.length === 1 ? m[2] : onlyAct;
  }
  if (numbers.length === 1) spendAct(onlyAct);
  const words = sectionWords(numbers, numbers.length === 1 ? onlyAct : undefined);
  const separator = numbers.length === 1 ? ", " : "; ";
  return `${text.slice(0, run.close)}${separator}${words}${text.slice(run.close)}`;
}

/** The section symbol and every abbreviation: our prose, never a name. */
export function glossed(text: string, seen: Glossary): string {
  let out = glossSection(text, seen);
  for (const [token, gloss] of ABBREVIATIONS) {
    const key = token.source;
    if (seen.has(key) || !token.test(out)) continue;
    seen.add(key);
    out = out.replace(token, gloss);
  }
  return out;
}
