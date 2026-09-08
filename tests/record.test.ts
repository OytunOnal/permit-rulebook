import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset } from "permit-rulebook-data";
import {
  clearRecord, loadRecord, restore, saveRecord, serialize, LEGACY_STORAGE_KEY, STORAGE_KEY,
  type RecordStore,
} from "../src/lib/record.js";

const dataset = rawDataset as unknown as Dataset;
const known = dataset.fields.map((f) => f.id);
const dist = fileURLToPath(new URL("../dist", import.meta.url));

describe("the record survives leaving the page (F2, F10)", () => {
  it("comes back exactly as it went in", () => {
    const answers = { destination: "nl", citizenship: "TR", situation: "offer" };
    const history = ["destination", "citizenship", "situation"];
    expect(restore(serialize(answers, history), known)).toEqual({ answers, history });
  });

  it("an absent, empty or corrupt record starts a fresh interview rather than crashing", () => {
    for (const raw of [null, "", "{", "null", "[]", '"nope"', "17"])
      expect(restore(raw, known), JSON.stringify(raw)).toEqual({ answers: {}, history: [] });
  });

  it("a record written by an older format is not half-read", () => {
    expect(restore(JSON.stringify({ version: 0, answers: { destination: "nl" }, history: ["destination"] }), known))
      .toEqual({ answers: {}, history: [] });
  });

  it("an answer to a question the rules no longer ask is dropped, not resurrected", () => {
    const raw = serialize(
      { destination: "nl", legacy_field: "yes" },
      ["destination", "legacy_field"],
    );
    expect(restore(raw, known)).toEqual({ answers: { destination: "nl" }, history: ["destination"] });
  });

  it("an answer with no place in the order is dropped too — it could never be shown or edited", () => {
    const raw = JSON.stringify({ version: 1, answers: { destination: "nl", citizenship: "TR" }, history: ["destination"] });
    expect(restore(raw, known)).toEqual({ answers: { destination: "nl" }, history: ["destination"] });
  });

  it("a duplicated field in the order is recorded once", () => {
    const raw = JSON.stringify({ version: 1, answers: { destination: "nl" }, history: ["destination", "destination"] });
    expect(restore(raw, known).history).toEqual(["destination"]);
  });

  it("the key is versioned, so a future format change cannot half-read this one", () => {
    expect(STORAGE_KEY).toMatch(/\.v\d+$/);
  });
});

/** A browser's storage, in a bottle. */
function fakeStore(): RecordStore & { readonly size: number } {
  const kept = new Map<string, string>();
  return {
    getItem: (key) => kept.get(key) ?? null,
    setItem: (key, value) => { kept.set(key, value); },
    removeItem: (key) => { kept.delete(key); },
    get size() { return kept.size; },
  };
}

/** A browser that refuses site data: reading it throws, not just returns null. */
const refusingStore: RecordStore = {
  getItem() { throw new DOMException("blocked"); },
  setItem() { throw new DOMException("blocked"); },
  removeItem() { throw new DOMException("blocked"); },
};

describe("the record is kept on the device, and \"Start over\" takes it with it", () => {
  const answers = { destination: "nl", citizenship: "TR", situation: "offer" };
  const history = ["destination", "citizenship", "situation"];

  it("what was answered is there again after the tab closes", () => {
    const store = fakeStore();
    saveRecord(store, answers, history);
    expect(loadRecord(store, known)).toEqual({ answers, history });
  });

  it("\"Start over\" hands the next person nothing", () => {
    // A shared or borrowed computer must not hand the next person a
    // stranger's salary: the stored record goes with the screen.
    const store = fakeStore();
    saveRecord(store, answers, history);
    clearRecord(store);
    expect(loadRecord(store, known)).toEqual({ answers: {}, history: [] });
    expect(store.size).toBe(0);
  });

  it("an interview with nothing answered leaves no record behind", () => {
    // An empty record still says someone was here.
    const store = fakeStore();
    saveRecord(store, answers, history);
    saveRecord(store, {}, []);
    expect(store.size).toBe(0);
  });

  it("a browser that refuses site data does not break the interview", () => {
    expect(() => saveRecord(refusingStore, answers, history)).not.toThrow();
    expect(() => clearRecord(refusingStore)).not.toThrow();
    expect(loadRecord(refusingStore, known)).toEqual({ answers: {}, history: [] });
  });

  it("no storage at all is the same as an empty one", () => {
    // `localStorage` can throw on the property access itself, so the page may
    // have nothing to hand over.
    expect(() => saveRecord(null, answers, history)).not.toThrow();
    expect(loadRecord(null, known)).toEqual({ answers: {}, history: [] });
  });
});

/**
 * The one-pager's first non-negotiable: the answers never leave the device.
 *
 * This used to be checked by reading the page's own source for `fetch`,
 * `sendBeacon` and friends — a surface trace, and this project does not accept
 * those: a bundled dependency, an inlined helper or a renamed call would walk
 * straight past it, and the promise is about what the page DOES. So the page is
 * driven in a real browser with the network watched, and the only thing
 * asserted is what it actually sent (human, 2026-09-08).
 */
const { chromePath } = await import("../scripts/chrome.mjs");
const { serve, withBrowser } = await import("../scripts/browser.mjs");

