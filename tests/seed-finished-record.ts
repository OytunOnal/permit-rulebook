import { recordSeedScript } from "./browser-walk.js";

// A finished interview's record, so the interview opens on the results, where the stamp reads "Record generated".
export const SEED_FINISHED_RECORD = recordSeedScript({
  destination: "nl", citizenship: "TR", situation: "ict", salary_eur_month: "band_6",
  nl_recent_grad: "no", top200_grad: "no", age_band: "a30to35",
});
