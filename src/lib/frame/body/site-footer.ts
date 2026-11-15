// @level presentation
import {
  CHECK_YOURS, CODE_LICENCE, COUNTRIES, copyrightNotice, DATA_FOOTER_ROW, dataLicence, datasetVersionLabel,
  FEEDBACK, FEEDBACK_FOOTER_ROW, LAST_RUN, licenceFooterRow, PRODUCT_NAME, READ_DAILY, readRangeHtml,
  REPOSITORY_FOOTER_ROW, ROUTE_AS_JSON, SPONSOR_FOOTER_ROW, THE_DATA, unreadLabel,
} from "../../copy/frame.js";
import { seal } from "../../identity.js";
import { esc, escAttr } from "../../reason.js";
import { DATA_PATH, FEEDBACK_PATH, url } from "../../site.js";
import { countryMarkOf, type HeaderPlace, type NavLink } from "./site-header.js";

/**
 * The site footer: the same block under every page.
 *
 * Each page had grown its own — the interview three links, a route page a
 * disclaimer and a health line, the country page three ends — so the way out
 * of the product depended on which page you were standing on (site map,
 * 2026-09-08). One footer, from the same source as the header.
 *
 * Its links look like links at rest: a resting underline, not the header's
 * borderless row. The isolated critique of the mock called an underline-on-
 * hover column "a list of words a mouse discovers", and a phone has no hover
 * at all.
 */
export interface FooterPlace extends HeaderPlace {
  /** The route's own JSON, on a route page only. */
  jsonPath?: string;
  /** Where "Check yours" starts, pre-scoped where a country is known. */
  checkPath?: string;
}

export interface FooterFacts {
  /** The read range, both ends: every quoted sentence's, notices included. */
  read: { oldest: string; newest: string };
  datasetVersion: string;
  /** The day the watch last ran — empty where it never has. */
  lastRun: string;
  /**
   * How many of the sources behind these values that run did not read — 0 on
   * every day the watch got all of them, which is every day but the ones this
   * line exists for. The words are `unreadLabel`'s, beside the other two
   * surfaces that say it; this file knows markup, not copy.
   */
  unread: number;
  disclaimer: string;
  licenceUrl: string;
  licenceName: string;
  repository: string;
  /**
   * The tracker's two links are no longer facts the footer needs: they left it
   * for `/feedback/`, where they are named as the option for a reader who has
   * an account and wants the public record (s13). The address is not here
   * either: the column carried it for a day and the human took it out on the
   * walk ("kaldir", 2026-09-16) — it lives on `/feedback/` only, in plain
   * text beside the doors, and the footer's row is the way there.
   */
  sponsor: string;
  owner: string;
  year: string;
}

const out = (href: string, label: string): string =>
  `<a class="out tap-min" href="${escAttr(href)}" target="_blank" rel="noopener">${esc(label)}</a>`;

/**
 * The separator between the footer's data tokens. The space before the dot is
 * non-breaking, so the dot ends the line it belongs to and the break falls
 * after it: the data line breaks at its separators before it breaks anywhere
 * else, and nothing that cannot break is ever wider than its column.
 */
const SEP = String.fromCharCode(160, 183) + " ";

/**
 * The one break the last-run parenthesis may take, and where: at its
 * separator, after the dot, as every other break on the line — `SEP`'s
 * non-breaking space before the dot, its ordinary space after, with the held
 * token closed and reopened around that space.
 *
 * The parenthesis is a held token, and on the first day it carried a count —
 * "(last run 2026-09-16 · 1 source unread)", 2026-09-16, run 35098352421 — it
 * measured 350 px in a 348 px column at 390. So each half is held in its own
 * token, whole, and the line may break between them; the words are the same
 * to the byte, and on a clean day so is the markup (s15).
 */
const SEP_BREAK = `${SEP.trimEnd()}</span> <span class="keep">`;

