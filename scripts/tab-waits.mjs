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
 * Run in every document the tab opens, before the page's own scripts: counts
 * the page's smooth scrolls still going, as each scroll says so itself. Two
 * frames reading the same scroll is not the end of one: its first frames
 * barely move, or not at all, and Chrome can run them back to back (#242).
 *
 * `scrollTo`, `scroll` and `scrollBy` end when the promise they return
 * settles. `scrollIntoView`'s settles at once, so its scroll ends at the next
 * `scrollend`, or once the viewport has no more than a pixel left to go: a
 * scroll asked of an element already there moves nothing and fires none.
 */
const WATCH_SMOOTH_SCROLLS = `(() => {
  const going = new Set();
  const untilSettled = (end) => {
    let settled = false;
    const settle = () => { settled = true; };
    end.then(settle, settle);
    return () => !settled;
  };
  const untilScrollEndOr = (there) => {
    let ended = false;
    addEventListener("scrollend", () => { ended = true; }, { capture: true, once: true });
    return () => !ended && !there();
  };
  const isSmooth = (options, scroller) => options?.behavior === "smooth"
    || (options?.behavior !== "instant" && getComputedStyle(scroller).scrollBehavior === "smooth");
  for (const owner of [window, Element.prototype])
    for (const name of ["scrollTo", "scroll", "scrollBy"]) {
      const ask = owner[name];
      owner[name] = function (...args) {
        const end = ask.apply(this, args);
        if (isSmooth(args[0], this instanceof Element ? this : document.documentElement))
          going.add(typeof end?.then === "function" ? untilSettled(end) : untilScrollEndOr(() => false));
        return end;
      };
    }
  // How far the viewport still has to scroll to bring el where block asks, within the scroll it has.
  const leftToGo = (el, block) => {
    const { top, bottom } = el.getBoundingClientRect();
    const by = { start: top, end: bottom - innerHeight, center: (top + bottom - innerHeight) / 2,
      nearest: top < 0 && bottom > innerHeight ? 0 : top < 0 ? top : Math.max(bottom - innerHeight, 0) }[block];
    const furthest = document.documentElement.scrollHeight - innerHeight;
    return Math.min(Math.max(scrollY + by, 0), furthest) - scrollY;
  };
  const intoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function (...args) {
    const returned = intoView.apply(this, args);
    const block = args[0] === false ? "end" : (args[0]?.block ?? "start");
    if (isSmooth(args[0], document.documentElement)) going.add(untilScrollEndOr(() => Math.abs(leftToGo(this, block)) <= 1));
    return returned;
  };
  Object.defineProperty(window, "__smoothScrollsUnfinished", {
    get: () => {
      for (const goes of going) if (!goes()) going.delete(goes);
      return going.size;
    },
  });
})()`;

/**
 * At rest, as the page sees it: no animation or transition running, no
 * smooth scroll the page asked for still going, and the scroll position the
 * same across two animation frames. The requests in flight are counted from
 * the tab's network events, outside the page.
 */
const AT_REST = `new Promise((resolve) => {
  const scrolled = () => scrollX + "," + scrollY;
  const before = scrolled();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const moving = document.getAnimations().some((a) => a.pending || a.playState === "running");
    resolve(!moving && !window.__smoothScrollsUnfinished && scrolled() === before);
  }));
})`;

/**
 * Whether the tab stands on a document other than `left` that has drawn.
 * Drawn: no longer loading, and none of the build's stand-in lines left. Only
 * the interview's page carries them, and the interview takes them out in the
 * task that draws its first screen; any other page has drawn once it has
 * loaded.
 */
const isNewDocumentDrawn = (left) => `${DOCUMENT_SHOWN} !== ${JSON.stringify(left)}
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
  /** Chrome's reply once every document the tab opens from here on counts its smooth scrolls. */
  #smoothScrollsWatched = null;

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

  /** Sends the navigation and returns once the new document has drawn. */
  goto = async (url) => {
    const left = await this.waitUntil(DOCUMENT_SHOWN, "the tab stood on no document");
    await this.navigate(url);
    await this.#waitUntilNewDocumentDrawnAfter(left);
  };

  /** Sends the navigation and returns at once, for a read before the page's script runs. */
  navigate = async (url) => {
    this.#forgetProblems();
    this.#documentSeen = null;
    await this.#watchSmoothScrolls();
    const { errorText } = await this.#sendToTab("Page.navigate", { url });
    if (errorText) throw new Error(`${url} did not load: ${errorText}`);
  };

  /** Reads `condition` in the page until it holds, and returns its value. */
  waitUntil = async (condition, what) => (await this.#waitUntilReadHolds(() => this.#readOnce(condition), what)).held;

  /** Waits until no animation or transition runs, no smooth scroll goes on, the scroll is still, and no request is in flight. */
  waitUntilAtRest = async () => {
    const atRest = async () => {
      const seen = await this.#readOnce(AT_REST);
      return this.#inFlight.size === 0 ? seen : null;
    };
    await this.#waitUntilReadHolds(atRest, () => `the page never came to rest: ${this.#inFlight.size === 0
      ? "an animation ran, a smooth scroll went on, or the scroll moved"
      : `requests stayed in flight (${[...this.#inFlight.values()].slice(0, 3).map((r) => r.url).join(", ")})`}`);
  };

  /** After a gesture that loads a document: waits until the tab stands on a
   * document other than the one the last wait read, and it has drawn. */
  waitUntilNewDocumentDrawn = async () => {
    if (this.#documentSeen === null) throw new Error("no wait has read the document the gesture left: wait on it before the gesture");
    await this.#waitUntilNewDocumentDrawnAfter(this.#documentSeen);
  };

  /** From the tab's first navigation on, every document it opens counts its smooth scrolls; asked once. */
  #watchSmoothScrolls() {
    this.#smoothScrollsWatched ??= this.#sendToTab("Page.addScriptToEvaluateOnNewDocument", { source: WATCH_SMOOTH_SCROLLS });
    return this.#smoothScrollsWatched;
  }

  #forgetRequestsNotOf(loaderId) {
    for (const [requestId, request] of this.#inFlight)
      if (request.loaderId !== loaderId) this.#inFlight.delete(requestId);
  }

  #waitUntilNewDocumentDrawnAfter(left) {
    return this.#waitUntilReadHolds(() => this.#readOnce(isNewDocumentDrawn(left)), "no new document drew its first screen");
  }

  /** Waits until `read` holds and returns what it read, its document kept as the one the tab was last seen on. */
  async #waitUntilReadHolds(read, what) {
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
