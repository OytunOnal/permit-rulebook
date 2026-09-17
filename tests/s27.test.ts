import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import { deriveBands, fieldOptions, type Dataset } from "permit-rulebook-data";
import { MENU, MENU_CLOSE, NOT_FOUND_START, NOT_FOUND_START_NOTE, PRODUCT_NAME, ROUTE_TAGLINE } from "../src/lib/copy.js";
import { MENU_SCRIPT, siteHeader } from "../src/lib/identity.js";
import { navCountries } from "../src/lib/country-page.js";
import { notFoundPage } from "../src/lib/not-found.js";
import { declarationHtml } from "../src/lib/question.js";
import { RECORD_VERSION } from "../src/lib/record.js";
import { glossSection } from "../src/lib/gloss.js";
import { esc } from "../src/lib/reason.js";
import { routePage } from "../src/lib/route-page.js";
import { routeAddresses, routePath } from "../src/lib/slug.js";

const ds = dataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));
const read = (path: string): string => readFileSync(path, "utf8").split("\r\n").join("\n");

const textOf = (html: string): string =>
  html.replace(/<[^>]*>/g, " ").split("&nbsp;").join(" ").split(/\s+/).join(" ").split(String.fromCharCode(160)).join(" ").trim();

/** The masthead's own markup, from its opening tag to its close. */
const mastheadOf = (html: string): string => {
  const start = html.indexOf('<header class="masthead');
  return start < 0 ? "" : html.slice(start, html.indexOf("</header>", start));
};

/**
 * s27 — five small slips (v1.1 gate critique, P8).
 *
 * Five things the critic saw on the live build and the walks confirmed: the
 * phone's Menu button says Menu while open; the disclosure mark on a country
 * section sits at the far left of the line with the name in the middle; the
 * 404 says "start from your own situation" twice to a screen reader and once
 * to a sighted one; the ledger's pencil wraps alone to a second line; a route
 * page's H1 is a name, a full stop and a sentence. Each is a decision below.
 */

describe("1 — the menu button says what it does", () => {
  it("the two words live in copy.ts and reach the button as attributes; the script carries neither", () => {
    expect(MENU).toBe("Menu");
    expect(MENU_CLOSE).toBe("Close");
    const header = siteHeader(navCountries(ds));
    const button = /<button class="menu[^"]*"([^>]*)>([^<]*)<\/button>/.exec(header);
    expect(button, "no menu button in the header").not.toBeNull();
    // Closed at rest, and says so.
    expect(button![2]).toBe(MENU);
    expect(button![1]).toContain('aria-expanded="false"');
    expect(button![1]).toContain(`data-word-closed="${MENU}"`);
    expect(button![1]).toContain(`data-word-open="${MENU_CLOSE}"`);
    // The script reads the words off the button: no user-facing string is
    // typed into it, so a change of word is one edit in copy.ts.
    expect(MENU_SCRIPT).toContain("dataset.wordOpen");
    expect(MENU_SCRIPT).toContain("dataset.wordClosed");
    for (const word of [MENU, MENU_CLOSE])
      expect(MENU_SCRIPT, `the script carries the word ${word}`).not.toMatch(new RegExp(`\\b${word}\\b`));
  });
});

/** The 404's sentence as a key: case-folded, without its "Or" and its full
 * stop, so a hidden heading that says the same thing in other clothes counts
 * as the second carrier it is. */
const SENTENCE = NOT_FOUND_START.toLowerCase().replace(/^or\s+/, "").replace(/[.]$/, "");

describe("3 — the 404 says it once", () => {
  it("the sentence is the section's heading, the section is labelled by it, and nothing else on the page carries it", () => {
    const { html } = notFoundPage(ds);
    const section = /<section class="cta" aria-labelledby="([^"]+)">([\s\S]*?)<\/section>/.exec(html);
    expect(section, "no call-to-action section").not.toBeNull();
    const [, labelledBy, inner] = section!;
    const heading = new RegExp(`<h2([^>]*) id="${labelledBy}"([^>]*)>([^<]*)</h2>`).exec(inner);
    expect(heading, "the section's label is not an h2").not.toBeNull();
    expect(heading![3]).toBe(NOT_FOUND_START);
    // Not hidden: it is the sentence the sighted reader sees.
    expect(`${heading![1]}${heading![2]}`).not.toContain("visually-hidden");
    // Once on the whole page, whatever the case or the punctuation: the
    // hidden heading it replaces spelled the words without the "Or" and the
    // full stop, and a check that read them back verbatim would pass its
    // return.
    const text = textOf(html.replace(/<style>[\s\S]*?<\/style>/g, " "));
    expect(text.toLowerCase().split(SENTENCE).length - 1).toBe(1);
    expect(inner).not.toContain("<strong>");
    // And the privacy line after it is the copy's, not the template's.
    expect(inner).toContain(`<p>${NOT_FOUND_START_NOTE}</p>`);
  });
});

