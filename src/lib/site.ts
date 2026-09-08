import { routeProvenance, type Dataset } from "permit-rulebook-data";
// The watch's own record of when it last ran. It is a fact about the data
// repository, not about the dataset, and it is the only date on this site that
// moves without a person (devils-advocate, 2026-09-08).
import watchState from "permit-rulebook-data/watch/state.json";
import { escAttr } from "./reason.js";
import { PRODUCT_NAME, TAGLINE } from "./copy.js";
/**
 * Where this build believes it lives, and where the data behind it lives.
 *
 * Every one of these is a GitHub-side fact the build cannot know: the
 * repositories are renamed by a person, the Pages deployment is switched on by
 * a person, the custom domain is bound by a person. So each is a default with
 * an override, stated here rather than typed into a template — an absolute
 * `og:image` URL guessed in twelve places is twelve places to be wrong.
 *
 * `SITE_URL` comes from `astro.config.mjs`, which reads the `SITE_URL`
 * environment variable; the default below is the domain the identity mock
 * shows in its link preview. A deploy under a different name sets the variable
 * and everything absolute on every page follows it.
 */
const DEFAULT_SITE_URL = "https://permitrulebook.com";


export const SITE_URL: string = (import.meta.env.SITE ?? DEFAULT_SITE_URL).replace(/[/]+$/, "");

/**
 * The path the site is served under, with no trailing slash: "" at a domain
 * root, "/permit-rulebook" on GitHub Pages. Astro sets `BASE_URL` from the
 * `base` config, which `astro.config.mjs` reads off SITE_URL's own path.
 *
 * Empty in the test runner and in any plain-Node caller, which is the root
 * case and therefore the right default.
 */
const BASE = import.meta.env.BASE_URL.replace(/[/]+$/, "");

/**
 * Every internal URL the site emits goes through here.
 *
 * A root-absolute `/germany/…` is correct at a domain root and broken under a
 * subpath: GitHub Pages serves a project repository at
 * `https://oytunonal.github.io/permit-rulebook/`, where every such link lands
 * outside the site (2026-09-08). One helper, so there is one place that can be
 * wrong — and at the root it returns the path unchanged, so the root build is
 * byte-for-byte what it was.
 *
 * `base` is a parameter only so a test can ask what a path becomes under a
 * subpath without building the whole site; nothing passes it in production.
 */
