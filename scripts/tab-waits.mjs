// @level infrastructure
/**
 * The waits of one browser tab: every browser case reads the page through
 * these, never after a fixed sleep (#224). Each reads what it waits for in the
 * page, moves on the moment it is there, and past one backstop throws naming
 * what never came.
 *
 * It reads the tab's page and the tab's network events. A read that Chrome
 * refuses because the page's document is being replaced is asked again; any
 * other failure throws at once, naming the condition and carrying Chrome's
 * message.
 */

/**
 * The one limit on a wait, read every 50 ms: 15 s, already proven on the
 * runner as s37's draw wait, far above any draw on a busy machine, and well
 * under the browser cases' own 120 s and 180 s, so a broken page fails with
 * the wait's message rather than Vitest's bare timeout.
 */
export const WAIT_BACKSTOP = { ms: 15000, everyMs: 50 };

/** The document the tab shows, told from every other by the moment it began. */
const DOCUMENT_SHOWN = "String(performance.timeOrigin)";

/** Chrome's refusals of a read while the page's document is being replaced: asked again. */
const REPLACED_CONTEXT = /Execution context was destroyed|Cannot find default execution context|Cannot find context with specified id|Inspected target navigated or closed/;

/**
 * At rest, as the page sees it: no animation or transition running, and the
 * scroll position the same across two animation frames. The requests in
 * flight are counted from the tab's network events, outside the page.
 */
const AT_REST = `new Promise((resolve) => {
  const scrolled = () => scrollX + "," + scrollY;
  const before = scrolled();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const moving = document.getAnimations().some((a) => a.pending || a.playState === "running");
    resolve(!moving && scrolled() === before);
  }));
})`;

/**
 * Whether the tab stands on a document other than `left` that has drawn.
 * Drawn: no longer loading, and none of the build's stand-in lines left. Only
 * the interview's page carries them, and the interview takes them out in the
 * task that draws its first screen; any other page has drawn once it has
 * loaded.
 */
const drawnAfter = (left) => `${DOCUMENT_SHOWN} !== ${JSON.stringify(left)}
  && document.readyState !== "loading" && !document.querySelector(".stand-in")`;

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * What `read` answers within `ms`, or null. A read that never answers, such
 * as an animation frame in a tab nobody shows, still ends at the backstop.
 */
