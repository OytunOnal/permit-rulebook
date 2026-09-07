/**
 * Vite serves any file with `?raw` as its own text. `tokens.css` is imported
 * that way so the route page inlines the token set rather than a retyped copy
 * of it (Standards review, 2026-09-07).
 */
declare module "*.css?raw" {
  const contents: string;
  export default contents;
}
