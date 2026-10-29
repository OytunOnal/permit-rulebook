// @level presentation
import type { Dataset, Profile } from "permit-rulebook-data";
import type { Glossary } from "../../../../gloss.js";

/**
 * The screen a card's blocks are drawn on, which every block takes whole: the
 * dataset, the reader's answers, and the screen's memory of what it has
 * already explained. A block drawn without a memory is a screen of its own.
 */
export interface CardScreen {
  ds: Dataset;
  answers: Profile;
  glossary?: Glossary;
}
