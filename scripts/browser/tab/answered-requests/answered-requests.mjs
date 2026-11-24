// @level infrastructure
import { decodeAttachedTarget } from "../attached-target/attached-target.mjs";

/**
 * The requests a tab answers itself, inside the browser, and the ones it
 * refuses: the browser pauses every request before it reaches the network.
 * The tab fulfils one that `answers.responseTo(request)` gives an answer for;
 * lets one go on when `answers.staysOnTheSite(url)` says so; and refuses the
 * rest, each named in the walk log under its address. The page sees an
 * ordinary response or a failed request, and the request still raises the
 * network events the tab keeps its requests from. A tab or a worker the page
 * opens itself is paused at its start and its requests handled the same way.
 *
 * @typedef {object} AnsweredRequests
 * @property {(request: PausedRequest) => AnswerToARequest | null} responseTo The answer to one paused request, or null for one the tab does not answer.
 * @property {(url: string) => boolean} staysOnTheSite Whether a request the tab does not answer goes on: true for the walked site's own origin.
 *
 * @typedef {object} PausedRequest
 * @property {string} url
 * @property {string} method
 * @property {Record<string, string>} headers
 *
 * @typedef {object} AnswerToARequest
 * @property {number} status
 * @property {[string, string][]} headers Each header's name and value.
 * @property {Buffer} body
 *
 * @typedef {object} RequestHandling
 * @property {(method: string, params: object) => Promise<unknown>} sendToTab Sends a DevTools command to the tab or worker whose requests these are.
 * @property {AnsweredRequests} answers
 * @property {{ recordError: (address: string, message: string) => void }} walkLog The browser's `WalkLog`.
 */

/** Every request, so none reaches the network before the tab has judged it. */
const EVERY_REQUEST = "*";

/**
 * Chrome's reply to an answer for a paused request that is gone: the page
 * dropped it (an aborted fetch, a page left) before the answer reached it.
 */
const REQUEST_GONE = "Invalid InterceptionId.";

/** Has the browser pause every request of the tab `sendToTab` drives before it reaches the network. */
export async function pauseEveryRequest(sendToTab) {
  await sendToTab("Fetch.enable", { patterns: [{ urlPattern: EVERY_REQUEST }] });
}

/** Sends the walk's answer to one paused request: fulfils it, lets it go on, or refuses it, naming it in the walk log. */
async function sendAnswerTo({ sendToTab, answers, walkLog }, { requestId, request }) {
  const answer = answers.responseTo(request);
  if (answer) {
    const { status, headers, body } = answer;
    return sendToTab("Fetch.fulfillRequest", {
      requestId, responseCode: status, responseHeaders: headers.map(([name, value]) => ({ name, value })), body: body.toString("base64"),
    });
  }
  if (answers.staysOnTheSite(request.url)) return sendToTab("Fetch.continueRequest", { requestId });
  walkLog.recordError(request.url, `the walk refused ${request.method} ${request.url}: not an address the walk may reach`);
  return sendToTab("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" });
}

/**
 * Answers, lets go on or refuses the paused request a DevTools `message` of
 * the tab names, as `handling.answers` says; any other message is not its.
 * An answer the walk could not make, or the browser refused, goes to the walk
 * log under the request's address, so a page left waiting on it is never a
 * silent one. A request the page dropped before the answer reached it is gone,
 * and no error.
 *
 * @param {RequestHandling} handling
 */
export function answerPausedRequest(handling, { method, params }) {
  if (method !== "Fetch.requestPaused") return;
  const { request } = params;
  sendAnswerTo(handling, params).catch((failure) => {
    if (failure.message === REQUEST_GONE) return;
    handling.walkLog.recordError(request.url, `the walk could not answer ${request.method} ${request.url}: ${failure.message}`);
  });
}

/**
 * Whether an attached target is one the walked pages opened and whose requests
 * are its own: a tab with an opener, or a service or shared worker served over
 * HTTP. A dedicated worker's requests are its page's, and an extension's worker
 * is Chrome's own.
 */
function isOpenedByThePage({ type, openerId, url }) {
  if (type === "page") return openerId !== undefined;
  const isASharedWorker = type === "service_worker" || type === "shared_worker";
  return isASharedWorker && /^https?:/.test(url);
}

/** Handles the requests of the target `attached`, if the walked pages opened it, then lets it run. */
async function setUpAttachedTarget(connection, attached, { answers, walkLog }) {
  const { sessionId } = attached;
  const sendToTarget = (method, params) => connection.send(method, params, sessionId);
  if (isOpenedByThePage(attached)) {
    const handling = { sendToTab: sendToTarget, answers, walkLog };
    connection.listenToTab(sessionId, (message) => answerPausedRequest(handling, message));
    await pauseEveryRequest(sendToTarget);
  }
  await sendToTarget("Runtime.runIfWaitingForDebugger", {});
}

/**
 * Has the browser `connection` drives pause every target it opens from now
 * on at its start, and handles the requests of each one the walked pages
 * open (a tab, a worker) as `answers` says before it runs; the walk's own
 * tabs, set up by `openTab`, and Chrome's are let run untouched. A target
 * that could not be set up goes to the walk log under its address.
 */
export async function answerRequestsOfWhatThePageOpens(connection, { answers, walkLog }) {
  connection.listenToBrowser((message) => {
    const attached = decodeAttachedTarget(message);
    if (!attached?.waitingForDebugger) return;
    setUpAttachedTarget(connection, attached, { answers, walkLog }).catch((failure) => walkLog.recordError(
      attached.url, `the walk could not handle the requests of a ${attached.type} the page opened: ${failure.message}`));
  });
  await connection.send("Target.setAutoAttach", { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
}
