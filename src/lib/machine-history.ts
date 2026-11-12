/** Previous machine analysis context for the ticket review. Pure helpers — no store access. */
import { analysisRows, conditionLabel, type Condition, type MachineAnalysis } from "@/lib/ticket-analysis";

export interface HistoryTicket {
  id: string;
  ticketNo: string;
  plantId: string;
  raisedOn: string;
  publishedOn?: string | undefined;
  assignedTo: string;
  analysis?: MachineAnalysis[] | undefined;
  machines?: string[] | undefined;
  machine?: string | undefined;
  area?: string | undefined;
}

export interface HistoryEntry {
  date: string;
  ticketNo: string;
  ticketId: string;
  machine: string;
  area: string;
  machineId?: string | undefined;
  analyzedBy: string; // person id or name
  a: MachineAnalysis;
}

const norm = (s?: string) => (s ?? "").trim().toLowerCase();

/** Same machine? Prefer the permanent machine id; fall back to name (+ area when both are known) for older rows. */
export function sameMachine(x: { machineId?: string | undefined; machine: string; area: string }, y: { machineId?: string | undefined; machine: string; area: string }) {
  if (x.machineId && y.machineId) return x.machineId === y.machineId;
  if (norm(x.machine) !== norm(y.machine)) return false;
  const ax = norm(x.area), ay = norm(y.area);
  return !ax || !ay || ax === ay || ax.split(", ").includes(ay) || ay.split(", ").includes(ax);
}

/** Completed analyses for one machine, newest first, excluding the ticket under review. */
export function machineHistory(
  tickets: HistoryTicket[],
  target: { plantId: string; machineId?: string | undefined; machine: string; area: string },
  excludeTicketId?: string,
): HistoryEntry[] {
  const out: HistoryEntry[] = [];
  for (const t of tickets) {
    if (t.plantId !== target.plantId || t.id === excludeTicketId) continue;
    for (const a of analysisRows(t)) {
      if (a.status !== "complete" || !a.condition) continue;
      if (!sameMachine(a, target)) continue;
      out.push({
        date: a.analyzedOn || t.publishedOn || t.raisedOn,
        ticketNo: t.ticketNo,
        ticketId: t.id,
        machine: a.machine,
        area: a.area,
        machineId: a.machineId,
        analyzedBy: a.analyzedBy || t.assignedTo,
        a,
      });
    }
  }
  return out.sort((x, y) => y.date.localeCompare(x.date) || y.ticketNo.localeCompare(x.ticketNo));
}

const RANK: Record<Condition, number> = { normal: 0, monitor: 1, attention: 2, abnormal: 3, critical: 4, insufficient: -1 };

/** Informational comparison only — never a diagnosis. */
export function conditionTrend(prev: MachineAnalysis["condition"], curr: MachineAnalysis["condition"]): "escalated" | "improved" | "same" | null {
  if (!prev || !curr || RANK[prev] < 0 || RANK[curr] < 0) return null;
  return RANK[curr] > RANK[prev] ? "escalated" : RANK[curr] < RANK[prev] ? "improved" : "same";
}

const isBlankFault = (f?: string) => !f?.trim() || norm(f) === "none" || norm(f) === "n/a";

/** Latest earlier entry whose fault type exactly matches the current one (case-insensitive). */
export function previouslyObserved(history: HistoryEntry[], fault: string): HistoryEntry | null {
  if (isBlankFault(fault)) return null;
  return history.find((h) => norm(h.a.fault) === norm(fault)) ?? null;
}

// ---- clean display (stored values untouched)
export const showFault = (f?: string) => (isBlankFault(f) ? "—" : f!.trim());
export const showText = (s?: string) => {
  const v = (s ?? "").trim();
  return !v || /^[.\-–—\s]*$/.test(v) || norm(v) === "none" ? "Not recorded" : v;
};
export const showCondition = (c?: MachineAnalysis["condition"]) => (c ? conditionLabel[c] : "—");

/** Group entries by machine for the "By Machine" view; newest first inside, groups by latest date. */
export function groupByMachine<E extends { machine: string; area: string; a: MachineAnalysis }>(entries: E[]) {
  const id = (e: E) => ({ machineId: e.a.machineId, machine: e.machine, area: e.area });
  const groups: { key: string; machine: string; area: string; entries: E[] }[] = [];
  for (const e of entries) {
    const g = groups.find((x) => sameMachine(id(x.entries[0]!), id(e)));
    if (g) g.entries.push(e);
    else groups.push({ key: e.a.machineId || `${norm(e.area)}|${norm(e.machine)}`, machine: e.machine, area: e.area, entries: [e] });
  }
  return groups;
}

export interface SensorLite { id: string; point_id: string | null; serial_no: string; status: string; install_date: string | null; removed_date: string | null; created_at: string }
export interface SensorChange { pointName: string; previous: string; current: string; changed: string }

const RETIRED = ["replaced", "removed", "returned", "inactive"];
/** Measurement points of a machine whose sensor was swapped after `since` (yyyy-mm-dd). */
export function sensorChangesSince(points: { id: string; name: string; machine_id: string }[], sensors: SensorLite[], machineId: string, since: string): SensorChange[] {
  const out: SensorChange[] = [];
  for (const p of points.filter((x) => x.machine_id === machineId)) {
    const at = sensors.filter((s) => s.point_id === p.id);
    const current = at.find((s) => !RETIRED.includes(s.status));
    if (!current) continue;
    const installed = (current.install_date ?? current.created_at).slice(0, 10);
    if (installed <= since) continue;
    const prev = at
      .filter((s) => RETIRED.includes(s.status) && s.id !== current.id)
      .sort((a, b) => (b.removed_date ?? b.created_at).localeCompare(a.removed_date ?? a.created_at))[0];
    if (!prev) continue;
    out.push({ pointName: p.name, previous: prev.serial_no, current: current.serial_no, changed: installed });
  }
  return out;
}
