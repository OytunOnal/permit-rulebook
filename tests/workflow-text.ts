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

/** A key's value on its own line in a job's text, at the job's own indent; "" if absent. */
export const jobKeyValueOf = (job: string, key: string): string =>
  new RegExp(`^ {4}${key}:\\s*(.+)$`, "m").exec(job)?.[1]?.trim() ?? "";

/** One job's text: from its name to the next job's; "" if absent. */
export const jobOf = (yaml: string, name: string): string => {
  const { jobs, headers } = jobHeadersOf(yaml);
  const at = headers.findIndex((m) => m[1] === name);
  if (at < 0) return "";
  return jobs.slice(headers[at]!.index, headers[at + 1]?.index);
};

/** Whether a line is YAML that counts: not blank, not a comment. */
const isContentLine = (line: string): boolean => line.trim() !== "" && !line.trimStart().startsWith("#");

/** A key's block: its own line at `indent` spaces and every line under it, up to the next content line at that indent or less; [] if absent. */
const blockLinesOf = (text: string, indent: number, key: string): string[] => {
  const lines = text.split("\n");
  const at = lines.findIndex((line) => line.startsWith(`${" ".repeat(indent)}${key}:`));
  if (at < 0) return [];
  const isPastBlock = (line: string, i: number): boolean =>
    i > at && isContentLine(line) && line.length - line.trimStart().length <= indent;
  const end = lines.findIndex(isPastBlock);
  return lines.slice(at, end < 0 ? undefined : end);
};

/** A key's value at `indent` spaces: its line's, or a `|` block's lines joined by spaces, with a `${{ }}` around the whole taken off; "" if absent. */
const expressionAt = (text: string, indent: number, key: string): string => {
  const [keyLine, ...under] = blockLinesOf(text, indent, key);
  if (keyLine === undefined) return "";
  const inline = keyLine.slice(indent + key.length + 1).trim();
  const parts = /^[|>][-+]?$/.test(inline) ? under.filter(isContentLine).map((line) => line.trim()) : [inline];
  return parts.join(" ").replace(/^\$\{\{\s*(.*?)\s*\}\}$/, "$1");
};

/** A job's `if:`, as one line with no `${{ }}` around it; "" when the job has none. */
export const jobConditionOf = (job: string): string => expressionAt(job, 4, "if");

/** Each step of a job, as its text from after its `- `. */
export const stepsOf = (job: string): string[] => job.split(/^ {6}- /m).slice(1);

/** A step's `if:` on a line of its own, as one line with no `${{ }}` around it; "" when the step has none. */
export const stepConditionOf = (step: string): string => expressionAt(step, 8, "if");

/** The scopes a job's `permissions:` block grants, each as `scope: level`; [] when it has no such block. */
export const jobPermissionsOf = (job: string): string[] =>
  blockLinesOf(job, 4, "permissions").slice(1).filter(isContentLine).map((line) => line.trim());

/** A trigger's `paths:` list under `on:`, each entry without its quotes, in the file's order; [] when it has none. */
export const triggerPathsOf = (yaml: string, trigger: string): string[] => {
  const triggers = blockLinesOf(yaml, 0, "on").join("\n");
  const triggerBlock = blockLinesOf(triggers, 2, trigger).join("\n");
  return blockLinesOf(triggerBlock, 4, "paths").slice(1).filter(isContentLine)
    .map((line) => line.trim().replace(/^- "?(.*?)"?$/, "$1"));
};

/** The workflow's own `concurrency:`: its group and whether it cancels a run in progress, each with no `${{ }}` around it. */
export const concurrencyOf = (yaml: string): { group: string; cancelInProgress: string } => {
  const block = blockLinesOf(yaml, 0, "concurrency").join("\n");
  return { group: expressionAt(block, 2, "group"), cancelInProgress: expressionAt(block, 2, "cancel-in-progress") };
};
