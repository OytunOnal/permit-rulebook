/**
 * What a string the carry did not write looks like in the deploy's log.
 *
 * The log is bounded for the same reason the network is. A page that names
 * four hundred files is a bounded list, not four hundred lines; a string the
 * carry did not write is printed shortened and on one line, because a log
 * nobody can read is the same as no log — and in Actions a line beginning `::`
 * is a workflow command.
 */

/**
 * Some names as one line, with a bottom to it. A page that names four hundred
 * files would otherwise be four hundred lines in a deploy's log, which is the
 * same thing as no log at all.
 */
export const boundedList = (names) => (names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`);

/**
 * As much of a string the carry did not write as a log line can afford. A page
 * may name a reference of any length at all, and an origin may answer with a
 * `content-type` of any length; printed whole, either writes the deploy's log
 * for it. 40 is the only bound in use: every call site takes the default — a
 * reference, the host one names, the path one resolves to, a `content-type`
 * the origin chose. The live address is not among them; it is the other
 * population, and its rule is all or nothing — printed whole once it has
 * parsed, or not printed at all (`carryAssets`).
 */
export const short = (text, max = 40) => (text.length > max ? `${text.slice(0, max)}…` : text);

/**
 * One line, whatever it is handed. In Actions a line beginning `::` is a
 * workflow command, so a value the carry prints but did not write — an address
 * from the environment, an error's message — must not be able to end a line
 * and start another one of its own.
 */
export const oneLine = (text) => text.replace(/[\u0000-\u001f\u007f]+/g, " ");

/** An error as a sentence, with the cause `fetch failed` always hides. */
export const sentenceOfError = (e) => {
  const message = e instanceof Error ? e.message : String(e);
  const cause = e instanceof Error && e.cause instanceof Error ? e.cause.message : "";
  return cause && !message.includes(cause) ? `${message} (${cause})` : message;
};
