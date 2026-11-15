import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/console/AppShell";
import { Bar, Chip, Empty, Field, Kpi, PageHeader, Panel, Select, SpecRow, Td, Th, TextInput, Tr } from "@/components/console/ui";
import {
  TODAY,
  analystsOf,
  engineerFleetTotals,
  engineerSummary,
  engineerUsage,
  fmtDate,
  plantName,
  removeEngineer,
  saveEngineer,
  shiftDate,
  useData,
  type Engineer,
} from "@/lib/store";
import { useExecution, ensureExecEngineer, execRecordFor } from "@/lib/execution";
import { Button } from "@/components/console/ui";
import { reviewUser, deleteAccount } from "@/lib/store";
import { Activity as ActivityIcon, CalendarDays, LayoutDashboard, Search, ShieldCheck, Trash2, Users } from "lucide-react";
import { EngineerMonitoring } from "@/components/console/EngineerMonitoring";
import { Workload } from "@/components/console/Workload";
import { cn } from "@/lib/utils";
import { engineerName } from "@/lib/store";

const roleLabel: Record<Engineer["role"], string> = { analyst: "Customer Success Engineer", manager: "Manager", execution: "Execution Engineer" };

export const Route = createFileRoute("/_authenticated/engineers")({
  head: () => ({
    meta: [
      { title: "Engineer Activity — Forbes Marshall CM Portal" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        name: "description",
        content:
          "Engineer-wise record of daily tasks completed and reports sent on time.",
      },
      { property: "og:title", content: "Engineer Activity — Forbes Marshall CM Portal" },
      {
        property: "og:description",
        content: "Accountability view per engineer: daily tasks and report delivery performance.",
      },
    ],
  }),
  component: EngineersPage,
});

