import { describe, expect, it } from "vitest";
import { dayKind, execOnSite, execScope, navAllowed, NAV_PATHS } from "@/lib/access";
import type { ExecJob, ExecSiteVisit } from "@/lib/execution";

const TODAY = "2026-10-21";
const E1 = "ex-abhishek", E2 = "ex-two";
const job = (id: string, status: ExecJob["status"], a: string, extra: Partial<ExecJob> = {}) =>
  ({ id, status, assignedEngineerId: a, secondaryEngineerId: "", plannedStart: null, plannedEnd: null, actualStart: null, actualEnd: null, expectedDate: null, removalPlanned: null, removalCompleted: null, ...extra }) as ExecJob;
const visit = (id: string, date: string, ids: string[]) => ({ id, visitDate: date, engineerIds: ids }) as ExecSiteVisit;

const jobs = [
  job("j1", "lead", E1), job("j2", "planning", E2), job("j3", "scheduled", E1, { plannedStart: "2026-10-22", plannedEnd: "2026-10-23" }),
  job("j4", "lead", E2, { secondaryEngineerId: E1 }), job("j5", "completed", E2),
  job("j6", "completed", E1, { removalPlanned: "2026-10-30" }), job("j7", "cancelled", E1, { plannedStart: "2026-10-27" }),
];
const visits = [visit("v1", TODAY, [E1]), visit("v2", "2026-10-05", [E1, E2]), visit("v3", "2026-09-30", [E1]), visit("v4", TODAY, [E2])];

const tabs = (m: boolean, d: Parameters<typeof navAllowed>[1]) => NAV_PATHS.filter((p) => navAllowed(m, d, p));

describe("tab access per login", () => {
  it("manager sees every tab", () => expect(tabs(true, "manager")).toEqual([...NAV_PATHS]));
  it("customer success engineer never sees Execution, Engineers or Settings", () =>
    expect(tabs(false, "customer_success")).toEqual(["/", "/tasks", "/discussions", "/visits", "/opportunities", "/reports", "/plants"]));
  it("execution engineer never sees Visits, Reports, Engineers or Settings", () =>
    expect(tabs(false, "execution")).toEqual(["/", "/tasks", "/discussions", "/execution", "/opportunities", "/plants"]));
});

describe("Execution visit and lead counts", () => {
  it("manager counts the whole team", () => {
    const s = execScope(jobs, visits, null, TODAY);
    expect(s.visible).toHaveLength(7);
    expect(s.leadCount).toBe(3);
    expect(s.visitsMonth).toBe(3);
  });
  it("execution engineer counts only own jobs (incl. as secondary) and own visits", () => {
    const s = execScope(jobs, visits, E1, TODAY);
    expect(s.visible.map((j) => j.id)).toEqual(["j1", "j3", "j4", "j6", "j7"]);
    expect(s.leadCount).toBe(2);
    expect(s.visitsMonth).toBe(2);
  });
  it("second execution engineer never sees the first one's solo work", () => {
    const s = execScope(jobs, visits, E2, TODAY);
    expect(s.visible.map((j) => j.id)).toEqual(["j2", "j4", "j5"]);
    expect(s.myVisits.map((v) => v.id)).toEqual(["v2", "v4"]);
  });
});

describe("Workload integration", () => {
  it("a non-job site visit makes the day a Site day", () => expect(execOnSite(jobs, visits, E1, TODAY).site).toBe(true));
  it("scheduled job dates are Site days", () => expect(execOnSite(jobs, visits, E1, "2026-10-23").job?.id).toBe("j3"));
  it("demo removal date counts as a Site day", () => expect(execOnSite(jobs, visits, E1, "2026-10-30").job?.id).toBe("j6"));
  it("cancelled jobs never create Site days", () => expect(execOnSite(jobs, visits, E1, "2026-10-27").site).toBe(false));
  it("another engineer's visit does not count for me", () => expect(execOnSite(jobs, [visit("x", "2026-10-28", [E2])], E1, "2026-10-28").site).toBe(false));
  it("day types: leave wins, weekend site = Holiday work, weekend idle = Off, weekday = Site/Office", () => {
    expect(dayKind(true, false, true, true)).toBe("leave");
    expect(dayKind(false, true, true, false)).toBe("weekend");
    expect(dayKind(false, true, false, false)).toBe("off");
    expect(dayKind(false, false, true, false)).toBe("site");
    expect(dayKind(false, false, false, false)).toBe("office");
  });
});
