import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type Status = "active" | "inactive";
export interface Kam { id: string; name: string; email: string; mobile: string; status: Status }
export interface Branch {
  id: string; name: string; kamId: string; rmName: string; rmContact: string; rmEmail: string; status: Status;
}
export interface SalesEngineer { id: string; name: string; employeeId: string; email: string; mobile: string; branchId: string; status: Status }
export interface AuditRow { id: string; entity: string; entityId: string; entityName: string; field: string; oldValue: string; newValue: string; changedBy: string; changedAt: string }

interface State { loaded: boolean; kams: Kam[]; branches: Branch[]; sales: SalesEngineer[]; audit: AuditRow[] }
let state: State = { loaded: false, kams: [], branches: [], sales: [], audit: [] };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let loading: Promise<void> | null = null;

export async function loadBranches() {
  const [k, b, s, a] = await Promise.all([
    db.from("ho_division_kams").select("*").order("name"),
    db.from("branches").select("*").order("branch_name"),
    db.from("sales_engineers").select("*").order("name"),
    db.from("ownership_audit").select("*").order("changed_at", { ascending: false }).limit(300),
  ]);
  state = {
    loaded: true,
    kams: (k.data ?? []).map((r: any) => ({ id: r.id, name: r.name, email: r.email, mobile: r.mobile, status: r.status })),
    branches: (b.data ?? []).map((r: any) => ({
      id: r.id, name: r.branch_name, kamId: r.ho_division_kam_id ?? "", rmName: r.branch_rm_name,
      rmContact: r.branch_rm_contact, rmEmail: r.branch_rm_email, status: r.status,
    })),
    sales: (s.data ?? []).map((r: any) => ({
      id: r.id, name: r.name, employeeId: r.employee_id, email: r.email, mobile: r.mobile, branchId: r.branch_id ?? "", status: r.status,
    })),
    audit: (a.data ?? []).map((r: any) => ({
      id: r.id, entity: r.entity, entityId: r.entity_id, entityName: r.entity_name, field: r.field,
      oldValue: r.old_value, newValue: r.new_value, changedBy: r.changed_by, changedAt: r.changed_at,
    })),
  };
  emit();
}

export function useBranches(): State {
  useEffect(() => {
    if (!state.loaded && !loading) loading = loadBranches().finally(() => (loading = null));
  }, []);
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => state,
    () => state,
  );
}

async function run(p: Promise<{ error: any }>) {
  const { error } = await p;
  if (error) throw new Error(error.message);
  await loadBranches();
}

export const saveKam = (k: Partial<Kam>) => {
  const row = { name: k.name?.trim(), email: k.email?.trim() ?? "", mobile: k.mobile?.trim() ?? "", status: k.status ?? "active" };
  return run(k.id ? db.from("ho_division_kams").update({ ...row, updated_at: new Date().toISOString() }).eq("id", k.id) : db.from("ho_division_kams").insert(row));
};
export const saveBranch = (b: Partial<Branch>) => {
  const row = {
    branch_name: (b.name ?? "").trim().toUpperCase(), ho_division_kam_id: b.kamId || null,
    branch_rm_name: b.rmName?.trim() ?? "", branch_rm_contact: b.rmContact?.trim() ?? "", branch_rm_email: b.rmEmail?.trim() ?? "",
    status: b.status ?? "active",
  };
  return run(b.id ? db.from("branches").update(row).eq("id", b.id) : db.from("branches").insert(row));
};
export const saveSales = (s: Partial<SalesEngineer>) => {
  const row = {
    name: s.name?.trim(), employee_id: s.employeeId?.trim() ?? "", email: s.email?.trim() ?? "", mobile: s.mobile?.trim() ?? "",
    branch_id: s.branchId || null, status: s.status ?? "active",
  };
  return run(s.id ? db.from("sales_engineers").update({ ...row, updated_at: new Date().toISOString() }).eq("id", s.id) : db.from("sales_engineers").insert(row));
};

export const emailOk = (e: string) => !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
/** Flags values that look incomplete (not corrected — shown for admin review). */
export const phoneSuspicious = (p: string) => !!p && p.replace(/\D/g, "").length !== 10;

export interface Ownership { branch: Branch | undefined; kam: Kam | undefined; sales: SalesEngineer | undefined }
export function ownershipOf(s: State, plant: { branchId?: string; salesEngineerId?: string }): Ownership {
  const branch = s.branches.find((b) => b.id === plant.branchId);
  return {
    branch,
    kam: branch ? s.kams.find((k) => k.id === branch.kamId) : undefined,
    sales: s.sales.find((x) => x.id === plant.salesEngineerId),
  };
}
