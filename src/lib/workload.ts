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
}
const defaults: WorkloadSettings = { csHigh: null, csOver: null, execHigh: null, execOver: null, nonWorkingDays: [0, 6], holidays: [] };

let state: WorkloadSettings = defaults;
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function loadWorkloadSettings() {
  const { data } = await db.from("workload_settings").select("*").eq("id", "default").maybeSingle();
  if (data) state = { csHigh: data.cs_high, csOver: data.cs_over, execHigh: data.exec_high, execOver: data.exec_over, nonWorkingDays: data.non_working_days ?? [0, 6], holidays: data.holidays ?? [] };
  loaded = true;
  emit();
}

export function useWorkloadSettings() {
  useEffect(() => { if (!loaded) void loadWorkloadSettings(); }, []);
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => state, () => state);
}

export async function saveWorkloadSettings(s: WorkloadSettings, by: string) {
  const { error } = await db.from("workload_settings").upsert({
    id: "default", cs_high: s.csHigh, cs_over: s.csOver, exec_high: s.execHigh, exec_over: s.execOver,
    non_working_days: s.nonWorkingDays, holidays: s.holidays, updated_by: by, updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  state = s;
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
export interface Leave { id: string; personId: string; start: string; end: string; reason: string; note: string }
let leaves: Leave[] = [];
let leavesLoaded = false;
const leaveListeners = new Set<() => void>();
const emitLeaves = () => leaveListeners.forEach((l) => l());
export async function loadLeaves() {
  const { data } = await db.from("engineer_leaves").select("*").order("start_date");
  leaves = (data ?? []).map((r: any) => ({ id: r.id, personId: r.person_id, start: r.start_date, end: r.end_date, reason: r.reason, note: r.note }));
  leavesLoaded = true;
  emitLeaves();
}
export function useLeaves() {
  useEffect(() => { if (!leavesLoaded) void loadLeaves(); }, []);
  return useSyncExternalStore((cb) => { leaveListeners.add(cb); return () => { leaveListeners.delete(cb); }; }, () => leaves, () => leaves);
}
export async function addLeave(l: Omit<Leave, "id">, by: string) {
  const { error } = await db.from("engineer_leaves").insert({ person_id: l.personId, start_date: l.start, end_date: l.end, reason: l.reason, note: l.note, created_by: by });
  if (error) throw new Error(error.message);
  await loadLeaves();
}
export async function deleteLeave(id: string) {
  const { error } = await db.from("engineer_leaves").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await loadLeaves();
}
export const leaveOn = (ls: Leave[], personId: string, d: string) => ls.find((l) => l.personId === personId && l.start <= d && l.end >= d);