function why(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}
const skipped = why();
if (skipped)
  process.stderr.write([
    "",
    `  !! THE PRIVACY PROMISE WAS NOT WALKED IN A BROWSER: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join(String.fromCharCode(10)));

interface Sent { url: string; method: string; postData: string; hasPostData: boolean }
interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
  requests(): Sent[];
  forgetRequests(): void;
}

/** Click through whatever the current question offers, whatever kind it is. */
const ANSWER_ONE = `(() => {
  const opt = document.querySelector(".qcard .opts .opt");
  if (opt) { opt.click(); return "opt"; }
  const row = document.querySelector(".clist [role=option]");
  if (row) { row.click(); return "row"; }
  const input = document.querySelector("#cfilter");
  if (input) { input.value = "Turkey"; input.dispatchEvent(new Event("input", { bubbles: true })); return "typed"; }
  return "none";
})()`;

describe.skipIf(skipped !== null)("the one-pager's promise: answers never leave the device", () => {
  it("a whole walk, and an answer changed after it, sends nothing but this page's own files", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/"), 900);
        const answered: string[] = [];
        for (let step = 0; step < 25; step++) {
          const state = await page.evaluate('document.querySelector("#app").dataset.state');
          if (state === "results") break;
          answered.push(await page.evaluate(ANSWER_ONE));
          await new Promise((r) => setTimeout(r, 260));
        }
        const reached = await page.evaluate('document.querySelector("#app").dataset.state');
        const walk = page.requests();

        // Now the gesture the promise is most easily broken by: changing an
        // answer once a verdict is on the screen.
        page.forgetRequests();
        await page.evaluate('document.querySelector("#app .done").click()');
        await new Promise((r) => setTimeout(r, 400));
        await page.evaluate(ANSWER_ONE);
        await new Promise((r) => setTimeout(r, 600));
        const afterEdit = page.requests();

        const declared = await page.evaluate(
          'JSON.stringify(Object.values(JSON.parse(localStorage.getItem("permit-rulebook.record.v1") || "{}").answers || {}))',
        );
        return { answered, reached, walk, afterEdit, declared: JSON.parse(declared) as string[] };
      }, { viewport: { width: 1100, height: 900 }, mobile: false, network: true }) as {
        answered: string[]; reached: string; walk: Sent[]; afterEdit: Sent[]; declared: string[];
      };

      expect(seen.reached, `the walk never reached a verdict: ${seen.answered.join(", ")}`).toBe("results");
      expect(seen.declared.length, "the walk answered nothing").toBeGreaterThan(5);

      const origin = server.origin as string;
      for (const [where, sent] of [["the walk", seen.walk], ["the edit", seen.afterEdit]] as const)
        for (const request of sent) {
          // Same origin: no third-party host, ever.
          expect(request.url.startsWith(origin), `${where}: a request left this origin — ${request.url}`).toBe(true);
          // GET only: nothing is submitted anywhere.
          expect(request.method, `${where}: ${request.method} ${request.url}`).toBe("GET");
          expect(request.hasPostData, `${where}: a body was sent to ${request.url}`).toBe(false);
          expect(request.postData, `${where}: a body was sent to ${request.url}`).toBe("");
          // No query string: an answer smuggled into one is still an answer
          // leaving the device.
          expect(request.url.includes("?"), `${where}: a query string on ${request.url}`).toBe(false);
          // And nothing the reader declared appears in the URL as a value of
          // its own. Matched on token boundaries: "de" is inside the word
          // "index", and a hashed asset name is not a leak.
          for (const answer of seen.declared) {
            const token = new RegExp(`(^|[^a-z0-9])${answer.toLowerCase().replace(/[^a-z0-9]/g, "[^a-z0-9]")}([^a-z0-9]|$)`);
            expect(token.test(request.url.toLowerCase()), `${where}: ${answer} reached ${request.url}`).toBe(false);
          }
        }

      // The edit repainted the screen without asking anyone anything.
      expect(seen.afterEdit.filter((r) => !r.url.endsWith(".css") && !r.url.endsWith(".js")))
        .toEqual(seen.afterEdit.filter((r) => !r.url.endsWith(".css") && !r.url.endsWith(".js")));
      expect(seen.afterEdit.length, `the edit sent ${seen.afterEdit.length} requests`).toBeLessThan(3);
    } finally {
      server.close();
    }
  }, 180000);
});

/**
 * s6 decision 1 — the key the record lives under carries the product's name,
 * and a record written under the old one is carried across rather than thrown
 * away. The comment said the old key went with the first save; nothing did it,
 * and "Start over" removed only the new key, so the stale record came back
 * (Standards review, 2026-09-07).
 */
describe("the rename does not cost anybody their answers", () => {
  it("reads a record left under the old key, then migrates it on the first save", () => {
    const store = fakeStore();
    const answers = { destination: "de", citizenship: "TR" };
    const history = ["destination", "citizenship"];
    store.setItem(LEGACY_STORAGE_KEY, serialize(answers, history));

    // It is found where it was left.
    expect(loadRecord(store, known)).toEqual({ answers, history });

    // The first save puts it under the new key and takes the old one away.
    saveRecord(store, answers, history);
    expect(store.getItem(STORAGE_KEY)).toBe(serialize(answers, history));
    expect(store.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    expect(store.size).toBe(1);
  });

  it("Start over clears both keys, so nothing stale comes back", () => {
    const store = fakeStore();
    store.setItem(LEGACY_STORAGE_KEY, serialize({ destination: "nl" }, ["destination"]));
    store.setItem(STORAGE_KEY, serialize({ destination: "de" }, ["destination"]));
    clearRecord(store);
    expect(store.size).toBe(0);
    expect(loadRecord(store, known)).toEqual({ answers: {}, history: [] });
  });
});
