// @level presentation
import type { FieldOption } from "permit-rulebook-data";

/** An answer as a sentence reads it: its `short` noun phrase ("a job offer"),
 * or its label where the dataset gives it none. */
export const phraseOfAnswer = (option: FieldOption): string => option.short ?? option.label;
