// @level infrastructure
/**
 * The browser's word that a target was just attached, a tab a page opened
 * among them, decoded once for every listener that hears it.
 *
 * @typedef {object} AttachedTarget
 * @property {string} sessionId The session the target's messages carry.
 * @property {boolean} waitingForDebugger Whether it waits, paused at its start, to be let run.
 * @property {string} type "page", "service_worker", "shared_worker" and the like.
 * @property {string} url
 * @property {string | undefined} openerId The target of the tab that opened it, if a tab did.
 */

/**
 * The target a browser `message` says was just attached, or null for any
 * other message.
 *
 * @returns {AttachedTarget | null}
 */
export function decodeAttachedTarget({ method, params }) {
  if (method !== "Target.attachedToTarget") return null;
  const { sessionId, waitingForDebugger, targetInfo: { type, url, openerId } } = params;
  return { sessionId, waitingForDebugger, type, url, openerId };
}
