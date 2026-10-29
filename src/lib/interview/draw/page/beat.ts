// @level presentation
/**
 * The beat (#86; GLOSSARY: Beat): a question card a gesture draws fades in,
 * and for the beat nothing on it commits an answer.
 *
 * Every question's options sit in the same spot, so a reflex second click or
 * Enter would land on a question nobody has read. The guard is time, not
 * motion: it holds the same under reduced motion, where the fade is off. The
 * card's one door for a commit asks `inside()`, so a click on an option or a
 * row, Enter on a focused option and the search's Enter are refused alike.
 */

export interface Beat {
  /** Starts the beat on the card just drawn. */
  begin(): void;
  /** Whether the beat is running. */
  inside(): boolean;
}

/**
 * The beat's length, the token `--motion-beat` (`tokens.css` says why either
 * unit is read). A token that is not a positive duration is logged and runs
 * no beat, never a beat that refuses every click.
 */
function beatMsOf(token: string): number {
  const duration = /^(\d*\.?\d+)(ms|s)$/.exec(token);
  const ms = duration ? Number(duration[1]) * (duration[2] === "ms" ? 1 : 1000) : NaN;
  if (Number.isFinite(ms) && ms > 0) return ms;
  console.error(`--motion-beat is not a positive duration (${JSON.stringify(token)}): the interview runs without a beat`);
  return 0;
}

/** The beat of the cards drawn into `main`. */
export function beatOf(main: HTMLElement): Beat {
  const ms = beatMsOf(getComputedStyle(document.documentElement).getPropertyValue("--motion-beat").trim());
  let endsAt = 0;
  return {
    inside: () => performance.now() < endsAt,
    begin: () => {
      if (ms === 0) return;
      endsAt = performance.now() + ms;
      // The fade starts again even where the box kept the nodes it had.
      delete main.dataset.beat;
      void main.offsetWidth;
      main.dataset.beat = "";
    },
  };
}
