import type { Profile } from "visa-rules";

/**
 * The interview record, kept where it can survive a reload and nowhere else.
 *
 * Browser Back and a refresh used to destroy a thirteen-question interview with
 * no warning (product-critique v0.7, F2), and a page stamped "RECORD GENERATED"
 * could not be kept at all (F10). The record now lives in `localStorage`:
 * per-browser, never transmitted, and cleared by "Start over" — a shared or
 * borrowed computer must not hand the next person a stranger's salary.
 *
 * Sharing by link is deliberately out of scope (human decision, 2026-09-07):
 * no URL fragment, no server. The consequence — the record does not follow the
 * person to another device — is a chosen limit, not a defect.
 */
export const STORAGE_KEY = "visa-navigator.record.v1";

export interface StoredRecord {
  version: 1;
  answers: Profile;
  /** The fields in the order they were asked, which is the order shown. */
  history: string[];
}

export function serialize(answers: Profile, history: string[]): string {
  return JSON.stringify({ version: 1, answers, history } satisfies StoredRecord);
}

/**
 * What comes back out. Anything the current dataset no longer asks is dropped:
 * a key written by an older dataset must not resurrect a field the rules have
 * since removed, and the answer to a question nobody will be asked again is not
 * part of the record.
 */
export function restore(raw: string | null, knownFields: readonly string[]): { answers: Profile; history: string[] } {
  const empty = { answers: {} as Profile, history: [] as string[] };
  if (!raw) return empty;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return empty; // a corrupt record is no record; never a crashed page
  }
  if (typeof parsed !== "object" || parsed === null) return empty;
  const record = parsed as Partial<StoredRecord>;
  if (record.version !== 1) return empty;
  if (typeof record.answers !== "object" || record.answers === null) return empty;
  if (!Array.isArray(record.history)) return empty;

  const known = new Set(knownFields);
  const answers: Profile = {};
  for (const [field, value] of Object.entries(record.answers))
    if (known.has(field) && typeof value === "string") answers[field] = value;
  const history = record.history.filter(
    (field, i): field is string =>
      typeof field === "string" && answers[field] !== undefined && record.history!.indexOf(field) === i,
  );
  // An answer with no place in the order would never be shown or edited.
  for (const field of Object.keys(answers)) if (!history.includes(field)) delete answers[field];
  return { answers, history };
}
