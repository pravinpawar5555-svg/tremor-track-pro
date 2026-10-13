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
import { Trash2 } from "lucide-react";
import { Workload } from "@/components/console/Workload";
import { cn } from "@/lib/utils";
import { engineerName } from "@/lib/store";

const roleLabel: Record<Engineer["role"], string> = { analyst: "Customer Success Engineer", manager: "Manager", execution: "Execution Engineer" };

export const Route = createFileRoute("/_authenticated/engineers")({
  head: () => ({
    meta: [
      { title: "Engineer Activity — Forbes Marshall CM Portal" },
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
  const [tab, setTab] = useState<"engineers" | "workload" | "activity">("engineers");

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
        <Empty>Only the manager can manage engineers and approve accounts.</Empty>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Engineers"
        subtitle={tab === "workload" ? "Resource planning — who has work, when, and where it is accumulating" : tab === "activity" ? "Recent work activity across the team" : "Manage the team and review the last 7 days of work"}
      />
      <div className="mb-4 inline-flex overflow-hidden rounded-md ring-1 ring-line">
        {([["engineers", "Engineers"], ["workload", "Workload"], ["activity", "Activity"]] as const).map(([id, l]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={cn("px-3 py-1.5 text-xs font-medium", tab === id ? "bg-signal text-signal-foreground" : "bg-panel text-mute hover:bg-base")}>{l}</button>
        ))}
      </div>
      {tab === "workload" ? <Workload data={data} myName={engineerName(data, data.currentUserId) || "Manager"} /> : null}
      {tab === "activity" ? <Activity /> : null}
      {tab === "engineers" ? (<>

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
                {[...pendingUsers, ...data.profiles.filter((p) => p.status !== "pending")].map((p) => (
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
              {data.engineers.map((e) => {
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

      <div className="grid items-start gap-4 xl:grid-cols-2">
        {team.map((a) => {
          const s = engineerSummary(data, a.id);
          const usage = engineerUsage(data, a.id);
          const fleet = engineerFleetTotals(data, a.id);
          return (
            <Panel
              key={a.id}
              title={a.name}
              meta={<Chip severity={s.activeToday ? "low" : "high"} label={s.activeToday ? "Tasks planned today" : "No tasks today"} />}
            >
              <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
                <Kpi label="Active days" value={`${s.activeDays}/${s.days}`} tone={s.activeDays >= 5 ? "low" : "medium"} />
                <Kpi label="Tasks · 7 d" value={s.tasks} />
                <Kpi label="Completed" value={s.done} tone="low" hint={`${s.pending} pending`} />
                <Kpi label="Reports late" value={s.reportsLate} tone={s.reportsLate ? "high" : "low"} hint={`${s.reportsSent} sent`} />
                <Kpi label="Total machines" value={fleet.machines} hint={`${usage.plants} plants`} />
                <Kpi label="Total assets" value={fleet.assets} />
                <Kpi label="Node 6 sensors" value={fleet.node6} />
                <Kpi label="Node X sensors" value={fleet.nodeX} />
                <Kpi label="VibAssist sensors" value={fleet.vibassist ?? 0} />
              </div>
              <div className="px-4 pb-3">
                <SpecRow label="Reports pending" value={s.reportsPending} />
                <SpecRow label="Reports overdue" value={s.reportsOverdue} />
              </div>
              <div className="border-t border-line/60 px-4 py-3">
                <div className="label-caps mb-2">Daily task list — last 7 days</div>
                <div className="flex flex-wrap gap-2">
                  {days.map((d) => (
                    <span
                      key={d}
                      className={`num rounded-md px-2 py-1 text-[11px] ${s.activeOn(d) ? "bg-sev-low/10 text-sev-low" : "bg-sev-high/10 text-sev-high"}`}
                    >
                      {fmtDate(d).slice(0, 6)}
                    </span>
                  ))}
                </div>
              </div>
            </Panel>
          );
        })}
      </div>

      {executionTeam.length ? (
        <div className="grid items-start gap-4 xl:grid-cols-2">
          {executionTeam.map((e) => {
            const rec = execRecordFor(e.id);
            const j = rec ? ex.jobs.filter((x) => x.assignedEngineerId === rec.id || x.secondaryEngineerId === rec.id) : [];
            const byType = (t: string) => j.filter((x) => x.installationType === t).length;
            const done = j.filter((x) => x.status === "completed").length;
            const open = j.filter((x) => !["completed", "cancelled"].includes(x.status)).length;
            const sensors = j.reduce((s, x) => s + x.sensorsInstalled, 0);
            const machines = j.reduce((s, x) => s + x.machinesCovered, 0);
            const visits = rec ? ex.updates.filter((u) => j.some((x) => x.id === u.jobId)).length : 0;
            return (
              <Panel key={e.id} title={e.name} meta={<Chip severity="low" label="Execution Engineer" />}>
                <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
                  <Kpi label="Installation sensors" value={sensors} />
                  <Kpi label="Machines covered" value={machines} />
                  <Kpi label="Site visits" value={visits} hint="daily updates" />
                  <Kpi label="Jobs completed" value={done} tone="low" hint={`${j.length} total`} />
                  <Kpi label="Demo jobs" value={byType("demo")} />
                  <Kpi label="Order jobs" value={byType("order")} />
                  <Kpi label="Troubleshooting jobs" value={byType("troubleshooting")} />
                  <Kpi label="Open jobs" value={open} />
                </div>
                <div className="px-4 pb-3">
                  <SpecRow label="Pending / follow-up" value={j.filter((x) => x.status === "pending").length} />
                  <SpecRow label="On hold" value={j.filter((x) => x.status === "on_hold").length} />
                </div>
              </Panel>
            );
          })}
        </div>
      ) : null}
      </>) : null}
    </AppShell>
  );
}

function Activity() {
  const data = useData();
  const ex = useExecution();
  const rows = [
    ...data.tasks.flatMap((t) => t.activity.map((a) => ({ at: a.at, who: engineerName(data, t.engineerId), text: `${a.text} — ${t.title}`, dom: "Customer Success" }))),
    ...ex.activity.map((a) => { const j = ex.jobs.find((x) => x.id === a.jobId); return { at: a.createdAt, who: a.byUser, text: `${a.text}${j ? ` — ${j.plantName || j.customerName}` : ""}`, dom: "Execution" }; }),
  ].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 80);
  return (
    <Panel title="Recent activity" meta={<span>Latest 80</span>}>
      <div className="divide-y divide-line/60">
        {rows.map((r, i) => (
          <div key={i} className="flex items-start justify-between gap-3 px-4 py-2 text-sm">
            <div className="min-w-0"><div className="truncate">{r.text}</div><div className="text-xs text-mute">{r.who} · {r.dom}</div></div>
            <span className="num shrink-0 text-xs text-mute">{fmtDate(r.at.slice(0, 10))}</span>
          </div>
        ))}
        {!rows.length ? <Empty>No activity yet.</Empty> : null}
      </div>
    </Panel>
  );
}
