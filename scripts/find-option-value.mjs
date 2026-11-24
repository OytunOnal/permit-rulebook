// @level presentation
/**
 * The value a command line gives an option, such as the folder after
 * `--out`: the argument right after the option's name. An option given with
 * nothing after it is refused as an `OptionMissing`, a kind of its own, so a
 * caller can tell it from a bug by its type.
 */

/** An option given with no value after it: `option` names it, the message is the caller's usage, or a plain one when the caller gives none. */
export class OptionMissing extends Error {
  constructor(option, usage) {
    super(usage ?? `${option} is given with no value after it`);
    this.name = "OptionMissing";
    this.option = option;
  }
}

/**
 * The argument after `option` in `argv`, undefined when `option` is not
 * there; throws an `OptionMissing` carrying `usage`, when given, when `option`
 * is the last argument or is followed by an empty one. A caller that turns the
 * `OptionMissing` into words of its own gives no `usage`.
 */
export function findOptionValue(argv, option, usage) {
  const at = argv.indexOf(option);
  if (at === -1) return undefined;
  if (!argv[at + 1]) throw new OptionMissing(option, usage);
  return argv[at + 1];
}
