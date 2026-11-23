// @level main
/**
 * `npm run traffic-counter:refresh`: refreshes the copy of Cloudflare's
 * traffic counter with `refresh-traffic-counter-copy.mjs`, dated today, prints
 * the report `cli-refresh-traffic-counter-copy.mjs` makes of it, and exits
 * with its code.
 */
import { reportTheRefresh } from "./cli-refresh-traffic-counter-copy.mjs";
import { printReport } from "./print-report.mjs";
import { refreshTrafficCounterCopy } from "./refresh-traffic-counter-copy.mjs";

const today = new Date().toISOString().slice(0, 10);
const report = reportTheRefresh(await refreshTrafficCounterCopy(today), today);
printReport(report);
process.exit(report.exitCode);