/** One country's row in the footer's first column, marked where it is this page. */
function countryRowHtml(link: NavLink, place: FooterPlace): string {
  return `<li><a class="tap-min" href="${escAttr(url(link.path))}"${countryMarkOf(link, place)}>${esc(link.label)}</a></li>`;
}

/** The rows of the footer's data column: the data page, the route's own JSON, the repository and the licence. */
function dataRowsHtml(facts: FooterFacts, place: FooterPlace): string {
  return [
    `<li><a class="tap-min" href="${escAttr(url(DATA_PATH))}">${esc(DATA_FOOTER_ROW)}</a></li>`,
    // Only where there is a route to serve: the other pages render the column
    // without it rather than linking a file that is not theirs.
    place.jsonPath ? `<li><a class="tap-min" href="${escAttr(url(place.jsonPath))}">${esc(ROUTE_AS_JSON)}</a></li>` : "",
    `<li>${out(facts.repository, REPOSITORY_FOOTER_ROW)}</li>`,
    `<li>${out(facts.licenceUrl, licenceFooterRow(facts.licenceName))}</li>`,
  ].filter(Boolean).join("");
}

/** The watch's last run, in its held parenthesis, with the unread count where there is one; nothing where it never ran. */
function lastRunHtml(facts: FooterFacts): string {
  if (!facts.lastRun) return "";
  return ` <span class="keep">(${esc(LAST_RUN)} <time datetime="${escAttr(facts.lastRun)}">${esc(facts.lastRun)}</time>${
    facts.unread ? `${SEP_BREAK}${esc(unreadLabel(facts.unread))}` : ""})</span>`;
}

/** One end of the read range: its day, in bold. */
const readDayHtml = (day: string): string => `<b><time datetime="${escAttr(day)}">${esc(day)}</time></b>`;

/** The footer's last line: the mark, the licences and the owner, then the health signal. */
function footerLineHtml(facts: FooterFacts): string {
  return `<div class="line">
      <span><a class="mark tap-min" href="${escAttr(url("/"))}">${seal()}${esc(PRODUCT_NAME)}</a>${SEP}<span class="keep">${
    esc(CODE_LICENCE)}</span>${SEP}<span class="keep">${esc(dataLicence(facts.licenceName))}</span>${SEP}<span class="keep">${
    esc(copyrightNotice(facts.year, facts.owner))}</span></span>
      <span>${readRangeHtml(readDayHtml(facts.read.oldest), readDayHtml(facts.read.newest))}${SEP}${
    esc(READ_DAILY)}${lastRunHtml(facts)}${SEP}<span class="keep">${esc(datasetVersionLabel(facts.datasetVersion))}</span></span>
    </div>`;
}

export function siteFooter(
  countries: NavLink[], facts: FooterFacts, place: FooterPlace = {},
): string {
  return `<footer class="site-foot">
    <p class="disclaimer">${esc(facts.disclaimer)}</p>
    <div class="cols">
      <div class="col">
        <h3>${esc(COUNTRIES)}</h3>
        <ul>${countries.map((link) => countryRowHtml(link, place)).join("")}
          <li class="act"><a class="tap-min" href="${
    escAttr(url(place.checkPath ?? "/"))}">${esc(CHECK_YOURS)}</a></li>
        </ul>
      </div>
      <div class="col">
        <h3>${esc(THE_DATA)}</h3>
        <ul>${dataRowsHtml(facts, place)}</ul>
      </div>
      <div class="col">
        <h3>${esc(FEEDBACK)}</h3>
        <ul>
          <li><a class="tap-min" href="${escAttr(url(FEEDBACK_PATH))}">${esc(FEEDBACK_FOOTER_ROW)}</a></li>
          <li>${out(facts.sponsor, SPONSOR_FOOTER_ROW)}</li>
        </ul>
      </div>
    </div>
    ${footerLineHtml(facts)}
  </footer>`;
}
