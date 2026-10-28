import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button, Field, Select, TextInput } from "@/components/console/ui";
import { TODAY, engineerName, fmtDate, useData, type Plant } from "@/lib/store";
import { useDomain } from "@/lib/domain";
import { ownershipOf, useBranches } from "@/lib/branches";
import {
  FREQ_MONTHS, HOLD_REASONS, freqLabel, modelLabel, periodLabel, periodsUntil, plantBilling, removePeriod, statusLabel, statusTone,
  upsertPeriod, useBilling, type BillingConfig, type InvoiceFrequency, type PeriodStatus, type PlantBillingView,
} from "@/lib/billing";

export function BillingBadge({ status }: { status: PeriodStatus | null }) {
  if (!status) return <span className="rounded px-1.5 py-0.5 text-[10px] text-mute ring-1 ring-line">Not configured</span>;
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${statusTone[status]}`}>{statusLabel[status]}</span>;
}

/** Small "Billing: Quarterly · status" line used under Report cycle. */
export function BillingLine({ view, onOpen }: { view: PlantBillingView; onOpen?: () => void }) {
  const rental = view.config.model === "rental";
  return (
    <button type="button" onClick={onOpen} className="mt-1 flex flex-wrap items-center gap-1 text-left text-xs text-mute">
      <span>Billing:</span>
      {rental ? <><span>{freqLabel[view.config.frequency]}</span><BillingBadge status={view.config.status === "paused" ? "on_hold" : view.status} /></>
        : view.config.model === "none" ? <BillingBadge status={null} /> : <span>{modelLabel[view.config.model]}</span>}
    </button>
  );
}

/** Rental & Billing section inside the Edit Plant form. */
export function BillingFormSection({ value, onChange }: { value: BillingConfig; onChange: (c: BillingConfig) => void }) {
  const set = (p: Partial<BillingConfig>) => onChange({ ...value, ...p });
  const rental = value.model === "rental";
  return (
    <div className="panel-inset grid gap-3 p-3 sm:col-span-2 sm:grid-cols-2 xl:col-span-4 xl:grid-cols-4">
      <div className="label-caps sm:col-span-2 xl:col-span-4">Rental & billing <span className="normal-case text-mute">(optional — separate from report cycle and AMC dates)</span></div>
      <Field label="Billing model">
        <Select value={value.model} onChange={(e) => set({ model: e.target.value as BillingConfig["model"] })}>
          <option value="none">Not configured</option><option value="rental">Rental</option><option value="one_time">One-Time / Order</option><option value="na">Not Applicable</option>
        </Select>
      </Field>
      {rental ? (
        <>
          <Field label="Invoice frequency">
            <Select value={value.frequency} onChange={(e) => set({ frequency: e.target.value as InvoiceFrequency })}>
              {(Object.keys(FREQ_MONTHS) as InvoiceFrequency[]).map((f) => <option key={f} value={f}>{freqLabel[f]}</option>)}
            </Select>
          </Field>
          <Field label="Billing start date"><TextInput type="date" value={value.startDate} onChange={(e) => set({ startDate: e.target.value })} /></Field>
          <Field label="Report required before invoice">
            <Select value={value.reportRequired ? "yes" : "no"} onChange={(e) => set({ reportRequired: e.target.value === "yes" })}><option value="yes">Yes</option><option value="no">No</option></Select>
          </Field>
          <Field label="Customer PO / order ref"><TextInput value={value.poRef} onChange={(e) => set({ poRef: e.target.value })} placeholder="PO-xxxx" /></Field>
          <Field label="Billing contact"><TextInput value={value.contactName} onChange={(e) => set({ contactName: e.target.value })} placeholder="Mr. ______" /></Field>
          <Field label="Billing email"><TextInput type="email" value={value.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} /></Field>
          <Field label="Billing status">
            <Select value={value.status} onChange={(e) => set({ status: e.target.value as BillingConfig["status"] })}><option value="active">Active</option><option value="paused">Paused</option></Select>
          </Field>
          <div className="sm:col-span-2 xl:col-span-4"><Field label="Billing note"><TextInput value={value.note} onChange={(e) => set({ note: e.target.value })} /></Field></div>
        </>
      ) : null}
    </div>
  );
}

const FLOW: { key: PeriodStatus; label: string }[] = [
  { key: "waiting", label: "Reports" }, { key: "ready", label: "Ready for invoice" }, { key: "sent_to_team", label: "Invoice team" },
  { key: "generated", label: "Invoice generated" }, { key: "invoice_sent", label: "Invoice sent" },
];

function useActor() {
  const data = useData();
  return engineerName(data, data.currentUserId);
}

/** Billing & Invoice detail for one plant. */
export function BillingDialog({ plant, open, onClose }: { plant: Plant | null; open: boolean; onClose: () => void }) {
  const data = useData();
  const b = useBilling();
  const isManager = useDomain() === "manager";
  const actor = useActor();
  const cfg = plant ? b.configOf(plant.id) : undefined;
  const [sel, setSel] = useState<string | null>(null);
  const periods = useMemo(() => (cfg?.model === "rental" && cfg.startDate ? periodsUntil(cfg.startDate, cfg.frequency, TODAY) : []), [cfg]);
  const at = periods.find((p) => p.start === sel) ?? periods[0];
  const view = plant ? plantBilling(cfg, plant.id, data.reports, b.records, TODAY, at) : null;
  const [mode, setMode] = useState<"" | "handoff" | "hold" | "invoice">("");
  const [note, setNote] = useState("");
  const [hold, setHold] = useState<string>(HOLD_REASONS[0] ?? "Other");
  const [inv, setInv] = useState({ no: "", date: TODAY, link: "", comment: "" });
  const [busy, setBusy] = useState(false);

  if (!plant || !view) return null;
  const rec = view.record;
  const st = view.status;
  const base = view.period ? { plantId: plant.id, periodStart: view.period.start, periodEnd: view.period.end, frequency: view.config.frequency } : null;
  const run = async (fn: () => Promise<void>, msg: string) => {
    setBusy(true);
    try { await fn(); await b.refresh(); toast.success(msg); setMode(""); setNote(""); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not save"); }
    finally { setBusy(false); }
  };
  const handoff = () => base && run(() => upsertPeriod({
    ...base, status: "sent_to_team", reportIds: view.reports.map((r) => r.id), reportsSent: view.sent, reportsTotal: view.total,
    poRef: view.config.poRef, note, sentBy: actor, sentAt: new Date().toISOString(), holdReason: "",
  }, actor), `Ready for Invoice — ${plant.name} · ${periodLabel(base.periodStart, base.periodEnd)} sent to invoice team`);
  const putHold = () => base && run(() => upsertPeriod({ ...base, status: "on_hold", holdReason: hold ?? "", note: note || rec?.note || "", reportsSent: view.sent, reportsTotal: view.total }, actor), `On hold — ${hold}`);
  const release = () => base && run(() => rec?.sentAt ? upsertPeriod({ ...base, status: rec.invoiceNo ? "generated" : "sent_to_team", holdReason: "" }, actor) : removePeriod(base.plantId, base.periodStart), "Hold released");
  const generate = () => base && run(() => upsertPeriod({ ...base, status: "generated", invoiceNo: inv.no.trim(), invoiceDate: inv.date, invoiceLink: inv.link.trim(), invoiceComment: inv.comment }, actor), `Invoice Generated — ${inv.no}`);
  const markSent = () => base && run(() => upsertPeriod({ ...base, status: "invoice_sent", invoiceSentDate: TODAY }, actor), `Invoice Sent — ${plant.name}`);
  const stepIdx = st === "on_hold" ? -1 : FLOW.findIndex((f) => f.key === st);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setMode(""); setSel(null); } }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plant.name}</DialogTitle>
          <div className="text-sm text-mute">{modelLabel[view.config.model]} billing{view.config.model === "rental" ? ` · ${freqLabel[view.config.frequency]}` : ""}{view.config.poRef ? ` · PO ${view.config.poRef}` : ""}</div>
        </DialogHeader>
        {view.config.model !== "rental" || !view.config.startDate ? (
          <p className="text-sm text-mute">Billing is not configured as Rental with a start date for this plant. {isManager ? "Use Edit plant → Rental & billing to set it up." : "Ask your manager to set it up."}</p>
        ) : !view.period ? (
          <p className="text-sm text-mute">Billing starts on {fmtDate(view.config.startDate)}.</p>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="panel-inset grid grid-cols-2 gap-3 p-3 sm:grid-cols-4">
              <div className="col-span-2"><div className="label-caps">Billing period</div><div className="text-base font-semibold">{periodLabel(view.period.start, view.period.end)}</div><div className="num text-xs text-mute">{fmtDate(view.period.start)} – {fmtDate(view.period.end)}</div></div>
              <div><div className="label-caps">Report progress</div><div className="num font-semibold">{view.sent} / {view.total} sent</div>{!view.config.reportRequired ? <div className="text-xs text-mute">Not required</div> : null}</div>
              <div><div className="label-caps">Status</div><BillingBadge status={st} />{rec?.holdReason && st === "on_hold" ? <div className="mt-1 text-xs">{rec.holdReason}</div> : null}</div>
            </div>
            {view.config.status === "paused" ? <div className="rounded bg-orange-500/10 px-3 py-2 text-xs text-orange-700">Billing is paused for this plant.</div> : null}

            <ol className="flex flex-wrap items-center gap-1 text-xs">
              {FLOW.map((f, i) => (
                <li key={f.key} className="flex items-center gap-1">
                  <span className={`rounded-full px-2 py-1 ring-1 ${i <= stepIdx ? "bg-signal/10 text-signal ring-signal/40" : "text-mute ring-line"}`}>{i <= stepIdx ? "✓" : "○"} {f.label}</span>
                  {i < FLOW.length - 1 ? <span className="text-mute">→</span> : null}
                </li>
              ))}
            </ol>

            {rec?.sentAt ? <div className="text-xs">Sent to invoice team <span className="num">{fmtDate(rec.sentAt.slice(0, 10))}</span> by {rec.sentBy}{rec.note ? ` — ${rec.note}` : ""}</div> : null}
            {rec?.invoiceNo ? (
              <div className="panel-inset p-3 text-xs">
                <div><span className="text-mute">Invoice no:</span> <span className="num font-semibold">{rec.invoiceNo}</span> · <span className="text-mute">Date:</span> {fmtDate(rec.invoiceDate)}</div>
                {rec.invoiceSentDate ? <div className="mt-1 text-green-700">✓ Sent to customer {fmtDate(rec.invoiceSentDate)}</div> : null}
                {rec.invoiceComment ? <div className="mt-1 text-mute">{rec.invoiceComment}</div> : null}
                {rec.invoiceLink ? <a href={rec.invoiceLink} target="_blank" rel="noreferrer" className="mt-1 inline-block text-signal">Open invoice</a> : null}
              </div>
            ) : null}

            {isManager && view.config.status === "active" ? (
              <div className="flex flex-wrap gap-2">
                {st === "ready" ? <Button variant="solid" onClick={() => setMode("handoff")}>Send to Invoice Team</Button> : null}
                {st === "sent_to_team" ? <Button variant="solid" onClick={() => setMode("invoice")}>Mark Invoice Generated</Button> : null}
                {st === "generated" ? <Button variant="solid" disabled={busy} onClick={markSent}>Mark Sent to Customer</Button> : null}
                {st === "on_hold" ? <Button disabled={busy} onClick={release}>Release hold</Button> : st !== "invoice_sent" ? <Button variant="ghost" onClick={() => setMode("hold")}>Put on hold</Button> : null}
              </div>
            ) : null}
            {st === "waiting" ? <div className="text-xs text-amber-700">Waiting for {view.total - view.sent || "scheduled"} report(s) — the invoice can be sent once all reports in this period are marked Sent.</div> : null}

            {mode === "handoff" ? (
              <div className="panel-inset space-y-2 p-3">
                <div className="label-caps">Confirm handoff</div>
                <div className="grid grid-cols-2 gap-1 text-xs"><span className="text-mute">Plant</span><span>{plant.name}</span><span className="text-mute">Period</span><span>{periodLabel(view.period.start, view.period.end)}</span><span className="text-mute">Frequency</span><span>{freqLabel[view.config.frequency]}</span><span className="text-mute">Reports</span><span>{view.sent} / {view.total}</span><span className="text-mute">Customer PO</span><span>{view.config.poRef || "—"}</span></div>
                <TextInput placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="flex gap-2"><Button variant="solid" disabled={busy} onClick={handoff}>Confirm handoff</Button><Button variant="ghost" onClick={() => setMode("")}>Cancel</Button></div>
              </div>
            ) : null}
            {mode === "hold" ? (
              <div className="panel-inset space-y-2 p-3">
                <Field label="Hold reason"><Select value={hold} onChange={(e) => setHold(e.target.value)}>{HOLD_REASONS.map((h) => <option key={h}>{h}</option>)}</Select></Field>
                <TextInput placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="flex gap-2"><Button variant="solid" disabled={busy} onClick={putHold}>Put on hold</Button><Button variant="ghost" onClick={() => setMode("")}>Cancel</Button></div>
              </div>
            ) : null}
            {mode === "invoice" ? (
              <div className="panel-inset grid gap-2 p-3 sm:grid-cols-2">
                <Field label="Invoice number"><TextInput value={inv.no} onChange={(e) => setInv({ ...inv, no: e.target.value })} placeholder="FM-INV-2026-032" /></Field>
                <Field label="Invoice date"><TextInput type="date" value={inv.date} onChange={(e) => setInv({ ...inv, date: e.target.value })} /></Field>
                <Field label="Invoice link"><TextInput value={inv.link} onChange={(e) => setInv({ ...inv, link: e.target.value })} placeholder="https://…" /></Field>
                <Field label="Comment"><TextInput value={inv.comment} onChange={(e) => setInv({ ...inv, comment: e.target.value })} /></Field>
                <div className="flex gap-2 sm:col-span-2"><Button variant="solid" disabled={busy || !inv.no.trim()} onClick={generate}>Save — Invoice Generated</Button><Button variant="ghost" onClick={() => setMode("")}>Cancel</Button></div>
              </div>
            ) : null}

            <div>
              <div className="label-caps mb-1">Reports in this billing period</div>
              {view.reports.length ? (
                <ul className="divide-y divide-line/60 rounded ring-1 ring-line">
                  {view.reports.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                      <span><span className="font-medium">{r.period}</span> · <span className="capitalize">{r.type}</span> report</span>
                      <span className="flex items-center gap-2">{r.status === "sent" ? <span className="text-green-700">✓ Sent {fmtDate(r.sentDate)}</span> : <span className="capitalize text-amber-700">{r.status}</span>}<Link to="/reports" className="text-signal">Open</Link></span>
                    </li>
                  ))}
                </ul>
              ) : <div className="text-xs text-mute">No scheduled reports fall in this period yet.</div>}
            </div>

            {periods.length > 1 ? (
              <div>
                <div className="label-caps mb-1">Billing history</div>
                <ul className="divide-y divide-line/60 rounded ring-1 ring-line">
                  {periods.map((p) => {
                    const v = plantBilling(cfg, plant.id, data.reports, b.records, TODAY, p);
                    return (
                      <li key={p.start}>
                        <button type="button" onClick={() => { setSel(p.start); setMode(""); }} className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-black/5 ${p.start === view.period?.start ? "bg-signal/5" : ""}`}>
                          <span>{periodLabel(p.start, p.end)} · <span className="num">{v.sent}/{v.total}</span> reports{v.record?.invoiceNo ? <span className="num"> · {v.record.invoiceNo}</span> : null}</span>
                          <BillingBadge status={v.status} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Manager / CS Billing Tracker — current period per rental plant. */
