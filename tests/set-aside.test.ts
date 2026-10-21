import { describe, expect, it } from "vitest";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { remainingQuestions, type Dataset, type Profile } from "permit-rulebook-data";
import { replayRecord } from "../src/lib/scope.js";

/**
 * #137 — a change of country names the answers it set aside.
 *
 * A reader who moves the offer country from France to Spain with the pencil
 * loses the answers only France's routes read. The replay reports them, and
 * the declared panel names them on the next screen, question or result, and
 * on no screen after it. The edit line promises only what happens.
 *
 * The walks are France records, found by running the replay on the real
 * dataset: Spain asks neither the French degree nor the innovative employer.
 */
const ds = rawDataset as unknown as Dataset;

interface Walk { answers: Profile; order: string[] }

/** France, finished; Spain sets aside the two French questions and asks one
 * of its own. */
const TO_A_QUESTION: Walk = {
  answers: {
    destination: "fr", situation: "offer", qualification: "degree", fr_degree: "yes",
    citizenship: "TR", fr_innovative_employer: "no", salary_eur_year: "band_1",
  },
  order: ["destination", "situation", "qualification", "fr_degree", "citizenship", "fr_innovative_employer", "salary_eur_year"],
};
/** France, finished; Spain sets aside the innovative employer and asks
 * nothing more. */
const TO_THE_RESULT: Walk = {
  answers: {
    destination: "fr", situation: "offer", qualification: "vocational", experience_7y: "3to5",
    fr_innovative_employer: "yes", citizenship: "TR", salary_eur_year: "band_3",
  },
  order: ["destination", "situation", "qualification", "experience_7y", "fr_innovative_employer", "citizenship", "salary_eur_year"],
};
/** France with no situation to score; Spain reads both answers. */
const NOTHING_SET_ASIDE: Walk = {
  answers: { destination: "fr", situation: "none" },
  order: ["destination", "situation"],
};

describe("the replay reports what it set aside", () => {
  it("France → Spain: the answers only France reads, in asked order, and none it kept", () => {
    const { answers, order } = TO_A_QUESTION;
    const replayed = replayRecord(ds, { ...answers, destination: "es" }, order);
    expect(replayed.setAside).toEqual(["fr_degree", "fr_innovative_employer"]);
    expect(replayed.setAside.filter((f) => replayed.order.includes(f))).toEqual([]);
  });

  it("a change the new scope reads all of sets nothing aside", () => {
    const { answers, order } = NOTHING_SET_ASIDE;
    expect(replayRecord(ds, { ...answers, destination: "es" }, order).setAside).toEqual([]);
  });

  it("the walks are what their names say", () => {
    const after = (w: Walk) => replayRecord(ds, { ...w.answers, destination: "es" }, w.order).answers;
    for (const w of [TO_A_QUESTION, TO_THE_RESULT, NOTHING_SET_ASIDE])
      expect(remainingQuestions(ds, w.answers), "the France record is not finished").toEqual([]);
    expect(remainingQuestions(ds, after(TO_A_QUESTION)).map((q) => q.field)).toEqual(["qualification_recent"]);
    expect(remainingQuestions(ds, after(TO_THE_RESULT))).toEqual([]);
    expect(remainingQuestions(ds, after(NOTHING_SET_ASIDE))).toEqual([]);
  });
});
