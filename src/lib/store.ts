import { useSyncExternalStore } from "react";

// ---------------------------------------------------------------- types

export type Frequency = "weekly" | "monthly" | "on-demand";
export type ReportStatus = "pending" | "prepared" | "sent";
export type Severity = "advisory" | "low" | "medium" | "high" | "critical";

export interface Engineer {
  id: string;
  name: string;
  initials: string;
  role: "analyst" | "manager";
}

export interface Plant {
  id: string;
  name: string;
  customer: string;
  location: string;
  machines: number;
  frequency: Frequency;
  contact: string;
  engineerId: string;
}

export interface DailyUpdate {
  id: string;
  date: string; // yyyy-mm-dd
  engineerId: string;
  plantId: string;
  machinesChecked: number;
  trend: number;
  kpi: number;
  fft: number;
  abnormal: number;
  remark: string;
  submittedAt: string; // HH:MM
}

export interface ReportRow {
  id: string;
  docNo: string;
  plantId: string;
  type: Frequency;
  period: string;
  dueDate: string;
  status: ReportStatus;
  sentDate?: string | undefined;
  byEngineerId: string;
}

export interface AppData {
  engineers: Engineer[];
  plants: Plant[];
  updates: DailyUpdate[];
  reports: ReportRow[];
}

// ---------------------------------------------------------------- constants

export const TODAY = "2026-09-22";

export const defaultEngineers: Engineer[] = [
  { id: "eng-1", name: "R. Ahuja", initials: "RA", role: "analyst" },
  { id: "eng-2", name: "M. Desai", initials: "MD", role: "analyst" },
  { id: "mgr-1", name: "P. Pawar", initials: "PP", role: "manager" },
];

