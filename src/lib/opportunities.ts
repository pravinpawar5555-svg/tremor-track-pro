import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

export const leadSources = [
  "Branch Sales", "Marketing", "Customer Success", "Execution Team", "Service / Other Division",
  "Existing Customer Expansion", "Referral", "Inbound Enquiry", "HO / KAM", "Other",
];
export const oppTypes = ["Demo", "Order", "Troubleshooting", "Expansion", "Replacement / Upgrade", "Technical Evaluation", "Other"];
export const lostReasons = ["Price", "Competitor", "Customer Budget", "Requirement Changed", "Project Postponed", "Technical Fit", "No Response", "Other"];

export const stages = {
  new: "New Lead",
  contacted: "Contacted",
  qualified: "Qualified",
  demo_planned: "Demo Planned",
  demo_progress: "Demo In Progress",
  demo_completed: "Demo Completed",
  proposal: "Proposal / Commercial",
  order_won: "Order Won",
  handed_exec: "Handed to Execution",
  exec_progress: "Execution In Progress",
  exec_completed: "Execution Completed",
  cs_handover: "Customer Success Handover",
  cs_active: "Customer Success Active",
  on_hold: "On Hold",
  lost: "Lost",
  not_qualified: "Not Qualified",
} as const;
export type Stage = keyof typeof stages;
export const closedStages: Stage[] = ["lost", "not_qualified", "cs_active"];
export const isOpen = (o: Opp) => !closedStages.includes(o.stage) && !o.archived;

/** Pipeline board columns. */
export const pipelineCols: { id: string; label: string; stages: Stage[] }[] = [
  { id: "new", label: "New / Contacted", stages: ["new", "contacted"] },
  { id: "qualified", label: "Qualified", stages: ["qualified"] },
  { id: "demo", label: "Demo", stages: ["demo_planned", "demo_progress", "demo_completed"] },
  { id: "proposal", label: "Proposal / Commercial", stages: ["proposal"] },
  { id: "won", label: "Order Won", stages: ["order_won"] },
  { id: "handover", label: "Handover / Execution", stages: ["handed_exec", "exec_progress", "exec_completed", "cs_handover"] },
];

export const stageTone = (s: Stage) =>
  s === "lost" || s === "not_qualified" ? "bg-black/5 text-mute ring-line"
  : s === "on_hold" ? "bg-sev-high/10 text-sev-high ring-sev-high/30"
  : s === "order_won" || s === "cs_active" ? "bg-sev-low/10 text-sev-low ring-sev-low/30"
  : s.startsWith("demo") ? "bg-sev-medium/10 text-sev-medium ring-sev-medium/30"
  : s === "proposal" ? "bg-[oklch(0.55_0.18_300)]/10 text-[oklch(0.5_0.18_300)] ring-[oklch(0.55_0.18_300)]/30"
  : "bg-signal/10 text-signal ring-signal/30";

export interface ExecHandover {
  status?: "draft" | "sent" | "accepted";
  poRef?: string; orderDate?: string; scope?: string; sensors?: number; machines?: number; expectedDate?: string;
  siteContact?: string; mobile?: string; email?: string; instructions?: string; attachments?: string;
  engineerId?: string; preparedBy?: string; preparedAt?: string; acceptedBy?: string; acceptedAt?: string;
}
export interface CsHandover {
  status?: "ready" | "accepted";
  pendingItems?: string; customerNotes?: string; engineerId?: string; acceptedBy?: string; acceptedAt?: string;
}

export interface Opp {
  id: string; number: string; leadSource: string; leadSourceOther: string;
  plantId: string; customerName: string; plantName: string; location: string;
  branchId: string; salesEngineerId: string; type: string; requirement: string;
  contactName: string; contactMobile: string; contactEmail: string;
  sensors: number; machines: number; expectedDate: string;
  priority: "normal" | "high"; stage: Stage;
  nextAction: string; nextActionOwner: string; nextActionDate: string;
  notes: string; attachments: string; value: number | null;
  jobId: string; execHandover: ExecHandover; csHandover: CsHandover; csEngineerId: string;
  lostReason: string; lostRemark: string; holdReason: string; holdReviewDate: string;
  archived: boolean; createdBy: string; createdByDomain: string; createdAt: string; updatedAt: string; closedAt: string | null;
}
export interface OppActivity { id: string; oppId: string; kind: string; text: string; byUser: string; createdAt: string }

