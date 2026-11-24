// @level domain
/**
 * A refusal of the lock's rules: a value of the wrong shape, named by the
 * declared reason it breaks, never by the value itself. Its kind, not its
 * text, tells a caller it is a refusal and not a bug.
 */

/** What the lock's rules refused, by the act refused: the words a refusal's message opens with, before its reason. */
export const REFUSAL_CONTEXTS = Object.freeze({
  chosenCommit: "no data commit is chosen",
  builtCommit: "a built commit is refused",
  lockedCommit: "a locked commit is refused",
  pinnedLock: "a pinned lock is refused",
});

/** An error that is a declared refusal: `reason` is one of the declared sets' reasons, `context` says what was refused. */
export class LockRefusal extends Error {
  constructor(reason, context) {
    super(context === undefined ? reason : `${context}: ${reason}`);
    this.name = "LockRefusal";
    this.reason = reason;
  }
}