export function BillingTracker({ plants, onOpen }: { plants: Plant[]; onOpen: (p: Plant) => void }) {
  const data = useData();
  const b = useBilling();
  const bs = useBranches();
  const [q, setQ] = useState("");
  const [freq, setFreq] = useState("");
  const [stF, setStF] = useState("");
  const [branch, setBranch] = useState("");
  const [cs, setCs] = useState("");
  const [more, setMore] = useState(false);
  const rows = plants.map((p) => ({ p, v: plantBilling(b.configOf(p.id), p.id, data.reports, b.records, TODAY) })).filter((x) => x.v.status);
  const month = TODAY.slice(0, 7);
  const count = (s: PeriodStatus) => rows.filter((x) => x.v.status === s).length;
  const sentThisMonth = b.records.filter((r) => r.status === "invoice_sent" && r.invoiceSentDate.startsWith(month)).length;
  const shown = rows.filter(({ p, v }) => (!freq || v.config.frequency === freq) && (!stF || v.status === stF) && (!branch || p.branchId === branch) && (!cs || p.engineerId === cs)
    && (!q.trim() || `${p.name} ${p.customer}`.toLowerCase().includes(q.trim().toLowerCase())));
  const team = [...new Set(plants.map((p) => p.engineerId))];

  return (
    <div className="space-y-3 p-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[["Waiting for reports", count("waiting")], ["Ready for invoice", count("ready")], ["With invoice team", count("sent_to_team")], ["Invoice generated", count("generated")], ["Invoice sent this month", sentThisMonth]].map(([l, v]) => (
          <div key={l as string} className="panel-inset px-3 py-2"><div className="label-caps">{l}</div><div className="num text-lg font-semibold">{v}</div></div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="min-w-48 flex-1"><TextInput placeholder="Search plant…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Button variant="ghost" onClick={() => setMore((m) => !m)}>Filters</Button>
      </div>
      {more ? (
        <div className="grid gap-2 sm:grid-cols-4">
          <Select value={freq} onChange={(e) => setFreq(e.target.value)}><option value="">All frequencies</option>{(Object.keys(freqLabel) as InvoiceFrequency[]).map((f) => <option key={f} value={f}>{freqLabel[f]}</option>)}</Select>
          <Select value={stF} onChange={(e) => setStF(e.target.value)}><option value="">All statuses</option>{(Object.keys(statusLabel) as PeriodStatus[]).map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}</Select>
          <Select value={branch} onChange={(e) => setBranch(e.target.value)}><option value="">All branches</option>{bs.branches.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>
          <Select value={cs} onChange={(e) => setCs(e.target.value)}><option value="">All CS engineers</option>{team.map((id) => <option key={id} value={id}>{engineerName(data, id)}</option>)}</Select>
        </div>
      ) : null}
      {shown.length ? (
        <>
          <ul className="divide-y divide-line/60 md:hidden">
            {shown.map(({ p, v }) => (
              <li key={p.id} className="py-3">
                <div className="font-semibold">{p.name}</div>
                <div className="mt-1 text-sm text-mute">{v.period ? periodLabel(v.period.start, v.period.end) : ""} · Billing {freqLabel[v.config.frequency]} · <span className="num">{v.sent}/{v.total}</span> reports</div>
                <div className="mt-1 flex items-center justify-between"><BillingBadge status={v.status} /><button type="button" className="text-sm text-signal" onClick={() => onOpen(p)}>Open billing</button></div>
              </li>
            ))}
          </ul>
          <table className="hidden w-full table-fixed text-sm md:table">
            <thead><tr className="text-left text-xs text-mute"><th className="py-2">Plant</th><th>Period</th><th>Frequency</th><th>Reports</th><th>Status</th><th>Invoice</th><th>Last update</th><th className="text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-line/60">
              {shown.map(({ p, v }) => (
                <tr key={p.id}>
                  <td className="py-2 pr-2"><div className="truncate font-medium">{p.name}</div><div className="truncate text-xs text-mute">{ownershipOf(bs, p).branch?.name ?? "—"}</div></td>
                  <td className="text-xs">{v.period ? periodLabel(v.period.start, v.period.end) : "—"}</td>
                  <td className="text-xs">{freqLabel[v.config.frequency]}</td>
                  <td className="num text-xs">{v.sent} / {v.total}</td>
                  <td><BillingBadge status={v.status} /></td>
                  <td className="num truncate text-xs">{v.record?.invoiceNo || "—"}</td>
                  <td className="num text-xs">{v.record ? fmtDate(v.record.updatedAt.slice(0, 10)) : "—"}</td>
                  <td className="text-right"><button type="button" className="rounded-md px-2 py-1 text-xs text-signal ring-1 ring-signal/40" onClick={() => onOpen(p)}>{v.status === "ready" ? "Send" : v.status === "invoice_sent" ? "View" : "Open"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : <div className="py-6 text-center text-sm text-mute">No rental plants match. Set a plant's billing model to Rental with a start date to track it here.</div>}
    </div>
  );
}
