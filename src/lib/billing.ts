/** Rental billing: config per plant, derived billing periods, readiness from existing Reports. */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ReportRow } from "./store";

export type BillingModel = "none" | "rental" | "one_time" | "na";
export type InvoiceFrequency = "monthly" | "quarterly" | "half_yearly" | "annually";
export type PeriodStatus = "waiting" | "ready" | "sent_to_team" | "generated" | "invoice_sent" | "on_hold";

export const modelLabel: Record<BillingModel, string> = { none: "Not configured", rental: "Rental", one_time: "One-Time / Order", na: "Not Applicable" };
export const freqLabel: Record<InvoiceFrequency, string> = { monthly: "Monthly", quarterly: "Quarterly", half_yearly: "Half-Yearly", annually: "Annually" };
export const FREQ_MONTHS: Record<InvoiceFrequency, number> = { monthly: 1, quarterly: 3, half_yearly: 6, annually: 12 };
export const statusLabel: Record<PeriodStatus, string> = {
  waiting: "Waiting for Report", ready: "Ready for Invoice", sent_to_team: "Sent to Invoice Team",
  generated: "Invoice Generated", invoice_sent: "Invoice Sent", on_hold: "On Hold",
};
export const statusTone: Record<PeriodStatus, string> = {
  waiting: "bg-amber-500/10 text-amber-700", ready: "bg-blue-500/10 text-blue-700",
  sent_to_team: "bg-purple-500/10 text-purple-700", generated: "bg-teal-500/10 text-teal-700",
  invoice_sent: "bg-green-600/10 text-green-700", on_hold: "bg-orange-500/10 text-orange-700",
};
export const HOLD_REASONS = ["PO Pending", "Customer Confirmation Pending", "Commercial Clarification", "Report Issue", "Contract Issue", "Other"];

export interface BillingConfig {
  plantId: string; model: BillingModel; frequency: InvoiceFrequency; startDate: string;
  status: "active" | "paused"; reportRequired: boolean; poRef: string; contactName: string; contactEmail: string; note: string;
}
export interface BillingRecord {
  id: string; plantId: string; periodStart: string; periodEnd: string; frequency: InvoiceFrequency; status: PeriodStatus;
  reportIds: string[]; reportsSent: number; reportsTotal: number; poRef: string; note: string; holdReason: string;
  sentBy: string; sentAt: string; invoiceNo: string; invoiceDate: string; invoiceLink: string; invoiceComment: string; invoiceSentDate: string;
  updatedAt: string;
}
export const blankConfig = (plantId = ""): BillingConfig => ({
  plantId, model: "none", frequency: "quarterly", startDate: "", status: "active", reportRequired: true, poRef: "", contactName: "", contactEmail: "", note: "",
});

// ---------------------------------------------------------------- pure date helpers
function addMonths(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(d, last));
  return t.toISOString().slice(0, 10);
}
function minusDay(iso: string) {
  return new Date(Date.parse(iso + "T00:00:00Z") - 86400000).toISOString().slice(0, 10);
}

/** Billing period containing `date`, stepping from start by the invoice frequency. Null if before start. */
export function periodFor(start: string, freq: InvoiceFrequency, date: string): { start: string; end: string } | null {
  if (!start || date < start) return null;
  const step = FREQ_MONTHS[freq];
  let s = start;
  for (let i = 0; i < 1200; i++) {
    const next = addMonths(start, step * (i + 1));
    if (date < next) return { start: s, end: minusDay(next) };
    s = next;
  }
  return null;
}
/** All completed-or-current periods from start up to `today`, newest first. */
export function periodsUntil(start: string, freq: InvoiceFrequency, today: string) {
  const out: { start: string; end: string }[] = [];
  if (!start || today < start) return out;
  const step = FREQ_MONTHS[freq];
  for (let i = 0; i < 1200; i++) {
    const s = addMonths(start, step * i);
    if (s > today) break;
    out.push({ start: s, end: minusDay(addMonths(start, step * (i + 1))) });
  }
  return out.reverse();
}
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function periodLabel(start: string, end: string) {
  const a = MON[Number(start.slice(5, 7)) - 1], b = MON[Number(end.slice(5, 7)) - 1];
  const ya = start.slice(0, 4), yb = end.slice(0, 4);
  if (start.slice(0, 7) === end.slice(0, 7)) return `${a} ${ya}`;
  return ya === yb ? `${a} – ${b} ${yb}` : `${a} ${ya} – ${b} ${yb}`;
}