export function initialsOf(name: string) {
  const parts = name.replace(/[^A-Za-z .]/g, "").split(/[ .]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

export function analystsOf(d: AppData) {
  return d.engineers.filter((e) => e.role === "analyst");
}

export function managersOf(d: AppData) {
  return d.engineers.filter((e) => e.role === "manager");
}

export const frequencyLabel: Record<Frequency, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  "on-demand": "On demand",
};

export const reportStatusLabel: Record<ReportStatus, string> = {
  pending: "Pending",
  prepared: "Prepared",
  sent: "Sent",
};

export function engineerName(d: AppData, id: string) {
  return d.engineers.find((e) => e.id === id)?.name ?? "—";
}

// ---------------------------------------------------------------- dates

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtDate(iso?: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
}

export function shiftDate(iso: string, days: number) {
  const dt = new Date(`${iso}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string) {
  const ms = new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime();
  return Math.round(ms / 86400000);
}

/** A report is late when it was sent after its due date, or is still unsent past due. */
export function reportTiming(r: ReportRow, today = TODAY): { late: boolean; days: number; label: string } {
  if (r.status === "sent" && r.sentDate) {
    const d = daysBetween(r.dueDate, r.sentDate);
    return { late: d > 0, days: d, label: d > 0 ? `Late by ${d} d` : "On time" };
  }
  const d = daysBetween(r.dueDate, today);
  if (d > 0) return { late: true, days: d, label: `Overdue ${d} d` };
  return { late: false, days: d, label: d === 0 ? "Due today" : `Due in ${-d} d` };
}

// ---------------------------------------------------------------- seed

function seed(): AppData {
  const plants: Plant[] = [
    { id: "pl-1", name: "Tata Steel — Kalinganagar CPP", customer: "Tata Steel", location: "Jajpur, Odisha", machines: 42, frequency: "weekly", contact: "S. Mohanty", engineerId: "eng-1" },
    { id: "pl-2", name: "Reliance — Jamnagar Utilities", customer: "Reliance Industries", location: "Jamnagar, Gujarat", machines: 36, frequency: "weekly", contact: "A. Trivedi", engineerId: "eng-2" },
    { id: "pl-3", name: "UltraTech — Awarpur Line 2", customer: "UltraTech Cement", location: "Chandrapur, MH", machines: 28, frequency: "monthly", contact: "R. Kulkarni", engineerId: "eng-1" },
    { id: "pl-4", name: "Hindalco — Renukoot Smelter", customer: "Hindalco", location: "Sonbhadra, UP", machines: 24, frequency: "monthly", contact: "V. Singh", engineerId: "eng-2" },
    { id: "pl-5", name: "Grasim — Nagda Pulp", customer: "Grasim Industries", location: "Nagda, MP", machines: 18, frequency: "weekly", contact: "D. Jain", engineerId: "eng-1" },
    { id: "pl-6", name: "Deepak Fertilisers — Taloja", customer: "Deepak Fertilisers", location: "Taloja, MH", machines: 15, frequency: "on-demand", contact: "N. Shetty", engineerId: "eng-2" },
  ];

  const u = (
    n: number,
    dayOffset: number,
    engineerId: string,
    plantId: string,
    machinesChecked: number,
    trend: number,
    kpi: number,
    fft: number,
    abnormal: number,
    remark: string,
    submittedAt: string,
  ): DailyUpdate => ({
    id: `up-${n}`,
    date: shiftDate(TODAY, dayOffset),
    engineerId,
    plantId,
    machinesChecked,
    trend,
    kpi,
    fft,
    abnormal,
    remark,
    submittedAt,
  });

  const updates: DailyUpdate[] = [
    u(1, 0, "eng-1", "pl-1", 14, 14, 14, 6, 2, "Boiler feed pump 2A velocity rising, FFT reviewed — 1X dominant. Informed site.", "09:10"),
    u(2, 0, "eng-1", "pl-5", 8, 8, 8, 2, 0, "All within limits.", "11:40"),
    u(3, -1, "eng-1", "pl-3", 12, 12, 10, 4, 1, "Raw mill fan bearing under watch, trend flat this week.", "09:25"),
    u(4, -1, "eng-2", "pl-2", 16, 16, 16, 5, 1, "Cooling tower fan 4 — KPI above alert, FFT taken for confirmation.", "09:05"),
    u(5, -2, "eng-2", "pl-4", 10, 10, 8, 3, 0, "Normal. Two machines were not running.", "09:35"),
    u(6, -2, "eng-1", "pl-1", 13, 13, 13, 4, 1, "Observation continued on BFP 2A.", "09:15"),
    u(7, -3, "eng-2", "pl-2", 15, 15, 15, 3, 0, "Normal across compressors.", "09:20"),
    u(8, -3, "eng-1", "pl-5", 9, 9, 9, 3, 1, "Pulp pump 3 crest factor high, to be re-checked.", "10:05"),
    u(9, -4, "eng-2", "pl-6", 7, 7, 7, 7, 2, "On-demand study after site complaint — two machines abnormal.", "14:10"),
    u(10, -4, "eng-1", "pl-3", 11, 11, 11, 2, 0, "Normal.", "09:30"),
  ];

  const r = (
    n: number,
    plantId: string,
    type: Frequency,
    period: string,
    dueOffset: number,
    status: ReportStatus,
    sentOffset: number | null,
    byEngineerId: string,
  ): ReportRow => ({
    id: `rp-${n}`,
    docNo: `FM-VM-2026-0${100 + n}`,
    plantId,
    type,
    period,
    dueDate: shiftDate(TODAY, dueOffset),
    status,
    ...(sentOffset === null ? {} : { sentDate: shiftDate(TODAY, sentOffset) }),
    byEngineerId,
  });

  const reports: ReportRow[] = [
    r(1, "pl-1", "weekly", "14–20 Sep 2026", -1, "sent", -1, "eng-1"),
    r(2, "pl-2", "weekly", "14–20 Sep 2026", -1, "sent", 0, "eng-2"),
    r(3, "pl-5", "weekly", "14–20 Sep 2026", -1, "prepared", null, "eng-1"),
    r(4, "pl-1", "weekly", "07–13 Sep 2026", -8, "sent", -8, "eng-1"),
    r(5, "pl-2", "weekly", "07–13 Sep 2026", -8, "sent", -6, "eng-2"),
    r(6, "pl-5", "weekly", "07–13 Sep 2026", -8, "sent", -8, "eng-1"),
    r(7, "pl-3", "monthly", "August 2026", -17, "sent", -15, "eng-1"),
    r(8, "pl-4", "monthly", "August 2026", -17, "sent", -17, "eng-2"),
    r(9, "pl-6", "on-demand", "Fan study — 18 Sep", -2, "pending", null, "eng-2"),
    r(10, "pl-1", "weekly", "21–27 Sep 2026", 6, "pending", null, "eng-1"),
    r(11, "pl-2", "weekly", "21–27 Sep 2026", 6, "pending", null, "eng-2"),
    r(12, "pl-5", "weekly", "21–27 Sep 2026", 6, "pending", null, "eng-1"),
    r(13, "pl-3", "monthly", "September 2026", 12, "pending", null, "eng-1"),
    r(14, "pl-4", "monthly", "September 2026", 12, "pending", null, "eng-2"),
  ];

  return { plants, updates, reports };
}

// ---------------------------------------------------------------- store

const KEY = "fm-cm-portal-v1";

let data: AppData = seed();
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) data = JSON.parse(raw) as AppData;
  } catch {
    /* keep seed */
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function commit(next: AppData) {
  data = next;
  persist();
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  load();
  listeners.add(cb);
  cb();
  return () => listeners.delete(cb);
}

export function useData(): AppData {
  return useSyncExternalStore(
    subscribe,
    () => data,
    () => data,
  );
}

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

export function savePlant(plant: Omit<Plant, "id"> & { id?: string }) {
  const plants = plant.id
    ? data.plants.map((p) => (p.id === plant.id ? ({ ...p, ...plant } as Plant) : p))
    : [...data.plants, { ...plant, id: uid("pl") } as Plant];
  commit({ ...data, plants });
}

export function removePlant(id: string) {
  commit({
    plants: data.plants.filter((p) => p.id !== id),
    updates: data.updates.filter((u) => u.plantId !== id),
    reports: data.reports.filter((r) => r.plantId !== id),
  });
}

export function addUpdate(entry: Omit<DailyUpdate, "id" | "submittedAt"> & { submittedAt?: string }) {
  const submittedAt =
    entry.submittedAt ??
    (typeof window === "undefined" ? "09:00" : new Date().toTimeString().slice(0, 5));
  commit({ ...data, updates: [{ ...entry, submittedAt, id: uid("up") }, ...data.updates] });
}

export function removeUpdate(id: string) {
  commit({ ...data, updates: data.updates.filter((u) => u.id !== id) });
}

export function saveReport(row: Omit<ReportRow, "id" | "docNo"> & { id?: string; docNo?: string }) {
  const reports = row.id
    ? data.reports.map((r) => (r.id === row.id ? ({ ...r, ...row } as ReportRow) : r))
    : [
        ...data.reports,
        { ...row, id: uid("rp"), docNo: row.docNo ?? `FM-VM-2026-0${200 + data.reports.length}` } as ReportRow,
      ];
  commit({ ...data, reports });
}

export function setReportStatus(id: string, status: ReportStatus, sentDate?: string) {
  commit({
    ...data,
    reports: data.reports.map((r) =>
      r.id === id
        ? status === "sent"
          ? { ...r, status, sentDate: sentDate ?? TODAY }
          : { ...r, status, sentDate: undefined }
        : r,
    ),
  });
}

export function resetDemoData() {
  commit(seed());
}

// ---------------------------------------------------------------- derived

export function plantName(d: AppData, id: string) {
  return d.plants.find((p) => p.id === id)?.name ?? "—";
}

export function todaysUpdates(d: AppData, date = TODAY) {
  return d.updates.filter((u) => u.date === date);
}

export function sumUpdates(list: DailyUpdate[]) {
  return list.reduce(
    (a, u) => ({
      machinesChecked: a.machinesChecked + u.machinesChecked,
      trend: a.trend + u.trend,
      kpi: a.kpi + u.kpi,
      fft: a.fft + u.fft,
      abnormal: a.abnormal + u.abnormal,
    }),
    { machinesChecked: 0, trend: 0, kpi: 0, fft: 0, abnormal: 0 },
  );
}

export function engineerSummary(d: AppData, engineerId: string, days = 7) {
  const from = shiftDate(TODAY, -(days - 1));
  const list = d.updates.filter((u) => u.engineerId === engineerId && u.date >= from);
  const totals = sumUpdates(list);
  const reports = d.reports.filter((r) => r.byEngineerId === engineerId);
  const sent = reports.filter((r) => r.status === "sent");
  const late = sent.filter((r) => reportTiming(r).late);
  const pending = reports.filter((r) => r.status !== "sent");
  const overdue = pending.filter((r) => reportTiming(r).late);
  const submittedToday = d.updates.some((u) => u.engineerId === engineerId && u.date === TODAY);
  const daysUpdated = new Set(list.map((u) => u.date)).size;
  return {
    ...totals,
    plantsCovered: new Set(list.map((u) => u.plantId)).size,
    entries: list.length,
    daysUpdated,
    days,
    submittedToday,
    reportsSent: sent.length,
    reportsLate: late.length,
    reportsPending: pending.length,
    reportsOverdue: overdue.length,
  };
}

export function plantSummary(d: AppData, plantId: string) {
  const list = d.updates.filter((u) => u.plantId === plantId).sort((a, b) => (a.date < b.date ? 1 : -1));
  const reports = d.reports.filter((r) => r.plantId === plantId);
  const sent = reports.filter((r) => r.status === "sent").sort((a, b) => ((a.sentDate ?? "") < (b.sentDate ?? "") ? 1 : -1));
  const next = reports.filter((r) => r.status !== "sent").sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1))[0];
  return {
    lastObserved: list[0]?.date,
    lastRemark: list[0]?.remark,
    observations: list.length,
    abnormal: sumUpdates(list).abnormal,
    lastReportSent: sent[0]?.sentDate,
    nextReport: next,
  };
}

export function reportKpis(d: AppData) {
  const sent = d.reports.filter((r) => r.status === "sent");
  const pending = d.reports.filter((r) => r.status !== "sent");
  const overdue = pending.filter((r) => reportTiming(r).late);
  const late = sent.filter((r) => reportTiming(r).late);
  const dueThisWeek = pending.filter((r) => daysBetween(TODAY, r.dueDate) <= 7);
  const onTimePct = sent.length ? Math.round(((sent.length - late.length) / sent.length) * 100) : 100;
  return { sent: sent.length, late: late.length, onTimePct, pending: pending.length, overdue: overdue.length, dueThisWeek: dueThisWeek.length };
}
