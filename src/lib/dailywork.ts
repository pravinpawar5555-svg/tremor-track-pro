import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

export type NotifyRule = "on_time" | "10m" | "1h" | "custom" | "none";
export const notifyLabel: Record<NotifyRule, string> = {
  on_time: "On due date/time",
  "10m": "10 minutes before",
  "1h": "1 hour before",
  custom: "Custom",
  none: "Don't notify",
};

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  description: string;
  plantId: string;
  taskId: string;
  date: string;
  time: string;
  notify: NotifyRule;
  status: "active" | "done";
  createdBy: string;
  completedAt: string | null;
  seenAt?: string | null;
}

export interface DayClosure {
  id: string;
  engineerId: string;
  workDate: string;
  assigned: number;
  completed: number;
  remaining: number;
  waiting: number;
  carried: number;
  note: string;
  closedAt: string;
}

interface State {
  reminders: Reminder[];
  closures: DayClosure[];
}

let state: State = { reminders: [], closures: [] };
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const toReminder = (r: any): Reminder => ({
  id: r.id,
  userId: r.user_id,
  title: r.title,
  description: r.description ?? "",
  plantId: r.plant_id ?? "",
  taskId: r.task_id ?? "",
  date: r.remind_date,
  time: r.remind_time ?? "",
  notify: (r.notify || "on_time") as NotifyRule,
  status: r.status === "done" ? "done" : "active",
  createdBy: r.created_by ?? "",
  completedAt: r.completed_at ?? null,
  seenAt: r.seen_at ?? null,
});
const fromReminder = (r: Reminder) => ({
  id: r.id,
  user_id: r.userId,
  title: r.title,
  description: r.description,
  plant_id: r.plantId,
  task_id: r.taskId,
  remind_date: r.date,
  remind_time: r.time,
  notify: r.notify,
  status: r.status,
  created_by: r.createdBy,
  completed_at: r.completedAt,
});
const toClosure = (r: any): DayClosure => ({
  id: r.id,
  engineerId: r.engineer_id,
  workDate: r.work_date,
  assigned: r.assigned,
  completed: r.completed,
  remaining: r.remaining,
  waiting: r.waiting,
  carried: r.carried,
  note: r.note ?? "",
  closedAt: r.closed_at,
});

export async function loadDailyWork() {
  const [r, c] = await Promise.all([
    db.from("reminders").select("*").order("remind_date"),
    db.from("day_closures").select("*").order("work_date", { ascending: false }),
  ]);
  state = { reminders: (r.data ?? []).map(toReminder), closures: (c.data ?? []).map(toClosure) };
  loaded = true;
  emit();
}

export function useDailyWork() {
  useEffect(() => {
    if (!loaded) void loadDailyWork();
  }, []);
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

export function blankReminder(userId: string, date: string): Reminder {
  return {
    id: crypto.randomUUID(),
    userId,
    title: "",
    description: "",
    plantId: "",
    taskId: "",
    date,
    time: "",
    notify: "on_time",
    status: "active",
    createdBy: userId,
    completedAt: null,
  };
}

export async function saveReminder(r: Reminder) {
  const exists = state.reminders.some((x) => x.id === r.id);
  state = {
    ...state,
    reminders: exists ? state.reminders.map((x) => (x.id === r.id ? r : x)) : [...state.reminders, r],
  };
  emit();
  const { error } = await db.from("reminders").upsert(fromReminder(r));
  if (error) console.error("reminder save failed", error);
}

export async function deleteReminder(id: string) {
  state = { ...state, reminders: state.reminders.filter((x) => x.id !== id) };
  emit();
  await db.from("reminders").delete().eq("id", id);
}

export async function markRemindersSeen(ids: string[]) {
  if (!ids.length) return;
  const at = new Date().toISOString();
  state = { ...state, reminders: state.reminders.map((x) => (ids.includes(x.id) ? { ...x, seenAt: at } : x)) };
  emit();
  await db.from("reminders").update({ seen_at: at }).in("id", ids);
}

export async function saveClosure(c: Omit<DayClosure, "id" | "closedAt">) {
  const { data, error } = await db
    .from("day_closures")
    .upsert(
      {
        engineer_id: c.engineerId,
        work_date: c.workDate,
        assigned: c.assigned,
        completed: c.completed,
        remaining: c.remaining,
        waiting: c.waiting,
        carried: c.carried,
        note: c.note,
        closed_at: new Date().toISOString(),
      },
      { onConflict: "engineer_id,work_date" },
    )
    .select("*");
  if (error) {
    console.error("close day failed", error);
    return false;
  }
  const row = toClosure(data[0]);
  state = {
    ...state,
    closures: [row, ...state.closures.filter((x) => !(x.engineerId === row.engineerId && x.workDate === row.workDate))],
  };
  emit();
  return true;
}
