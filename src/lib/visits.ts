import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TODAY, shiftDate } from "@/lib/store";

const db = supabase as any;

export type VisitType = "amc" | "request";
export type VisitFrequency = "monthly" | "quarterly" | "half_yearly" | "yearly" | "custom" | "none";
export type StoredStatus = "planned" | "rescheduled" | "completed" | "cancelled";
export type VisitStatus = "upcoming" | "due" | "completed" | "overdue" | "rescheduled" | "cancelled";

export interface VisitAction {
  action: string;
  responsible: string;
  dueDate: string;
  status: "open" | "closed";
  remarks: string;
}

export interface Visit {
  id: string;
  plantId: string;
  engineerIds: string[];
  visitType: VisitType;
  frequency: VisitFrequency;
  customEvery: number;
  customUnit: "weeks" | "months";
  plannedDate: string;
  purpose: string;
  status: StoredStatus;
  completedDate: string | null;
  discussionPoints: string[];
  observations: string;
  actions: VisitAction[];
  nextVisitDate: string | null;
  createdBy: string;
  customerAttendees: Attendee[];
  fmAttendees: string[];
}

export interface Attendee { name: string; phone: string }

export const visitTypeLabel: Record<VisitType, string> = { amc: "AMC Planned", request: "On-Request" };
export const visitFrequencyLabel: Record<VisitFrequency, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-Yearly",
  yearly: "Yearly",
  custom: "Custom",
  none: "One-time",
};
export const visitStatusLabel: Record<VisitStatus, string> = {
  upcoming: "Upcoming",
  due: "Due",
  completed: "Completed",
  overdue: "Overdue",
  rescheduled: "Rescheduled",
  cancelled: "Cancelled",
};

export function frequencyText(v: Pick<Visit, "visitType" | "frequency" | "customEvery" | "customUnit">) {
  if (v.visitType !== "amc") return "—";
  if (v.frequency === "custom") return `Every ${v.customEvery} ${v.customUnit}`;
  return visitFrequencyLabel[v.frequency];
}

function addMonths(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1 + n, 1));
  const last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  dt.setUTCDate(Math.min(d!, last));
  return dt.toISOString().slice(0, 10);
}

/** Next AMC visit date from a completed visit date. */
export function nextVisitAfter(v: Pick<Visit, "visitType" | "frequency" | "customEvery" | "customUnit">, from: string) {
  if (v.visitType !== "amc") return null;
  const n = Math.max(1, v.customEvery || 1);
  switch (v.frequency) {
    case "monthly": return addMonths(from, 1);
    case "quarterly": return addMonths(from, 3);
    case "half_yearly": return addMonths(from, 6);
    case "yearly": return addMonths(from, 12);
    case "custom": return v.customUnit === "weeks" ? shiftDate(from, 7 * n) : addMonths(from, n);
    default: return null;
  }
}

export function visitStatus(v: Visit): VisitStatus {
  if (v.status === "completed") return "completed";
  if (v.status === "cancelled") return "cancelled";
  if (v.plannedDate < TODAY) return "overdue";
  if (v.status === "rescheduled") return "rescheduled";
  if (v.plannedDate <= shiftDate(TODAY, 7)) return "due";
  return "upcoming";
}

export const statusTone: Record<VisitStatus, string> = {
  completed: "bg-sev-low/10 text-sev-low ring-sev-low/40",
  due: "bg-sev-medium/10 text-sev-medium ring-sev-medium/40",
  upcoming: "bg-sev-medium/10 text-sev-medium ring-sev-medium/40",
  rescheduled: "bg-sev-medium/10 text-sev-medium ring-sev-medium/40",
  overdue: "bg-sev-high/10 text-sev-high ring-sev-high/40",
  cancelled: "bg-black/5 text-mute ring-line",
};

// ---- store

