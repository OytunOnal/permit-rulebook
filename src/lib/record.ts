import type { Profile } from "permit-rulebook-data";

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
export const STORAGE_KEY = "permit-rulebook.record.v1";

/**
 * The key the record was written under before the name changed (s6, decision
 * 1). A key is not a user-facing string, but it is a string in this repository
 * carrying the old name, and the sweep is checked by grep rather than by eye.
 *
 * It is read once and never written: someone who answered questions yesterday
 * comes back today and finds their record where they left it, and the old key
 * goes with the first save. Dropping it silently would have thrown away a
 * thirteen-question interview to tidy a name.
 */
export const LEGACY_STORAGE_KEY = "visa-navigator.record.v1";

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

/**
 * The slice of `Storage` the record needs. Storage can be unavailable
 * (private mode, blocked site data) and can throw on the property access
 * itself, so the page may have nothing to hand over — the interview must
 * still run, it just won't survive the tab.
 */
export interface RecordStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Keep what has been answered. Nothing answered is nothing to keep: an empty
 * record left behind still says someone was here. */
export function saveRecord(store: RecordStore | null, answers: Profile, history: string[]): void {
  try {
    if (history.length === 0) store?.removeItem(STORAGE_KEY);
    else store?.setItem(STORAGE_KEY, serialize(answers, history));
    // The migration, actually performed. The comment above said the old key
    // went with the first save and nothing did it, so a record written before
    // the rename sat there for ever — and "Start over", which removed only the
    // new key, handed the next person the stale one back (Standards review,
    // 2026-09-07). One write, then it is gone.
    store?.removeItem(LEGACY_STORAGE_KEY);
  } catch { /* no storage: the interview still runs, it just won't persist */ }
}

/** "Start over": a shared or borrowed computer must not hand the next person
 * a stranger's salary — under either key. */
export function clearRecord(store: RecordStore | null): void {
  try {
    store?.removeItem(STORAGE_KEY);
    store?.removeItem(LEGACY_STORAGE_KEY);
  } catch { /* nothing to clear */ }
}

/** What the last visit left, filtered to what this dataset still asks. */
export function loadRecord(
  store: RecordStore | null, knownFields: readonly string[],
): { answers: Profile; history: string[] } {
  let raw: string | null = null;
  try {
    raw = store?.getItem(STORAGE_KEY) ?? store?.getItem(LEGACY_STORAGE_KEY) ?? null;
  } catch { return { answers: {}, history: [] }; }
  return restore(raw, knownFields);
}
