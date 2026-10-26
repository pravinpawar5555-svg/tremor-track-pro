import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button, Empty, Field, Kpi, Panel, Select, TextArea, TextInput, Td, Th, Tr } from "@/components/console/ui";
import { cn } from "@/lib/utils";
import { TODAY, analystsOf, engineerName, fmtDate, managersOf, useData } from "@/lib/store";
import { useBranches } from "@/lib/branches";
import { blankOpp, saveOpp, stages, useOpps, type Opp } from "@/lib/opportunities";
import { blankReminder, saveReminder } from "@/lib/dailywork";
import {
  APPLICATIONS, NEXT_STEPS, OUTCOMES, PURPOSES, blankSalesVisit, hasPotential, matchesFilter, saveSalesVisit, salesStatusLabel,
  salesSummary, statusAfterCompletion, useSalesVisits, visitWithLabel, type SalesFilter, type SalesVisit, type VisitWith,
} from "@/lib/sales-visits";

const tone: Record<string, string> = {
  planned: "bg-sev-medium/10 text-sev-medium ring-sev-medium/40",
  completed: "bg-sev-low/10 text-sev-low ring-sev-low/40",
  followup: "bg-sev-high/10 text-sev-high ring-sev-high/40",
  cancelled: "bg-black/5 text-mute ring-line",
};
const Pill = ({ s }: { s: SalesVisit["status"] }) => <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1", tone[s])}>{salesStatusLabel[s]}</span>;

function useNames() {
  const data = useData();
  const br = useBranches();
  const people = [...managersOf(data), ...analystsOf(data)];
  const branch = (id: string) => br.branches.find((b) => b.id === id);
  const se = (id: string) => br.sales.find((s) => s.id === id);
  const withText = (v: SalesVisit) =>
    v.visitWith === "solo" ? "Solo" : v.participants.length ? v.participants.map((p) => p.name).join(", ") : visitWithLabel[v.visitWith];
  return { data, br, people, branch, se, withText, me: data.currentUserId, meName: engineerName(data, data.currentUserId) };
}

