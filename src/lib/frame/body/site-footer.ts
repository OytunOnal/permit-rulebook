// @level presentation
import { FEEDBACK, FEEDBACK_FOOTER_ROW, PRODUCT_NAME, unreadLabel } from "../../copy/frame.js";
import { seal } from "../../identity.js";
import { esc, escAttr } from "../../reason.js";
import { DATA_PATH, FEEDBACK_PATH, url } from "../../site.js";
import type { HeaderPlace, NavLink } from "./site-header.js";

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
  /** The span the values were read over, both ends. */
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

export function siteFooter(
  countries: NavLink[], facts: FooterFacts, place: FooterPlace = {},
): string {
  const here = (link: NavLink): string => {
    const marked = place.countryPath && link.path === place.countryPath && place.current
      ? ` aria-current="${escAttr(place.current)}"`
      : "";
    return `<li><a class="tap-min" href="${escAttr(url(link.path))}"${marked}>${esc(link.label)}</a></li>`;
  };
  const data = [
    `<li><a class="tap-min" href="${escAttr(url(DATA_PATH))}">The data — status, versions, downloads</a></li>`,
    // Only where there is a route to serve: the other pages render the column
    // without it rather than linking a file that is not theirs.
    place.jsonPath ? `<li><a class="tap-min" href="${escAttr(url(place.jsonPath))}">This route as JSON</a></li>` : "",
    `<li>${out(facts.repository, "The repository")}</li>`,
    `<li>${out(facts.licenceUrl, `Licence · ${facts.licenceName}`)}</li>`,
  ].filter(Boolean).join("");

  return `<footer class="site-foot">
    <p class="disclaimer">${esc(facts.disclaimer)}</p>
    <div class="cols">
      <div class="col">
        <h3>Countries</h3>
        <ul>${countries.map(here).join("")}
          <li class="act"><a class="tap-min" href="${
    escAttr(url(place.checkPath ?? "/"))}">Check yours</a></li>
        </ul>
      </div>
      <div class="col">
        <h3>The data</h3>
        <ul>${data}</ul>
      </div>
      <div class="col">
        <h3>${esc(FEEDBACK)}</h3>
        <ul>
          <li><a class="tap-min" href="${escAttr(url(FEEDBACK_PATH))}">${esc(FEEDBACK_FOOTER_ROW)}</a></li>
          <li>${out(facts.sponsor, "Sponsor this work")}</li>
        </ul>
      </div>
    </div>
    <div class="line">
      <span><a class="mark tap-min" href="${escAttr(url("/"))}">${seal()}${esc(PRODUCT_NAME)}</a>${SEP}<span class="keep">code MIT</span>${SEP}<span class="keep">data ${
    esc(facts.licenceName)}</span>${SEP}<span class="keep">© ${esc(facts.year)} ${esc(facts.owner)}</span></span>
      <span>values read between <b><time datetime="${
    escAttr(facts.read.oldest)}">${esc(facts.read.oldest)}</time></b> and <b><time datetime="${
    escAttr(facts.read.newest)}">${esc(facts.read.newest)}</time></b>${SEP}re-read daily${facts.lastRun ? ` <span class="keep">(last run <time datetime="${
    escAttr(facts.lastRun)}">${esc(facts.lastRun)}</time>${
    facts.unread ? `${SEP_BREAK}${esc(unreadLabel(facts.unread))}` : ""})</span>` : ""}${SEP}<span class="keep">dataset ${
    esc(facts.datasetVersion)}</span></span>
    </div>
  </footer>`;
}
