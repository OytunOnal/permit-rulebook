import { describe, expect, it } from "vitest";
import { url } from "../src/lib/site.js";
import { marksOn, situationScreen, unscoredOf } from "./situation-marks.js";

/**
 * The guard ruling 19 changed the mark's shape under: the not-checked mark's
 * markup as question 2 draws it, whole, and the written state's door to the
 * same page. It sat in s19 and has its own file since ruling 21, under the
 * same name.
 */
describe("s19 — the interview knows which situations a destination's scored routes ask", () => {
  it("the mark's markup on question 2, whole, and the written state's door to the same page (guard, ruling 19)", () => {
    expect(marksOn(situationScreen("fr")).research).toBe(
      "Not checked for France yet — Talent — researcher (chercheur) is quoted, not checked: "
      + `<a href="${url("/france/talent-researcher")}">read it here</a>.`,
    );
    expect(unscoredOf({ destination: "fr", situation: "research" })?.door?.href).toBe(url("/france/talent-researcher"));
  });
});
