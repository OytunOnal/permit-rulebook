// @level infrastructure
/**
 * The requests a tab answers itself, inside the browser, and the ones it
 * refuses: the browser pauses every request before it reaches the network.
 * The tab fulfils one `answers.responseTo(request)` gives a response; lets one
 * go on when `answers.goesOut(url)` says so; and refuses the rest, each named
 * in the walk log under its address. The page sees an ordinary response, or a
 * failed request, and the request still raises the network events the tab
 * keeps its requests from.
 *
 * @typedef {object} AnsweredRequests
 * @property {(request: PausedRequest) => Response | null} responseTo The response to one paused request, or null for one the tab does not answer.
 * @property {(url: string) => boolean} goesOut Whether a request the tab does not answer goes on to the network.
 *
 * @typedef {object} PausedRequest
 * @property {string} url
 * @property {string} method
 * @property {Record<string, string>} headers
 *
 * @typedef {object} Response
 * @property {number} status
 * @property {[string, string][]} headers Each header's name and value.
 * @property {Buffer} body
 */

/** Every request, so none reaches the network before the tab has judged it. */
const EVERY_REQUEST = "*";

/** Has the browser pause every request before it reaches the network. */
export async function pauseEveryRequest(sendToTab) {
  await sendToTab("Fetch.enable", { patterns: [{ urlPattern: EVERY_REQUEST }] });
}

/** Fulfils the paused request `requestId` with `response`. */
const fulfil = (sendToTab, requestId, { status, headers, body }) => sendToTab("Fetch.fulfillRequest", {
  requestId, responseCode: status, responseHeaders: headers.map(([name, value]) => ({ name, value })), body: body.toString("base64"),
});

/**
 * What the tab does with a paused request: answers it, lets it go on, or
 * refuses it, naming it in `walkLog` under its address.
 */
function handlingPausedRequests(sendToTab, answers, walkLog) {
  return ({ requestId, request }) => {
    const response = answers.responseTo(request);
    if (response) return fulfil(sendToTab, requestId, response);
    if (answers.goesOut(request.url)) return sendToTab("Fetch.continueRequest", { requestId });
    walkLog.recordError(request.url, `the walk refused ${request.method} ${request.url}: not an address the walk may reach`);
    return sendToTab("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" });
  };
}

/**
 * The listener, for the tab's DevTools messages, that answers, lets go on or
 * refuses each paused request as `answers` says. An answer the browser
 * refuses goes to `walkLog` under the request's address, so a page left
 * waiting on it is never a silent one.
 */
export function answeringPausedRequests(sendToTab, answers, walkLog) {
  const handlePausedRequest = handlingPausedRequests(sendToTab, answers, walkLog);
  return ({ method, params }) => {
    if (method !== "Fetch.requestPaused") return;
    const { request } = params;
    handlePausedRequest(params)
      .catch((refused) => walkLog.recordError(request.url, `the browser refused the walk's answer to ${request.method} ${request.url}: ${refused.message}`));
  };
}
