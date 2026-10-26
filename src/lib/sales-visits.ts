import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TODAY, shiftDate } from "@/lib/store";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

export type SalesCustomerType = "new" | "existing";
export type SalesStatus = "planned" | "completed" | "followup" | "cancelled";
export type VisitWith = "solo" | "branch_sales" | "rm" | "kam" | "execution" | "cs" | "other";

export const visitWithLabel: Record<VisitWith, string> = {
  solo: "Solo",
  branch_sales: "With Branch Sales",
  rm: "With Regional Manager",
  kam: "With HO Division KAM",
  execution: "With Execution Engineer",
  cs: "With Customer Success Engineer",
  other: "Other",
};
export const salesStatusLabel: Record<SalesStatus, string> = { planned: "Planned", completed: "Completed", followup: "Follow-up Required", cancelled: "Cancelled" };

export const PURPOSES = [
  "Business Introduction", "Wireless Monitoring Discussion", "New Application Discussion", "Existing Installation Expansion",
  "Demo Discussion", "Order Discussion", "Commercial Follow-up", "Technical + Commercial Discussion", "Customer Relationship Visit",
  "Reference / Case Study Discussion", "Lead Follow-up", "Opportunity Follow-up", "Other",
];
export const OUTCOMES = [
  "No Immediate Opportunity", "Potential Identified", "Lead Identified", "Opportunity Identified", "Follow-up Required",
  "Demo Proposed", "Customer Interested", "Customer Not Interested", "Need Technical Discussion", "Need Commercial Discussion", "Other",
];
export const NEXT_STEPS = [
  "No Further Action", "Follow-up Call", "Follow-up Visit", "Send Information", "Share Proposal", "Arrange Demo",
  "Technical Discussion", "Commercial Discussion", "Create Lead", "Create Opportunity", "Update Existing Lead", "Update Existing Opportunity", "Other",
];
export const APPLICATIONS = ["ID Fan", "Boiler Feed Pump", "Cooling Tower Fan", "Compressor", "Motor", "Pump", "Gearbox"];

export interface Participant { name: string; role: string; salesEngineerId?: string }
export interface HistoryItem { at: string; by: string; text: string }

export interface SalesVisit {
  id: string; visitNo: string; visitDate: string; actualDate: string;
  customerType: SalesCustomerType; plantId: string; company: string; location: string;
  contactPerson: string; contactNumber: string; email: string;
  branchId: string; salesEngineerId: string; ownerId: string; visitWith: VisitWith; participants: Participant[];
  purpose: string; objective: string; customerMet: string; fmParticipants: string;
  summary: string; requirement: string; applications: string[]; potential: "" | "yes" | "no" | "more";
  outcome: string; nextStep: string; followupDate: string; nextOwnerId: string; nextAction: string;
  status: SalesStatus; opportunityId: string; reminderId: string; history: HistoryItem[]; createdAt: string;
}

// ---------- pure rules

/** Outcomes that show the "Potential identified — what next?" prompt. */
export const POTENTIAL_OUTCOMES = ["Potential Identified", "Lead Identified", "Opportunity Identified", "Demo Proposed", "Customer Interested"];
export const hasPotential = (v: Pick<SalesVisit, "outcome" | "potential">) => v.potential === "yes" || POTENTIAL_OUTCOMES.includes(v.outcome);

const FOLLOWUP_STEPS = ["Follow-up Call", "Follow-up Visit", "Send Information", "Share Proposal", "Arrange Demo", "Technical Discussion", "Commercial Discussion"];
/** Status after completing: Follow-up Required when the next step needs a follow-up, else Completed. */
export function statusAfterCompletion(nextStep: string, outcome: string): SalesStatus {
  return FOLLOWUP_STEPS.includes(nextStep) || outcome === "Follow-up Required" ? "followup" : "completed";
}

export type SalesFilter = "upcoming" | "completed" | "followup" | "potential" | "all";
export function matchesFilter(v: SalesVisit, f: SalesFilter): boolean {
  if (f === "all") return true;
  if (f === "upcoming") return v.status === "planned";
  if (f === "completed") return v.status === "completed" || v.status === "followup";
  if (f === "followup") return v.status === "followup";
  return v.status !== "cancelled" && v.status !== "planned" && hasPotential(v);
}

export function salesSummary(list: SalesVisit[], month = TODAY.slice(0, 7)) {
  const live = list.filter((v) => v.status !== "cancelled");
  const m = live.filter((v) => (v.actualDate || v.visitDate).slice(0, 7) === month);
  return {
    planned: live.filter((v) => v.status === "planned").length,
    completed: live.filter((v) => v.status === "completed" || v.status === "followup").length,
    followup: live.filter((v) => v.status === "followup").length,
    potential: live.filter((v) => matchesFilter(v, "potential")).length,
    month: {
      visits: m.length,
      newCustomers: m.filter((v) => v.customerType === "new").length,
      existing: m.filter((v) => v.customerType === "existing").length,
      linked: m.filter((v) => v.opportunityId).length,
    },
  };
}

