import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveBands, fieldOptions } from "permit-rulebook-data";
import { MENU, MENU_CLOSE } from "../src/lib/copy/frame.js";
import { NOT_FOUND_START } from "../src/lib/copy/not-found.js";
import { ROUTE_TAGLINE } from "../src/lib/copy/route-page.js";
import { declarationHtml } from "../src/lib/question.js";
import { routeAddresses, routePath } from "../src/lib/slug.js";
import { PAINTED_AS_COMPOSED, paintedAsComposedScript, verdictFor } from "./verdict-cards.js";
import { DESK, PHONE, type PageOnSite } from "../scripts/browser/browser.mjs";
import { InterviewPage } from "../scripts/interview-page/interview-page.mjs";
import { evaluateAtRest, openAtRest, skipReason, warnNotWalked, withSite } from "./browser-walk.js";
import { OPENED, SENTENCE, WALKED_TO_FOUR, ds, headerOf, nameOf } from "./s27-slips.js";

const dist = fileURLToPath(new URL("../dist", import.meta.url));
const read = (path: string): string => readFileSync(path, "utf8").split("\r\n").join("\n");

/**
 * s27 — five small slips (v1.1 gate critique, P8): the walks. `s27.test.ts`
 * holds the decisions read from the copy, the markup and the verdict.
 *
 * The browser: the four slips a stylesheet decides are measured on the built
 * site at the phone and the desktop the critique named.
 */

const skipped = skipReason();
if (skipped) warnNotWalked("THE S27 SLIPS", skipped);

// The phone and the desktop the critique named: every slip a stylesheet decides is measured at both.
const SCREENS = [["390x844", PHONE], ["1280x900", DESK]] as const;
/** A screen the slips are measured at. */
type Screen = (typeof SCREENS)[number][1];

/** In the page: the menu button's words and whether it says it is expanded, as JSON. */
function readMenuButton(): string {
  const b = document.querySelector(".menu")!;
  return JSON.stringify({ text: (b.textContent ?? "").trim(), expanded: b.getAttribute("aria-expanded") });
}

// The menu button read in the page, at each step of its walk.
const BUTTON = `(${readMenuButton})()`;
/** The menu button read by `BUTTON` at each step of its walk. */
type MenuButtonSeen = Record<"closed" | "open" | "escaped" | "reopened" | "outside", { text: string; expanded: string }>;

/**
 * Every country section's summary, measured: the mark's right edge against
 * the name's left edge, and where the name and the tally sit. The mark is the
 * name element's own `::before`, laid as an inline block so its width can be
 * read back; the name's text starts where the range over its text node
 * starts. In the page, as JSON.
 */
function readSections(): string {
  return JSON.stringify([...document.querySelectorAll<HTMLDetailsElement>(".country-sec")].map((d) => {
    const summary = d.querySelector("summary")!;
    const name = summary.querySelector(".cname")!;
    const tally = summary.querySelector(".tally")!;
    const nameBox = name.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(name);
    const text = [...range.getClientRects()].sort((a, b) => a.left - b.left)[0]!;
    const mark = getComputedStyle(name, "::before");
    const tallyBox = tally.getBoundingClientRect();
    const sum = summary.getBoundingClientRect();
    return {
      name: (name.textContent ?? "").trim(), open: d.open, said: summary.classList.contains("said"),
      fontSize: parseFloat(getComputedStyle(summary).fontSize),
      markWidth: parseFloat(mark.width), markContent: mark.content,
      gap: text.left - (nameBox.left + parseFloat(mark.width)),
      nameLeft: nameBox.left - sum.left, nameTop: nameBox.top, nameBottom: nameBox.bottom,
      tallyLeft: tallyBox.left - sum.left, tallyRight: sum.right - tallyBox.right, tallyTop: tallyBox.top,
    };
  }));
}

// Every country section's summary, measured as `readSections` says.
const SECTIONS = `(${readSections})()`;

interface Section {
  name: string; open: boolean; said: boolean; fontSize: number; markWidth: number; markContent: string; gap: number;
  nameLeft: number; nameTop: number; nameBottom: number; tallyLeft: number; tallyRight: number; tallyTop: number;
}

/** Where a section's tally sits against its name: on the name's line or beneath it, aligned or adrift. */
function tallyPlaceOf(s: Section): string {
  if (s.tallyTop < s.nameBottom) return s.tallyRight < 2 ? "right, on the name's line" : "adrift on the name's line";
  return s.tallyLeft < 2 ? "beneath, left-aligned" : "beneath, adrift";
}

