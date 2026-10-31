import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/store";

const db = supabase as any;

export type ExecInstallType = "demo" | "order" | "troubleshooting";
export type ExecStatus = "lead" | "planning" | "scheduled" | "in_progress" | "pending" | "completed" | "cancelled" | "on_hold";
export type YesNoNa = "yes" | "no" | "na";

export interface ExecEngineer {
  id: string;
  name: string;
  employeeId: string;
  email: string;
  mobile: string;
  branch: string;
  role: "manager" | "engineer";
  status: "active" | "inactive";
  linkedUserId: string;
}

export interface ExecLink { label: string; url: string }

export interface ExecJob {
  id: string;
  installationType: ExecInstallType;
  plantId: string;
  customerName: string;
  plantName: string;
  location: string;
  contactPerson: string;
  contactNumber: string;
  email: string;
  expectedDate: string | null;
  assignedEngineerId: string;
  secondaryEngineerId: string;
  priority: "normal" | "high";
  status: ExecStatus;
  notes: string;
  scheduleNotes: string;
  createdBy: string;
  createdAt: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  sensorsInstalled: number;
  machinesCovered: number;
  plannedSensors: number;
  plannedMachines: number;
  kickoff: YesNoNa;
  configuration: YesNoNa;
  aip: YesNoNa;
  reportLink: string;
  links: ExecLink[];
  comments: string;
  pendingReason: string;
  pendingRemark: string;
  nextPlannedDate: string | null;
  completedAt: string | null;
  completedBy: string;
  removalPlanned: string | null;
  removalCompleted: string | null;
  sensorsRemoved: number;
  removalNotes: string;
}

export interface ExecUpdate {
  id: string;
  jobId: string;
  workDate: string;
  remark: string;
  workCompleted: string;
  pendingNextAction: string;
  attachmentLink: string;
  createdBy: string;
  createdAt: string;
}

export interface ExecActivity {
  id: string;
  jobId: string;
  kind: "system" | "comment";
  text: string;
  byUser: string;
  createdAt: string;
}

export const installTypeLabel: Record<ExecInstallType, string> = { demo: "Demo", order: "Order", troubleshooting: "Troubleshooting" };
export const execStatusLabel: Record<ExecStatus, string> = {
  lead: "Lead Created",
  planning: "Planning",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  pending: "Pending / Follow-up",
  completed: "Completed",
  cancelled: "Cancelled",
  on_hold: "On Hold",
};

export const execStatusTone: Record<ExecStatus, string> = {
  lead: "bg-black/5 text-mute ring-line",
  planning: "bg-sev-advisory/10 text-sev-advisory ring-sev-advisory/40",
  scheduled: "bg-sev-medium/10 text-sev-medium ring-sev-medium/40",
  in_progress: "bg-signal/10 text-signal ring-signal/40",
  pending: "bg-sev-high/10 text-sev-high ring-sev-high/40",
  completed: "bg-sev-low/10 text-sev-low ring-sev-low/40",
  cancelled: "bg-black/5 text-mute ring-line",
  on_hold: "bg-sev-medium/10 text-sev-medium ring-sev-medium/40",
};

export const pendingReasons = [
  "Material Pending",
  "Customer Confirmation Pending",
  "Site Not Ready",
  "Access / Permission Pending",
  "Network / IT Support Pending",
  "Configuration Pending",
  "Additional Visit Required",
  "Other",
];

export const checklistLabel: Record<ExecStatus | string, string> = {};
export const yesNoNaLabel: Record<YesNoNa, string> = { yes: "Yes", no: "No", na: "N/A" };

// ---- store

