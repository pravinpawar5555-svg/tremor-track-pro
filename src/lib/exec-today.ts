// Pure "Today" rules for the Execution tab (phone-first summary, card colours, stale-remark dot).
import type { ExecJob } from "@/lib/execution";

export type TodayFilter = "active" | "due" | "overdue" | "visits";
const closed = (s: ExecJob["status"]) => s === "completed" || s === "cancelled";

export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

export function isOverdue(j: ExecJob, today: string) {
  return !closed(j.status) && j.status !== "lead" && !!j.plannedEnd && j.plannedEnd < today;
}

export function isDueToday(j: ExecJob, today: string) {
  if (closed(j.status) || !j.plannedStart) return false;
  return j.plannedStart <= today && (j.plannedEnd ?? j.plannedStart) >= today;
}

export const isActiveJob = (j: ExecJob) => j.status === "in_progress";

/** In-progress job whose last remark (or start) is 2+ days old. */
export function needsRemark(j: ExecJob, lastUpdate: string | undefined, today: string) {
  if (!isActiveJob(j)) return false;
  const ref = lastUpdate ?? j.actualStart ?? j.plannedStart;
  return !!ref && daysBetween(ref, today) >= 2;
}

export function jobTone(j: ExecJob, today: string): "overdue" | "today" | "done" | "normal" {
  if (j.status === "completed") return "done";
  if (isOverdue(j, today)) return "overdue";
  if (isDueToday(j, today)) return "today";
  return "normal";
}

export function filterToday(jobs: ExecJob[], f: TodayFilter, today: string) {
  if (f === "active") return jobs.filter(isActiveJob);
  if (f === "due") return jobs.filter((j) => isDueToday(j, today));
  if (f === "overdue") return jobs.filter((j) => isOverdue(j, today));
  return [];
}

export function mapsUrl(...parts: string[]) {
  const q = parts.filter(Boolean).join(", ");
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : "";
}

/** Field work done (sensors + machines in, configuration not missing) but job still open → ready to close. */
export function isReadyToClose(j: ExecJob) {
  return j.status === "in_progress" && j.sensorsInstalled > 0 && j.machinesCovered > 0 && j.configuration !== "no";
}

/** Manager / engineer status bucket used by KPI cards and Jobs filters. */
export type JobBucket = "scheduled" | "in_progress" | "pending" | "ready" | "completed" | "other";
export function jobBucket(j: ExecJob): JobBucket {
  if (j.status === "completed") return "completed";
  if (j.status === "pending" || j.status === "on_hold") return "pending";
  if (isReadyToClose(j)) return "ready";
  if (j.status === "in_progress") return "in_progress";
  if (j.status === "scheduled") return "scheduled";
  return "other";
}

const needsClosure = (j: ExecJob) => !closed(j.status) && j.status !== "lead" && j.status !== "planning" && (j.status === "in_progress" || j.status === "pending");

export type Attention = { key: string; label: string; jobs: ExecJob[]; tone: "high" | "medium" };
/** Actionable exceptions only; zero-count rows are dropped. */
export function attentionItems(jobs: ExecJob[], lastUpdate: (id: string) => string | undefined, today: string): Attention[] {
  const items: Attention[] = [
    { key: "past_end", label: "Past end date — not closed", tone: "high", jobs: jobs.filter((j) => isOverdue(j, today)) },
    { key: "customer", label: "Customer confirmation pending", tone: "medium", jobs: jobs.filter((j) => j.status === "pending" && j.pendingReason === "Customer Confirmation Pending") },
    { key: "pending", label: "Pending jobs", tone: "medium", jobs: jobs.filter((j) => j.status === "pending" || j.status === "on_hold") },
    { key: "aip", label: "AIP sheet pending", tone: "medium", jobs: jobs.filter((j) => needsClosure(j) && j.installationType !== "troubleshooting" && j.aip === "no") },
    { key: "config", label: "Configuration pending", tone: "medium", jobs: jobs.filter((j) => needsClosure(j) && j.configuration === "no") },
    { key: "report", label: "Report link missing", tone: "medium", jobs: jobs.filter((j) => isReadyToClose(j) && !j.reportLink.trim()) },
    { key: "update", label: "Daily update missing", tone: "high", jobs: jobs.filter((j) => needsRemark(j, lastUpdate(j.id), today)) },
  ];
  return items.filter((i) => i.jobs.length > 0);
}

const startKey = (j: ExecJob) => j.plannedStart ?? "9999";
/** 3–5 jobs for "Current / Upcoming": in progress, then nearest scheduled; ready-to-close only when nothing else. */
export function focusJobs(jobs: ExecJob[], max = 5) {
  const running = jobs.filter((j) => j.status === "in_progress" && !isReadyToClose(j)).sort((a, b) => (startKey(a) < startKey(b) ? -1 : 1));
  const next = jobs.filter((j) => j.status === "scheduled" || j.status === "planning").sort((a, b) => (startKey(a) < startKey(b) ? -1 : 1));
  const list = [...running, ...next];
  return list.length ? list.slice(0, max) : jobs.filter(isReadyToClose).slice(0, max);
}