function EngineersPage() {
  const data = useData();
  const ex = useExecution();
  const team = analystsOf(data);
  const executionTeam = data.engineers.filter((e) => e.role === "execution");
  const from = shiftDate(TODAY, -6);
  const days = Array.from({ length: 7 }, (_, i) => shiftDate(TODAY, -6 + i));

  const blank = { id: "", name: "", role: "analyst" as Engineer["role"] };
  const [form, setForm] = useState(blank);
  const [note, setNote] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmId, setConfirmId] = useState("");
  const [moveTo, setMoveTo] = useState("");
  const [tab, setTab] = useState<"overview" | "engineers" | "workload" | "activity">("overview");
  const [accountSearch, setAccountSearch] = useState("");
  const [accountStatus, setAccountStatus] = useState("all");

  const submit = () => {
    const res = saveEngineer(form.id ? { id: form.id, name: form.name, role: form.role } : { name: form.name, role: form.role });
    setNote(res);
    if (res.ok && form.role === "execution") void ensureExecEngineer(res.id, form.name, res.id);
    if (res.ok) setForm(blank);
  };

  const startEdit = (e: Engineer) => {
    setForm({ id: e.id, name: e.name, role: e.role });
    setNote(null);
  };

  const confirmDelete = (id: string) => {
    const res = removeEngineer(id, moveTo || undefined);
    setNote(res);
    if (res.ok) {
      setConfirmId("");
      setMoveTo("");
      if (form.id === id) setForm(blank);
    }
  };

  const pendingUsers = data.profiles.filter((p) => p.status === "pending");
  const review = async (id: string, approve: boolean) => {
    const res = await reviewUser(id, approve);
    setNote(res);
  };

  if (data.role !== "manager") {
    return (
      <AppShell>
        <PageHeader title="Team Workload" subtitle="Who has work, when, and where — apply for leave here" />
        <Workload data={data} myName={engineerName(data, data.currentUserId) || "Engineer"} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Engineers"
        subtitle="Team monitoring, workload and account management"
      />
      <div className="mb-5 flex gap-2 overflow-x-auto border-b border-line pb-3">
        {([{ id: "overview", label: "Team overview", icon: LayoutDashboard }, { id: "workload", label: "Workload", icon: CalendarDays }, { id: "activity", label: "Activity", icon: ActivityIcon }, { id: "engineers", label: "Team & accounts", icon: ShieldCheck }] as const).map(({ id, label, icon: Icon }) => <Button key={id} variant={tab === id ? "solid" : "ghost"} className="shrink-0" onClick={() => setTab(id)}><Icon className="size-4" />{label}{id === "engineers" && pendingUsers.length ? <span className="num">{pendingUsers.length}</span> : null}</Button>)}
      </div>
      {tab === "overview" && <EngineerMonitoring onWorkload={() => setTab("workload")} />}
      {tab === "workload" ? <Workload data={data} myName={engineerName(data, data.currentUserId) || "Manager"} /> : null}
      {tab === "activity" ? <Activity /> : null}
      {tab === "engineers" ? (<>

      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><div className="relative min-w-0"><Search className="pointer-events-none absolute top-2 left-2 size-4 text-mute" /><TextInput aria-label="Search team accounts" placeholder="Search name or email…" className="pl-8" value={accountSearch} onChange={(e) => setAccountSearch(e.target.value)} /></div><Select aria-label="Account status" className="w-auto" value={accountStatus} onChange={(e) => setAccountStatus(e.target.value)}><option value="all">All statuses</option><option value="pending">Pending approval</option><option value="approved">Approved</option><option value="rejected">Rejected</option></Select></div>
      {note && <p role="status" className={cn("mb-3 text-xs", note.ok ? "text-sev-low" : "text-sev-critical")}>{note.message}</p>}
      <Panel title="Account approvals" meta={`${pendingUsers.length} waiting`} className="mb-4">
        {data.profiles.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Mobile</Th>
                  <Th>Status</Th>
                  <Th align="right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {[...pendingUsers, ...data.profiles.filter((p) => p.status !== "pending")].filter((p) => (accountStatus === "all" || p.status === accountStatus) && `${p.fullName} ${p.email}`.toLowerCase().includes(accountSearch.toLowerCase())).map((p) => (
                  <Tr key={p.id}>
                    <Td>{p.fullName || "—"}</Td>
                    <Td className="text-mute">{p.email}</Td>
                    <Td mono>{p.phone || "—"}</Td>
                    <Td>
                      <Chip
                        severity={p.status === "approved" ? "low" : p.status === "pending" ? "medium" : "high"}
                        label={p.status === "approved" ? "Approved" : p.status === "pending" ? "Pending approval" : "Rejected"}
                      />
                    </Td>
                    <Td align="right">
                      {p.engineerId === data.currentUserId ? null : (
                        <span className="flex justify-end gap-2">
                          {p.status !== "approved" ? <Button variant="solid" onClick={() => void review(p.id, true)}>Approve</Button> : null}
                          {p.status !== "rejected" ? <Button variant="ghost" onClick={() => void review(p.id, false)}>{p.status === "approved" ? "Revoke" : "Reject"}</Button> : null}
                          <button
                            type="button"
                            aria-label="Delete account"
                            className="grid size-8 place-items-center rounded-md text-sev-high hover:bg-sev-high/10"
                            onClick={async () => {
                              if (!window.confirm(`Delete the account of ${p.fullName || p.email}? They will no longer be able to log in. Their past work stays in the portal.`)) return;
                              setNote(await deleteAccount(p.id));
                            }}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No sign-ups yet.</Empty>
        )}
      </Panel>

      <Panel
        title={form.id ? "Edit engineer" : "Add engineer"}
        meta={<span className="num text-xs text-mute">{data.engineers.length} people on record</span>}
        className="mb-4"
      >
        <div className="grid gap-3 p-4 sm:grid-cols-[1fr_12rem_auto]">
          <Field label="Name">
            <TextInput
              value={form.name}
              placeholder="e.g. R. Ahuja"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </Field>
          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Engineer["role"] })}>
              <option value="analyst">Customer Success Engineer</option>
              <option value="manager">Manager</option>
              <option value="execution">Execution Engineer</option>
            </Select>
          </Field>
          <div className="flex items-end gap-2">
            <Button variant="solid" onClick={submit}>{form.id ? "Save name" : "Add engineer"}</Button>
            {form.id ? <Button variant="ghost" onClick={() => { setForm(blank); setNote(null); }}>Cancel</Button> : null}
          </div>
        </div>
        {note ? (
          <div className={`px-4 pb-3 text-xs ${note.ok ? "text-sev-low" : "text-sev-high"}`}>{note.message}</div>
        ) : null}

        <div className="overflow-x-auto border-t border-line/60">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Role</Th>
                <Th align="right">Plants</Th>
                <Th align="right">Tasks</Th>
                <Th align="right">Reports</Th>
                <Th align="right">Manage</Th>
              </tr>
            </thead>
            <tbody>
              {data.engineers.filter((e) => e.name.toLowerCase().includes(accountSearch.toLowerCase())).map((e) => {
                const usage = engineerUsage(data, e.id);
                const others = data.engineers.filter((o) => o.id !== e.id);
                return (
                  <Tr key={e.id}>
                    <Td>{e.name}</Td>
                    <Td>{roleLabel[e.role]}</Td>
                    <Td align="right" mono>{usage.plants}</Td>
                    <Td align="right" mono>{data.tasks.filter((t) => t.engineerId === e.id).length}</Td>
                    <Td align="right" mono>{usage.reports}</Td>
                    <Td align="right">
                      {confirmId === e.id ? (
                        <span className="flex flex-wrap items-center justify-end gap-2">
                          {usage.plants + usage.updates + usage.reports > 0 ? (
                            <Select value={moveTo} onChange={(ev) => setMoveTo(ev.target.value)}>
                              <option value="">Move work to…</option>
                              {others.map((o) => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                              ))}
                            </Select>
                          ) : null}
                          <Button onClick={() => confirmDelete(e.id)}>Confirm delete</Button>
                          <Button variant="ghost" onClick={() => { setConfirmId(""); setMoveTo(""); }}>Cancel</Button>
                        </span>
                      ) : (
                        <span className="flex items-center justify-end gap-2">
                          <Button variant="ghost" onClick={() => startEdit(e)}>Edit</Button>
                          <Button variant="ghost" onClick={() => { setConfirmId(e.id); setMoveTo(""); setNote(null); }}>Delete</Button>
                        </span>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      </>) : null}
    </AppShell>
  );
}

function Activity() {
  const data = useData();
  const ex = useExecution();
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("all");
  const [period, setPeriod] = useState("7");
  const cutoff = period === "all" ? "" : shiftDate(TODAY, -(Number(period) - 1));
  const rows = [
    ...data.tasks.flatMap((t) => t.activity.map((a) => ({ at: a.at, who: engineerName(data, a.by), text: `${a.text} — ${t.title}`, dom: data.engineers.find((e) => e.id === t.engineerId)?.role === "execution" ? "Execution" : data.engineers.find((e) => e.id === t.engineerId)?.role === "manager" ? "Manager" : "Customer Success" }))),
    ...ex.activity.map((a) => { const j = ex.jobs.find((x) => x.id === a.jobId); const person = data.profiles.find((p) => p.id === a.byUser); return { at: a.createdAt, who: engineerName(data, person?.engineerId ?? a.byUser), text: `${a.text}${j ? ` — ${j.plantName || j.customerName}` : ""}`, dom: "Execution" }; }),
  ].filter((r) => (!cutoff || r.at.slice(0, 10) >= cutoff) && (domain === "all" || r.dom === domain) && `${r.who} ${r.text}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => a.at < b.at ? 1 : -1).slice(0, 80);
  return <section className="space-y-4"><div className="flex flex-wrap gap-3"><TextInput aria-label="Search activity" className="min-w-0 flex-1" placeholder="Search engineer or activity…" value={query} onChange={(e) => setQuery(e.target.value)} /><Select aria-label="Activity team" className="w-auto" value={domain} onChange={(e) => setDomain(e.target.value)}><option value="all">All teams</option><option>Customer Success</option><option>Execution</option><option>Manager</option></Select><Select aria-label="Activity period" className="w-auto" value={period} onChange={(e) => setPeriod(e.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All recorded activity</option></Select></div><h2 className="font-semibold">Recent activity <span className="num text-xs font-normal text-mute">{rows.length}</span></h2><ol className="divide-y divide-line border-y border-line">{rows.map((r, i) => <li key={`${r.at}-${i}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-4"><div className="min-w-0"><p className="break-words text-sm">{r.text}</p><p className="mt-2 text-xs text-mute">{r.who} · {r.dom}</p></div><time className="num shrink-0 text-[10px] text-mute">{fmtDate(r.at.slice(0, 10))}<span className="block text-right">{r.at.slice(11, 16)}</span></time></li>)}</ol>{!rows.length && <Empty>No activity matches these filters.</Empty>}</section>;
}