describe("4 — the pencil never stands alone", () => {
  it("the row binds the pen to the last word of the answer with a space that cannot break", () => {
    const html = declarationHtml(ds, { qualification: "degree" }, ["qualification"], null);
    expect(html).toContain(`University degree&nbsp;<span class="pen" aria-hidden="true">✎</span>`);
    // The words are what they were: the label, then the pen.
    expect(textOf(html)).toContain("University degree ✎");
  });
});

/** The H1 a route page gives itself: its name, glossed once, escaped as it ships. */
const nameOf = (route: { name: string }): string => esc(glossSection(route.name, new Set()));

/** The masthead's H1 and the element after it, as the markup carries them. */
const headerOf = (html: string): { h1: string; next: string } | null => {
  const m = /<h1>([^<]*)<\/h1>\s*<p class="tagline">([^<]*)<\/p>/.exec(mastheadOf(html));
  return m ? { h1: m[1]!, next: m[2]! } : null;
};

describe("5 — a route's H1 is its name", () => {
  it("on every route page the H1 is the name the data gives it — no full stop after it — and the tagline follows as a line of its own", () => {
    const addresses = routeAddresses(ds);
    expect(addresses.length).toBeGreaterThan(20);
    for (const address of addresses) {
      const page = routePage(ds, address);
      const header = headerOf(page.html);
      expect(header, `${page.path}: the H1 is not a name followed by the tagline`).not.toBeNull();
      expect(header!.h1, page.path).toBe(nameOf(address.route));
      expect(header!.h1, page.path).not.toMatch(/\.$/);
      expect(header!.next).toBe(ROUTE_TAGLINE);
      expect(mastheadOf(page.html), page.path).not.toContain("<em>");
    }
  });

  it("the <title> and the social preview do not move", () => {
    for (const address of routeAddresses(ds)) {
      const page = routePage(ds, address);
      const title = `${address.route.name} · ${address.country.name} · ${PRODUCT_NAME}`;
      expect(page.title, page.path).toBe(title);
      expect(page.html).toContain(`<title>${title}</title>`);
      expect(page.html).toContain(`<meta property="og:title" content="${title}">`);
    }
  });
});

/**
 * The browser: the four slips a stylesheet decides are measured on the built
 * site at the phone and the desktop the critique named.
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
  process.stderr.write(`\n  !! THE S27 SLIPS WERE NOT MEASURED IN A BROWSER: ${skipped}.\n     Run: npm run build && npm test\n\n`);

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
  problems(): string[];
}

const VIEWPORTS = [
  ["390x844", { width: 390, height: 844 }, true],
  ["1280x900", { width: 1280, height: 900 }, false],
] as const;

const seed = (answers: Record<string, string>) =>
  `localStorage.setItem("permit-rulebook.record.v1", ${JSON.stringify(JSON.stringify({
    version: RECORD_VERSION, answers, history: Object.keys(answers),
  }))})`;
const tap = (value: string) => `document.querySelector(".qcard .opt[data-value=${value}]").click()`;
const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

const BUTTON = '(() => { const b = document.querySelector(".menu"); return JSON.stringify({ text: b.textContent.trim(), expanded: b.getAttribute("aria-expanded") }); })()';

/**
 * Every country section's summary, measured: the mark's right edge against
 * the name's left edge, and where the name and the tally sit. The mark is the
 * name element's own `::before`, laid as an inline block so its width can be
 * read back; the name's text starts where the range over its text node
 * starts.
 */
const SECTIONS = `JSON.stringify([...document.querySelectorAll(".country-sec")].map((d) => {
  const summary = d.querySelector("summary");
  const name = summary.querySelector(".cname");
  const tally = summary.querySelector(".tally");
  const nameBox = name.getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(name);
  const text = [...range.getClientRects()].sort((a, b) => a.left - b.left)[0];
  const mark = getComputedStyle(name, "::before");
  const tallyBox = tally.getBoundingClientRect();
  const sum = summary.getBoundingClientRect();
  return {
    name: name.textContent.trim(), open: d.open, said: summary.classList.contains("said"),
    fontSize: parseFloat(getComputedStyle(summary).fontSize),
    markWidth: parseFloat(mark.width), markContent: mark.content,
    gap: text.left - (nameBox.left + parseFloat(mark.width)),
    nameLeft: nameBox.left - sum.left, nameTop: nameBox.top, nameBottom: nameBox.bottom,
    tallyLeft: tallyBox.left - sum.left, tallyRight: sum.right - tallyBox.right, tallyTop: tallyBox.top,
  };
}))`;

