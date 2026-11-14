// @level presentation
import { fieldOptions, type Dataset, type FieldOption } from "permit-rulebook-data";
import type { AnswerRef } from "../reckon/reckon-verdict.js";

/** An answer as a sentence reads it: its `short` noun phrase ("a job offer"),
 * or its label where the dataset gives it none. */
export const phraseOfAnswer = (option: FieldOption): string => option.short ?? option.label;

/** An answer the layout names by its field and value, as a sentence reads
 * it; one the dataset does not offer is refused. */
export function phraseOfAnswerRef(ds: Dataset, ref: AnswerRef): string {
  const option = fieldOptions(ds, ref.field).find((o) => o.value === ref.value);
  if (!option) throw new Error(`${ref.field} offers no answer ${ref.value}`);
  return phraseOfAnswer(option);
}