/** The four-country walk s26 seeds, to the result where every section is drawn: France leads, the other three closed. */
const walkToFour = async (site: PageOnSite): Promise<void> => {
  const interview = new InterviewPage(site);
  await interview.seed({ destination: "all", situation: "research" });
  await interview.open();
  await site.page.waitUntilAtRest();
  await interview.answer("situation_country", "fr");
  await interview.answer("qualification", "none");
  await interview.answer("citizenship", "TR");
  await interview.answer("nl_recent_grad", "no");
  await interview.answer("top200_grad", "no");
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
    for (const value of values) rows.push(declarationHtml(ds, { answers: { [field.id]: value }, asked: [field.id], currentField: null }));
  }
  return rows.join("");
};

/** In the page: each ledger row's pen against the last line of its answer, as JSON. */
function readPens(): string {
  return JSON.stringify([...document.querySelectorAll<HTMLElement>("#decl-list .done")].map((row) => {
    const dd = row.querySelector("dd")!;
    const pen = dd.querySelector(".pen")!;
    const range = document.createRange();
    range.setStart(dd, 0);
    range.setEndBefore(pen);
    const lines = [...range.getClientRects()].filter((r) => r.width > 0);
    const last = lines.reduce((a, b) => (b.top > a.top ? b : a));
    const box = pen.getBoundingClientRect();
    return {
      field: row.dataset.field, text: (dd.textContent ?? "").trim(), lines: new Set(lines.map((l) => Math.round(l.top))).size,
      penTop: box.top, penLeft: box.left, lastTop: last.top, lastLeft: last.left,
      width: row.getBoundingClientRect().width,
    };
  }));
}

// Every pen in the ledger measured, once the dataset's rows are drawn into it.
const PENS = `(${readPens})()`;

interface Pen {
  field: string; text: string; lines: number; penTop: number; penLeft: number;
  lastTop: number; lastBottom: number; lastLeft: number; width: number;
}

/** In the page: the masthead's H1, the element after it, and the type of that element and of the H1's em, as JSON. */
function readHeader(): string {
  const h1 = document.querySelector(".masthead-with-stamps h1")!;
  const next = h1.nextElementSibling!;
  const style = (el: Element) => { const s = getComputedStyle(el); return { font: s.font, color: s.color, display: s.display }; };
  const em = h1.querySelector("em");
  return JSON.stringify({ h1: (h1.textContent ?? "").trim(), nextTag: next.tagName, nextClass: next.className,
    nextText: (next.textContent ?? "").trim(), tagline: style(next), em: em ? style(em) : null });
}

// The masthead read the same way on a route page and on the country page whose type it must match.
const HEADER = `(${readHeader})()`;

/** In the page: the 404's call-to-action heading, and every element whose own text carries `sentence`, as JSON. */
function readNotFoundHeading(sentence: string): string {
  const section = document.querySelector("section.cta")!;
  const label = document.getElementById(section.getAttribute("aria-labelledby")!)!;
  const box = label.getBoundingClientRect();
  const carriers = [...document.querySelectorAll("body *")].filter((el) =>
    [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").toLowerCase().includes(sentence)));
  const isVisible = box.width > 10 && box.height > 10 && getComputedStyle(label).position !== "absolute";
  return JSON.stringify({ tag: label.tagName, text: (label.textContent ?? "").trim(), visible: isVisible,
    carriers: carriers.length, carrierIsLabel: carriers.length === 1 && carriers[0] === label });
}

/** In the page: how the open card's door is drawn under its scope line, as JSON. */
function readDoor(): string {
  const scoped = document.querySelector(".route .scoped")!;
  const door = scoped.querySelector(".door")!;
  const s = getComputedStyle(door);
  const range = document.createRange();
  range.setStart(scoped, 0);
  range.setEndBefore(door);
  const line = [...range.getClientRects()].filter((r) => r.width > 0).pop();
  const box = door.getBoundingClientRect();
  const root = getComputedStyle(document.documentElement);
  return JSON.stringify({ decoration: s.textDecorationLine, color: s.color,
    band: root.getPropertyValue("--color-band").trim(),
    beneath: line && box.top >= line.bottom - 1, left: Math.round(box.left - scoped.getBoundingClientRect().left),
    height: box.height, tapMin: parseFloat(root.getPropertyValue("--tap-min")) });
}

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
  for (const [name, screen] of SCREENS) {
    it(`${name}: the menu button reads Menu, then Close, then Menu again after Escape and after a tap outside`,
      () => expectMenuButtonSaysWhatItDoes(screen), 180_000);
    it(`${name}: on the four-country result the mark is within 0.6 em of the name, closed and open, on every section`,
      () => expectMarkBesideTheNameOnEverySection(name, screen), 180_000);
    it(`${name}: the 404 carries the sentence once, as the visible heading its section is labelled by`,
      () => expectNotFoundSaysItOnce(screen), 180_000);
    it(`${name}: a route page's H1 is the name; the tagline is the next element, in the type the em had`,
      () => expectRouteH1IsTheName(screen), 180_000);
  }

  it("1280x900: in the ledger, over every answer the dataset offers, the pen sits on the answer's last line and never as its first glyph",
    expectPenOnTheAnswersLastLine, 180_000);

  for (const [name, screen] of SCREENS) {
    it(`${name}: under the open card the door is underlined, in the prose-link colour, on a line of its own beneath the scope line, at the tap size`,
      () => expectDoorDrawnAsADoor(name, screen), 180_000);
  }

  it("every built route page: the H1 is the route's name with no full stop after it, and the tagline element follows",
    expectEveryBuiltRoutePageHeadedByItsName);
});

