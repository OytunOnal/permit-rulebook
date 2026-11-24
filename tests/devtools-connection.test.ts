import { describe, expect, it } from "vitest";
import { DevToolsConnection } from "../scripts/browser/browser.mjs";

/**
 * The connection to Chrome (`DevToolsConnection`, from
 * `scripts/browser/browser.mjs`) over a stand-in socket: the browser's own
 * messages reach every listener, since the handling of what a page opens and
 * each tab's count of the tabs it opened both listen to them (#453).
 */

/** A socket that sends nowhere and hands the connection the messages a case gives it. */
function createStandInSocket() {
  type MessageListener = (event: { data: string }) => void;
  let hear: MessageListener = () => {
    throw new Error("the connection never listened to the socket");
  };
  return {
    addEventListener: (type: string, listener: MessageListener) => {
      if (type === "message") hear = listener;
    },
    send: () => {},
    close: () => {},
    receive: (message: object) => hear({ data: JSON.stringify(message) }),
  };
}

describe("the connection's browser listeners", () => {
  it("hands one browser message to every listener, in the order each came", () => {
    const socket = createStandInSocket();
    const connection = new DevToolsConnection(socket);
    const heard: string[] = [];
    connection.listenToBrowser(({ method }: { method: string }) => heard.push(`first: ${method}`));
    connection.listenToBrowser(({ method }: { method: string }) => heard.push(`second: ${method}`));
    socket.receive({ method: "Target.attachedToTarget", params: { targetInfo: { openerId: "opener" } } });
    expect(heard).toEqual(["first: Target.attachedToTarget", "second: Target.attachedToTarget"]);
  });
});
