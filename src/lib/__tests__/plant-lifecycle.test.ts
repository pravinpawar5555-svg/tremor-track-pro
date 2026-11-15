import { describe, expect, it } from "vitest";
import { lifecycleChange, plantStatus } from "@/lib/plant-lifecycle";
describe("demo plant lifecycle", () => {
  it("existing plants remain active", () => { expect(plantStatus({})).toBe("active"); });
  it("removed demo goes to follow-up with its actual removal date", () => {
    expect(lifecycleChange("removed", "2026-11-15", "Collected", "2026-11-20")).toEqual({ operational_status: "sales_followup", demo_removed_date: "2026-11-15", sales_followup_date: "2026-11-20", lifecycle_note: "Collected" });
  });
  it("confirmed order returns immediately to active as Order", () => {
    expect(lifecycleChange("won", "", "PO received", "2026-11-20")).toEqual({ operational_status: "active", category: "order", sales_followup_date: null, lifecycle_note: "PO received" });
  });
  it("lost order leaves follow-up and requires a reason", () => {
    expect(() => lifecycleChange("lost", "", "", "")).toThrow("Lost-order reason is required");
    expect(lifecycleChange("lost", "", "No budget", "2026-11-20").operational_status).toBe("closed_lost");
    expect(lifecycleChange("lost", "", "No budget", "2026-11-20").sales_followup_date).toBeNull();
  });
  it("removal needs an actual date", () => { expect(() => lifecycleChange("removed", "", "", "")).toThrow(); });
  it("reopening a lost prospect returns to follow-up, not active monitoring", () => { expect(lifecycleChange("reopen", "", "New enquiry", "").operational_status).toBe("sales_followup"); });
});