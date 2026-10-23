// @level infrastructure
/**
 * The browser's history behind the interview history's port: every call the
 * site makes to `window.history`, and its one `popstate` listener, are here.
 */
import type { BrowserHistory } from "./interview-history/index.js";

export function browserHistoryOf(win: Window): BrowserHistory {
  return {
    state: () => win.history.state as unknown,
    push: (state) => win.history.pushState(state, ""),
    replace: (state) => win.history.replaceState(state, ""),
    back: () => win.history.back(),
    onMove: (listener) => win.addEventListener("popstate", (e) => listener(e.state)),
  };
}
