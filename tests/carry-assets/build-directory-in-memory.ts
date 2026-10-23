import type { BuildDirectory } from "../../scripts/carry-assets/carry.mjs";

/**
 * The build directory in memory, for the carry's flow: what this build has in
 * `_astro/`, what the flow writes there and beside the page, with no disk
 * anywhere. Each operation the flow calls is one a case can make refuse, the
 * way a `dist/` it cannot write into refuses.
 */

/** A port operation a case can make throw. */
type Operation = "builtAssets" | "writeCarriedAsset" | "writeDigestList";

export type BuildInMemory = BuildDirectory & {
  /** What `_astro/` holds, by name: this build's own assets and what was carried. */
  assets: Map<string, Buffer>;
  /** The files written beside the page, by name: the digest list. */
  besidePage: Map<string, string>;
  /** The names in `_astro/`, sorted. */
  assetNames: () => string[];
};

/**
 * A build that already holds `have` in `_astro/`. Every operation named in
 * `refusing` throws, as the filesystem does under a path it cannot use.
 */
export function buildDirectoryInMemory(
  have: Record<string, Buffer> = {},
  { refusing = [] }: { refusing?: Operation[] } = {},
): BuildInMemory {
  const assets = new Map(Object.entries(have));
  const besidePage = new Map<string, string>();
  const throwIfRefused = (operation: Operation): void => {
    if (refusing.includes(operation)) throw new Error(`ENOTDIR: not a directory, ${operation}`);
  };
  return {
    assets,
    besidePage,
    assetNames: () => [...assets.keys()].sort(),
    builtAssets: () => {
      throwIfRefused("builtAssets");
      return [...assets].map(([name, bytes]) => ({ name, bytes }));
    },
    isBuilt: (name: string) => assets.has(name),
    writeCarriedAsset: (name: string, bytes: Buffer) => {
      throwIfRefused("writeCarriedAsset");
      assets.set(name, bytes);
    },
    writeDigestList: (name: string, text: string) => {
      throwIfRefused("writeDigestList");
      besidePage.set(name, text);
    },
  };
}
