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
