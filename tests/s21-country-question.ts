import dataset from "permit-rulebook-data/data/dataset.json";
import { DESTINATION_FIELD, SITUATION_FIELD, remainingQuestions, type Dataset } from "permit-rulebook-data";

const ds = dataset as unknown as Dataset;

/** The country question, as the four-country path reaches it: third, after the situation. */
export const countryQuestion = () =>
  remainingQuestions(ds, { [DESTINATION_FIELD]: "all", [SITUATION_FIELD]: "research" })[0]!;
