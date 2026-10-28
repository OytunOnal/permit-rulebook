// @level infrastructure
/**
 * The two screens every walk is taken at, the browser cases' own.
 *
 * @typedef {object} Screen
 * @property {{ width: number, height: number }} viewport In CSS pixels.
 * @property {boolean} mobile Whether Chrome emulates a phone: touch, and a layout viewport set by the page's viewport meta.
 */

/**
 * The desktop, where the declared panel stands open beside the question.
 * @type {Screen}
 */
export const DESK = { viewport: { width: 1280, height: 900 }, mobile: false };

/**
 * A phone.
 * @type {Screen}
 */
export const PHONE = { viewport: { width: 390, height: 844 }, mobile: true };
