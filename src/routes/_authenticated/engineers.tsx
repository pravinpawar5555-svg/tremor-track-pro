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
import { reviewUser } from "@/lib/store";

const roleLabel: Record<Engineer["role"], string> = { analyst: "Engineer", manager: "Manager", execution: "Execution Engineer" };

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
  const team = analystsOf(data);
  const from = shiftDate(TODAY, -6);
  const days = Array.from({ length: 7 }, (_, i) => shiftDate(TODAY, -6 + i));

  const blank = { id: "", name: "", role: "analyst" as Engineer["role"] };
  const [form, setForm] = useState(blank);
  const [note, setNote] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmId, setConfirmId] = useState("");
  const [moveTo, setMoveTo] = useState("");

  const submit = () => {
    const res = saveEngineer(form.id ? { id: form.id, name: form.name, role: form.role } : { name: form.name, role: form.role });
    setNote(res);
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
        subtitle="Manage the team and review the last 7 days of work"
      />

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
              <option value="analyst">Engineer</option>
              <option value="manager">Manager</option>
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
                    <Td>{e.role === "analyst" ? "Engineer" : "Manager"}</Td>
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
    </AppShell>
  );
}
