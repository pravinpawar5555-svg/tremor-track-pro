import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/console/AppShell";
import { Button, Empty, Field, PageHeader, Panel, Select, TextInput } from "@/components/console/ui";
import { peekDomain } from "@/lib/domain";
import { useData, engineerName } from "@/lib/store";
import { saveWorkloadSettings, useWorkloadSettings, type WorkloadSettings } from "@/lib/workload";
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

type Tab = "kams" | "branches" | "sales" | "hierarchy" | "history" | "workload";
const tabs: [Tab, string][] = [["kams", "HO Division KAMs"], ["branches", "Branches"], ["sales", "Sales Engineers"], ["hierarchy", "Hierarchy"], ["history", "Change history"], ["workload", "Workload"]];

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
  const bn = (id: string) => s.branches.find((b) => b.id === id)?.name ?? "—";
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
      {s.sales.length ? (
        <ul className="divide-y divide-line/60">
          {s.sales.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="font-medium">{x.name}</span>
              <span className="text-xs text-mute">{bn(x.branchId)}</span>
              <span className="text-xs text-mute">{x.email} {x.mobile}</span>
              <StatusPill s={x.status} />
              <Button variant="ghost" className="ml-auto" onClick={() => setF(x)}>Edit</Button>
            </li>
          ))}
        </ul>
      ) : <Empty>No Sales Engineers yet. Add them branch by branch.</Empty>}
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
        <Field label="Company holidays" hint="Dates separated by commas, e.g. 2026-10-20, 2026-11-08">
          <TextInput value={v.holidays.join(", ")} onChange={(e) => setF({ ...v, holidays: e.target.value.split(/[,\s]+/).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)) })} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 px-4 pb-4">
        <Button variant="solid" disabled={!f} onClick={async () => { if (f && (await wrap(saveWorkloadSettings(f, engineerName(data, data.currentUserId) || "Manager"), "Workload settings saved"))) setF(null); }}>Save</Button>
      </div>
    </Panel>
  );
}
