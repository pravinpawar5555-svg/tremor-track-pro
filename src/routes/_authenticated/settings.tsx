import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AccessControl } from "@/components/console/AccessControl";
import { AppShell } from "@/components/console/AppShell";
import { Button, Empty, Field, PageHeader, Panel, Select, TextInput } from "@/components/console/ui";
import { peekDomain } from "@/lib/domain";
import { useData, engineerName } from "@/lib/store";
import { dateRange, saveWorkloadSettings, useWorkloadSettings, type WorkloadSettings } from "@/lib/workload";
import {
  emailOk, phoneSuspicious, saveBranch, saveKam, saveSales, useBranches,
  type Branch, type Kam, type SalesEngineer,
} from "@/lib/branches";

export const Route = createFileRoute("/_authenticated/settings")({
  beforeLoad: () => {
    if (peekDomain() !== "manager") throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Branch & Sales Mapping — Forbes Marshall CM Portal" },
      { name: "description", content: "Manage HO Division KAMs, branches with Branch RM contacts, and Sales Engineers." },
      { property: "og:title", content: "Branch & Sales Mapping — Forbes Marshall CM Portal" },
      { property: "og:description", content: "Central Forbes Marshall commercial hierarchy for plant ownership." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

type Tab = "kams" | "branches" | "sales" | "hierarchy" | "history" | "workload" | "access";
const tabs: [Tab, string][] = [["kams", "HO Division KAMs"], ["branches", "Branches"], ["sales", "Sales Engineers"], ["hierarchy", "Hierarchy"], ["history", "Change history"], ["workload", "Workload"], ["access", "Access Control"]];

const wrap = async (p: Promise<void>, ok: string) => {
  try { await p; toast.success(ok); return true; } catch (e: any) { toast.error(e.message ?? "Could not save"); return false; }
};

function StatusPill({ s }: { s: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ring-1 ${s === "active" ? "text-sev-low ring-sev-low/40" : "text-mute ring-line"}`}>{s}</span>;
}

function SettingsPage() {
  const [tab, setTab] = useState<Tab>("branches");
  return (
    <AppShell>
      <PageHeader title="Settings" subtitle="Branch & Sales Mapping — HO Division KAM → Branch → Branch RM → Sales Engineer → Plant" />
      <div className="mb-4 flex flex-wrap gap-1">
        {tabs.map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 text-xs ring-1 ${tab === t ? "bg-signal/10 font-medium text-signal ring-signal/40" : "text-mute ring-line/80 hover:bg-black/5"}`}>{l}</button>
        ))}
      </div>
      {tab === "kams" && <Kams />}
      {tab === "branches" && <Branches />}
      {tab === "sales" && <Sales />}
      {tab === "hierarchy" && <Hierarchy />}
      {tab === "history" && <History />}
      {tab === "workload" && <WorkloadRules />}
      {tab === "access" && <AccessControl />}
    </AppShell>
  );
}