export function SalesVisitsSection({ planSignal }: { planSignal: number }) {
  const n = useNames();
  const all = useSalesVisits();
  const { opps } = useOpps();
  const [filter, setFilter] = useState<SalesFilter>("upcoming");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [q, setQ] = useState("");
  const [more, setMore] = useState(false);
  const [fType, setFType] = useState("");
  const [fBranch, setFBranch] = useState("");
  const [fOutcome, setFOutcome] = useState("");
  const [fOwner, setFOwner] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<SalesVisit | null>(null);
  const [completing, setCompleting] = useState<SalesVisit | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [lastSignal, setLastSignal] = useState(planSignal);
  if (planSignal !== lastSignal) { setLastSignal(planSignal); setEditing(blankSalesVisit(n.me)); setOpenId(null); }

  const oppNo = (id: string) => opps.find((o) => o.id === id)?.number ?? "";
  const sum = salesSummary(all);
  const shown = useMemo(() => all.filter((v) => {
    if (!matchesFilter(v, filter)) return false;
    if (fType && v.customerType !== fType) return false;
    if (fBranch && v.branchId !== fBranch) return false;
    if (fOutcome && v.outcome !== fOutcome) return false;
    if (fOwner && v.ownerId !== fOwner) return false;
    if (from && v.visitDate < from) return false;
    if (to && v.visitDate > to) return false;
    if (q.trim()) {
      const t = [v.company, v.contactPerson, v.location, n.branch(v.branchId)?.name, n.se(v.salesEngineerId)?.name, engineerName(n.data, v.ownerId), v.visitNo, oppNo(v.opportunityId), v.summary, v.requirement]
        .join(" ").toLowerCase();
      if (!t.includes(q.trim().toLowerCase())) return false;
    }
    return true;
  }).sort((a, b) => (filter === "upcoming" ? (a.visitDate < b.visitDate ? -1 : 1) : a.visitDate < b.visitDate ? 1 : -1)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [all, filter, fType, fBranch, fOutcome, fOwner, from, to, q, opps]);

  const sel = all.find((v) => v.id === openId) ?? null;
  const counts: Record<SalesFilter, number> = {
    upcoming: all.filter((v) => matchesFilter(v, "upcoming")).length,
    completed: sum.completed, followup: sum.followup, potential: sum.potential, all: all.length,
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi label="Planned" value={sum.planned} />
        <Kpi label="Completed" value={sum.completed} />
        <Kpi label="Follow-up required" value={sum.followup} tone={sum.followup ? "high" : undefined} />
        <Kpi label="Potential identified" value={sum.potential} tone={sum.potential ? "low" : undefined} />
      </div>
      <p className="mt-2 text-[11px] text-mute">
        This month: {sum.month.visits} visits · {sum.month.newCustomers} new · {sum.month.existing} existing · {sum.month.linked} linked to a lead / opportunity
      </p>

      {editing ? <PlanForm key={editing.id} initial={editing} onClose={() => setEditing(null)} onSaved={(v) => { setEditing(null); setOpenId(v.id); }} /> : null}
      {completing ? <CompleteForm key={completing.id} v={completing} onClose={() => setCompleting(null)} onSaved={(v) => { setCompleting(null); setOpenId(v.id); }} /> : null}
      {sel && !editing && !completing ? <Detail v={sel} onClose={() => setOpenId(null)} onEdit={() => setEditing(sel)} onComplete={() => setCompleting(sel)} /> : null}

      <Panel className="mt-4" title="Sales Visits" meta={
        <span className="inline-flex rounded-md p-0.5 ring-1 ring-line/80">
          {(["list", "calendar"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setView(k)} className={cn("rounded px-2.5 py-1 text-xs", view === k ? "bg-signal/10 text-signal" : "text-mute")}>{k === "list" ? "List" : "Calendar"}</button>
          ))}
        </span>
      }>
        <div className="flex flex-wrap items-center gap-1 border-b border-line/60 px-3 py-2">
          {([["upcoming", "Upcoming"], ["completed", "Completed"], ["followup", "Follow-up"], ["potential", "Potential Identified"], ["all", "All"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} className={cn("rounded-md px-2.5 py-1 text-xs", filter === k ? "bg-signal text-signal-foreground" : "text-mute hover:bg-black/5")}>
              {l} <span className="num opacity-70">{counts[k]}</span>
            </button>
          ))}
          <div className="ml-auto flex w-full gap-2 sm:w-auto">
            <TextInput placeholder="Search company, contact, lead…" value={q} onChange={(e) => setQ(e.target.value)} className="sm:w-60" />
            <Button onClick={() => setMore((m) => !m)}>Filters</Button>
          </div>
        </div>
        {more ? (
          <div className="grid gap-2 border-b border-line/60 px-3 py-2 sm:grid-cols-3 lg:grid-cols-6">
            <Field label="From"><TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="To"><TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
            <Field label="Customer type"><Select value={fType} onChange={(e) => setFType(e.target.value)}><option value="">All</option><option value="new">New</option><option value="existing">Existing</option></Select></Field>
            <Field label="Branch"><Select value={fBranch} onChange={(e) => setFBranch(e.target.value)}><option value="">All</option>{n.br.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
            <Field label="Visit owner"><Select value={fOwner} onChange={(e) => setFOwner(e.target.value)}><option value="">All</option>{n.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            <Field label="Outcome"><Select value={fOutcome} onChange={(e) => setFOutcome(e.target.value)}><option value="">All</option>{OUTCOMES.map((o) => <option key={o}>{o}</option>)}</Select></Field>
          </div>
        ) : null}

        {view === "calendar" ? <SalesCalendar list={shown} onPick={setOpenId} /> : !shown.length ? <Empty>No sales visits here. Use “+ Plan Sales Visit” to add one.</Empty> : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full table-fixed text-sm">
                <thead><tr className="text-left">
                  <Th className="w-20">Date</Th><Th>Customer</Th><Th className="w-28">Type</Th><Th>Visit with</Th><Th>Purpose</Th><Th>Outcome / Next</Th><Th className="w-28">Owner</Th><Th className="w-24">Status</Th>
                </tr></thead>
                <tbody>
                  {shown.map((v) => (
                    <Tr key={v.id} className="cursor-pointer">
                      <Td mono><button type="button" onClick={() => setOpenId(v.id)} className="text-left text-signal">{fmtDate(v.visitDate)}</button></Td>
                      <Td><button type="button" onClick={() => setOpenId(v.id)} className="block truncate text-left font-medium">{v.company || "—"}</button><span className="block truncate text-[11px] text-mute">{v.location}</span></Td>
                      <Td className="text-xs">{v.customerType === "new" ? "New" : "Existing"}</Td>
                      <Td className="truncate text-xs">{n.withText(v)}</Td>
                      <Td className="truncate text-xs">{v.purpose}</Td>
                      <Td className="text-xs"><span className="block truncate">{v.outcome || "—"}</span><span className="block truncate text-mute">{v.nextStep}</span></Td>
                      <Td className="truncate text-xs">{engineerName(n.data, v.ownerId)}</Td>
                      <Td><Pill s={v.status} /></Td>
                    </Tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-line/60 lg:hidden">
              {shown.map((v) => (
                <button key={v.id} type="button" onClick={() => setOpenId(v.id)} className="block w-full px-4 py-3 text-left">
                  <div className="flex items-center justify-between gap-2"><span className="label-caps">{fmtDate(v.visitDate)}</span><Pill s={v.status} /></div>
                  <div className="mt-1 font-semibold">{v.company || "—"}</div>
                  <div className="text-xs text-mute">{v.customerType === "new" ? "New Customer" : "Existing Customer"} · {v.location || "—"}</div>
                  <div className="mt-1 text-xs">With: {n.withText(v)}</div>
                  <div className="text-xs">Purpose: {v.purpose || "—"}</div>
                  {v.outcome ? <div className="text-xs">Outcome: {v.outcome}{v.nextStep ? ` · Next: ${v.nextStep}` : ""}</div> : null}
                </button>
              ))}
            </div>
          </>
        )}
      </Panel>
    </>
  );
}

function SalesCalendar({ list, onPick }: { list: SalesVisit[]; onPick: (id: string) => void }) {
  const [month, setMonth] = useState(TODAY.slice(0, 7));
  const [y, m] = month.split("-").map(Number) as [number, number];
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const shift = (d: number) => { const t = new Date(Date.UTC(y, m - 1 + d, 1)); setMonth(t.toISOString().slice(0, 7)); };
  return (
    <div className="p-3">
      <div className="mb-2 flex items-center justify-between text-sm">
        <Button variant="ghost" onClick={() => shift(-1)}>‹</Button>
        <span className="font-medium">{new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}</span>
        <Button variant="ghost" onClick={() => shift(1)}>›</Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[11px]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="label-caps text-center">{d}</div>)}
        {Array.from({ length: lead }).map((_, i) => <div key={`x${i}`} />)}
        {Array.from({ length: days }).map((_, i) => {
          const iso = `${month}-${String(i + 1).padStart(2, "0")}`;
          const items = list.filter((v) => v.visitDate === iso);
          return (
            <div key={iso} className={cn("min-h-16 rounded-md p-1 ring-1 ring-line/60", iso === TODAY && "ring-signal")}>
              <div className="num text-mute">{i + 1}</div>
              {items.map((v) => (
                <button key={v.id} type="button" onClick={() => onPick(v.id)} className="mt-0.5 block w-full truncate rounded bg-signal/10 px-1 text-left text-signal">{v.company}</button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlanForm({ initial, onClose, onSaved }: { initial: SalesVisit; onClose: () => void; onSaved: (v: SalesVisit) => void }) {
  const n = useNames();
  const { opps } = useOpps();
  const [v, setV] = useState<SalesVisit>(initial);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof SalesVisit>(k: K, val: SalesVisit[K]) => setV((x) => ({ ...x, [k]: val }));
  const pickPlant = (id: string) => {
    const p = n.data.plants.find((x) => x.id === id);
    setV((x) => ({ ...x, plantId: id, company: p ? `${p.customer || p.name}${p.customer && p.name !== p.customer ? ` — ${p.name}` : ""}` : "", location: p?.location ?? x.location,
      contactPerson: x.contactPerson || p?.contact || "", contactNumber: x.contactNumber || p?.contactPhone || "", branchId: p?.branchId || x.branchId, salesEngineerId: p?.salesEngineerId || x.salesEngineerId }));
  };
  const branchSales = n.br.sales.filter((s) => s.status === "active" && (!v.branchId || s.branchId === v.branchId));
  const toggleSe = (id: string, name: string) =>
    set("participants", v.participants.some((p) => p.salesEngineerId === id) ? v.participants.filter((p) => p.salesEngineerId !== id) : [...v.participants, { name, role: "Sales Engineer", salesEngineerId: id }]);
  const ok = v.visitDate && v.company.trim() && v.location.trim() && v.branchId && v.ownerId && v.purpose;
  const submit = async () => {
    if (!ok) return toast.error("Fill the required fields marked *");
    setBusy(true);
    try {
      const notes: string[] = [];
      if (!initial.visitNo) notes.push("Sales visit planned");
      else {
        if (initial.visitDate !== v.visitDate) notes.push(`Date changed ${fmtDate(initial.visitDate)} → ${fmtDate(v.visitDate)}`);
        const added = v.participants.filter((p) => !initial.participants.some((q) => q.name === p.name));
        if (added.length) notes.push(`Participant added: ${added.map((p) => p.name).join(", ")}`);
        if (initial.ownerId !== v.ownerId) notes.push(`Owner changed to ${engineerName(n.data, v.ownerId)}`);
        if (initial.opportunityId !== v.opportunityId && v.opportunityId) notes.push("Lead / opportunity linked");
        if (!notes.length) notes.push("Visit details edited");
      }
      const saved = await saveSalesVisit(v, n.meName, notes.join("; "));
      toast.success(`Sales visit ${saved.visitNo} saved`);
      onSaved(saved);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Panel className="mt-4" title={initial.visitNo ? `Edit ${initial.visitNo}` : "Plan sales visit"} meta={<button type="button" className="text-signal" onClick={onClose}>Close</button>}>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Visit date *"><TextInput type="date" value={v.visitDate} onChange={(e) => set("visitDate", e.target.value)} /></Field>
        <Field label="Customer type *">
          <div className="flex gap-1">{(["existing", "new"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setV((x) => ({ ...x, customerType: k, plantId: k === "new" ? "" : x.plantId }))} className={cn("flex-1 rounded-md px-2 py-1.5 text-xs ring-1 ring-line", v.customerType === k ? "bg-signal text-signal-foreground" : "text-mute")}>{k === "new" ? "New Customer" : "Existing Customer"}</button>
          ))}</div>
        </Field>
        {v.customerType === "existing" ? (
          <Field label="Customer / plant *"><Select value={v.plantId} onChange={(e) => pickPlant(e.target.value)}><option value="">Select…</option>{n.data.plants.map((p) => <option key={p.id} value={p.id}>{p.customer} — {p.name}</option>)}</Select></Field>
        ) : (
          <Field label="Company name *"><TextInput value={v.company} onChange={(e) => set("company", e.target.value)} /></Field>
        )}
        <Field label="Location *"><TextInput value={v.location} onChange={(e) => set("location", e.target.value)} /></Field>
        <Field label="Contact person"><TextInput value={v.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} /></Field>
        <Field label="Contact number"><TextInput value={v.contactNumber} onChange={(e) => set("contactNumber", e.target.value)} /></Field>
        <Field label="Email"><TextInput type="email" value={v.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Branch *"><Select value={v.branchId} onChange={(e) => set("branchId", e.target.value)}><option value="">Select…</option>{n.br.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
        <Field label="Sales engineer" hint={v.branchId ? `RM: ${n.branch(v.branchId)?.rmName || "—"}` : undefined}><Select value={v.salesEngineerId} onChange={(e) => set("salesEngineerId", e.target.value)}><option value="">—</option>{branchSales.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="Visit owner *"><Select value={v.ownerId} onChange={(e) => set("ownerId", e.target.value)}>{n.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        <Field label="Visit with *"><Select value={v.visitWith} onChange={(e) => setV((x) => ({ ...x, visitWith: e.target.value as VisitWith, participants: e.target.value === "solo" ? [] : x.participants }))}>{Object.entries(visitWithLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
        <Field label="Visit purpose *"><Select value={v.purpose} onChange={(e) => set("purpose", e.target.value)}><option value="">Select…</option>{PURPOSES.map((p) => <option key={p}>{p}</option>)}</Select></Field>
        {v.visitWith === "branch_sales" ? (
          <div className="sm:col-span-2 lg:col-span-3">
            <span className="label-caps">Branch sales engineers joining</span>
            <div className="mt-1 flex flex-wrap gap-1">{branchSales.map((s) => {
              const on = v.participants.some((p) => p.salesEngineerId === s.id);
              return <button key={s.id} type="button" onClick={() => toggleSe(s.id, s.name)} className={cn("rounded-full px-2.5 py-1 text-xs ring-1 ring-line", on ? "bg-signal text-signal-foreground" : "text-mute")}>{s.name}</button>;
            })}{!branchSales.length ? <span className="text-xs text-mute">Pick a branch first.</span> : null}</div>
          </div>
        ) : v.visitWith !== "solo" ? (
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Participants (name — role, one per line)">
              <TextArea value={v.participants.map((p) => (p.role ? `${p.name} — ${p.role}` : p.name)).join("\n")} onChange={(e) => set("participants", e.target.value.split("\n").filter((l) => l.trim()).map((l) => { const [a, b] = l.split("—"); return { name: (a ?? "").trim(), role: (b ?? "").trim() || visitWithLabel[v.visitWith].replace("With ", "") }; }))} />
            </Field>
          </div>
        ) : null}
        <Field label="Related lead / opportunity"><Select value={v.opportunityId} onChange={(e) => set("opportunityId", e.target.value)}><option value="">None</option>{opps.filter((o) => !o.archived).map((o) => <option key={o.id} value={o.id}>{o.number} · {o.customerName} · {stages[o.stage]}</option>)}</Select></Field>
        <div className="sm:col-span-2"><Field label="Visit objective / notes"><TextArea value={v.objective} onChange={(e) => set("objective", e.target.value)} placeholder="e.g. Discuss wireless vibration monitoring for ID fan and BFP" /></Field></div>
      </div>
      <div className="flex justify-end gap-2 border-t border-line/60 px-4 py-3">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="solid" disabled={busy} onClick={submit}>{busy ? "Saving…" : "Save visit"}</Button>
      </div>
    </Panel>
  );
}

function CompleteForm({ v: initial, onClose, onSaved }: { v: SalesVisit; onClose: () => void; onSaved: (v: SalesVisit) => void }) {
  const n = useNames();
  const [v, setV] = useState<SalesVisit>({ ...initial, actualDate: initial.actualDate || TODAY, fmParticipants: initial.fmParticipants || [n.meName, ...initial.participants.map((p) => p.name)].join(", ") });
  const [other, setOther] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof SalesVisit>(k: K, val: SalesVisit[K]) => setV((x) => ({ ...x, [k]: val }));
  const toggleApp = (a: string) => set("applications", v.applications.includes(a) ? v.applications.filter((x) => x !== a) : [...v.applications, a]);
  const submit = async () => {
    if (!v.summary.trim() || !v.outcome || !v.nextStep) return toast.error("Discussion summary, outcome and next step are required");
    setBusy(true);
    try {
      const status = statusAfterCompletion(v.nextStep, v.outcome);
      const saved = await saveSalesVisit({ ...v, status }, n.meName, `Visit completed — outcome: ${v.outcome}; next step: ${v.nextStep}`);
      toast.success("Visit outcome saved");
      onSaved(saved);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Panel className="mt-4" title={`Visit outcome — ${initial.company}`} meta={<button type="button" className="text-signal" onClick={onClose}>Close</button>}>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <Field label="Actual visit date"><TextInput type="date" value={v.actualDate} onChange={(e) => set("actualDate", e.target.value)} /></Field>
        <Field label="Customer representatives met"><TextInput value={v.customerMet} onChange={(e) => set("customerMet", e.target.value)} /></Field>
        <div className="sm:col-span-2"><Field label="Forbes Marshall participants"><TextInput value={v.fmParticipants} onChange={(e) => set("fmParticipants", e.target.value)} /></Field></div>
        <div className="sm:col-span-2"><Field label="Discussion summary *"><TextArea value={v.summary} onChange={(e) => set("summary", e.target.value)} /></Field></div>
        <div className="sm:col-span-2"><Field label="Customer requirement / need"><TextArea value={v.requirement} onChange={(e) => set("requirement", e.target.value)} /></Field></div>
        <div className="sm:col-span-2">
          <span className="label-caps">Applications / machines discussed</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {[...APPLICATIONS, ...v.applications.filter((a) => !APPLICATIONS.includes(a))].map((a) => (
              <button key={a} type="button" onClick={() => toggleApp(a)} className={cn("rounded-full px-2.5 py-1 text-xs ring-1 ring-line", v.applications.includes(a) ? "bg-signal text-signal-foreground" : "text-mute")}>{a}</button>
            ))}
            <span className="inline-flex gap-1"><TextInput value={other} onChange={(e) => setOther(e.target.value)} placeholder="Other…" className="w-32" /><Button onClick={() => { if (other.trim()) { toggleApp(other.trim()); setOther(""); } }}>Add</Button></span>
          </div>
        </div>
        <Field label="Potential identified?">
          <div className="flex gap-1">{([["yes", "Yes"], ["no", "No"], ["more", "Need more discussion"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => set("potential", k)} className={cn("flex-1 rounded-md px-2 py-1.5 text-xs ring-1 ring-line", v.potential === k ? "bg-signal text-signal-foreground" : "text-mute")}>{l}</button>
          ))}</div>
        </Field>
        <Field label="Visit outcome *"><Select value={v.outcome} onChange={(e) => set("outcome", e.target.value)}><option value="">Select…</option>{OUTCOMES.map((o) => <option key={o}>{o}</option>)}</Select></Field>
        <Field label="Next step *"><Select value={v.nextStep} onChange={(e) => set("nextStep", e.target.value)}><option value="">Select…</option>{NEXT_STEPS.map((o) => <option key={o}>{o}</option>)}</Select></Field>
        <Field label="Next follow-up date"><TextInput type="date" value={v.followupDate} onChange={(e) => set("followupDate", e.target.value)} /></Field>
        <Field label="Next step owner"><Select value={v.nextOwnerId} onChange={(e) => set("nextOwnerId", e.target.value)}>{n.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        <Field label="Short next action"><TextInput value={v.nextAction} onChange={(e) => set("nextAction", e.target.value)} placeholder="e.g. Customer to share machine list" /></Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-line/60 px-4 py-3">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="solid" disabled={busy} onClick={submit}>{busy ? "Saving…" : "Save outcome"}</Button>
      </div>
    </Panel>
  );
}

function Detail({ v, onClose, onEdit, onComplete }: { v: SalesVisit; onClose: () => void; onEdit: () => void; onComplete: () => void }) {
  const n = useNames();
  const { opps } = useOpps();
  const [busy, setBusy] = useState(false);
  const [linking, setLinking] = useState(false);
  const linked = opps.find((o) => o.id === v.opportunityId);
  const isLead = (o: Opp) => o.stage === "new" || o.stage === "contacted";
  const branch = n.branch(v.branchId);

  const create = async (asOpp: boolean) => {
    setBusy(true);
    try {
      const plant = n.data.plants.find((p) => p.id === v.plantId);
      const o: Opp = {
        ...blankOpp(n.me), leadSource: "Other", leadSourceOther: `Sales Visit ${v.visitNo}`, plantId: v.plantId,
        customerName: plant?.customer || v.company, plantName: plant?.name ?? "", location: v.location, branchId: v.branchId, salesEngineerId: v.salesEngineerId,
        type: v.outcome === "Demo Proposed" || v.nextStep === "Arrange Demo" ? "Demo" : "Order",
        requirement: [v.requirement, v.applications.length ? `Applications: ${v.applications.join(", ")}` : ""].filter(Boolean).join("\n"),
        contactName: v.contactPerson, contactMobile: v.contactNumber, contactEmail: v.email, stage: asOpp ? "qualified" : "new",
        nextAction: v.nextAction || v.nextStep, nextActionOwner: engineerName(n.data, v.nextOwnerId), nextActionDate: v.followupDate,
        notes: `From Sales Visit ${v.visitNo} on ${fmtDate(v.actualDate || v.visitDate)} by ${engineerName(n.data, v.ownerId)}.\n${v.summary}`,
      };
      const saved = await saveOpp(o, undefined, n.me, n.meName);
      await (await import("@/integrations/supabase/client")).supabase.from("opportunities").update({ sales_visit_id: v.id } as never).eq("id", saved.id);
      await saveSalesVisit({ ...v, opportunityId: saved.id }, n.meName, `${asOpp ? "Opportunity" : "Lead"} created: ${saved.number}`);
      toast.success(`${asOpp ? "Opportunity" : "Lead"} ${saved.number} created — open it to complete the details`);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const link = async (id: string) => {
    const o = opps.find((x) => x.id === id);
    if (!o) return;
    await saveSalesVisit({ ...v, opportunityId: id }, n.meName, `${isLead(o) ? "Lead" : "Opportunity"} linked: ${o.number}`);
    setLinking(false);
  };
  const followUp = async () => {
    if (!v.followupDate) return toast.error("Set a follow-up date first (Edit outcome)");
    const r = { ...blankReminder(v.nextOwnerId || n.me, v.followupDate), createdBy: n.me, plantId: v.plantId,
      title: `Follow up with ${v.company}${v.nextAction ? ` — ${v.nextAction}` : ""}`, description: `Linked to Sales Visit ${v.visitNo}` };
    await saveReminder(r);
    await saveSalesVisit({ ...v, reminderId: r.id }, n.meName, `Follow-up reminder created for ${fmtDate(v.followupDate)}`);
    toast.success("Follow-up reminder added to Daily Work");
  };
  const cancel = async () => { await saveSalesVisit({ ...v, status: "cancelled" }, n.meName, "Visit cancelled"); toast.success("Visit cancelled"); };
  const done = v.status === "completed" || v.status === "followup";
  const Row = ({ l, val }: { l: string; val: React.ReactNode }) => <div className="flex justify-between gap-3 border-b border-line/50 py-1.5 text-xs last:border-0"><span className="text-mute">{l}</span><span className="text-right">{val || "—"}</span></div>;

  return (
    <Panel className="mt-4" title={`${v.company} · Sales Visit`} meta={<button type="button" className="text-signal" onClick={onClose}>Close</button>}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line/60 px-4 py-2 text-xs">
        <span className="num text-mute">{v.visitNo}</span><span>{fmtDate(v.actualDate || v.visitDate)}</span><Pill s={v.status} />
        <span className="ml-auto flex flex-wrap gap-2">
          {v.status !== "cancelled" ? <Button onClick={onEdit}>Edit</Button> : null}
          {v.status !== "cancelled" ? <Button variant="solid" onClick={onComplete}>{done ? "Edit outcome" : "Complete visit"}</Button> : null}
          {v.status === "planned" ? <Button variant="ghost" onClick={cancel}>Cancel visit</Button> : null}
        </span>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-2">
        <div>
          <div className="label-caps mb-1">Visit information</div>
          <Row l="Customer" val={v.company} /><Row l="Location" val={v.location} /><Row l="Customer type" val={v.customerType === "new" ? "New Customer" : "Existing Customer"} />
          <Row l="Contact" val={[v.contactPerson, v.contactNumber, v.email].filter(Boolean).join(" · ")} />
          <Row l="Visit owner" val={engineerName(n.data, v.ownerId)} />
          <Row l="Visit mode" val={v.visitWith === "solo" ? "Solo" : `Joint — ${v.participants.map((p) => `${p.name}${p.role ? ` (${p.role})` : ""}`).join(", ") || visitWithLabel[v.visitWith]}`} />
          <Row l="Branch" val={branch ? `${branch.name}${branch.rmName ? ` · RM ${branch.rmName}` : ""}` : ""} />
          <Row l="Sales engineer" val={n.se(v.salesEngineerId)?.name} />
          <Row l="Purpose" val={v.purpose} />
          {v.objective ? <p className="mt-2 whitespace-pre-wrap text-xs">{v.objective}</p> : null}
        </div>
        <div>
          {done ? (
            <>
              <div className="label-caps mb-1">Discussion & outcome</div>
              <p className="whitespace-pre-wrap text-xs">{v.summary}</p>
              <Row l="Customer met" val={v.customerMet} /><Row l="FM participants" val={v.fmParticipants} />
              <Row l="Requirement" val={v.requirement} /><Row l="Applications" val={v.applications.join(", ")} />
              <Row l="Outcome" val={v.outcome} /><Row l="Next step" val={v.nextStep} />
              <Row l="Follow-up" val={v.followupDate ? `${fmtDate(v.followupDate)} · ${engineerName(n.data, v.nextOwnerId)}` : ""} /><Row l="Next action" val={v.nextAction} />
            </>
          ) : <Empty>Outcome is recorded after the meeting — use “Complete visit”.</Empty>}
          <div className="label-caps mb-1 mt-4">Business link</div>
          {linked ? (
            <div className="flex items-center justify-between gap-2 text-xs">
              <span>{isLead(linked) ? "Lead" : "Opportunity"}: <span className="num font-medium">{linked.number}</span> · {stages[linked.stage]}</span>
              <Link to="/opportunities" search={{ focus: linked.id }} className="text-signal">Open</Link>
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              {done && hasPotential(v) ? <p className="font-medium text-sev-low">Potential identified. What would you like to do?</p> : <p className="text-mute">No lead / opportunity created.</p>}
              {done ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="solid" disabled={busy} onClick={() => create(false)}>Create Lead</Button>
                  <Button disabled={busy} onClick={() => create(true)}>Create Opportunity</Button>
                  <Button onClick={() => setLinking((x) => !x)}>Link existing</Button>
                  {!v.reminderId ? <Button onClick={followUp}>Follow-up first</Button> : null}
                </div>
              ) : <Button onClick={() => setLinking((x) => !x)}>Link existing lead / opportunity</Button>}
              {linking ? <Select defaultValue="" onChange={(e) => link(e.target.value)}><option value="">Select…</option>{opps.filter((o) => !o.archived).map((o) => <option key={o.id} value={o.id}>{o.number} · {o.customerName} · {stages[o.stage]}</option>)}</Select> : null}
            </div>
          )}
          {linked && done && !v.reminderId ? <div className="mt-2"><Button onClick={followUp}>Add follow-up reminder</Button></div> : null}
          {v.reminderId ? <p className="mt-2 text-xs text-mute">Follow-up reminder is in Daily Work for {fmtDate(v.followupDate)}.</p> : null}
        </div>
      </div>
      {v.history.length ? (
        <div className="border-t border-line/60 px-4 py-3">
          <div className="label-caps mb-1">Activity</div>
          {[...v.history].reverse().map((h, i) => <div key={i} className="text-xs"><span className="text-mute">{h.at ? new Date(h.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : ""} · {h.by}</span> — {h.text}</div>)}
        </div>
      ) : null}
    </Panel>
  );
}
