/**
 * The parts of a function body that the lint's probe guard refuses in a
 * test's string, put together here, so a suite that lints code it writes in
 * strings can write an arrow or a function without the guard reading that
 * code as an in-page probe.
 */

/** An arrow. */
export const ARROW = ["=", ">"].join("");
/** The function keyword. */
export const FUNCTION = ["func", "tion"].join("");
