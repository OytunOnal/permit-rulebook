// @level domain
/**
 * A refusal of the lock's rules: a value of the wrong shape, named by the
 * declared reason it breaks, never by the value itself. Its kind, not its
 * text, tells a caller it is a refusal and not a bug.
 */

/** An error that is a declared refusal: `reason` is one of the declared sets' reasons, `context` says what was refused. */
export class LockRefusal extends Error {
  constructor(reason, context) {
    super(context === undefined ? reason : `${context}: ${reason}`);
    this.name = "LockRefusal";
    this.reason = reason;
  }
}