let engineers: ExecEngineer[] = [];
let jobs: ExecJob[] = [];
let updates: ExecUpdate[] = [];
let activity: ExecActivity[] = [];
let siteVisits: ExecSiteVisit[] = [];
let archivedSiteVisits: ExecSiteVisit[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => {
  snapshot = { engineers, jobs, updates, activity, siteVisits, archivedSiteVisits };
  listeners.forEach((l) => l());
};

const eFrom = (r: any): ExecEngineer => ({
  id: r.id,
  name: r.name ?? "",
  employeeId: r.employee_id ?? "",
  email: r.email ?? "",
  mobile: r.mobile ?? "",
  branch: r.branch ?? "",
  role: r.role === "manager" ? "manager" : "engineer",
  status: r.status === "inactive" ? "inactive" : "active",
  linkedUserId: r.linked_user_id ?? "",
});

const jFrom = (r: any): ExecJob => ({
  id: r.id,
  installationType: (["demo", "order", "troubleshooting"].includes(r.installation_type) ? r.installation_type : "demo") as ExecInstallType,
  plantId: r.plant_id ?? "",
  customerName: r.customer_name ?? "",
  plantName: r.plant_name ?? "",
  location: r.location ?? "",
  contactPerson: r.contact_person ?? "",
  contactNumber: r.contact_number ?? "",
  email: r.email ?? "",
  expectedDate: r.expected_execution_date,
  assignedEngineerId: r.assigned_engineer_id ?? "",
  secondaryEngineerId: r.secondary_engineer_id ?? "",
  priority: r.priority === "high" ? "high" : "normal",
  status: (["lead", "planning", "scheduled", "in_progress", "pending", "completed", "cancelled", "on_hold"].includes(r.status) ? r.status : "lead") as ExecStatus,
  notes: r.notes ?? "",
  scheduleNotes: r.schedule_notes ?? "",
  createdBy: r.created_by ?? "",
  createdAt: r.created_at ?? "",
  plannedStart: r.planned_start_date,
  plannedEnd: r.planned_end_date,
  actualStart: r.actual_start_date,
  actualEnd: r.actual_end_date,
  sensorsInstalled: r.sensors_installed ?? 0,
  machinesCovered: r.machines_covered ?? 0,
  plannedSensors: r.planned_sensors ?? 0,
  plannedMachines: r.planned_machines ?? 0,
  kickoff: (["yes", "no", "na"].includes(r.kickoff_completed) ? r.kickoff_completed : "no") as YesNoNa,
  configuration: (["yes", "no", "na"].includes(r.configuration_completed) ? r.configuration_completed : "no") as YesNoNa,
  aip: (["yes", "no", "na"].includes(r.aip_generated) ? r.aip_generated : "no") as YesNoNa,
  reportLink: r.report_link ?? "",
  links: Array.isArray(r.links) ? r.links : [],
  comments: r.comments ?? "",
  pendingReason: r.pending_reason ?? "",
  pendingRemark: r.pending_remark ?? "",
  nextPlannedDate: r.next_planned_date,
  completedAt: r.completed_at,
  completedBy: r.completed_by ?? "",
  removalPlanned: r.removal_planned_date,
  removalCompleted: r.removal_completed_date,
  sensorsRemoved: r.sensors_removed ?? 0,
  removalNotes: r.removal_notes ?? "",
});

const uFrom = (r: any): ExecUpdate => ({
  id: r.id,
  jobId: r.job_id,
  workDate: r.work_date,
  remark: r.remark ?? "",
  workCompleted: r.work_completed ?? "",
  pendingNextAction: r.pending_next_action ?? "",
  attachmentLink: r.attachment_link ?? "",
  createdBy: r.created_by ?? "",
  createdAt: r.created_at ?? "",
});

const aFrom = (r: any): ExecActivity => ({ id: r.id, jobId: r.job_id, kind: r.kind === "comment" ? "comment" : "system", text: r.text ?? "", byUser: r.by_user ?? "", createdAt: r.created_at ?? "" });

export async function loadExecution() {
  const [e, j, u, a] = await Promise.all([
    db.from("execution_engineers").select("*").order("name"),
    db.from("execution_jobs").select("*").order("created_at", { ascending: false }),
    db.from("execution_daily_updates").select("*").order("work_date"),
    db.from("execution_activity").select("*").order("created_at", { ascending: false }),
  ]);
  const sv = await db.from("execution_site_visits").select("*").order("visit_date", { ascending: false });
  if (sv.error) console.error("execution site visits load failed", sv.error);
  const allSv: ExecSiteVisit[] = (sv.data ?? []).map(svFrom);
  siteVisits = allSv.filter((v) => !v.archived);
  archivedSiteVisits = allSv.filter((v) => v.archived);
  for (const [res, label] of [[e, "engineers"], [j, "jobs"], [u, "updates"], [a, "activity"]] as const) {
    if (res.error) console.error(`execution ${label} load failed`, res.error);
  }
  engineers = (e.data ?? []).map(eFrom);
  jobs = (j.data ?? []).map(jFrom);
  updates = (u.data ?? []).map(uFrom);
  activity = (a.data ?? []).map(aFrom);
  loaded = true;
  emit();
}

export function useExecution() {
  useEffect(() => {
    if (!loaded) void loadExecution();
  }, []);
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapshot,
    () => snapshot,
  );
}

