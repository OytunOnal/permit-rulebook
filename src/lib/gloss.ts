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
 * Where the gloss goes: a bracket inside a bracket is not how anyone reads, and
 * a route's name already parenthesises its citation ("Skilled worker — academic
 * (§ 18b)"). Inside one, the words follow a comma instead.
 */
function joined(prefix: string, citation: string, words: string): string {
  const inside = prefix.split("(").length > prefix.split(")").length;
  return inside ? `${citation}, ${words}` : `${citation} (${words})`;
}

/**
 * The section symbol, said in words the first time a page uses it. Safe on a
 * name: it expands nothing but the symbol, so a route keeps the name it is
 * known by.
 */
export function glossSection(text: string, seen: Glossary): string {
  if (seen.has(SECTION_KEY) || !SECTION.test(text)) return text;
  seen.add(SECTION_KEY);
  return text.replace(SECTION, (whole, num: string, act: string | undefined, offset: number) => {
    const named = act ? ACTS[act.trim()] : undefined;
    // The act's own gloss is spent here too, or one breath would explain the
    // same abbreviation twice.
    if (act) {
      const entry = ABBREVIATIONS.find(([token]) => token.test(act));
      if (entry) seen.add(entry[0].source);
    }
    return joined(text.slice(0, offset), whole, `section ${num}${named ? ` of ${named}` : ""}`);
  });
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