function Kams() {
  const s = useBranches();
  const [f, setF] = useState<Partial<Kam> | null>(null);
  return (
    <Panel title="HO Division KAMs" meta={<Button variant="solid" onClick={() => setF({ status: "active" })}>Add KAM</Button>}>
      {f && (
        <div className="grid gap-3 border-b border-line/60 p-4 sm:grid-cols-4">
          <Field label="Name *"><TextInput value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Email" hint={emailOk(f.email ?? "") ? undefined : "Invalid email"}><TextInput value={f.email ?? ""} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Mobile"><TextInput value={f.mobile ?? ""} onChange={(e) => setF({ ...f, mobile: e.target.value })} /></Field>
          <Field label="Status"><Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as any })}><option value="active">Active</option><option value="inactive">Inactive</option></Select></Field>
          <div className="flex gap-2 sm:col-span-4">
            <Button variant="solid" disabled={!f.name?.trim() || !emailOk(f.email ?? "")} onClick={async () => { if (await wrap(saveKam(f), "KAM saved")) setF(null); }}>Save</Button>
            <Button variant="ghost" onClick={() => setF(null)}>Cancel</Button>
          </div>
        </div>
      )}
      <ul className="divide-y divide-line/60">
        {s.kams.map((k) => (
          <li key={k.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <span className="font-medium">{k.name}</span>
            <span className="text-xs text-mute">{s.branches.filter((b) => b.kamId === k.id).length} branches</span>
            <span className="text-xs text-mute">{k.email} {k.mobile}</span>
            <StatusPill s={k.status} />
            <Button variant="ghost" className="ml-auto" onClick={() => setF(k)}>Edit</Button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Branches() {
  const s = useBranches();
  const data = useData();
  const [f, setF] = useState<Partial<Branch> | null>(null);
  return (
    <Panel title={`Branches (${s.branches.length})`} meta={<Button variant="solid" onClick={() => setF({ status: "active", kamId: s.kams[0]?.id ?? "" })}>Add branch</Button>}>
      {f && (
        <div className="grid gap-3 border-b border-line/60 p-4 sm:grid-cols-3">
          <Field label="Branch name *"><TextInput value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="HO Division KAM"><Select value={f.kamId ?? ""} onChange={(e) => setF({ ...f, kamId: e.target.value })}>{s.kams.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</Select></Field>
          <Field label="Status"><Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as any })}><option value="active">Active</option><option value="inactive">Inactive</option></Select></Field>
          <Field label="Branch RM"><TextInput value={f.rmName ?? ""} onChange={(e) => setF({ ...f, rmName: e.target.value })} /></Field>
          <Field label="Branch RM Contact" hint={phoneSuspicious(f.rmContact ?? "") ? "Not 10 digits — please verify" : undefined}><TextInput value={f.rmContact ?? ""} onChange={(e) => setF({ ...f, rmContact: e.target.value })} /></Field>
          <Field label="Branch RM Email" hint={emailOk(f.rmEmail ?? "") ? undefined : "Invalid email"}><TextInput value={f.rmEmail ?? ""} onChange={(e) => setF({ ...f, rmEmail: e.target.value })} /></Field>
          <div className="flex gap-2 sm:col-span-3">
            <Button variant="solid" disabled={!f.name?.trim() || !emailOk(f.rmEmail ?? "")} onClick={async () => { if (await wrap(saveBranch(f), "Branch saved")) setF(null); }}>Save</Button>
            <Button variant="ghost" onClick={() => setF(null)}>Cancel</Button>
          </div>
        </div>
      )}
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {s.branches.map((b) => {
          const kam = s.kams.find((k) => k.id === b.kamId);
          return (
            <div key={b.id} className="panel-inset p-3 text-sm">
              <div className="flex items-center gap-2"><span className="font-semibold">{b.name}</span><StatusPill s={b.status} /><Button variant="ghost" className="ml-auto" onClick={() => setF(b)}>Edit</Button></div>
              <div className="mt-1 text-xs text-mute">HO Division KAM: <span className="text-ink">{kam?.name ?? "—"}</span></div>
              <div className="mt-1 text-xs text-mute">Branch RM: <span className="text-ink">{b.rmName || "—"}</span></div>
              <div className="num text-xs">
                <a className="text-signal" href={`tel:${b.rmContact}`}>{b.rmContact}</a>
                {phoneSuspicious(b.rmContact) && <span className="ml-1 text-sev-high">⚠ verify</span>}
              </div>
              <a className="text-xs text-signal" href={`mailto:${b.rmEmail}`}>{b.rmEmail}</a>
              <div className="mt-2 flex gap-4 text-xs text-mute">
                <span>Plants <span className="num text-ink">{data.plants.filter((p) => p.branchId === b.id).length}</span></span>
                <span>Sales Engineers <span className="num text-ink">{s.sales.filter((x) => x.branchId === b.id).length}</span></span>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function Sales() {
  const s = useBranches();
  const [f, setF] = useState<Partial<SalesEngineer> | null>(null);
  const [q, setQ] = useState("");
  const [bf, setBf] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const t = q.trim().toLowerCase();
  const groups = s.branches
    .filter((b) => !bf || b.id === bf)
    .map((b) => ({
      b,
      list: s.sales.filter((x) => x.branchId === b.id && (!t || b.name.toLowerCase().includes(t) || [x.name, x.mobile, x.email].some((v) => (v ?? "").toLowerCase().includes(t)))),
    }))
    .filter((g) => g.list.length || (!t && !bf ? false : !t));
  const shown = groups.reduce((n, g) => n + g.list.length, 0);
  return (
    <Panel title={`Sales Engineers (${s.sales.length})`} meta={<Button variant="solid" onClick={() => setF({ status: "active", branchId: s.branches[0]?.id ?? "" })}>Add Sales Engineer</Button>}>
      {f && (
        <div className="grid gap-3 border-b border-line/60 p-4 sm:grid-cols-3">
          <Field label="Name *"><TextInput value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Branch"><Select value={f.branchId ?? ""} onChange={(e) => setF({ ...f, branchId: e.target.value })}>{s.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
          <Field label="Employee ID"><TextInput value={f.employeeId ?? ""} onChange={(e) => setF({ ...f, employeeId: e.target.value })} /></Field>
          <Field label="Email" hint={emailOk(f.email ?? "") ? undefined : "Invalid email"}><TextInput value={f.email ?? ""} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Mobile"><TextInput value={f.mobile ?? ""} onChange={(e) => setF({ ...f, mobile: e.target.value })} /></Field>
          <Field label="Status"><Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as any })}><option value="active">Active</option><option value="inactive">Inactive</option></Select></Field>
          <div className="flex gap-2 sm:col-span-3">
            <Button variant="solid" disabled={!f.name?.trim() || !emailOk(f.email ?? "")} onClick={async () => { if (await wrap(saveSales(f), "Sales Engineer saved")) setF(null); }}>Save</Button>
            <Button variant="ghost" onClick={() => setF(null)}>Cancel</Button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 border-b border-line/60 p-3">
        <TextInput className="min-w-0 flex-1" placeholder="Search name, mobile, email or branch…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={bf} onChange={(e) => setBf(e.target.value)} className="w-auto">
          <option value="">All branches</option>
          {s.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
        <span className="text-xs text-mute">{shown} shown</span>
      </div>
      {groups.length ? (
        <div className="grid gap-3 p-3 md:grid-cols-2">
          {groups.map(({ b, list }) => {
            const isOpen = open[b.id] ?? (!!q || !!bf);
            return (
              <div key={b.id} className="rounded-md border border-line/70">
                <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left" onClick={() => setOpen({ ...open, [b.id]: !isOpen })}>
                  <span className="text-mute">{isOpen ? "▾" : "▸"}</span>
                  <span className="font-medium">{b.name}</span>
                  <span className="num rounded-full border border-line px-2 text-xs">{list.length}</span>
                  <span className="ml-auto truncate text-xs text-mute">RM: {b.rmName || "—"}</span>
                </button>
                {isOpen && (
                  <ul className="divide-y divide-line/60 border-t border-line/60">
                    {list.map((x) => (
                      <li key={x.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{x.name}</div>
                          <div className="text-xs text-mute break-all">
                            {x.mobile && <a className="text-signal" href={`tel:${x.mobile}`}>{x.mobile}</a>} {x.email && <a className="text-signal" href={`mailto:${x.email}`}>{x.email}</a>}
                          </div>
                        </div>
                        <StatusPill s={x.status} />
                        <Button variant="ghost" onClick={() => setF(x)}>Edit</Button>
                      </li>
                    ))}
                    <li className="px-3 py-2"><Button variant="ghost" onClick={() => setF({ status: "active", branchId: b.id })}>+ Add Engineer</Button></li>
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      ) : <Empty>{s.sales.length ? "No match." : "No Sales Engineers yet. Add them branch by branch."}</Empty>}
    </Panel>
  );
}

function Hierarchy() {
  const s = useBranches();
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {s.kams.map((k) => {
        const bs = s.branches.filter((b) => b.kamId === k.id);
        return (
          <Panel key={k.id} title={k.name.toUpperCase()} meta={`${bs.length} Branches`}>
            <ul className="px-4 py-2 text-sm">
              {bs.map((b) => <li key={b.id} className="py-1"><span className="font-medium">{b.name}</span> <span className="text-mute">— {b.rmName}</span></li>)}
            </ul>
          </Panel>
        );
      })}
    </div>
  );
}

function History() {
  const s = useBranches();
  return (
    <Panel title="Ownership change history">
      {s.audit.length ? (
        <ul className="divide-y divide-line/60">
          {s.audit.map((a) => (
            <li key={a.id} className="px-4 py-2 text-sm">
              <span className="num text-xs text-mute">{new Date(a.changedAt).toLocaleString("en-IN")}</span>{" "}
              <span className="font-medium">{a.entity === "plant" ? "Plant" : "Branch"} {a.entityName}</span>: {a.field} changed{" "}
              <span className="text-mute">{a.oldValue || "—"}</span> → <span>{a.newValue || "—"}</span>
              <span className="text-xs text-mute"> · by {a.changedBy}</span>
            </li>
          ))}
        </ul>
      ) : <Empty>No changes recorded yet.</Empty>}
    </Panel>
  );
}

function HolidayEditor({ v, set }: { v: WorkloadSettings; set: (s: WorkloadSettings) => void }) {
  const [mode, setMode] = useState<"single" | "range">("single");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [name, setName] = useState("");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const names = v.holidayNames ?? {};
  const add = () => {
    const ds = dateRange(start, mode === "range" ? end : start);
    if (!ds.length) return;
    const nn = { ...names };
    for (const d of ds) nn[d] = name.trim() || nn[d] || "Holiday";
    set({ ...v, holidays: [...new Set([...v.holidays, ...ds])].sort(), holidayNames: nn });
    setStart(""); setEnd(""); setName("");
  };
  const remove = (d: string) => { const nn = { ...names }; delete nn[d]; set({ ...v, holidays: v.holidays.filter((x) => x !== d), holidayNames: nn }); };
  const byMonth = new Map<string, string[]>();
  for (const d of [...v.holidays].sort()) byMonth.set(d.slice(0, 7), [...(byMonth.get(d.slice(0, 7)) ?? []), d]);
  const mLabel = (m: string) => new Date(m + "-01T00:00:00Z").toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const first = new Date(month + "-01T00:00:00Z");
  const lead = (first.getUTCDay() + 6) % 7;
  const dim = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const shiftM = (n: number) => { const d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + n, 1)); setMonth(d.toISOString().slice(0, 7)); };
  return (
    <div className="grid gap-3">
      <div className="label-caps">Company holidays</div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="inline-flex overflow-hidden rounded-md ring-1 ring-line">
          {(["single", "range"] as const).map((m) => <button key={m} type="button" onClick={() => setMode(m)} className={`px-2.5 py-1.5 text-xs ${mode === m ? "bg-signal text-signal-foreground" : "text-mute"}`}>{m === "single" ? "Single date" : "Date range"}</button>)}
        </div>
        <Field label={mode === "range" ? "From" : "Date"}><TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        {mode === "range" ? <Field label="To"><TextInput type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} /></Field> : null}
        <Field label="Holiday name"><TextInput value={name} placeholder="e.g. Diwali" onChange={(e) => setName(e.target.value)} /></Field>
        <Button disabled={!start} onClick={add}>+ Add</Button>
      </div>
      <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
        <div className="rounded-md p-2 ring-1 ring-line">
          <div className="mb-1 flex items-center justify-between text-xs font-medium">
            <button type="button" aria-label="Previous month" onClick={() => shiftM(-1)} className="px-2">‹</button>{mLabel(month)}<button type="button" aria-label="Next month" onClick={() => shiftM(1)} className="px-2">›</button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px]">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i} className="text-mute">{d}</div>)}
            {Array.from({ length: lead }, (_, i) => <div key={"b" + i} />)}
            {Array.from({ length: dim }, (_, i) => { const d = `${month}-${String(i + 1).padStart(2, "0")}`; const h = v.holidays.includes(d); const off = v.nonWorkingDays.includes(new Date(d + "T00:00:00Z").getUTCDay());
              return <div key={d} title={h ? names[d] || "Holiday" : undefined} className={`rounded py-1 ${h ? "bg-sev-medium/20 font-semibold text-sev-medium" : off ? "text-mute" : ""}`}>{i + 1}</div>; })}
          </div>
        </div>
        <div className="grid content-start gap-2 sm:grid-cols-2">
          {byMonth.size === 0 ? <div className="text-xs text-mute">No holidays added yet.</div> : [...byMonth].map(([m, ds]) => (
            <div key={m} className="rounded-md p-2 ring-1 ring-line">
              <button type="button" onClick={() => setMonth(m)} className="mb-1 text-xs font-semibold">{mLabel(m)} — {ds.length} holiday{ds.length > 1 ? "s" : ""}</button>
              {ds.map((d) => (
                <div key={d} className="flex items-center gap-2 py-0.5 text-xs">
                  <span className="num w-20 text-mute">{new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" })}</span>
                  <span className="flex-1 truncate">{names[d] || "Holiday"}</span>
                  <button type="button" aria-label={`Remove ${d}`} onClick={() => remove(d)} className="text-mute hover:text-sev-critical">✕</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="text-[11px] text-mute">Holidays inside an approved leave are not counted as leave. Click Save to apply.</div>
    </div>
  );
}

function WorkloadRules() {
  const cur = useWorkloadSettings();
  const data = useData();
  const [f, setF] = useState<WorkloadSettings | null>(null);
  const v = f ?? cur;
  const num = (x: string) => (x === "" ? null : Math.max(0, Number(x) || 0));
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <Panel title="Workload Settings" meta={<span>Leave blank to show counts only, without High / Over judgement</span>}>
      <div className="grid gap-4 p-4 md:grid-cols-2">
        <div className="grid gap-2">
          <div className="label-caps">Customer Success — active items per day</div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="High from"><TextInput type="number" value={v.csHigh ?? ""} onChange={(e) => setF({ ...v, csHigh: num(e.target.value) })} /></Field>
            <Field label="Overloaded from"><TextInput type="number" value={v.csOver ?? ""} onChange={(e) => setF({ ...v, csOver: num(e.target.value) })} /></Field>
          </div>
          <div className="text-[11px] text-mute">Counts tasks (incl. carried), reports due, visits and customer follow-ups on that day.</div>
        </div>
        <div className="grid gap-2">
          <div className="label-caps">Execution — concurrent jobs per day</div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="High from"><TextInput type="number" value={v.execHigh ?? ""} onChange={(e) => setF({ ...v, execHigh: num(e.target.value) })} /></Field>
            <Field label="Overloaded from"><TextInput type="number" value={v.execOver ?? ""} onChange={(e) => setF({ ...v, execOver: num(e.target.value) })} /></Field>
          </div>
          <div className="text-[11px] text-mute">Overlapping jobs for the same engineer are always flagged as a conflict.</div>
        </div>
        <div className="grid gap-2">
          <div className="label-caps">Non-working days</div>
          <div className="flex flex-wrap gap-1.5">
            {days.map((d, i) => { const on = v.nonWorkingDays.includes(i); return <button key={d} type="button" onClick={() => setF({ ...v, nonWorkingDays: on ? v.nonWorkingDays.filter((x) => x !== i) : [...v.nonWorkingDays, i] })} className={`rounded-md px-2.5 py-1 text-xs ring-1 ${on ? "bg-signal/10 text-signal ring-signal/40" : "text-mute ring-line"}`}>{d}</button>; })}
          </div>
        </div>
        <div className="md:col-span-2"><HolidayEditor v={v} set={setF} /></div>
      </div>
      <div className="flex justify-end gap-2 px-4 pb-4">
        <Button variant="solid" disabled={!f} onClick={async () => { if (f && (await wrap(saveWorkloadSettings(f, engineerName(data, data.currentUserId) || "Manager"), "Workload settings saved"))) setF(null); }}>Save</Button>
      </div>
    </Panel>
  );
}