interface Section {
  name: string; open: boolean; said: boolean; fontSize: number; markWidth: number; markContent: string; gap: number;
  nameLeft: number; nameTop: number; nameBottom: number; tallyLeft: number; tallyRight: number; tallyTop: number;
}

/** The four-country walk s26 seeds, to the result where every section is drawn: France leads, the other three closed. */
const walkToFour = async (page: BrowserPage, base: string): Promise<void> => {
  await page.goto(base, 300);
  await page.evaluate(seed({ destination: "all", situation: "research" }));
  await page.goto(base, 900);
  await page.evaluate(tap("fr"));
  await settle(400);
  await page.evaluate(tap("none"));
  await settle(400);
  await page.evaluate('(() => { const i = document.querySelector("#cfilter"); i.value = "Turkey"; i.dispatchEvent(new Event("input", { bubbles: true })); })()');
  await settle(300);
  await page.evaluate('document.querySelector(".clist [role=option]").click()');
  await settle(400);
  await page.evaluate(tap("no"));
  await settle(400);
  await page.evaluate(tap("no"));
  await settle(900);
};

/**
 * Every ledger row the dataset can produce, drawn into the real ledger at its
 * real width, and each pen measured against the last line of its answer.
 */
const ledgerRows = (): string => {
  const rows: string[] = [];
  for (const field of ds.fields) {
    const values = [
      ...fieldOptions(ds, field.id).map((o) => o.value),
      ...(field.type === "money_band" ? deriveBands(ds, field.id).map((b) => b.id) : []),
    ];
    for (const value of values) rows.push(declarationHtml(ds, { [field.id]: value }, [field.id], null));
  }
  return rows.join("");
};

const PENS = `JSON.stringify([...document.querySelectorAll("#decl-list .done")].map((row) => {
  const dd = row.querySelector("dd");
  const pen = dd.querySelector(".pen");
  const range = document.createRange();
  range.setStart(dd, 0);
  range.setEndBefore(pen);
  const lines = [...range.getClientRects()].filter((r) => r.width > 0);
  const last = lines.reduce((a, b) => (b.top > a.top ? b : a));
  const box = pen.getBoundingClientRect();
  return {
    field: row.dataset.field, text: dd.textContent.trim(), lines: new Set(lines.map((l) => Math.round(l.top))).size,
    penTop: box.top, penLeft: box.left, lastTop: last.top, lastLeft: last.left,
    width: row.getBoundingClientRect().width,
  };
}))`;

interface Pen {
  field: string; text: string; lines: number; penTop: number; penLeft: number;
  lastTop: number; lastBottom: number; lastLeft: number; width: number;
}

const HEADER = `JSON.stringify((() => {
  const h1 = document.querySelector(".masthead-with-stamps h1");
  const next = h1.nextElementSibling;
  const style = (el) => { const s = getComputedStyle(el); return { font: s.font, color: s.color, display: s.display }; };
  return { h1: h1.textContent.trim(), nextTag: next.tagName, nextClass: next.className, nextText: next.textContent.trim(),
    tagline: style(next), em: h1.querySelector("em") ? style(h1.querySelector("em")) : null };
})())`;

/** The route the critique quoted: a name that ends in a bracket. */
const EXPERIENCED = (() => {
  const germany = ds.countries.find((c) => c.code === "DE")!;
  return routePath(germany, germany.routes.find((r) => r.id === "de-experienced-worker")!);
})();

interface Header {
  h1: string; nextTag: string; nextClass: string; nextText: string;
  tagline: { font: string; color: string; display: string };
  em: { font: string; color: string; display: string } | null;
}

