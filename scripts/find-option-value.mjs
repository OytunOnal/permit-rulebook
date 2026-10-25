// @level presentation
/**
 * The value a command line gives an option, such as the folder after
 * `--out`: the argument right after the option's name.
 */

/**
 * The argument after `option` in `argv`, undefined when `option` is not
 * there; throws `usage` when `option` is the last argument or is followed by
 * an empty one.
 */
export function findOptionValue(argv, option, usage) {
  const at = argv.indexOf(option);
  if (at === -1) return undefined;
  if (!argv[at + 1]) throw new Error(usage);
  return argv[at + 1];
}
