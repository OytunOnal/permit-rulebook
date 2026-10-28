// @level infrastructure
/**
 * The connection to one Chrome over its DevTools protocol: each command sent
 * and its reply matched to it by id, and each event handed to the tab of ours
 * that raised it.
 */
export class DevToolsConnection {
  #socket;
  #nextId = 0;
  /** The commands sent and not yet answered, by their ids. */
  #pending = new Map();
  /**
   * What hears each tab's events, by the tab's CDP session: every event a tab
   * raises carries its session, so a second tab's errors are its own and its
   * `goto` empties only its own list (s37 delta 2 — the lists had been one,
   * shared by every tab).
   */
  #tabs = new Map();

  constructor(socket) {
    this.#socket = socket;
    socket.addEventListener("message", this.#receive);
  }

  /** Opens the connection to the DevTools endpoint at `devToolsUrl`. */
  static async open(devToolsUrl) {
    const socket = new WebSocket(devToolsUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    return new DevToolsConnection(socket);
  }

  /** Sends a command, to the tab of `sessionId` when one is named, and returns Chrome's reply. */
  send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++this.#nextId;
      this.#pending.set(id, { resolve, reject });
      this.#socket.send(JSON.stringify({ id, method, params, sessionId }));
    });

  /** Hands every message of the tab of `sessionId` to `hear`, a command's reply included. */
  listenToTab(sessionId, hear) {
    this.#tabs.set(sessionId, hear);
  }

  /** Closes the connection. */
  close() {
    try { this.#socket.close(); } catch { /* already closed */ }
  }

  #receive = (event) => {
    const message = JSON.parse(event.data);
    const hear = this.#tabs.get(message.sessionId);
    // An event from no tab of ours — the browser's own — has no list to go on.
    if (message.method && !hear) return;
    if (hear) hear(message);
    // An event answers no command.
    if (!message.method) this.#settleReply(message);
  };

  /** Settles the command `reply` answers with its result, or its error. */
  #settleReply(reply) {
    const waiter = this.#pending.get(reply.id);
    if (!waiter) return;
    this.#pending.delete(reply.id);
    if (reply.error) waiter.reject(new Error(reply.error.message));
    else waiter.resolve(reply.result);
  }
}
