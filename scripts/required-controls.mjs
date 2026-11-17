// @level domain
/**
 * The controls a seeded result can be required to draw, one row each: the
 * name the tap check's report gives it, the selector that finds each one on
 * screen, and the words its count takes on a screen's ok line. A result
 * seeded to draw a control and drawing none fails, since its controls then go
 * unmeasured. A new control is one row.
 */

/**
 * @typedef {object} RequiredControl
 * @property {string} name
 * @property {string} selector
 * @property {string} note
 */

/** Every control a seed can require, by its name. @type {RequiredControl[]} */
export const REQUIRED_CONTROLS = [
  { name: "Steps line", selector: ".steps-line a", note: "Steps line link(s)" },
  { name: "More quotes control", selector: "details.more-quotes > summary", note: "More quotes control(s)" },
];