/** Scheduled (non on-demand) reports whose due date falls in the period. */
export function periodReports(reports: ReportRow[], plantId: string, start: string, end: string) {
  return reports.filter((r) => r.plantId === plantId && r.type !== "on-demand" && r.dueDate >= start && r.dueDate <= end)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** Readiness from reports: Ready only when every required report is sent (and at least one exists). */
export function readiness(reportRequired: boolean, list: ReportRow[]): { sent: number; total: number; status: "waiting" | "ready" } {
  const sent = list.filter((r) => r.status === "sent").length;
  const total = list.length;
  if (!reportRequired) return { sent, total, status: "ready" };
  return { sent, total, status: total > 0 && sent === total ? "ready" : "waiting" };
}

/** Effective status: a saved handoff record wins, otherwise derived from reports. */
export function effectiveStatus(rec: BillingRecord | undefined, derived: "waiting" | "ready"): PeriodStatus {
  return rec ? rec.status : derived;
}

export interface PlantBillingView {
  config: BillingConfig; period: { start: string; end: string } | null; reports: ReportRow[];
  sent: number; total: number; status: PeriodStatus | null; record?: BillingRecord;
}
export function plantBilling(config: BillingConfig | undefined, plantId: string, reports: ReportRow[], records: BillingRecord[], today: string, at?: { start: string; end: string }): PlantBillingView {
  const cfg = config ?? blankConfig(plantId);
  if (cfg.model !== "rental" || !cfg.startDate) return { config: cfg, period: null, reports: [], sent: 0, total: 0, status: null };
  const period = at ?? periodFor(cfg.startDate, cfg.frequency, today);
  if (!period) return { config: cfg, period: null, reports: [], sent: 0, total: 0, status: null };
  const list = periodReports(reports, plantId, period.start, period.end);
  const r = readiness(cfg.reportRequired, list);
  const record = records.find((x) => x.plantId === plantId && x.periodStart === period.start);
  return { config: cfg, period, reports: list, sent: r.sent, total: r.total, status: effectiveStatus(record, r.status), record };
}

// ---------------------------------------------------------------- cloud
/* eslint-disable @typescript-eslint/no-explicit-any */
const toCfg = (r: any): BillingConfig => ({
  plantId: r.plant_id, model: r.model, frequency: r.frequency, startDate: r.start_date ?? "", status: r.status,
  reportRequired: r.report_required, poRef: r.po_ref, contactName: r.contact_name, contactEmail: r.contact_email, note: r.note,
});
const toRec = (r: any): BillingRecord => ({
  id: r.id, plantId: r.plant_id, periodStart: r.period_start, periodEnd: r.period_end, frequency: r.frequency, status: r.status,
  reportIds: r.report_ids ?? [], reportsSent: r.reports_sent, reportsTotal: r.reports_total, poRef: r.po_ref, note: r.note,
  holdReason: r.hold_reason, sentBy: r.sent_by, sentAt: r.sent_at ?? "", invoiceNo: r.invoice_no, invoiceDate: r.invoice_date ?? "",
  invoiceLink: r.invoice_link, invoiceComment: r.invoice_comment, invoiceSentDate: r.invoice_sent_date ?? "", updatedAt: r.updated_at,
});

const KEY = ["billing"];
export function useBilling() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const [c, p] = await Promise.all([
        supabase.from("plant_billing").select("*"),
        supabase.from("billing_periods").select("*").order("period_start", { ascending: false }),
      ]);
      if (c.error) throw c.error;
      if (p.error) throw p.error;
      return { configs: (c.data ?? []).map(toCfg), records: (p.data ?? []).map(toRec) };
    },
  });
  const configs = q.data?.configs ?? [];
  const records = q.data?.records ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: KEY });
  return { configs, records, loading: q.isLoading, refresh, configOf: (id: string) => configs.find((c) => c.plantId === id) };
}

export async function saveBillingConfig(c: BillingConfig, by: string) {
  const { error } = await supabase.from("plant_billing").upsert({
    plant_id: c.plantId, model: c.model, frequency: c.frequency, start_date: c.startDate || null, status: c.status,
    report_required: c.reportRequired, po_ref: c.poRef, contact_name: c.contactName, contact_email: c.contactEmail, note: c.note,
    updated_by: by, updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function upsertPeriod(input: Partial<BillingRecord> & { plantId: string; periodStart: string; periodEnd: string; frequency: InvoiceFrequency; status: PeriodStatus }, by: string) {
  const row: Record<string, unknown> = {
    plant_id: input.plantId, period_start: input.periodStart, period_end: input.periodEnd, frequency: input.frequency, status: input.status,
    updated_by: by, updated_at: new Date().toISOString(),
  };
  const map: [keyof BillingRecord, string][] = [
    ["reportIds", "report_ids"], ["reportsSent", "reports_sent"], ["reportsTotal", "reports_total"], ["poRef", "po_ref"], ["note", "note"],
    ["holdReason", "hold_reason"], ["sentBy", "sent_by"], ["sentAt", "sent_at"], ["invoiceNo", "invoice_no"], ["invoiceDate", "invoice_date"],
    ["invoiceLink", "invoice_link"], ["invoiceComment", "invoice_comment"], ["invoiceSentDate", "invoice_sent_date"],
  ];
  for (const [k, col] of map) if (input[k] !== undefined) row[col] = input[k] === "" && /date|_at$/.test(col) ? null : input[k];
  const { error } = await supabase.from("billing_periods").upsert(row as never, { onConflict: "plant_id,period_start" });
  if (error) throw error;
}

export async function removePeriod(plantId: string, periodStart: string) {
  const { error } = await supabase.from("billing_periods").delete().eq("plant_id", plantId).eq("period_start", periodStart);
  if (error) throw error;
}
