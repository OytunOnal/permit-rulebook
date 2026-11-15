// @level main
/**
 * `npm run assets` and `npm run assets:check`: imports the dataset, the
 * watch's state, the product's words and the social card's layout, reckons the
 * dataset's facts, builds the card's facts from them (and,
 * to render, its HTML in the palette `render-assets.mjs` reads from
 * `tokens.css`), hands them to `render-assets.mjs`, prints the report
 * `cli-render-assets.mjs` makes of what it did, and exits with its code. It
 * reads no file itself.
 */
import dataset from "permit-rulebook-data/data/dataset.json" with { type: "json" };
import watchState from "permit-rulebook-data/watch/state.json" with { type: "json" };
// The product's own words, the card's own layout and the dataset's reckoned
// facts, imported rather than retyped. Node strips the types; the specifiers
// are `.ts` because Node resolves a `.js` specifier literally and there is no
// build step here.
import { PRODUCT_NAME, TAGLINE, routesCheckerAsksAbout } from "../src/lib/copy/frame.ts";
import { reckonDatasetFacts } from "../src/lib/dataset-facts/reckon-dataset-facts.ts";
import { socialCardFacts, socialCardHtml } from "../src/lib/social-card.ts";
import { assetsAskedBy, checkReportOf, renderReportOf } from "./cli-render-assets.mjs";
import { printReport } from "./print-report.mjs";
import { checkAssets, readTokensStylesheet, renderAssets } from "./render-assets.mjs";

const asked = assetsAskedBy(process.argv.slice(2));
const facts = socialCardFacts(dataset, reckonDatasetFacts(dataset, watchState), {
  product: PRODUCT_NAME, tagline: TAGLINE, routesLineOf: routesCheckerAsksAbout,
});

const report = asked.isCheck
  ? checkReportOf(checkAssets(facts), facts)
  : renderReportOf(renderAssets({ facts, cardHtml: socialCardHtml(facts, readTokensStylesheet()), outDir: asked.outDir }), facts);
printReport(report);
process.exit(report.exitCode);
