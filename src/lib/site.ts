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

const configured = (import.meta as { env?: Record<string, string | undefined> }).env?.SITE;

export const SITE_URL: string = (configured ?? DEFAULT_SITE_URL).replace(/\/+$/, "");

/** An absolute URL for a site-root path, for the meta a link preview reads. */
export const absolute = (path: string): string => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

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