async function answerWithin(read, ms) {
  let timer;
  const outOfTime = new Promise((resolve) => { timer = setTimeout(() => resolve(null), ms); });
  try {
    return await Promise.race([read(), outOfTime]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The first of `read`'s answers that holds, asked every `everyMs`; past the
 * backstop, an error naming `what`, or what `what()` says once it is past.
 */
async function pollUntil(read, what) {
  const deadline = Date.now() + WAIT_BACKSTOP.ms;
  for (;;) {
    const timeLeft = deadline - Date.now();
    const seen = timeLeft > 0 ? await answerWithin(read, timeLeft) : null;
    if (seen?.held) return seen;
    if (Date.now() >= deadline) throw new Error(`${typeof what === "function" ? what() : what} (waited ${WAIT_BACKSTOP.ms} ms)`);
    await pause(WAIT_BACKSTOP.everyMs);
  }
}

/**
 * The waits of the tab that `sendToTab` sends CDP commands to. The tab's
 * events go through `watch`, so the waits know the requests in flight; a
 * navigation calls `forgetProblems`, so the tab's problems are its page's.
 */
export class TabWaits {
  #sendToTab;
  #forgetProblems;
  /** The tab's requests in flight by their ids: each one's address, and the document load it belongs to. */
  #inFlight = new Map();
  /** The document the last wait read the tab on: the one a gesture leaves. */
  #documentSeen = null;

  constructor(sendToTab, forgetProblems) {
    this.#sendToTab = sendToTab;
    this.#forgetProblems = forgetProblems;
  }

  /**
   * Counts the tab's requests in flight from its network events. A request
   * the document left was making is cancelled with it and Chrome reports no
   * end to it, so a new document in the tab drops every request not its own.
   */
  watch = ({ method, params }) => {
    if (method === "Network.requestWillBeSent")
      this.#inFlight.set(params.requestId, { url: params.request.url, loaderId: params.loaderId });
    if (method === "Network.loadingFinished" || method === "Network.loadingFailed") this.#inFlight.delete(params.requestId);
    if (method === "Page.frameNavigated" && !params.frame.parentId) this.#forgetRequestsNotOf(params.frame.loaderId);
  };

  /**
   * Sends the navigation and returns once the new document has drawn. Given a
   * time, it sleeps that long instead and waits for nothing: the old way,
   * kept until every case has moved off it (#230).
   */
  goto = async (url, settleMs) => {
    if (settleMs !== undefined) {
      this.#forgetProblems();
      this.#documentSeen = null;
      await this.#sendToTab("Page.navigate", { url });
      return pause(settleMs);
    }
    const left = await this.waitUntil(DOCUMENT_SHOWN, "the tab stood on no document");
    await this.navigate(url);
    await this.#waitUntilDrawnAfter(left);
  };

  /** Sends the navigation and returns at once, for a read before the page's script runs. */
  navigate = async (url) => {
    this.#forgetProblems();
    this.#documentSeen = null;
    const { errorText } = await this.#sendToTab("Page.navigate", { url });
    if (errorText) throw new Error(`${url} did not load: ${errorText}`);
  };

  /** Reads `condition` in the page until it holds, and returns its value. */
  waitUntil = async (condition, what) => (await this.#holding(() => this.#readOnce(condition), what)).held;

  /** Waits until no animation or transition runs, the scroll is still, and no request is in flight. */
  waitUntilAtRest = async () => {
    const atRest = async () => {
      const seen = await this.#readOnce(AT_REST);
      return this.#inFlight.size === 0 ? seen : null;
    };
    await this.#holding(atRest, () => `the page never came to rest: ${this.#inFlight.size === 0
      ? "an animation ran or the scroll moved"
      : `requests stayed in flight (${[...this.#inFlight.values()].slice(0, 3).map((r) => r.url).join(", ")})`}`);
  };

  /** After a gesture that loads a document: waits until the tab stands on a
   * document other than the one the last wait read, and it has drawn. */
  waitUntilNewDocumentDrawn = async () => {
    if (this.#documentSeen === null) throw new Error("no wait has read the document the gesture left: wait on it before the gesture");
    await this.#waitUntilDrawnAfter(this.#documentSeen);
  };

  #forgetRequestsNotOf(loaderId) {
    for (const [requestId, request] of this.#inFlight)
      if (request.loaderId !== loaderId) this.#inFlight.delete(requestId);
  }

  #waitUntilDrawnAfter(left) {
    return this.#holding(() => this.#readOnce(drawnAfter(left)), "no new document drew its first screen");
  }

  /** The read that holds, its document kept as the one the tab was last seen on. */
  async #holding(read, what) {
    const seen = await pollUntil(read, what);
    this.#documentSeen = seen.document;
    return seen;
  }

  /** `condition` read once in the page, with the document it ran in; null
   * when Chrome refused the read because the document was being replaced. */
  async #readOnce(condition) {
    const expression = `Promise.resolve((\n${condition}\n)).then((held) => ({ held, document: ${DOCUMENT_SHOWN} }))`;
    let reply;
    try {
      reply = await this.#sendToTab("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    } catch (e) {
      if (REPLACED_CONTEXT.test(e.message)) return null;
      throw new Error(`the page could not read ${condition}: ${e.message}`);
    }
    const thrown = reply.exceptionDetails;
    if (thrown) throw new Error(`${condition} threw in the page: ${thrown.exception?.description ?? thrown.text}`);
    return reply.result.value;
  }
}