let snapshot = { engineers, jobs, updates, activity, siteVisits, archivedSiteVisits };

export function execEngineerName(id: string) {
  return engineers.find((e) => e.id === id)?.name ?? "";
}

async function log(jobId: string, text: string, byUser: string, kind: "system" | "comment" = "system") {
  const { data, error } = await db.from("execution_activity").insert({ job_id: jobId, kind, text, by_user: byUser }).select("*");
  if (error) return console.error("execution activity failed", error);
  const saved = data?.[0];
  if (!saved) return;
  activity = [aFrom(saved), ...activity];
  emit();
}

function diffText(prev: ExecJob, next: ExecJob): string[] {
  const out: string[] = [];
  if (prev.status !== next.status) out.push(`Status changed to ${execStatusLabel[next.status]}`);
  if (prev.assignedEngineerId !== next.assignedEngineerId) out.push(`Assigned to ${execEngineerName(next.assignedEngineerId) || "—"}`);
  if (prev.secondaryEngineerId !== next.secondaryEngineerId) out.push(`Second engineer set to ${execEngineerName(next.secondaryEngineerId) || "—"}`);
  if (prev.plannedStart !== next.plannedStart || prev.plannedEnd !== next.plannedEnd) out.push(`Schedule changed to ${dateRange(next)}`);
  if (prev.sensorsInstalled !== next.sensorsInstalled) out.push(`Sensors installed updated to ${next.sensorsInstalled}`);
  if (prev.machinesCovered !== next.machinesCovered) out.push(`Machines covered updated to ${next.machinesCovered}`);
  if (prev.reportLink !== next.reportLink) out.push("Report link updated");
  if (prev.aip !== next.aip) out.push(`AIP sheet marked ${yesNoNaLabel[next.aip]}`);
  if (prev.removalPlanned !== next.removalPlanned) out.push(`Demo removal scheduled for ${fmtDate(next.removalPlanned ?? undefined)}`);
  if (prev.sensorsRemoved !== next.sensorsRemoved) out.push(`Sensors removed updated to ${next.sensorsRemoved}`);
  if (prev.removalCompleted !== next.removalCompleted) out.push(next.removalCompleted ? `Demo removal completed on ${fmtDate(next.removalCompleted)}` : "Demo removal reopened");
  return out;
}

const toRow = (j: ExecJob) => ({
  id: j.id,
  installation_type: j.installationType,
  plant_id: j.plantId,
  customer_name: j.customerName,
  plant_name: j.plantName,
  location: j.location,
  contact_person: j.contactPerson,
  contact_number: j.contactNumber,
  email: j.email,
  expected_execution_date: j.expectedDate,
  assigned_engineer_id: j.assignedEngineerId,
  secondary_engineer_id: j.secondaryEngineerId,
  priority: j.priority,
  status: j.status,
  notes: j.notes,
  schedule_notes: j.scheduleNotes,
  created_by: j.createdBy,
  planned_start_date: j.plannedStart,
  planned_end_date: j.plannedEnd,
  actual_start_date: j.actualStart,
  actual_end_date: j.actualEnd,
  sensors_installed: j.sensorsInstalled,
  machines_covered: j.machinesCovered,
  planned_sensors: j.plannedSensors,
  planned_machines: j.plannedMachines,
  kickoff_completed: j.kickoff,
  configuration_completed: j.configuration,
  aip_generated: j.aip,
  report_link: j.reportLink,
  links: j.links,
  comments: j.comments,
  pending_reason: j.pendingReason,
  pending_remark: j.pendingRemark,
  next_planned_date: j.nextPlannedDate,
  completed_at: j.completedAt,
  completed_by: j.completedBy,
  removal_planned_date: j.removalPlanned,
  removal_completed_date: j.removalCompleted,
  sensors_removed: j.sensorsRemoved,
  removal_notes: j.removalNotes,
  updated_at: new Date().toISOString(),
});

