// @level infrastructure
/**
 * The site's own checkout: the folder holding this code's `package.json`. It
 * reads and writes nothing.
 */
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** Found from this file's own place, never the working folder, so a run started from any folder names the same site. */
export const siteRoot = dirname(fileURLToPath(new URL("../../../package.json", import.meta.url)));
