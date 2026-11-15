import { describe, expect, it } from "vitest";
import { deliveryLane, deliveryWindow, pendingSchedules } from "@/lib/report-horizon";
import type { RecurringReport, ReportRow } from "@/lib/store";

describe("calendar report delivery windows", () => {
  it("Sunday November 15 ends this week; November 16 starts next week", () => {
    expect(deliveryWindow("2026-11-15")).toEqual({ today: "2026-11-15", start: "2026-11-09", end: "2026-11-15", nextStart: "2026-11-16", nextEnd: "2026-11-22" });
    expect(deliveryLane("2026-11-15", "2026-11-15")).toBe("week");
    expect(deliveryLane("2026-11-16", "2026-11-15")).toBe("next");
  });
  it("overdue work does not appear in this-week delivery", () => {
    expect(deliveryLane("2026-11-14", "2026-11-15")).toBe("overdue");
  });
  it("next week includes Sunday but excludes the following Monday", () => {
    expect(deliveryLane("2026-11-22", "2026-11-15")).toBe("next");
    expect(deliveryLane("2026-11-23", "2026-11-15")).toBe("later");
  });
  it("Monday and a year boundary retain Monday–Sunday windows", () => {
    expect(deliveryWindow("2026-12-28").nextStart).toBe("2027-01-04");
    expect(deliveryWindow("2026-12-28").end).toBe("2027-01-03");
  });
  it("an already generated report is not counted as another scheduled delivery", () => {
    const report: ReportRow = { id: "r1", plantId: "p1", type: "weekly", dueDate: "2026-11-16", status: "pending", docNo: "R1", period: "", byEngineerId: "e1" };
    const schedule: RecurringReport = { id: "s1", plantId: "p1", type: "weekly", nextDue: "2026-11-16", engineerId: "e1", active: true };
    expect(pendingSchedules([report], [schedule])).toEqual([]);
    expect(pendingSchedules([], [schedule])).toEqual([schedule]);
  });
  it("inactive recurring schedules never create forecast cards", () => {
    expect(pendingSchedules([], [{ id: "s1", plantId: "p1", type: "weekly", nextDue: "2026-11-16", engineerId: "e1", active: false }])).toEqual([]);
  });
});