import { describe, expect, it } from "vitest";
import dataset from "visa-rules/data/dataset.json";
import { evaluate, type Dataset, type Profile, type Route } from "visa-rules";
import { caveatHtml, precondHtml } from "../src/lib/card.js";

const ds = dataset as unknown as Dataset;

const routeOf = (id: string): Route =>
  ds.countries.flatMap((c) => c.routes).find((r) => r.id === id)!;

/**
 * The orientation year used to test "you have no job offer yet" as a rule of
 * the route. It is not one — the Dutch immigration service's requirement list
 * says nothing about an offer (human read 2026-09-07) — and it hid the route
 * from the graduate for whom it is the way to the lower salary threshold.
 * What replaced it is prose on the card, so the card is what these read.
 */
describe("the orientation year, on the card", () => {
  const graduate: Profile = {
    destination: "nl", citizenship: "TR", situation: "offer",
    nl_recent_grad: "yes", top200_grad: "no",
  };

  it("reaches a person who has a job offer", () => {
    const result = evaluate(ds, graduate).find((r) => r.route.id === "nl-orientation-year")!;
    expect(result.status).toBe("met");
  });

  it("states the condition the interview cannot ask, under the same heading as the rest", () => {
    const html = precondHtml(routeOf("nl-orientation-year"));
    expect(html).toContain("Also required — not checked here");
    expect(html).toMatch(/not previously held an orientation year permit/i);
    // Beside the plain lines, not in a block of its own.
    expect(html).toMatch(/three years of graduating/);
    expect(html.match(/class="precond"/g)).toHaveLength(1);
  });

  it("passes on the qualification the source puts on its own answer", () => {
    const html = caveatHtml(routeOf("nl-orientation-year"));
    expect(html).toContain("The official page also says");
    expect(html).toMatch(/Turkish passport/);
    // Not invented, and not a bar the reader can fail.
    expect(html).toMatch(/does not say how/i);
    expect(html).not.toMatch(/Also required/);
  });

  it("a route that makes no such statement renders nothing at all", () => {
    expect(caveatHtml(routeOf("nl-hsm-under30"))).toBe("");
    expect(precondHtml(routeOf("de-chancenkarte"))).toBe("");
  });

  it("dataset prose reaches the page as text, never as markup", () => {
    const route: Route = {
      ...routeOf("nl-orientation-year"),
      preconditions: ["<script>alert(1)</script>"],
      statements: [{
        id: "x", kind: "caveat", text: "a & b <em>c</em>",
        source: { source_url: "https://example.org", quote: "quoted", retrieved_at: "2026-09-07" },
      }],
    };
    expect(precondHtml(route)).toContain("&lt;script&gt;");
    expect(caveatHtml(route)).toContain("a &amp; b &lt;em&gt;c&lt;/em&gt;");
  });
});
