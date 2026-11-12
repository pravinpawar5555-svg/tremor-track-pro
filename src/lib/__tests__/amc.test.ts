import { describe, expect, it } from "vitest";
import { amcStatus, plantAmcStatus, demoFollowUp } from "../amc";

describe("AMC 60-day renewal countdown", () => {
  it("no end date → none", () => expect(amcStatus(null, "2026-10-22").state).toBe("none"));
  it("exactly 60 days left → renewal", () => expect(amcStatus("2026-12-21", "2026-10-22")).toEqual({ state: "renewal", days: 60 }));
  it("61 days left → active", () => expect(amcStatus("2026-12-22", "2026-10-22").state).toBe("active"));
  it("ends today → renewal with 0 days", () => expect(amcStatus("2026-10-22", "2026-10-22")).toEqual({ state: "renewal", days: 0 }));
  it("past end → expired", () => expect(amcStatus("2026-10-20", "2026-10-22")).toEqual({ state: "expired", days: -2 }));
});

describe("Demo dates are not AMC dates", () => {
  it("excludes a demo ending in 49 days from AMC renewals", () => {
    expect(plantAmcStatus({ category: "demo", amcEnd: "2026-12-31" }, "2026-11-12")).toEqual({ state: "none", days: null });
  });
  it("excludes expired demos from expired AMC counts", () => {
    expect(plantAmcStatus({ category: "demo", amcEnd: "2026-11-10" }, "2026-11-12").state).toBe("none");
  });
  it("preserves the 60-day AMC rule for order plants", () => {
    expect(plantAmcStatus({ category: "order", amcEnd: "2026-12-31" }, "2026-11-12")).toEqual({ state: "renewal", days: 49 });
  });
  it("uses the demo end date for its linked follow-up", () => {
    expect(demoFollowUp({ id: "demo-1", name: "BMM ISPAT", category: "demo", amcEnd: "2026-12-31" })).toMatchObject({ plantId: "demo-1", date: "2026-12-31" });
  });
  it("does not create a demo follow-up for an order plant", () => {
    expect(demoFollowUp({ id: "order-1", name: "Plant", category: "order", amcEnd: "2026-12-31" })).toBeNull();
  });
  it("requires an end date for a demo follow-up", () => {
    expect(demoFollowUp({ id: "demo-1", name: "Plant", category: "demo" })).toBeNull();
  });
});
