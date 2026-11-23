// @level infrastructure
/**
 * The requests a tab answers itself, inside the browser, so they never reach
 * the network: the browser pauses each request whose address matches one of
 * `answers.urlPatterns`, and the tab fulfils it with the response
 * `answers.responseTo(request)` gives. The page sees an ordinary response, and
 * the request still raises the network events the tab keeps its requests from.
 *
 * @typedef {object} AnsweredRequests
 * @property {string[]} urlPatterns The addresses answered, as DevTools' `Fetch` patterns (`*` for any characters).
 * @property {(request: PausedRequest) => Response} responseTo The response to one paused request.
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

/** Has the browser pause, before they reach the network, the requests `answers` covers. */
export async function pauseAnsweredRequests(sendToTab, answers) {
  await sendToTab("Fetch.enable", { patterns: answers.urlPatterns.map((urlPattern) => ({ urlPattern })) });
}

/**
 * The listener, for the tab's DevTools messages, that fulfils each paused
 * request with the response `answers` gives it. A fulfilment the browser
 * refuses goes to `walkLog` under the request's address, so a page left
 * waiting on its answer is never a silent one.
 */
export function answeringPausedRequests(sendToTab, answers, walkLog) {
  return ({ method, params }) => {
    if (method !== "Fetch.requestPaused") return;
    const { requestId, request } = params;
    const { status, headers, body } = answers.responseTo(request);
    sendToTab("Fetch.fulfillRequest", {
      requestId, responseCode: status, responseHeaders: headers.map(([name, value]) => ({ name, value })), body: body.toString("base64"),
    }).catch((refused) => walkLog.recordError(request.url, `the browser refused the walk's answer to ${request.method} ${request.url}: ${refused.message}`));
  };
}
