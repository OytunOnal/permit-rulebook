// @level infrastructure
/**
 * The two messages a local run always logs about the traffic counter, and
 * nothing else. Both name the beacon endpoint AND the reason, so a different
 * failure about the same host is not swallowed with them.
 */
const LOCAL_BEACON_NOISE = [
  /blocked by CORS policy[\s\S]*cloudflareinsights\.com|cloudflareinsights\.com[\s\S]*blocked by CORS policy/,
  /Failed to load resource: net::ERR_FAILED \(https:\/\/cloudflareinsights\.com\//,
];

/**
 * Whether `problem` is one of the two messages a local run always logs about
 * the traffic counter (`TabEvents.problems` says why they are left out).
 */
export const isLocalBeaconNoise = (problem) => LOCAL_BEACON_NOISE.some((rule) => rule.test(problem));

/**
 * What one tab has thrown and asked for, kept from the events it raises: its
 * problems since its last navigation, and its requests when the caller asked
 * to watch the network. Each problem also goes to the walk's log, with the
 * address of the page it came from.
 */
export class TabEvents {
  #sendToTab;
  #network;
  #walkLog;
  /** The address of the page the tab shows, from its main frame's navigations. */
  #address = "about:blank";
  /** Everything the page threw or logged as an error. */
  #problems = [];
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

  /** Empties the problems: a navigation calls it, so they are its page's. */
  forgetProblems = () => { this.#problems.length = 0; };

  /**
   * Everything the page threw or logged as an error — except the traffic
   * counter's two local-only failures.
   *
   * Cloudflare's beacon endpoint answers `Access-Control-Allow-Origin:
   * http://127.0.0.1`, without the port a local static server has to use, so
   * every local run logs a preflight refusal and the load failure that
   * follows it — for a request that is fine in production (2026-09-08).
   * Exactly those two messages are dropped, not every line that mentions the
   * host: a script error thrown BY the beacon, or any other complaint naming
   * it, still fails the run (Spec review, 2026-09-08).
   *
   * The counter is not silenced either. `tests/record.test.ts` asserts the
   * script was fetched and a report was actually sent, so a page that stopped
   * counting fails there.
   */
  problems = () => this.#problems.filter((p) => !isLocalBeaconNoise(p));

  /** The unfiltered list, for a caller that wants the counter's noise too. */
  allProblems = () => [...this.#problems];

  requests = () => this.#requests.map((r) => ({ ...r }));

  forgetRequests = () => { this.#requests.length = 0; };

  /** Keeps `problem` as the tab's, and in the walk's log under the page's address. */
  #keepProblem(problem) {
    this.#problems.push(problem);
    this.#walkLog.recordError(this.#address, problem);
  }

  #recordException(details) {
    this.#keepProblem(`exception: ${details.exception?.description ?? details.text}`);
  }

  #recordConsoleError(args) {
    this.#keepProblem(`console.error: ${args.map((a) => a.value ?? a.description ?? "").join(" ")}`);
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
    this.#keepProblem(`log: ${text}${url ? ` (${url})` : ""}`);
  }
}
