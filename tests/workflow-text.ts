import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** CRLF is a checkout detail on Windows, not a fact about the file. */
export const readText = (path: string): string => readFileSync(path, "utf8").split("\r\n").join("\n");

/** The workflows, read as text by the tests that hold their decisions. */
export const workflowsDir = fileURLToPath(new URL("../.github/workflows/", import.meta.url));

/** Every workflow file's name in that folder. */
export const workflowFiles: string[] = readdirSync(workflowsDir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));

/** The Pages workflow's text. */
export const pagesYaml = readText(join(workflowsDir, "pages.yml"));

/** Every job's name, in the order the file declares them. The keys under `on:` are triggers, not jobs. */
export const jobNamesOf = (yaml: string): string[] =>
  [...yaml.slice(yaml.indexOf("jobs:")).matchAll(/^ {2}([a-z][a-z0-9-]*):\n/gm)].map((m) => m[1]!);

/** One job's text: from its name to the next job at the same indent; "" if absent. */
export const jobOf = (yaml: string, name: string): string => {
  const jobs = yaml.slice(yaml.indexOf("jobs:"));
  const start = jobs.indexOf(`\n  ${name}:\n`);
  if (start < 0) return "";
  const rest = jobs.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[a-z][a-z0-9-]*:\n/);
  return next < 0 ? rest : rest.slice(0, next + 1);
};