describe.skipIf(skipped !== null)("s27 — in the browser", () => {
  for (const [name, viewport, mobile] of VIEWPORTS) {
    it(`${name}: the menu button reads Menu, then Close, then Menu again after Escape and after a tap outside`, async () => {
      const server = await serve(dist);
      try {
        const seen = await withBrowser(async (page: BrowserPage) => {
          await page.goto(server.url("/germany/"), 500);
          const closed = JSON.parse(await page.evaluate(BUTTON));
          await page.evaluate('document.querySelector(".menu").click()');
          const open = JSON.parse(await page.evaluate(BUTTON));
          await page.evaluate('document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))');
          const escaped = JSON.parse(await page.evaluate(BUTTON));
          await page.evaluate('document.querySelector(".menu").click()');
          const reopened = JSON.parse(await page.evaluate(BUTTON));
          await page.evaluate('document.querySelector("footer").click()');
          const outside = JSON.parse(await page.evaluate(BUTTON));
          return { closed, open, escaped, reopened, outside, problems: page.problems() };
        }, { viewport, mobile }) as Record<string, { text: string; expanded: string }> & { problems: string[] };
        expect(seen.problems).toEqual([]);
        expect(seen.closed).toEqual({ text: MENU, expanded: "false" });
        expect(seen.open).toEqual({ text: MENU_CLOSE, expanded: "true" });
        expect(seen.escaped).toEqual({ text: MENU, expanded: "false" });
        expect(seen.reopened).toEqual({ text: MENU_CLOSE, expanded: "true" });
        expect(seen.outside).toEqual({ text: MENU, expanded: "false" });
      } finally { server.close(); }
    }, 180_000);

    it(`${name}: on the four-country result the mark is within 0.6 em of the name, closed and open, on every section`, async () => {
      const server = await serve(dist);
      try {
        const seen = await withBrowser(async (page: BrowserPage) => {
          await walkToFour(page, server.url("/"));
          const asDrawn = JSON.parse(await page.evaluate(SECTIONS)) as Section[];
          await page.evaluate('document.querySelectorAll(".country-sec").forEach((d) => { d.open = !d.open; })');
          await settle(200);
          const toggled = JSON.parse(await page.evaluate(SECTIONS)) as Section[];
          return { asDrawn, toggled, problems: page.problems() };
        }, { viewport, mobile }) as { asDrawn: Section[]; toggled: Section[]; problems: string[] };
        expect(seen.problems).toEqual([]);
        expect(seen.asDrawn.map((s) => s.name)).toEqual(["France", "Germany", "Spain", "Netherlands"]);
        // Both states of every section: the one it was drawn in, and the other.
        expect(seen.toggled.map((s) => s.open)).toEqual(seen.asDrawn.map((s) => !s.open));
        for (const s of [...seen.asDrawn, ...seen.toggled]) {
          const where = `${name} ${s.name} ${s.open ? "open" : "closed"}`;
          expect(s.markContent, where).toBe(s.open ? '"▾"' : '"▸"');
          expect(s.markWidth, where).toBeGreaterThan(0);
          expect(s.gap, where).toBeGreaterThanOrEqual(0);
          expect(s.gap, `${where}: the mark is ${s.gap.toFixed(1)} px from the name (0.6 em is ${(0.6 * s.fontSize).toFixed(1)} px)`)
            .toBeLessThanOrEqual(0.6 * s.fontSize);
          // The group sits at the line's start.
          expect(s.nameLeft, where).toBeLessThan(2);
          // The tally is level with the name, at the right — or, on the phone
          // only, wrapped beneath it and left-aligned. One of the two, never a
          // third place.
          const onTheLine = s.tallyTop < s.nameBottom;
          const place = onTheLine ? (s.tallyRight < 2 ? "right, on the name's line" : "adrift on the name's line")
            : (s.tallyLeft < 2 ? "beneath, left-aligned" : "beneath, adrift");
          if (viewport.width === 1280) expect(place, where).toBe("right, on the name's line");
          else expect(["right, on the name's line", "beneath, left-aligned"], where).toContain(place);
        }
        // The s21 sentence keeps its own row on the phone.
        const said = seen.asDrawn.find((s) => s.said)!;
        expect(said.name).toBe("France");
        if (viewport.width === 390) expect(said.tallyTop).toBeGreaterThanOrEqual(said.nameBottom);
      } finally { server.close(); }
    }, 180_000);

    it(`${name}: the 404 carries the sentence once, as the visible heading its section is labelled by`, async () => {
      const server = await serve(dist);
      try {
        const seen = JSON.parse(await withBrowser(async (page: BrowserPage) => {
          await page.goto(server.url("/404.html"), 400);
          return page.evaluate(`JSON.stringify((() => {
            const section = document.querySelector("section.cta");
            const label = document.getElementById(section.getAttribute("aria-labelledby"));
            const box = label.getBoundingClientRect();
            const carriers = [...document.querySelectorAll("body *")].filter((el) =>
              [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.toLowerCase().includes(${JSON.stringify(SENTENCE)})));
            return { tag: label.tagName, text: label.textContent.trim(), visible: box.width > 10 && box.height > 10
              && getComputedStyle(label).position !== "absolute", carriers: carriers.length,
              carrierIsLabel: carriers.length === 1 && carriers[0] === label };
          })())`);
        }, { viewport, mobile }) as string) as { tag: string; text: string; visible: boolean; carriers: number; carrierIsLabel: boolean };
        expect(seen.tag).toBe("H2");
        expect(seen.text).toBe(NOT_FOUND_START);
        expect(seen.visible).toBe(true);
        // One element on the page says it, and it is the one the section is labelled by.
        expect(seen.carriers).toBe(1);
        expect(seen.carrierIsLabel).toBe(true);
      } finally { server.close(); }
    }, 180_000);

    it(`${name}: a route page's H1 is the name; the tagline is the next element, in the type the em had`, async () => {
      const server = await serve(dist);
      try {
        const seen = await withBrowser(async (page: BrowserPage) => {
          await page.goto(server.url(EXPERIENCED), 400);
          const route = JSON.parse(await page.evaluate(HEADER)) as Header;
          const routeProblems = page.problems();
          // The country page keeps the em: the type the tagline must match.
          await page.goto(server.url("/germany/"), 400);
          const country = JSON.parse(await page.evaluate(HEADER)) as Header;
          return { route, country, problems: [...routeProblems, ...page.problems()] };
        }, { viewport, mobile }) as { route: Header; country: Header; problems: string[] };
        expect(seen.problems).toEqual([]);
        expect(seen.route.h1).toBe("Experienced worker (§ 19c / § 6 BeschV; § = section)");
        expect(seen.route.nextTag).toBe("P");
        expect(seen.route.nextClass).toBe("tagline");
        expect(seen.route.nextText).toBe(ROUTE_TAGLINE);
        expect(seen.route.tagline.display).toBe("block");
        expect(seen.country.em, "the country page lost its em").not.toBeNull();
        expect(seen.route.tagline.font).toBe(seen.country.em!.font);
        expect(seen.route.tagline.color).toBe(seen.country.em!.color);
      } finally { server.close(); }
    }, 180_000);
  }

  it("1280x900: in the ledger, over every answer the dataset offers, the pen sits on the answer's last line and never as its first glyph", async () => {
    const server = await serve(dist);
    try {
      const rows = ledgerRows();
      const seen = await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/"), 900);
        await page.evaluate(`document.getElementById("decl-list").innerHTML = ${JSON.stringify(rows)}`);
        await settle(200);
        return { pens: JSON.parse(await page.evaluate(PENS)) as Pen[], problems: page.problems() };
      }, { viewport: { width: 1280, height: 900 }, mobile: false }) as { pens: Pen[]; problems: string[] };
      expect(seen.problems).toEqual([]);
      expect(seen.pens.length).toBeGreaterThan(200);
      // The measurement is of the real sidebar, at its real width: the 15.5rem
      // column less the panel's padding, and no wider.
      expect(seen.pens[0]!.width).toBeGreaterThan(200);
      expect(seen.pens[0]!.width).toBeLessThan(260);
      // Some answers do wrap here — the measurement has to cover a second line to mean anything.
      expect(seen.pens.filter((p) => p.lines > 1).length).toBeGreaterThan(0);
      for (const p of seen.pens) {
        const where = `${p.field}: "${p.text}"`;
        expect(Math.abs(p.penTop - p.lastTop), `${where} — the pen's top is ${(p.penTop - p.lastTop).toFixed(1)} px off its answer's last line`).toBeLessThanOrEqual(2);
        expect(p.penLeft, `${where} — the pen is the first glyph on its line`).toBeGreaterThan(p.lastLeft + 1);
      }
    } finally { server.close(); }
  }, 180_000);

  it("every built route page: the H1 is the route's name with no full stop after it, and the tagline element follows", () => {
    const addresses = routeAddresses(ds);
    expect(addresses.length).toBeGreaterThan(20);
    for (const address of addresses) {
      const built = join(dist, address.path, "index.html");
      expect(existsSync(built), `${address.path} was not built`).toBe(true);
      const header = headerOf(read(built));
      expect(header, `${address.path}: the H1 is not a name followed by the tagline`).not.toBeNull();
      expect(header!.h1, address.path).toBe(nameOf(address.route));
      expect(header!.h1, address.path).not.toMatch(/\.$/);
      expect(header!.next, address.path).toBe(ROUTE_TAGLINE);
    }
  });
});
