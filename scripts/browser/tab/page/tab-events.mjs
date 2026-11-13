// @level infrastructure
/**
 * What one tab has thrown and asked for, kept from the events it raises:
 * each error it throws or logs goes to the walk's log, unfiltered, with the
 * address of the page it came from; and its requests are kept when the
 * caller asked to watch the network.
 */
export class TabEvents {
  #sendToTab;
  #network;
  #walkLog;
  /** The address of the page the tab shows, from its main frame's navigations. */
  #address = "about:blank";
  /** Every request the page made, when the caller asked to watch. */
  #requests = [];

  /** `network`: whether the tab keeps the list of its requests; `walkLog`: the `WalkLog` of the browser it is in. */
  constructor(sendToTab, { network, walkLog }) {
    this.#sendToTab = sendToTab;
    this.#network = network;
    this.#walkLog = walkLog;
  }

  /** Keeps what the tab's CDP `message` says it threw, logged or asked for, and where its page is. */
  record = ({ method, params }) => {
    if (method === "Page.frameNavigated" && !params.frame.parentId) this.#address = params.frame.url;
    if (method === "Runtime.exceptionThrown") this.#recordException(params.exceptionDetails);
    if (method === "Runtime.consoleAPICalled" && params.type === "error") this.#recordConsoleError(params.args);
    if (method === "Network.requestWillBeSent" && this.#network) this.#recordRequest(params);
    if (method === "Log.entryAdded" && params.entry.level === "error") this.#recordLogError(params.entry);
  };

  requests = () => this.#requests.map((r) => ({ ...r }));

  forgetRequests = () => { this.#requests.length = 0; };

  /** Passes `problem` on to the walk's log, under the address of the page it came from. */
  #passOn(problem) {
    this.#walkLog.recordError(this.#address, problem);
  }

  #recordException(details) {
    this.#passOn(`exception: ${details.exception?.description ?? details.text}`);
  }

  #recordConsoleError(args) {
    this.#passOn(`console.error: ${args.map((a) => a.value ?? a.description ?? "").join(" ")}`);
  }

  #recordRequest({ request, type, requestId }) {
    const record = {
      url: request.url,
      method: request.method,
      type: type ?? "",
      postData: request.postData ?? "",
      hasPostData: request.hasPostData === true,
    };
    this.#requests.push(record);
    // A body Chrome did not inline has to be asked for, and asked for now:
    // once the request is gone the browser cannot produce it. What a page
    // SENDS is the only honest way to check what it does not send
    // (human, 2026-09-08).
    if (record.hasPostData && !record.postData)
      this.#sendToTab("Network.getRequestPostData", { requestId })
        .then((r) => { record.postData = r.postData ?? ""; })
        .catch(() => { record.postData = "<unreadable>"; });
  }

  /** The URL belongs in the message: "Failed to load resource" without it
   * tells a reader of a red run nothing, and a filter nothing either. */
  #recordLogError({ text, url }) {
    this.#passOn(`log: ${text}${url ? ` (${url})` : ""}`);
  }
}
