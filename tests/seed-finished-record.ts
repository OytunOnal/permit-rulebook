import { RECORD_VERSION } from "../src/lib/record.js";

// A finished interview's record, so the interview opens on the results, where the stamp reads "Record generated".
export const SEED_FINISHED_RECORD =
  'localStorage.setItem("permit-rulebook.record.v1", ' + JSON.stringify(JSON.stringify({
    version: RECORD_VERSION,
    answers: {
      destination: "nl", citizenship: "TR", situation: "ict", salary_eur_month: "band_6",
      nl_recent_grad: "no", top200_grad: "no", age_band: "a30to35",
    },
    history: ["destination", "citizenship", "situation", "salary_eur_month", "nl_recent_grad", "top200_grad", "age_band"],
  })) + ")";
