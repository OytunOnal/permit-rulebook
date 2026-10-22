// @level presentation
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
 * use is the act it names: "§ 6 BeschV (the Employment Ordinance)", or, in
 * the bracket a citation already stands in, "(§ 6 BeschV; BeschV = the
 * Employment Ordinance)".
 *
 * The gloss is appended, never substituted into the citation: "§ 18g AufenthG"
 * stays the citation a reader can search for, and gains the words after it. It
 * runs over OUR text only — a route's own name, a citation, a route's summary,
 * a question's label, an answer's help, a learn link's label, a statement, a
 * reading — never over a quote, which is verbatim by contract (#151, ruling 8).
 *
 * One module, so every page explains a symbol the same way, and each page
 * keeps its own memory of what it has already said.
 */

/** One page's memory of which abbreviations it has already explained. */
export type Glossary = Set<string>;

/** Each abbreviation, and the words that explain it. */
export const ABBREVIATIONS: ReadonlyArray<readonly [token: string, words: string]> = [
  ["AufenthG", "the Residence Act"],
  ["BeschV", "the Employment Ordinance"],
  ["TFEU", "the Treaty on the Functioning of the European Union"],
  ["UGE", "Spain's large-companies unit"],
  ["IND", "the Dutch immigration service"],
  ["CNO-2011", "Spain's occupation classification"],
  ["MVV", "the Dutch entry visa"],
  ["IELTS", "an English-language test"],
  ["Schengen", "the EU's border-free travel area"],
  ["ISCO-08", "the international occupation codes"],
];

/** Where an abbreviation stands as a word of its own. */
const tokenPattern = (token: string): RegExp => new RegExp(`\\b${token}\\b`);

/**
 * A section citation: the symbol, its number, and — where the citation carries
 * one — the act it belongs to. The act is matched with it so the first use
 * spends one parenthetical instead of two abutting ones.
 */
const SECTION = /\u00a7[\u00a0\u202f ]?([0-9]+[a-z]?)( (?:AufenthG|BeschV))?/;

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
 * The act a citation names and the words that explain it, the first time the
 * page names it, and nothing after. Spent against the abbreviation's own key, or `glossed` would explain the
 * same act twice in one breath.
 *
 * The words used to open with the sign — "§ = section; BeschV = …" — and
 * before that restated the citation: "(§ 20a, section 20a)", a stutter on
 * whichever heading it landed on (v1.1 gate critique, P1; s23). The sign's
 * words went in s32's amendment 6: the human reads § as a reader does.
 */
function actEntry(act: string | undefined, seen: Glossary): readonly [token: string, words: string] | null {
  const name = act?.trim();
  const entry = ABBREVIATIONS.find(([token]) => token === name);
  if (!entry || seen.has(entry[0])) return null;
  seen.add(entry[0]);
  return entry;
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
    // Outside a bracket the act's words follow the citation in a bracket of
    // their own, the form any abbreviation takes there: "§ 18g AufenthG (the
    // Residence Act)" (#151, story 25).
    const entry = actEntry(first[2], seen);
    return entry
      ? `${text.slice(0, at)}${first[0]} (${entry[1]})${text.slice(at + first[0].length)}`
      : text;
  }

  // The words follow the whole run rather than cutting into it, and name the
  // act only where the run cites one section; a run of several ("§ 19c / § 6
  // BeschV") is left as it is, and the prose that follows explains the act.
  const inside = text.slice(run.open, run.close);
  const cited = [...inside.matchAll(new RegExp(SECTION.source, "g"))];
  const entry = cited.length === 1 ? actEntry(cited[0]![2], seen) : null;
  return entry ? `${text.slice(0, run.close)}; ${entry[0]} = ${entry[1]}${text.slice(run.close)}` : text;
}

/**
 * Whether our own text already says what the token is, in the list's words,
 * just before the bracket it opens: "the Dutch immigration service (IND)". The
 * dataset writes an abbreviation that way where it can, and a gloss after it
 * would say the same words twice.
 */
function saidBefore(text: string, at: number, words: string): boolean {
  const before = text.slice(0, at).replace(/’/g, "'").toLowerCase();
  return before.endsWith(`${words.toLowerCase()} (`);
}

/**
 * The text with the token at `at` explained: nothing added where the text
 * already says it, "MVV = the Dutch entry visa" after the bracket the token
 * stands in, or its own bracket after it elsewhere — the rule a citation's act
 * follows, so a bracket never opens inside another.
 */
function explainedAt(text: string, at: number, [token, words]: readonly [string, string]): string {
  if (saidBefore(text, at, words)) return text;
  const run = bracketRun(text, at);
  if (run) return `${text.slice(0, run.close)}; ${token} = ${words}${text.slice(run.close)}`;
  const end = at + token.length;
  return `${text.slice(0, end)} (${words})${text.slice(end)}`;
}

/** A citation's act and every abbreviation: our prose, never a name. */
export function glossed(text: string, seen: Glossary): string {
  let out = glossSection(text, seen);
  for (const entry of ABBREVIATIONS) {
    const use = seen.has(entry[0]) ? null : tokenPattern(entry[0]).exec(out);
    if (!use) continue;
    seen.add(entry[0]);
    out = explainedAt(out, use.index, entry);
  }
  return out;
}