export function blankSalesVisit(ownerId: string): SalesVisit {
  return {
    id: crypto.randomUUID(), visitNo: "", visitDate: shiftDate(TODAY, 1), actualDate: "", customerType: "existing", plantId: "", company: "", location: "",
    contactPerson: "", contactNumber: "", email: "", branchId: "", salesEngineerId: "", ownerId, visitWith: "solo", participants: [],
    purpose: "", objective: "", customerMet: "", fmParticipants: "", summary: "", requirement: "", applications: [], potential: "",
    outcome: "", nextStep: "", followupDate: "", nextOwnerId: ownerId, nextAction: "", status: "planned", opportunityId: "", reminderId: "",
    history: [], createdAt: new Date().toISOString(),
  };
}

// ---------- store

const toVisit = (r: any): SalesVisit => ({
  id: r.id, visitNo: r.visit_no ?? "", visitDate: r.visit_date, actualDate: r.actual_visit_date ?? "",
  customerType: r.customer_type === "new" ? "new" : "existing", plantId: r.plant_id ?? "", company: r.company_name ?? "", location: r.location ?? "",
  contactPerson: r.contact_person ?? "", contactNumber: r.contact_number ?? "", email: r.email ?? "",
  branchId: r.branch_id ?? "", salesEngineerId: r.sales_engineer_id ?? "", ownerId: r.visit_owner_id ?? "", visitWith: (r.visit_with ?? "solo") as VisitWith,
  participants: Array.isArray(r.participants) ? r.participants : [], purpose: r.purpose ?? "", objective: r.objective ?? "",
  customerMet: r.customer_met ?? "", fmParticipants: r.fm_participants ?? "", summary: r.discussion_summary ?? "", requirement: r.customer_requirement ?? "",
  applications: r.applications ?? [], potential: r.potential ?? "", outcome: r.visit_outcome ?? "", nextStep: r.next_step ?? "",
  followupDate: r.next_followup_date ?? "", nextOwnerId: r.next_step_owner_id ?? "", nextAction: r.next_action ?? "",
  status: (r.status ?? "planned") as SalesStatus, opportunityId: r.opportunity_id ?? "", reminderId: r.reminder_id ?? "",
  history: Array.isArray(r.history) ? r.history : [], createdAt: r.created_at,
});
const fromVisit = (v: SalesVisit) => ({
  id: v.id, visit_date: v.visitDate, actual_visit_date: v.actualDate || null, customer_type: v.customerType, plant_id: v.plantId,
  company_name: v.company, location: v.location, contact_person: v.contactPerson, contact_number: v.contactNumber, email: v.email,
  branch_id: v.branchId, sales_engineer_id: v.salesEngineerId, visit_owner_id: v.ownerId, visit_with: v.visitWith, participants: v.participants,
  purpose: v.purpose, objective: v.objective, customer_met: v.customerMet, fm_participants: v.fmParticipants,
  discussion_summary: v.summary, customer_requirement: v.requirement, applications: v.applications, potential: v.potential,
  visit_outcome: v.outcome, next_step: v.nextStep, next_followup_date: v.followupDate || null, next_step_owner_id: v.nextOwnerId,
  next_action: v.nextAction, status: v.status, opportunity_id: v.opportunityId || null, reminder_id: v.reminderId || null, history: v.history,
});

let list: SalesVisit[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function loadSalesVisits() {
  const { data, error } = await db.from("sales_visits").select("*").order("visit_date", { ascending: false });
  if (error) console.error("sales visits load failed", error);
  list = (data ?? []).map(toVisit);
  loaded = true;
  emit();
}

export function useSalesVisits() {
  useEffect(() => { if (!loaded) void loadSalesVisits(); }, []);
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => list, () => list);
}

/** Save with an appended history line (history is never overwritten). */
export async function saveSalesVisit(v: SalesVisit, by: string, note: string): Promise<SalesVisit> {
  const next = { ...v, history: [...v.history, { at: new Date().toISOString(), by, text: note }] };
  const { data, error } = await db.from("sales_visits").upsert(fromVisit(next)).select("*").single();
  if (error) throw new Error(error.message);
  const saved = toVisit(data);
  list = [saved, ...list.filter((x) => x.id !== saved.id)].sort((a, b) => (a.visitDate < b.visitDate ? 1 : -1));
  emit();
  return saved;
}
