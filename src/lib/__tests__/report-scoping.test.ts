import { describe, expect, it, vi } from "vitest";

// The store module talks to the cloud on import; the counting rules under test are pure.
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import {
  TODAY,
  engineerSummary,
  reportKpis,
  scopedRecurring,
  scopedReports,
  shiftDate,
  type AppData,
  type Frequency,
  type Plant,
  type RecurringReport,
  type ReportRow,
} from "@/lib/store";

const MANAGER = "mgr-1";
const ISHA = "eng-isha";
const LAXMI = "eng-laxmi";

const plant = (id: string, frequencies: Frequency[], engineerId: string): Plant =>
  ({ id, name: id, customer: "", location: "", machines: 0, assets: 0, node6: 0, nodeX: 0, vibassist: 0,
     frequencies, contact: "", contactPhone: "", engineerId, category: "order" }) as Plant;

let n = 0;
const report = (plantId: string, type: Frequency, by: string, dueOffset: number, status: ReportRow["status"] = "pending"): ReportRow => ({
  id: `rp-${++n}`, docNo: `D-${n}`, plantId, type, period: "", dueDate: shiftDate(TODAY, dueOffset),
  status, sentDate: status === "sent" ? TODAY : undefined, byEngineerId: by,
});
const sched = (plantId: string, type: RecurringReport["type"], engineerId: string): RecurringReport => ({
  id: `rr-${++n}`, plantId, type, nextDue: shiftDate(TODAY, 10), engineerId, active: true,
});

/**
 * Mirrors the real situation: Isha has old weekly/monthly reports for plants
 * whose cycle was later reduced, and those must never count as overdue.
 */
function fixture(role: AppData["role"], currentUserId: string): AppData {
  const plants = [
    plant("p-weekly-isha", ["weekly", "monthly"], ISHA),
    plant("p-monthly-only", ["monthly"], ISHA), // weekly switched off
    plant("p-ondemand-only", ["on-demand"], ISHA), // monthly switched off
    plant("p-laxmi", ["monthly"], LAXMI),
  ];
  const reports = [
    report("p-weekly-isha", "weekly", ISHA, -3), // real overdue (Isha)
    report("p-weekly-isha", "weekly", ISHA, 3), // due this week (Isha)
    report("p-monthly-only", "weekly", ISHA, -10), // orphan — weekly disabled
    report("p-ondemand-only", "monthly", ISHA, -8), // orphan — monthly disabled
    report("p-ondemand-only", "monthly", ISHA, -40, "sent"), // sent history stays
    report("p-laxmi", "monthly", LAXMI, -2), // real overdue (Laxmi)
    report("p-laxmi", "monthly", LAXMI, -1, "prepared"), // prepared but not sent = overdue
  ];
  const recurring = [
    sched("p-weekly-isha", "weekly", ISHA),
    sched("p-monthly-only", "monthly", ISHA),
    sched("p-laxmi", "monthly", LAXMI),
  ];
  return {
    engineers: [], plants, updates: [], reports, tickets: [], messages: [], tasks: [], recurring, profiles: [],
    currentUserId, role,
  } as AppData;
}

const manager = () => fixture("manager", MANAGER);
const isha = () => fixture("engineer", ISHA);
const laxmi = () => fixture("engineer", LAXMI);

// Top-bar pill and Report Register both count through scopedReports + reportKpis.
const overdueCount = (d: AppData) => reportKpis({ ...d, reports: scopedReports(d) }).overdue;
const registerOverdue = (d: AppData) => scopedReports(d).filter((r) => r.status !== "sent" && r.dueDate < TODAY).length;

describe("overdue reports — top bar vs Report Register", () => {
  it("manager sees the whole team, excluding switched-off cycles", () => {
    expect(overdueCount(manager())).toBe(3);
    expect(registerOverdue(manager())).toBe(3);
  });

  it("customer success engineer sees only her own overdue reports", () => {
    expect(overdueCount(isha())).toBe(1);
    expect(registerOverdue(isha())).toBe(1);
    expect(overdueCount(laxmi())).toBe(2);
    expect(registerOverdue(laxmi())).toBe(2);
  });

  it("top bar and register always agree for every login", () => {
    for (const d of [manager(), isha(), laxmi()]) expect(overdueCount(d)).toBe(registerOverdue(d));
  });

  it("engineer never receives another engineer's reports", () => {
    expect(scopedReports(isha()).every((r) => r.byEngineerId === ISHA)).toBe(true);
    expect(scopedReports(laxmi()).every((r) => r.byEngineerId === LAXMI)).toBe(true);
  });

  it("orphan reports for a switched-off cycle are hidden, sent history is kept", () => {
    const ids = scopedReports(isha()).map((r) => r.plantId + ":" + r.type + ":" + r.status);
    expect(ids).not.toContain("p-monthly-only:weekly:pending");
    expect(ids).not.toContain("p-ondemand-only:monthly:pending");
    expect(ids).toContain("p-ondemand-only:monthly:sent");
  });
});

describe("Dashboard counts", () => {
  it("manager per-engineer overdue figures add up to the team total", () => {
    const d = manager();
    const sum = engineerSummary(d, ISHA).reportsOverdue + engineerSummary(d, LAXMI).reportsOverdue;
    expect(engineerSummary(d, ISHA).reportsOverdue).toBe(1);
    expect(engineerSummary(d, LAXMI).reportsOverdue).toBe(2);
    expect(sum).toBe(overdueCount(d));
  });

  it("engineer 'Reports due' card counts only her own unsent, in-cycle reports due within 7 days", () => {
    const d = isha();
    const due = scopedReports(d).filter((r) => r.byEngineerId === ISHA && r.status !== "sent" && r.dueDate <= shiftDate(TODAY, 7));
    expect(due.length).toBe(2);
  });

  it("reportKpis ignores orphan reports even when given unscoped data", () => {
    expect(reportKpis(manager()).overdue).toBe(3);
  });
});

describe("Recurring Settings", () => {
  it("manager sees every schedule", () => {
    expect(scopedRecurring(manager())).toHaveLength(3);
  });

  it("customer success engineer sees only her own schedules", () => {
    expect(scopedRecurring(isha())).toHaveLength(2);
    expect(scopedRecurring(laxmi())).toHaveLength(1);
    expect(scopedRecurring(isha()).every((r) => r.engineerId === ISHA)).toBe(true);
  });
});
