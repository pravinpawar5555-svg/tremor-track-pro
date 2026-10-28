import { describe, expect, it } from "vitest";
import { periodFor, periodLabel, plantBilling, readiness, blankConfig, type BillingRecord } from "../billing";
import type { ReportRow } from "../store";

const rep = (id: string, due: string, status: ReportRow["status"], type: ReportRow["type"] = "monthly"): ReportRow =>
  ({ id, docNo: id, plantId: "pl-1", type, period: due.slice(0, 7), dueDate: due, status, byEngineerId: "e" });

describe("billing periods", () => {
  it("quarterly from 1 Jul gives Jul–Sep", () => {
    expect(periodFor("2026-07-01", "quarterly", "2026-08-15")).toEqual({ start: "2026-07-01", end: "2026-09-30" });
    expect(periodLabel("2026-07-01", "2026-09-30")).toBe("Jul – Sep 2026");
  });
  it("annual from 1 Apr ends 31 Mar next year; monthly is one month", () => {
    expect(periodFor("2026-04-01", "annually", "2027-01-10")).toEqual({ start: "2026-04-01", end: "2027-03-31" });
    expect(periodFor("2026-04-01", "monthly", "2026-10-05")).toEqual({ start: "2026-10-01", end: "2026-10-31" });
    expect(periodFor("2026-04-01", "half_yearly", "2026-05-01")).toEqual({ start: "2026-04-01", end: "2026-09-30" });
  });
});

describe("readiness from reports", () => {
  it("3/3 sent is Ready, 2/3 is Waiting", () => {
    expect(readiness(true, [rep("a", "2026-07-30", "sent"), rep("b", "2026-08-30", "sent"), rep("c", "2026-09-30", "sent")]).status).toBe("ready");
    const r = readiness(true, [rep("a", "2026-07-30", "sent"), rep("b", "2026-08-30", "sent"), rep("c", "2026-09-30", "pending")]);
    expect([r.sent, r.total, r.status]).toEqual([2, 3, "waiting"]);
  });
  it("no reports in period is not Ready when reports are required", () => {
    expect(readiness(true, []).status).toBe("waiting");
  });
  it("plant without rental config shows not configured, saved handoff wins over derived", () => {
    expect(plantBilling(undefined, "pl-1", [], [], "2026-08-01").status).toBeNull();
    const cfg = { ...blankConfig("pl-1"), model: "rental" as const, startDate: "2026-07-01" };
    const reports = [rep("a", "2026-07-30", "sent"), rep("x", "2026-08-02", "pending", "on-demand")];
    expect(plantBilling(cfg, "pl-1", reports, [], "2026-08-01").status).toBe("ready");
    const rec = { plantId: "pl-1", periodStart: "2026-07-01", status: "sent_to_team" } as BillingRecord;
    expect(plantBilling(cfg, "pl-1", reports, [rec], "2026-08-01").status).toBe("sent_to_team");
  });
});
