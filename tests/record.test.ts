import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { deriveQuestions, type Dataset } from "permit-rulebook-data";
import { RECORD_VERSION,
  clearRecord, loadRecord, restore, saveRecord, serialize, LEGACY_STORAGE_KEY, STORAGE_KEY,
  type RecordStore,
} from "../src/lib/record.js";
import { BEACON_ENDPOINT, BEACON_SCRIPT, expectNothingLeft, type Sent } from "./wire.js";

const dataset = rawDataset as unknown as Dataset;
const known = deriveQuestions(dataset);
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

  it("an answer the field no longer offers is dropped the same way — a retired option is not an answer", () => {
    // s25 replaced the seven-year yes/no with three rungs; a record carrying
    // "yes" must not sit on the ledger as an answer nobody can pick.
    const raw = serialize({ destination: "nl", experience_7y: "yes" }, ["destination", "experience_7y"]);
    expect(restore(raw, known)).toEqual({ answers: { destination: "nl" }, history: ["destination"] });
  });

  it("an answer with no place in the order is dropped too — it could never be shown or edited", () => {
    const raw = JSON.stringify({ version: RECORD_VERSION, answers: { destination: "nl", citizenship: "TR" }, history: ["destination"] });
    expect(restore(raw, known)).toEqual({ answers: { destination: "nl" }, history: ["destination"] });
  });

  it("a duplicated field in the order is recorded once", () => {
    const raw = JSON.stringify({ version: RECORD_VERSION, answers: { destination: "nl" }, history: ["destination", "destination"] });
    expect(restore(raw, known).history).toEqual(["destination"]);
  });

  it("the key is versioned, so a future format change cannot half-read this one", () => {
    expect(STORAGE_KEY).toMatch(/\.v\d+$/);
  });
});

/**
 * The one bit the verdict already implies (s22).
 *
 * A reader who comes back with a finished record restores straight to the
 * verdict, and the page has to know that BEFORE it paints — the pre-paint
 * script reads a few bytes, never the engine. So the record says whether the
 * interview was complete when it was written. It is a fact about the answers
 * under the rules they were written against, not a new thing remembered: the
 * same answers replayed give the same screen.
 */