export const url = (path: string, base: string = BASE): string => {
  const joined = `${base.replace(/[/]+$/, "")}/${String(path).replace(/^[/]+/, "")}`;
  // A page's address ends in a slash, because that is the address the host
  // serves. Without it every URL in the sitemap answered 301 to its own slash
  // form while the canonical and the og:url named the slash-less one — a
  // crawler was being pointed at a redirect (devils-advocate, 2026-09-08).
  // A file keeps its name: `/germany/x.json` is not a directory.
  const [pathname, rest = ""] = joined.split(/(?=[?#])/, 2) as [string, string?];
  const isFile = /[.][a-z0-9]+$/i.test(pathname);
  return `${isFile || pathname.endsWith("/") ? pathname : `${pathname}/`}${rest}`;
};

/** The origin alone, for the absolute URLs a link preview reads. */
const ORIGIN = new URL(SITE_URL).origin;

/** An absolute URL for an internal path, base included. */
export const absolute = (path: string): string => `${ORIGIN}${url(path)}`;

/**
 * The data repository, by the name decision 1 gives it. It does not exist under
 * that name until the human renames it on GitHub; nothing here can do that, and
 * nothing here pretends the rename has happened beyond linking to where it will
 * land.
 */
export const REPO_DATA = "https://github.com/OytunOnal/permit-rulebook-data";

/** Where a stranger's first piece of feedback goes — on the product itself, so
 * it has somewhere to land the day the link goes out (decision 4). */
export const TRACKER_URL = `${REPO_DATA}/issues/new/choose`;

/**
 * Every route researched and deliberately left out, with the reason. A country
 * index says what it does not hold as well as what it does; until that file has
 * a page of its own, the link goes to the file in the data repository (human,
 * 2026-09-08).
 */
export const EXCLUSIONS_URL = `${REPO_DATA}/blob/master/data/exclusions.md`;

/**
 * The issue form for a route or a country we do not hold yet — the tracker's
 * own `new-need` template, so the reader lands on the questions rather than on
 * a blank box.
 */
export const NEW_NEED_URL = `${REPO_DATA}/issues/new?template=new-need.yml`;

/**
 * Sponsorship. The page GitHub serves at this address until Sponsors is
 * switched on for the account is GitHub's own "not accepting sponsorships"
 * page, which is the truth of it; the human turns it on (2026-09-08).
 */
export const SPONSOR_URL = "https://github.com/sponsors/OytunOnal";

/**
 * The traffic counter's site id.
 *
 * Cloudflare Web Analytics is cookieless and stores nothing about a visitor: it
 * records the page view, the address, the referrer and the country, and nothing
 * a reader answered here — the interview never sends an answer anywhere, and
 * this does not change that (human decision, 2026-09-08). The token is a public
 * site id that identifies the site to Cloudflare, not a secret: it ships inside
 * the page, as Cloudflare's own snippet does.
 */
export const ANALYTICS_TOKEN = "50d203a6cbed4e3a84ba3629843d6ac9";

/** Where the beacon comes from, named once so a test can allow exactly it. */
export const ANALYTICS_SCRIPT = "https://static.cloudflareinsights.com/beacon.min.js";

/** Where the beacon reports to — the one other address this site talks to. */
export const ANALYTICS_BEACON = "https://cloudflareinsights.com/cdn-cgi/rum";

/**
 * The counter, exactly as Cloudflare issued it. One source, every page: a page
 * that quietly stopped counting would be a number nobody could trust.
 *
 * It goes at the END of the body, not in the head. In the head it is a module
 * script fetched before the page's own, and when it cannot reach Cloudflare —
 * a sandbox, a blocked network, a slow DNS — the interview rendered a second
 * late and the smoke check found no question on the screen (2026-09-08). A
 * traffic counter may never be in front of the product.
 */
export const analyticsBeacon = (): string =>
  `<script type="module" src="${escAttr(ANALYTICS_SCRIPT)}" data-cf-beacon='{"token": "${
    ANALYTICS_TOKEN}"}'></script>`;

/** Whose copyright the footer states. The LICENSE file's own holder. */
export const OWNER = "Oytun Onal";

/** The dataset licence, linked rather than stated as unlinked text (the mock's
 * P4: a door with no handle). */
export const DATA_LICENCE_URL = `${REPO_DATA}/blob/master/data/LICENSE`;
export const DATA_LICENCE_NAME = "CC BY 4.0";
/** The same licence, spelled out — no abbreviation goes unexplained on first
 * use (scenario step 1), and "CC BY 4.0" is one to a reader who is not a
 * developer. The short form is fine everywhere after it. */
export const DATA_LICENCE_FULL = "Creative Commons Attribution 4.0 (CC BY 4.0)";

/** The social card, rendered at 1200×630 and committed under `public/`. */
export const SOCIAL_CARD_PATH = "/social-card.png";

/**
 * The head a page shares with every other page: the description a search
 * result reads, the canonical address, and the card a link preview draws.
 *
 * It was written out three times — the route page, the country page, the data
 * page — with the same eleven tags and three chances to drift (Standards
 * review, 2026-09-08). The title and the description are the page's own; the
 * rest is the product's, and the product says it once.
 */
export function headMeta(o: {
  title: string;
  description: string;
  path: string;
  /** `article` for a route page, `website` for an index. */
  kind?: "article" | "website";
}): string {
  const preview = `${TAGLINE} ${o.description}`;
  return [
    `<meta name="description" content="${escAttr(o.description)}">`,
    `<link rel="canonical" href="${escAttr(absolute(o.path))}">`,
    `<meta property="og:site_name" content="${escAttr(PRODUCT_NAME)}">`,
    `<meta property="og:title" content="${escAttr(o.title)}">`,
    `<meta property="og:description" content="${escAttr(preview)}">`,
    `<meta property="og:type" content="${escAttr(o.kind ?? "website")}">`,
    `<meta property="og:url" content="${escAttr(absolute(o.path))}">`,
    `<meta property="og:image" content="${escAttr(absolute(SOCIAL_CARD_PATH))}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escAttr(o.title)}">`,
    `<meta name="twitter:description" content="${escAttr(preview)}">`,
    `<meta name="twitter:image" content="${escAttr(absolute(SOCIAL_CARD_PATH))}">`,
  ].join(String.fromCharCode(10));
}

/**
 * The span of days the values on this site were read on.
 *
 * The footer says the range rather than the newest date alone: "read
 * 2026-09-08" is the flattering end of a set that starts earlier, and a reader
 * deciding whether to trust a number deserves both ends of it (footer critique,
 * 2026-09-08).
 */
export function readRange(dataset: Dataset): { oldest: string; newest: string } {
  const days: string[] = [];
  for (const country of dataset.countries)
    for (const route of country.routes)
      for (const entry of routeProvenance(route)) days.push(entry.value.retrieved_at);
  days.sort();
  return { oldest: days[0] ?? "", newest: days[days.length - 1] ?? "" };
}

/**
 * The day every watched source was last re-read — written by every run of the
 * watch, changed or not.
 *
 * The site used to say the date in the corner "moves on its own", which was
 * false: that is the newest `retrieved_at` in the dataset, and only a person
 * writes it. This is the one that moves by itself, so it is the one printed
 * beside "re-read daily".
 */
export const lastWatchRun = (): string =>
  (watchState as { last_run?: string }).last_run ?? "";