export function blankJob(createdBy: string): ExecJob {
  return {
    id: crypto.randomUUID(),
    installationType: "demo",
    plantId: "",
    customerName: "",
    plantName: "",
    location: "",
    contactPerson: "",
    contactNumber: "",
    email: "",
    expectedDate: null,
    assignedEngineerId: "",
    secondaryEngineerId: "",
    priority: "normal",
    status: "lead",
    notes: "",
    scheduleNotes: "",
    createdBy,
    createdAt: new Date().toISOString(),
    plannedStart: null,
    plannedEnd: null,
    actualStart: null,
    actualEnd: null,
    sensorsInstalled: 0,
    machinesCovered: 0,
    plannedSensors: 0,
    plannedMachines: 0,
    kickoff: "no",
    configuration: "no",
    aip: "no",
    reportLink: "",
    links: [],
    comments: "",
    pendingReason: "",
    pendingRemark: "",
    nextPlannedDate: null,
    completedAt: null,
    completedBy: "",
    removalPlanned: null,
    removalCompleted: null,
    sensorsRemoved: 0,
    removalNotes: "",
  };
}

export async function saveJob(next: ExecJob, prev: ExecJob | undefined, byUser: string) {
  jobs = [next, ...jobs.filter((j) => j.id !== next.id)];
  emit();
  const { error } = await db.from("execution_jobs").upsert(toRow(next));
  if (error) {
    console.error("execution job save failed", error);
    throw error;
  }
  if (prev) {
    for (const t of diffText(prev, next)) await log(next.id, t, byUser);
  } else {
    await log(next.id, `Lead created (${installTypeLabel[next.installationType]})`, byUser);
  }
}

export async function deleteJob(id: string) {
  jobs = jobs.filter((j) => j.id !== id);
  updates = updates.filter((u) => u.jobId !== id);
  activity = activity.filter((a) => a.jobId !== id);
  emit();
  await db.from("execution_daily_updates").delete().eq("job_id", id);
  await db.from("execution_activity").delete().eq("job_id", id);
  const { error } = await db.from("execution_jobs").delete().eq("id", id);
  if (error) {
    console.error("execution job delete failed", error);
    throw error;
  }
}

export async function addDailyUpdate(u: Omit<ExecUpdate, "id" | "createdAt">, byUser: string) {
  const row = {
    id: crypto.randomUUID(),
    job_id: u.jobId,
    work_date: u.workDate,
    remark: u.remark.trim(),
    work_completed: u.workCompleted,
    pending_next_action: u.pendingNextAction,
    attachment_link: u.attachmentLink,
    created_by: u.createdBy,
  };
  const { data, error } = await db.from("execution_daily_updates").insert(row).select("*").single();
  if (error) {
    console.error("execution update save failed", error);
    throw error;
  }
  if (!data) throw new Error("The saved update could not be retrieved. Refresh before trying again.");
  updates = [...updates, uFrom(data)].sort((a, b) => a.workDate.localeCompare(b.workDate));
  emit();
  await log(u.jobId, `Daily update added for ${fmtDate(u.workDate)}`, byUser);
}

export async function deleteDailyUpdate(id: string) {
  updates = updates.filter((u) => u.id !== id);
  emit();
  const { error } = await db.from("execution_daily_updates").delete().eq("id", id);
  if (error) console.error("execution update delete failed", error);
}

export async function addComment(jobId: string, text: string, byUser: string) {
  await log(jobId, text, byUser, "comment");
}