let visits: Visit[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const fromRow = (r: any): Visit => ({
  id: r.id,
  plantId: r.plant_id,
  engineerIds: r.engineer_ids ?? [],
  visitType: r.visit_type === "request" ? "request" : "amc",
  frequency: r.frequency ?? "none",
  customEvery: r.custom_every ?? 1,
  customUnit: r.custom_unit === "weeks" ? "weeks" : "months",
  plannedDate: r.planned_date,
  purpose: r.purpose ?? "",
  status: r.status ?? "planned",
  completedDate: r.completed_date,
  discussionPoints: r.discussion_points ?? [],
  observations: r.observations ?? "",
  actions: Array.isArray(r.actions) ? r.actions : [],
  nextVisitDate: r.next_visit_date,
  createdBy: r.created_by ?? "",
  customerAttendees: Array.isArray(r.customer_attendees) ? r.customer_attendees : [],
  fmAttendees: Array.isArray(r.fm_attendees) ? r.fm_attendees : [],
});

const toRow = (v: Visit) => ({
  id: v.id,
  plant_id: v.plantId,
  engineer_ids: v.engineerIds,
  visit_type: v.visitType,
  frequency: v.visitType === "amc" ? v.frequency : "none",
  custom_every: v.customEvery,
  custom_unit: v.customUnit,
  planned_date: v.plannedDate,
  purpose: v.purpose,
  status: v.status,
  completed_date: v.completedDate,
  discussion_points: v.discussionPoints,
  observations: v.observations,
  actions: v.actions,
  next_visit_date: v.nextVisitDate,
  created_by: v.createdBy,
  customer_attendees: v.customerAttendees,
  fm_attendees: v.fmAttendees,
});

export async function loadVisits() {
  const { data, error } = await db.from("visits").select("*").order("planned_date");
  if (error) console.error("visits load failed", error);
  visits = (data ?? []).map(fromRow);
  loaded = true;
  emit();
}

async function save(list: Visit[]) {
  const ids = new Set(list.map((v) => v.id));
  visits = [...visits.filter((v) => !ids.has(v.id)), ...list].sort((a, b) => (a.plannedDate < b.plannedDate ? -1 : 1));
  emit();
  const { error } = await db.from("visits").upsert(list.map(toRow));
  if (error) {
    console.error("visit save failed", error);
    throw error;
  }
}

export function useVisits() {
  useEffect(() => {
    if (!loaded) void loadVisits();
  }, []);
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => visits,
    () => visits,
  );
}

export function blankVisit(createdBy: string): Visit {
  return {
    id: crypto.randomUUID(),
    plantId: "",
    engineerIds: [],
    visitType: "amc",
    frequency: "quarterly",
    customEvery: 2,
    customUnit: "months",
    plannedDate: TODAY,
    purpose: "",
    status: "planned",
    completedDate: null,
    discussionPoints: [],
    observations: "",
    actions: [],
    nextVisitDate: null,
    createdBy,
    customerAttendees: [],
    fmAttendees: [],
  };
}

export function saveVisit(v: Visit) {
  return save([v]);
}

/**
 * Complete a visit. For AMC visits the next visit is created automatically
 * (at `nextDate`, which the manager may override). On-request visits never
 * touch the AMC schedule.
 */
export function completeVisit(v: Visit, summary: Pick<Visit, "completedDate" | "discussionPoints" | "observations" | "actions">, nextDate: string | null) {
  const done: Visit = { ...v, ...summary, status: "completed", nextVisitDate: v.visitType === "amc" ? nextDate : null };
  const list = [done];
  if (v.visitType === "amc" && nextDate) {
    const exists = visits.some((x) => x.plantId === v.plantId && x.visitType === "amc" && x.plannedDate === nextDate && x.status !== "cancelled");
    if (!exists) {
      list.push({
        ...blankVisit(v.createdBy),
        plantId: v.plantId,
        engineerIds: v.engineerIds,
        visitType: "amc",
        frequency: v.frequency,
        customEvery: v.customEvery,
        customUnit: v.customUnit,
        plannedDate: nextDate,
        purpose: v.purpose,
      });
    }
  }
  return save(list);
}

export function rescheduleVisit(v: Visit, date: string) {
  return save([{ ...v, plannedDate: date, status: "rescheduled" }]);
}

export function cancelVisit(v: Visit) {
  return save([{ ...v, status: "cancelled" }]);
}

export async function deleteVisit(id: string) {
  visits = visits.filter((v) => v.id !== id);
  emit();
  const { error } = await db.from("visits").delete().eq("id", id);
  if (error) console.error("visit delete failed", error);
}

export function openActions(list: Visit[]) {
  return list.flatMap((v) => v.actions.filter((a) => a.status === "open").map((a) => ({ visit: v, action: a })));
}

/** Reminders: 7 days before, 1 day before, on due date, and overdue. */
export function visitReminders(list: Visit[]) {
  const out: { visit: Visit; kind: "overdue" | "today" | "tomorrow" | "week" }[] = [];
  for (const v of list) {
    const s = visitStatus(v);
    if (s === "completed" || s === "cancelled") continue;
    if (v.plannedDate < TODAY) out.push({ visit: v, kind: "overdue" });
    else if (v.plannedDate === TODAY) out.push({ visit: v, kind: "today" });
    else if (v.plannedDate === shiftDate(TODAY, 1)) out.push({ visit: v, kind: "tomorrow" });
    else if (v.plannedDate === shiftDate(TODAY, 7)) out.push({ visit: v, kind: "week" });
  }
  return out.sort((a, b) => (a.visit.plannedDate < b.visit.plannedDate ? -1 : 1));
}
