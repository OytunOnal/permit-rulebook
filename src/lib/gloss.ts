/**
 * Abbreviations a stranger cannot be expected to know, expanded the first time
 * each page uses one (scenario step 1: no abbreviation goes unexplained on
 * first use). `AufenthG` appears twice in the German source lines and `BeschV`
 * in the experienced-worker route's; to a searcher outside German-speaking
 * legal culture they are opaque tokens dressed as authority (route-page
 * critique F8).
 *
 * The symbol itself was one of them from 2026-09-08 (a reader on a phone asked
 * what "§" means) until s32's amendment 6 (the human's walk, 2026-09-18: "§ =
 * section yazmaya gerek yok"): the sign is read as a reader reads it, and the
 * words are gone from every screen. What a citation still explains on first
 * use is the act it names — "BeschV = the Employment Ordinance" — in the
 * bracket the citation already has.
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

/**
 * What the act a citation names is, in the citation's own form — "BeschV = the
 * Employment Ordinance" — the first time the page names it, and nothing after.
 * Spent against the abbreviation's own key, or `glossed` would explain the
 * same act twice in one breath.
 *
 * The words used to open with the sign — "§ = section; BeschV = …" — and
 * before that restated the citation: "(§ 20a, section 20a)", a stutter on
 * whichever heading it landed on (v1.1 gate critique, P1; s23). The sign's
 * words went in s32's amendment 6: the human reads § as a reader does.
 */
function actWords(act: string | undefined, seen: Glossary): string | null {
  const name = act?.trim();
  if (!name || !ACTS[name]) return null;
  const entry = ABBREVIATIONS.find(([token]) => token.test(name));
  if (!entry || seen.has(entry[0].source)) return null;
  seen.add(entry[0].source);
  return `${name} = ${ACTS[name]}`;
}

/**
 * The act a section citation names, said in words the first time a page cites
 * it. Safe on a name: it expands nothing inside the citation, so a route keeps
 * the name it is known by and the string a person would paste into a search
 * box survives whole — the words land after the citation, never in it. A
 * citation that names no act adds nothing: the sign carries no explainer
 * (amendment 6).
 */
export function glossSection(text: string, seen: Glossary): string {
  const first = SECTION.exec(text);
  if (!first) return text;

  const at = first.index;
  const run = bracketRun(text, at);
  if (!run) {
    const words = actWords(first[2], seen);
    return words
      ? `${text.slice(0, at)}${first[0]} (${words})${text.slice(at + first[0].length)}`
      : text;
  }

  // The words follow the whole run rather than cutting into it, and name the
  // act only where the run cites one section; a run of several ("§ 19c / § 6
  // BeschV") is left as it is, and the prose that follows explains the act.
  const inside = text.slice(run.open, run.close);
  const cited = [...inside.matchAll(new RegExp(SECTION.source, "g"))];
  const words = cited.length === 1 ? actWords(cited[0]![2], seen) : null;
  return words ? `${text.slice(0, run.close)}; ${words}${text.slice(run.close)}` : text;
}

/** A citation's act and every abbreviation: our prose, never a name. */
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