/** Checks the menu button reads Menu, then Close, then Menu again after Escape and after a tap outside. */
async function expectMenuButtonSaysWhatItDoes(screen: Screen): Promise<void> {
  const seen = await withSite<MenuButtonSeen>(async ({ page, url: addressOf }) => {
    await page.goto(addressOf("/germany/"));
    const closed = JSON.parse(await page.evaluate(BUTTON));
    await page.evaluate('document.querySelector(".menu").click()');
    const open = JSON.parse(await page.evaluate(BUTTON));
    await page.evaluate('document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))');
    const escaped = JSON.parse(await page.evaluate(BUTTON));
    await page.evaluate('document.querySelector(".menu").click()');
    const reopened = JSON.parse(await page.evaluate(BUTTON));
    await page.evaluate('document.querySelector("footer").click()');
    const outside = JSON.parse(await page.evaluate(BUTTON));
    return { closed, open, escaped, reopened, outside };
  }, screen);
  expect(seen.closed).toEqual({ text: MENU, expanded: "false" });
  expect(seen.open).toEqual({ text: MENU_CLOSE, expanded: "true" });
  expect(seen.escaped).toEqual({ text: MENU, expanded: "false" });
  expect(seen.reopened).toEqual({ text: MENU_CLOSE, expanded: "true" });
  expect(seen.outside).toEqual({ text: MENU, expanded: "false" });
}

/** In the page: opens every country's section that is closed, and closes every one that is open. */
function toggleEverySectionInPage(): string {
  document.querySelectorAll<HTMLDetailsElement>(".country-sec").forEach((d) => { d.open = !d.open; });
  return "toggled";
}

/** Checks, on the four-country result, the mark is within 0.6 em of the name, closed and open, on every section. */
async function expectMarkBesideTheNameOnEverySection(name: string, screen: Screen): Promise<void> {
  const seen = await withSite(async (site) => {
    const { page } = site;
    await walkToFour(site);
    const painted = JSON.parse(await page.evaluate(paintedAsComposedScript(verdictFor(WALKED_TO_FOUR))));
    const asDrawn = JSON.parse(await page.evaluate(SECTIONS)) as Section[];
    await evaluateAtRest(page, `(${toggleEverySectionInPage})()`);
    const toggled = JSON.parse(await page.evaluate(SECTIONS)) as Section[];
    return { painted, asDrawn, toggled };
  }, screen) as {
    painted: typeof PAINTED_AS_COMPOSED; asDrawn: Section[]; toggled: Section[];
  };
  // The sections, their order and which line says the sentence are the
  // verdict's ("2 — the four-country result's sections, from the
  // verdict"); the walk ends on that verdict, painted.
  expect(seen.painted).toEqual(PAINTED_AS_COMPOSED);
  expect(seen.asDrawn).toHaveLength(4);
  // Both states of every section: the one it was drawn in, and the other.
  expect(seen.toggled.map((s) => s.open)).toEqual(seen.asDrawn.map((s) => !s.open));
  for (const s of [...seen.asDrawn, ...seen.toggled]) expectMarkBesideTheName(`${name} ${s.name} ${s.open ? "open" : "closed"}`, s, screen);
  // The s21 sentence keeps its own row on the phone.
  const said = seen.asDrawn.find((s) => s.said)!;
  if (screen === PHONE) expect(said.tallyTop).toBeGreaterThanOrEqual(said.nameBottom);
}

