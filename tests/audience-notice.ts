import type { Dataset, Notice } from "permit-rulebook-data";

/**
 * `dataset`'s notice that says who a route page is not for: an EU, EEA or
 * Swiss passport needs no permit. The object itself, so a case can bend it on
 * a copy. Throws where the dataset carries none, so no case reads a missing
 * notice as a quiet pass.
 */
export function audienceNoticeOf(dataset: Dataset): Notice {
  const notice = (dataset.notices ?? []).find((n) => n.kind === "no-permit-needed");
  if (!notice) throw new Error("the dataset carries no no-permit-needed notice");
  return notice;
}