const toOpp = (r: any): Opp => ({
  id: r.id, number: r.opportunity_number, leadSource: r.lead_source, leadSourceOther: r.lead_source_other,
  plantId: r.plant_id, customerName: r.customer_name, plantName: r.plant_name, location: r.location,
  branchId: r.branch_id, salesEngineerId: r.sales_engineer_id, type: r.opportunity_type, requirement: r.requirement_summary,
  contactName: r.contact_name, contactMobile: r.contact_mobile, contactEmail: r.contact_email,
  sensors: r.expected_sensor_qty ?? 0, machines: r.expected_machine_qty ?? 0, expectedDate: r.expected_date ?? "",
  priority: r.priority === "high" ? "high" : "normal", stage: r.stage as Stage,
  nextAction: r.next_action, nextActionOwner: r.next_action_owner, nextActionDate: r.next_action_date ?? "",
  notes: r.notes, attachments: r.attachment_links, value: r.estimated_value === null || r.estimated_value === undefined ? null : Number(r.estimated_value),
  jobId: r.related_execution_job_id, execHandover: r.exec_handover ?? {}, csHandover: r.cs_handover ?? {}, csEngineerId: r.customer_success_engineer_id,
  lostReason: r.lost_reason, lostRemark: r.lost_remark, holdReason: r.hold_reason, holdReviewDate: r.hold_review_date ?? "",
  archived: !!r.archived, createdBy: r.created_by, createdByDomain: r.created_by_domain, createdAt: r.created_at, updatedAt: r.updated_at, closedAt: r.closed_at,
});
const fromOpp = (o: Opp, by: string) => ({
  id: o.id, lead_source: o.leadSource, lead_source_other: o.leadSourceOther,
  plant_id: o.plantId, customer_name: o.customerName, plant_name: o.plantName, location: o.location,
  branch_id: o.branchId, sales_engineer_id: o.salesEngineerId, opportunity_type: o.type, requirement_summary: o.requirement,
  contact_name: o.contactName, contact_mobile: o.contactMobile, contact_email: o.contactEmail,
  expected_sensor_qty: o.sensors || 0, expected_machine_qty: o.machines || 0, expected_date: o.expectedDate || null,
  priority: o.priority, stage: o.stage, next_action: o.nextAction, next_action_owner: o.nextActionOwner, next_action_date: o.nextActionDate || null,
  notes: o.notes, attachment_links: o.attachments, estimated_value: o.value,
  related_execution_job_id: o.jobId, exec_handover: o.execHandover, cs_handover: o.csHandover, customer_success_engineer_id: o.csEngineerId,
  lost_reason: o.lostReason, lost_remark: o.lostRemark, hold_reason: o.holdReason, hold_review_date: o.holdReviewDate || null,
  archived: o.archived, created_by: o.createdBy, updated_by: by,
  closed_at: closedStages.includes(o.stage) ? (o.closedAt ?? new Date().toISOString()) : null,
});

let opps: Opp[] = [];
let activity: OppActivity[] = [];
let loaded = false;
const listeners = new Set<() => void>();
let snap = { opps, activity };
const emit = () => { snap = { opps, activity }; listeners.forEach((l) => l()); };

export async function loadOpps() {
  const [o, a] = await Promise.all([
    db.from("opportunities").select("*").order("created_at", { ascending: false }),
    db.from("opportunity_activity").select("*").order("created_at", { ascending: false }),
  ]);
  opps = (o.data ?? []).map(toOpp);
  activity = (a.data ?? []).map((r: any) => ({ id: r.id, oppId: r.opportunity_id, kind: r.kind, text: r.text, byUser: r.by_user, createdAt: r.created_at }));
  loaded = true;
  emit();
}

export function useOpps() {
  useEffect(() => { if (!loaded) void loadOpps(); }, []);
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => snap, () => snap);
}

export function blankOpp(createdBy: string): Opp {
  return {
    id: crypto.randomUUID(), number: "", leadSource: "Branch Sales", leadSourceOther: "", plantId: "", customerName: "", plantName: "", location: "",
    branchId: "", salesEngineerId: "", type: "Order", requirement: "", contactName: "", contactMobile: "", contactEmail: "",
    sensors: 0, machines: 0, expectedDate: "", priority: "normal", stage: "new", nextAction: "", nextActionOwner: "", nextActionDate: "",
    notes: "", attachments: "", value: null, jobId: "", execHandover: {}, csHandover: {}, csEngineerId: "",
    lostReason: "", lostRemark: "", holdReason: "", holdReviewDate: "", archived: false, createdBy, createdByDomain: "",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), closedAt: null,
  };
}

export async function logOpp(oppId: string, text: string, byUser: string, kind = "system") {
  const { error } = await db.from("opportunity_activity").insert({ opportunity_id: oppId, text, by_user: byUser, kind });
  if (error) console.error("opportunity activity failed", error);
}

function diff(a: Opp, b: Opp): string[] {
  const out: string[] = [];
  if (a.stage !== b.stage) out.push(`Stage changed: ${stages[a.stage]} → ${stages[b.stage]}`);
  if (a.salesEngineerId !== b.salesEngineerId) out.push("Sales owner changed");
  if (a.branchId !== b.branchId) out.push("Branch changed");
  if (a.nextAction !== b.nextAction || a.nextActionDate !== b.nextActionDate) out.push(`Next action: ${b.nextAction || "—"}${b.nextActionDate ? ` (${b.nextActionDate})` : ""}`);
  if (a.jobId !== b.jobId && b.jobId) out.push("Execution job linked");
  if (a.requirement !== b.requirement) out.push("Requirement updated");
  if (a.type !== b.type) out.push(`Type changed to ${b.type}`);
  if (a.priority !== b.priority) out.push(`Priority: ${b.priority}`);
  if (a.csEngineerId !== b.csEngineerId && b.csEngineerId) out.push("Customer Success engineer assigned");
  if ((a.execHandover.status ?? "") !== (b.execHandover.status ?? "")) out.push(`Execution handover: ${b.execHandover.status}`);
  if ((a.csHandover.status ?? "") !== (b.csHandover.status ?? "")) out.push(`Customer Success handover: ${b.csHandover.status}`);
  if (a.archived !== b.archived) out.push(b.archived ? "Archived" : "Restored");
  return out;
}

export async function saveOpp(next: Opp, prev: Opp | undefined, byUser: string, byName: string): Promise<Opp> {
  const { data, error } = await db.from("opportunities").upsert(fromOpp(next, byUser)).select("*").single();
  if (error) throw new Error(error.message);
  const saved = toOpp(data);
  if (prev) for (const t of diff(prev, saved)) await logOpp(saved.id, t, byName);
  else await logOpp(saved.id, `Lead created (${saved.type}) from ${saved.leadSource}`, byName);
  await loadOpps();
  return saved;
}