/** Checks one section's mark sits within 0.6 em of its name, at the line's start, and its tally in one of its two places. */
function expectMarkBesideTheName(where: string, s: Section, screen: Screen): void {
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
  const place = tallyPlaceOf(s);
  if (screen === DESK) expect(place, where).toBe("right, on the name's line");
  else expect(["right, on the name's line", "beneath, left-aligned"], where).toContain(place);
}

/** Checks the 404 carries the sentence once, as the visible heading its section is labelled by. */
async function expectNotFoundSaysItOnce(screen: Screen): Promise<void> {
  const seen = JSON.parse(await withSite(async ({ page, url: addressOf }) => {
    await page.goto(addressOf("/404.html"));
    return page.evaluate(`(${readNotFoundHeading})(${JSON.stringify(SENTENCE)})`);
  }, screen) as string) as { tag: string; text: string; visible: boolean; carriers: number; carrierIsLabel: boolean };
  expect(seen.tag).toBe("H2");
  expect(seen.text).toBe(NOT_FOUND_START);
  expect(seen.visible).toBe(true);
  // One element on the page says it, and it is the one the section is labelled by.
  expect(seen.carriers).toBe(1);
  expect(seen.carrierIsLabel).toBe(true);
}

/** Checks a route page's H1 is the name, and the tagline is the next element, in the type the em had. */
async function expectRouteH1IsTheName(screen: Screen): Promise<void> {
  const seen = await withSite(async ({ page, url: addressOf }) => {
    await page.goto(addressOf(EXPERIENCED));
    const route = JSON.parse(await page.evaluate(HEADER)) as Header;
    // The country page keeps the em: the type the tagline must match.
    await page.goto(addressOf("/germany/"));
    const country = JSON.parse(await page.evaluate(HEADER)) as Header;
    return { route, country };
  }, screen) as { route: Header; country: Header };
  // The name alone — and since s32's amendment 6 without the sign's
  // explainer after the citation.
  expect(seen.route.h1).toBe("Experienced worker (§ 19c / § 6 BeschV)");
  expect(seen.route.nextTag).toBe("P");
  expect(seen.route.nextClass).toBe("tagline");
  expect(seen.route.nextText).toBe(ROUTE_TAGLINE);
  expect(seen.route.tagline.display).toBe("block");
  expect(seen.country.em, "the country page lost its em").not.toBeNull();
  expect(seen.route.tagline.font).toBe(seen.country.em!.font);
  expect(seen.route.tagline.color).toBe(seen.country.em!.color);
}

/** Checks, in the ledger, over every answer the dataset offers, the pen sits on the answer's last line and never as its first glyph. */
async function expectPenOnTheAnswersLastLine(): Promise<void> {
  const rows = ledgerRows();
  const seen = await withSite(async ({ page, url: addressOf }) => {
    await openAtRest(page, addressOf("/"));
    await evaluateAtRest(page, `document.getElementById("decl-list").innerHTML = ${JSON.stringify(rows)}`);
    return { pens: JSON.parse(await page.evaluate(PENS)) as Pen[] };
  }, DESK) as { pens: Pen[] };
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
}

/** How the open card's door is drawn, as `readDoor` reads it. */
interface Door { decoration: string; color: string; band: string; beneath: boolean; left: number; height: number; tapMin: number }

/** Checks under the open card the door is underlined, in the prose-link colour, on a line of its own beneath the scope line, at the tap size. */
async function expectDoorDrawnAsADoor(name: string, screen: Screen): Promise<void> {
  const door = await withSite(async (site) => {
    const interview = new InterviewPage(site);
    await interview.seed(OPENED);
    await interview.open();
    await site.page.waitUntilAtRest();
    return JSON.parse(await site.page.evaluate(`(${readDoor})()`)) as Door;
  }, screen) as Door;
  // The door's words and its internal href are the verdict's ("8 — the
  // card's door is a door"); here, how it is drawn.
  expect(door.decoration).toBe("underline");
  // The band colour, read back as the browser states it.
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(door.band.slice(i, i + 2), 16));
  expect(door.color).toBe(`rgb(${r}, ${g}, ${b})`);
  expect(door.beneath, `${name}: the door shares the scope line's last line`).toBe(true);
  expect(door.left).toBe(0);
  expect(door.height).toBeGreaterThanOrEqual(door.tapMin);
}

/** Checks every built route page: the H1 is the route's name with no full stop after it, and the tagline element follows. */
function expectEveryBuiltRoutePageHeadedByItsName(): void {
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
}