export async function saveEngineer(e: ExecEngineer) {
  engineers = [e, ...engineers.filter((x) => x.id !== e.id)].sort((a, b) => a.name.localeCompare(b.name));
  emit();
  const { error } = await db.from("execution_engineers").upsert({
    id: e.id,
    name: e.name,
    employee_id: e.employeeId,
    email: e.email,
    mobile: e.mobile,
    branch: e.branch,
    role: e.role,
    status: e.status,
    linked_user_id: e.linkedUserId,
  });
  if (error) {
    console.error("execution engineer save failed", error);
    throw error;
  }
}

/** Make sure an Engineers-tab member with the Execution Engineer role has a matching execution team record. */
export async function ensureExecEngineer(id: string, name: string, linkedUserId: string) {
  const existing = engineers.find((x) => x.id === id || x.linkedUserId === linkedUserId);
  if (!existing) {
    await saveEngineer({ id, name, employeeId: "", email: "", mobile: "", branch: "", role: "engineer", status: "active", linkedUserId });
  } else if (existing.name !== name || existing.linkedUserId !== linkedUserId) {
    await saveEngineer({ ...existing, name, linkedUserId });
  }
}

export function execRecordFor(userId: string) {
  return engineers.find((x) => x.linkedUserId === userId || x.id === userId);
}

export async function deleteEngineer(id: string) {
  engineers = engineers.filter((e) => e.id !== id);
  emit();
  const { error } = await db.from("execution_engineers").delete().eq("id", id);
  if (error) {
    console.error("execution engineer delete failed", error);
    throw error;
  }
}

export async function reassignJobs(fromId: string, toId: string) {
  const moved = jobs.filter((j) => (j.assignedEngineerId === fromId || j.secondaryEngineerId === fromId) && !["completed", "cancelled"].includes(j.status));
  if (moved.length) {
    const next = moved.map((j) => ({ ...j, assignedEngineerId: j.assignedEngineerId === fromId ? toId : j.assignedEngineerId, secondaryEngineerId: j.secondaryEngineerId === fromId ? toId : j.secondaryEngineerId }));
    jobs = jobs.map((j) => next.find((n) => n.id === j.id) ?? j);
    emit();
    const { error } = await db.from("execution_jobs").upsert(next.map(toRow));
    if (error) console.error("execution reassign failed", error);
  }
}

// ---- helpers

export function dateRange(j: Pick<ExecJob, "plannedStart" | "plannedEnd">) {
  if (!j.plannedStart && !j.plannedEnd) return "—";
  if (j.plannedStart === j.plannedEnd || !j.plannedEnd) return fmtDate(j.plannedStart ?? undefined);
  return `${fmtDate(j.plannedStart ?? undefined)} – ${fmtDate(j.plannedEnd ?? undefined)}`;
}

export function updatesFor(jobId: string) {
  return updates.filter((u) => u.jobId === jobId);
}

export function activityFor(jobId: string) {
  return activity.filter((a) => a.jobId === jobId);
}

export function openJobs() {
  return jobs.filter((j) => !["completed", "cancelled"].includes(j.status));
}

// ---- standalone site visits (factory inspection, sensor collection, etc.)

export type SiteVisitType = "factory_inspection" | "sensor_collection" | "material" | "customer_meeting" | "service_support" | "other";
export type SiteVisitOutcome = "completed" | "follow_up" | "blocked";
export const siteVisitTypeLabel: Record<SiteVisitType, string> = {
  factory_inspection: "Factory Inspection",
  sensor_collection: "Sensor Collection / Return",
  material: "Material Delivery / Pickup",
  customer_meeting: "Customer Meeting / Survey",
  service_support: "Service Support / Troubleshooting",
  other: "Other Site Work",
};
export const siteVisitOutcomeLabel: Record<SiteVisitOutcome, string> = { completed: "Completed", follow_up: "Follow-up needed", blocked: "Blocked" };

