// Role access matrix (public.role_permissions / reminder_rules). Enforced in the database by
// perm_level() policies and the reminders trigger; the UI reads the same rows.
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Level = "none" | "own" | "all";
export type PermRole = "customer_success" | "execution";
export interface Perm { role: PermRole; module: string; action: string; level: Level }
export interface Rule { from_domain: PermRole; to_domain: PermRole; allowed: boolean }
export interface Audit { id: string; setting: string; old_value: string; new_value: string; changed_by: string; changed_at: string }

export const ROLES: [PermRole, string][] = [["customer_success", "CS Engineer"], ["execution", "Execution Engineer"]];
export const MODULES: [string, string][] = [
  ["tasks", "Daily Work"], ["reminders", "Reminders"], ["discussions", "Discussion & Tickets"], ["visits", "Visits"],
  ["execution", "Execution"], ["opportunities", "Leads & Opportunities"], ["reports", "Reports"], ["plants", "Plants"],
  ["contacts", "Customer Phonebook"], ["engineers", "Engineers"], ["settings", "Settings"],
];
export const ACTIONS = ["view", "create", "edit", "assign", "approve", "close", "export"] as const;
export const REMINDER_ACTIONS = ["view", "create", "edit", "resolve"] as const;
export const DASH_SECTIONS: [string, string][] = [
  ["kpis", "Headline cards"], ["alerts", "Alerts & attention"], ["tasks", "Today's work"], ["reports", "Report status"],
  ["visits", "Visits"], ["execution", "Execution jobs"], ["opportunities", "Leads"], ["workload", "Workload"],
];
export const PATH_MODULE: Record<string, string> = {
  "/tasks": "tasks", "/discussions": "discussions", "/visits": "visits", "/execution": "execution",
  "/opportunities": "opportunities", "/reports": "reports", "/plants": "plants", "/contacts": "contacts",
  "/engineers": "engineers", "/settings": "settings",
};

let perms: Perm[] | null = null;
const ls = new Set<() => void>();
const emit = () => ls.forEach((l) => l());

export async function loadPermissions() {
  const { data } = await (supabase as any).from("role_permissions").select("role,module,action,level");
  perms = (data ?? []) as Perm[];
  emit();
  return perms;
}
export function usePermissions() {
  return useSyncExternalStore((l) => { ls.add(l); return () => { ls.delete(l); }; }, () => perms, () => perms);
}

/** Pure lookup; missing rows mean "own" (today's behaviour). */
export function levelOf(list: Perm[] | null, role: string, module: string, action: string): Level {
  return list?.find((p) => p.role === role && p.module === module && p.action === action)?.level ?? "own";
}

export async function loadRules(): Promise<Rule[]> {
  const { data } = await (supabase as any).from("reminder_rules").select("from_domain,to_domain,allowed");
  return (data ?? []) as Rule[];
}
export async function loadAudit(): Promise<Audit[]> {
  const { data } = await (supabase as any).from("permission_audit").select("*").order("changed_at", { ascending: false }).limit(200);
  return (data ?? []) as Audit[];
}
export async function savePermissions(changed: Perm[], rules: Rule[]) {
  if (changed.length) {
    const { error } = await (supabase as any).from("role_permissions").upsert(changed, { onConflict: "role,module,action" });
    if (error) throw error;
  }
  if (rules.length) {
    const { error } = await (supabase as any).from("reminder_rules").upsert(rules, { onConflict: "from_domain,to_domain" });
    if (error) throw error;
  }
  await loadPermissions();
}
