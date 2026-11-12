import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

/** Manager-configured workload rules. Null thresholds = show counts only, no judgement. */
export interface WorkloadSettings {
  csHigh: number | null;
  csOver: number | null;
  execHigh: number | null;
  execOver: number | null;
  nonWorkingDays: number[]; // 0 = Sunday
  holidays: string[];
  holidayNames: Record<string, string>;
}
const defaults: WorkloadSettings = { csHigh: null, csOver: null, execHigh: null, execOver: null, nonWorkingDays: [0, 6], holidays: [], holidayNames: {} };

let state: WorkloadSettings = defaults;
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const workloadSettingsLoaded = () => loaded;

export function normalizeHolidayNames(holidays: string[], names: Record<string, string> = {}) {
  return Object.fromEntries([...new Set(holidays)].sort().map((d) => [d, names[d]?.trim() || "Holiday"]));
}

function settingsFromRow(data: any): WorkloadSettings {
  const holidays = data.holidays ?? [];
  return {
    csHigh: data.cs_high, csOver: data.cs_over, execHigh: data.exec_high, execOver: data.exec_over,
    nonWorkingDays: data.non_working_days ?? [0, 6], holidays,
    holidayNames: normalizeHolidayNames(holidays, data.holiday_names ?? {}),
  };
}

export function addHolidayDates(s: WorkloadSettings, dates: string[], name: string): WorkloadSettings {
  const holidays = [...new Set([...s.holidays, ...dates])].sort();
  const names = { ...(s.holidayNames ?? {}) };
  for (const d of dates) names[d] = name.trim() || names[d] || "Holiday";
  return { ...s, holidays, holidayNames: normalizeHolidayNames(holidays, names) };
}

export function renameHoliday(s: WorkloadSettings, date: string, name: string): WorkloadSettings {
  if (!s.holidays.includes(date)) return s;
  return { ...s, holidayNames: { ...(s.holidayNames ?? {}), [date]: name } };
}

export async function loadWorkloadSettings() {
  if (loading) return loading;
  loading = (async () => {
    const { data, error } = await db.from("workload_settings").select("*").eq("id", "default").maybeSingle();
    if (error) throw new Error(error.message);
    state = data ? settingsFromRow(data) : defaults;
    loaded = true;
    emit();
  })().finally(() => { loading = null; });
  return loading;
}

export function useWorkloadSettings() {
  useEffect(() => { if (!loaded) void loadWorkloadSettings().catch(() => undefined); }, []);
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => state, () => state);
}

export async function saveWorkloadSettings(s: WorkloadSettings, by: string) {
  const holidays = [...new Set(s.holidays)].sort();
  const clean = { ...s, holidays, holidayNames: normalizeHolidayNames(holidays, s.holidayNames) };
  const { data, error } = await db.from("workload_settings").upsert({
    id: "default", cs_high: clean.csHigh, cs_over: clean.csOver, exec_high: clean.execHigh, exec_over: clean.execOver,
    non_working_days: clean.nonWorkingDays, holidays: clean.holidays, holiday_names: clean.holidayNames, updated_by: by, updated_at: new Date().toISOString(),
  }).select("*").single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Saved settings could not be read back");
  state = settingsFromRow(data);
  loaded = true;
  emit();
}

export type Level = "none" | "normal" | "high" | "over";
export function levelFor(value: number, high: number | null, over: number | null): Level | null {
  if (!value) return "none";
  if (high === null && over === null) return null; // not configured — no judgement
  if (over !== null && value >= over) return "over";
  if (high !== null && value >= high) return "high";
  return "normal";
}

/* ------------------------------------------------------------ Engineer leaves */
export interface Leave { id: string; personId: string; start: string; end: string; reason: string; note: string; status?: string }
let leaves: Leave[] = [];
let leavesLoaded = false;
const leaveListeners = new Set<() => void>();
const emitLeaves = () => leaveListeners.forEach((l) => l());
export async function loadLeaves() {
  const { data } = await db.from("engineer_leaves").select("*").order("start_date");
  leaves = (data ?? []).map((r: any) => ({ id: r.id, personId: r.person_id, start: r.start_date, end: r.end_date, reason: r.reason, note: r.note, status: r.status ?? "approved" }));
  leavesLoaded = true;
  emitLeaves();
}
export function useLeaves() {
  useEffect(() => { if (!leavesLoaded) void loadLeaves(); }, []);
  return useSyncExternalStore((cb) => { leaveListeners.add(cb); return () => { leaveListeners.delete(cb); }; }, () => leaves, () => leaves);
}
export async function addLeave(l: Omit<Leave, "id">, by: string, approved = true) {
  const { error } = await db.from("engineer_leaves").insert({ person_id: l.personId, start_date: l.start, end_date: l.end, reason: l.reason, note: l.note, created_by: by, status: approved ? "approved" : "pending", reviewed_by: approved ? by : "" });
  if (error) throw new Error(error.message);
  await loadLeaves();
}
export async function deleteLeave(id: string) {
  const { error } = await db.from("engineer_leaves").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await loadLeaves();
}
export async function reviewLeave(id: string, approve: boolean, by: string) {
  const { error } = await db.from("engineer_leaves").update({ status: approve ? "approved" : "rejected", reviewed_by: by }).eq("id", id);
  if (error) throw error;
  await loadLeaves();
}
/** Only approved leave counts as a Leave day in Workload. */
export const WFH_REASON = "Work From Home";
export const isWfh = (l: Leave) => l.reason === WFH_REASON;
const approvedOn = (ls: Leave[], personId: string, d: string, wfh: boolean) => ls.find((l) => (l.status ?? "approved") === "approved" && isWfh(l) === wfh && l.personId === personId && l.start <= d && l.end >= d);
export const leaveOn = (ls: Leave[], personId: string, d: string) => approvedOn(ls, personId, d, false);
export const wfhOn = (ls: Leave[], personId: string, d: string) => approvedOn(ls, personId, d, true);

/** All ISO dates from start to end inclusive (max 366). */
export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  if (!start) return out;
  const e = end && end >= start ? end : start;
  const d = new Date(start + "T00:00:00Z");
  while (out.length < 366) { const iso = d.toISOString().slice(0, 10); if (iso > e) break; out.push(iso); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}