export interface ExecSiteVisit {
  id: string;
  visitDate: string;
  startTime: string;
  endTime: string;
  engineerIds: string[];
  plantId: string;
  location: string;
  visitType: SiteVisitType;
  purpose: string;
  notes: string;
  sensorsCollected: number;
  sensorsDelivered: number;
  outcome: SiteVisitOutcome;
  attachmentLink: string;
  relatedJobId: string;
  createdBy: string;
  archived: boolean;
}

function svFrom(r: any): ExecSiteVisit {
  return {
    id: r.id,
    visitDate: r.visit_date,
    startTime: r.start_time ?? "",
    endTime: r.end_time ?? "",
    engineerIds: Array.isArray(r.engineer_ids) ? r.engineer_ids : [],
    plantId: r.plant_id ?? "",
    location: r.location ?? "",
    visitType: (r.visit_type in siteVisitTypeLabel ? r.visit_type : "other") as SiteVisitType,
    purpose: r.purpose ?? "",
    notes: r.notes ?? "",
    sensorsCollected: r.sensors_collected ?? 0,
    sensorsDelivered: r.sensors_delivered ?? 0,
    outcome: (r.outcome in siteVisitOutcomeLabel ? r.outcome : "completed") as SiteVisitOutcome,
    attachmentLink: r.attachment_link ?? "",
    relatedJobId: r.related_job_id ?? "",
    createdBy: r.created_by ?? "",
    archived: !!r.archived,
  };
}

export function blankSiteVisit(today: string, engineerId: string, createdBy: string): ExecSiteVisit {
  return { id: "", visitDate: today, startTime: "", endTime: "", engineerIds: engineerId ? [engineerId] : [], plantId: "", location: "", visitType: "factory_inspection", purpose: "", notes: "", sensorsCollected: 0, sensorsDelivered: 0, outcome: "completed", attachmentLink: "", relatedJobId: "", createdBy, archived: false };
}

export async function saveSiteVisit(v: ExecSiteVisit) {
  const isNew = !v.id;
  const id = v.id || crypto.randomUUID();
  const row = {
    id, visit_date: v.visitDate, start_time: v.startTime, end_time: v.endTime, engineer_ids: v.engineerIds, plant_id: v.plantId,
    location: v.location, visit_type: v.visitType, purpose: v.purpose, notes: v.notes, sensors_collected: v.sensorsCollected || 0,
    sensors_delivered: v.sensorsDelivered || 0, outcome: v.outcome, attachment_link: v.attachmentLink, related_job_id: v.relatedJobId,
    created_by: v.createdBy, updated_at: new Date().toISOString(),
  };
  const { error } = isNew ? await db.from("execution_site_visits").insert(row) : await db.from("execution_site_visits").update(row).eq("id", id);
  if (error) {
    console.error("site visit save failed", error);
    throw error;
  }
  const next = { ...v, id };
  siteVisits = [next, ...siteVisits.filter((x) => x.id !== id)].sort((a, b) => (a.visitDate < b.visitDate ? 1 : -1));
  emit();
  if (v.relatedJobId) await log(v.relatedJobId, `${siteVisitTypeLabel[v.visitType]} visit on ${fmtDate(v.visitDate)}${v.purpose ? ` — ${v.purpose}` : ""}`, v.createdBy).catch(() => {});
}

/** Archive hides a visit from lists and all counts; restore brings it back. Nothing is deleted. */
export async function setSiteVisitArchived(id: string, archived: boolean) {
  const { error } = await db.from("execution_site_visits").update({ archived, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  const all = [...siteVisits, ...archivedSiteVisits].map((v) => (v.id === id ? { ...v, archived } : v));
  siteVisits = all.filter((v) => !v.archived).sort((a, b) => (a.visitDate < b.visitDate ? 1 : -1));
  archivedSiteVisits = all.filter((v) => v.archived);
  emit();
}

export async function deleteSiteVisit(id: string) {
  siteVisits = siteVisits.filter((x) => x.id !== id);
  emit();
  const { error } = await db.from("execution_site_visits").delete().eq("id", id);
  if (error) console.error("site visit delete failed", error);
}

export function siteVisitsOn(engineerId: string, date: string) {
  return siteVisits.filter((v) => v.visitDate === date && v.engineerIds.includes(engineerId));
}
