import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** CRLF is a checkout detail on Windows, not a fact about the file. */
export const readText = (path: string): string => readFileSync(path, "utf8").split("\r\n").join("\n");

/** The workflows, read as text by the tests that hold their decisions. */
const workflowsDir = fileURLToPath(new URL("../.github/workflows/", import.meta.url));

/** Every workflow file in that folder, as a full path. */
export const workflowPaths: string[] = readdirSync(workflowsDir)
  .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
  .map((f) => join(workflowsDir, f));

/** The Pages workflow's text. */
export const pagesYaml = readText(join(workflowsDir, "pages.yml"));

/** A job's header: its name at two spaces' indent, alone on its line. */
const JOB_HEADER = /^ {2}([a-z][a-z0-9-]*):\n/gm;

/** Each job's header, in the order the file declares them. The keys under `on:` are triggers, not jobs. */
const jobHeadersOf = (yaml: string): { jobs: string; headers: RegExpMatchArray[] } => {
  const jobs = yaml.slice(yaml.indexOf("jobs:"));
  return { jobs, headers: [...jobs.matchAll(JOB_HEADER)] };
};

/** Every job's name, in the order the file declares them. */
export const jobNamesOf = (yaml: string): string[] => jobHeadersOf(yaml).headers.map((m) => m[1]!);

/** One job's text: from its name to the next job's; "" if absent. */
export const jobOf = (yaml: string, name: string): string => {
  const { jobs, headers } = jobHeadersOf(yaml);
  const at = headers.findIndex((m) => m[1] === name);
  if (at < 0) return "";
  return jobs.slice(headers[at]!.index, headers[at + 1]?.index);
};