describe("the record says whether it was finished (s22)", () => {
  const answers = { destination: "nl", citizenship: "TR", situation: "offer" };
  const history = ["destination", "citizenship", "situation"];

  it("a finished record says so, and an unfinished one says so too", () => {
    expect(JSON.parse(serialize(answers, history, true)).done).toBe(true);
    expect(JSON.parse(serialize(answers, history, false)).done).toBe(false);
    // Left unsaid, an interview is not finished.
    expect(JSON.parse(serialize(answers, history)).done).toBe(false);
  });

  it("the bit changes nothing about what comes back: the screen is computed from the answers", () => {
    expect(restore(serialize(answers, history, true), known)).toEqual({ answers, history });
    // A record from before the bit existed is read the same way.
    expect(restore(JSON.stringify({ version: RECORD_VERSION, answers, history }), known)).toEqual({ answers, history });
  });

  it("the record holds exactly these four things, and nothing else", () => {
    // Named as a list so that a fifth field is a decision someone makes here,
    // not a key that arrives with a feature (the answers never leave the
    // device, and what the device keeps is part of that promise).
    expect(Object.keys(JSON.parse(serialize(answers, history, true))).sort())
      .toEqual(["answers", "done", "history", "version"]);
  });

  it("is written by the save, and is what the pre-paint script will find", () => {
    const store = fakeStore();
    saveRecord(store, answers, history, true);
    expect(JSON.parse(store.getItem(STORAGE_KEY)!).done).toBe(true);
    saveRecord(store, answers, history);
    expect(JSON.parse(store.getItem(STORAGE_KEY)!).done).toBe(false);
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
 * Since 2026-09-08 the pages carry a cookieless traffic counter (Cloudflare Web
 * Analytics, the human's decision), so "nothing leaves" is no longer the same
 * sentence as "no request leaves". Exactly two addresses outside this site are
 * allowed — the beacon script, and the beacon's own endpoint — and what the
 * beacon SENDS is read back off the wire and checked: the page's address, the
 * browser, the site token, and nothing a reader answered.
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
        // Every route the verdict named: none of these may reach the counter
        // either — which of them fit is the reader's business.
        const routes = await page.evaluate(
          'JSON.stringify([...document.querySelectorAll("#app a[href]")]'
          + '.map((a) => a.getAttribute("href")).filter((h) => /^[/][a-z-]+[/][a-z0-9-]+$/.test(h))'
          + '.map((h) => h.split("/").pop()))',
        );
        return {
          answered, reached, walk, afterEdit,
          declared: JSON.parse(declared) as string[], routes: JSON.parse(routes) as string[],
        };
      }, { viewport: { width: 1100, height: 900 }, mobile: false, network: true }) as {
        answered: string[]; reached: string; walk: Sent[]; afterEdit: Sent[];
        declared: string[]; routes: string[];
      };

      expect(seen.reached, `the walk never reached a verdict: ${seen.answered.join(", ")}`).toBe("results");
      expect(seen.declared.length, "the walk answered nothing").toBeGreaterThan(5);

      const origin = server.origin as string;
      // The same assertion the s26 walk makes over its requests (tests/wire.ts).
      for (const [where, sent] of [["the walk", seen.walk], ["the edit", seen.afterEdit]] as const)
        expectNothingLeft(sent, { origin, where, declared: seen.declared, routes: seen.routes });

      // The counter was actually running: a blocked beacon would make every
      // assertion above pass by having nothing to check (Security review).
      const fetched = seen.walk.filter((r) => r.url.startsWith(BEACON_SCRIPT));
      const reports = [...seen.walk, ...seen.afterEdit]
        .filter((r) => r.url.startsWith(BEACON_ENDPOINT) && r.method === "POST");
      expect(fetched.length, "the counter's script was never fetched").toBeGreaterThan(0);
      expect(reports.length, "the counter sent no report at all").toBeGreaterThan(0);
      // One report per page LOAD, not per answered question. Cloudflare's
      // single-page tracking follows every pushState, and this interview pushes
      // one per answer: seven answers sent thirteen reports until `spa: false`
      // (Security review, 2026-09-08).
      expect(reports.length, `${seen.declared.length} answers produced ${reports.length} reports`)
        .toBeLessThanOrEqual(2);

      // The edit repainted the screen without asking THIS SITE anything: the
      // counter reports a view when the history entry changes, which is the
      // page's address and nothing else.
      const ours = seen.afterEdit.filter((r) => r.url.startsWith(origin));
      expect(ours.length, `the edit sent ${ours.length} requests to this site`).toBeLessThan(3);
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

/**
 * The other way in: a route page's call to action lands here with the route in
 * the query string. That id is the page's own address and the counter may carry
 * it — an ANSWER in that query string would be a different matter (Security
 * review, 2026-09-08).
 */
describe.skipIf(skipped !== null)("arriving pre-scoped sends no more than arriving cold", () => {
  it("a walk that starts at /?route=… still sends only the counter's own report", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/"), 600);
        await page.evaluate('localStorage.removeItem("permit-rulebook.record.v1")');
        await page.goto(`${server.url("/")}?route=de-blue-card-general`, 1400);
        for (let step = 0; step < 4; step++) {
          await page.evaluate(ANSWER_ONE);
          await new Promise((r) => setTimeout(r, 300));
        }
        await new Promise((r) => setTimeout(r, 1500));
        const declared = await page.evaluate(
          'JSON.stringify(Object.values(JSON.parse(localStorage.getItem("permit-rulebook.record.v1") || "{}").answers || {}))',
        );
        return { sent: page.requests(), declared: JSON.parse(declared) as string[] };
      }, { viewport: { width: 390, height: 844 }, mobile: true, network: true }) as {
        sent: Sent[]; declared: string[];
      };

      const origin = server.origin as string;
      const reports = seen.sent.filter((r) => r.url.startsWith(BEACON_ENDPOINT) && r.method === "POST");
      expect(seen.declared.length, "the pre-scoped walk answered nothing").toBeGreaterThan(3);
      expect(reports.length, `${reports.length} reports for one page load`).toBeLessThanOrEqual(2);

      for (const request of seen.sent) {
        if (request.url.startsWith(BEACON_SCRIPT)) continue;
        if (request.url.startsWith(BEACON_ENDPOINT)) {
          if (request.method === "OPTIONS") continue;
          const raw = String(request.postData ?? "");
          // Origin and path masked; the query string left in to be checked.
          const body = raw.replace(/"location":"([^"?]*)([^"]*)"/g, (_m, _p, query) => `"location":"${query}"`);
          // Measured, not assumed: the counter reports the path only — the
          // query string the reader arrived with never reaches it, so the route
          // id does not either, though it would have been allowed as the page's
          // own address (Security review, 2026-09-08).
          expect(raw).not.toContain("route=de-blue-card-general");
          expect(raw, "the report carries no address at all").toContain('"location"');
          // No answer, anywhere in it — query string included.
          for (const answer of seen.declared) {
            const token = new RegExp(`(^|[^a-z0-9])${
              answer.toLowerCase().replace(/[^a-z0-9]/g, "[^a-z0-9]")}([^a-z0-9]|$)`);
            expect(token.test(body.toLowerCase()), `${answer} reached the beacon`).toBe(false);
          }
          continue;
        }
        expect(request.url.startsWith(origin), `a request left this origin — ${request.url}`).toBe(true);
        expect(request.method, `${request.method} ${request.url}`).toBe("GET");
      }
    } finally {
      server.close();
    }
  }, 180000);
});

