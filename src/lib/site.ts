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
export const url = (path: string, base: string = BASE): string =>
  `${base.replace(/[/]+$/, "")}/${String(path).replace(/^[/]+/, "")}`;

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
