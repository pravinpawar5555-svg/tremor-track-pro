import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/console/AppShell";
import { Bar, Chip, Empty, Field, Kpi, PageHeader, Panel, Select, SpecRow, Td, Th, TextInput, Tr } from "@/components/console/ui";
import {
  TODAY,
  analystsOf,
  engineerSummary,
  engineerUsage,
  fmtDate,
  plantName,
  removeEngineer,
  resetDemoData,
  saveEngineer,
  shiftDate,
  useData,
  type Engineer,
} from "@/lib/store";
import { Button } from "@/components/console/ui";

export const Route = createFileRoute("/engineers")({
  head: () => ({
    meta: [
      { title: "Engineer Activity — Forbes Marshall CM Portal" },
      {
        name: "description",
        content:
          "Engineer-wise record of daily updates submitted, plants covered, machines checked, abnormalities found and reports sent on time.",
      },
      { property: "og:title", content: "Engineer Activity — Forbes Marshall CM Portal" },
      {
        property: "og:description",
        content: "Accountability view per engineer: daily updates, coverage and report delivery performance.",
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

  return (
    <AppShell>
      <PageHeader
        title="Engineers"
        subtitle="Manage the team and review the last 7 days of work"
        actions={<Button variant="ghost" onClick={resetDemoData}>Reset demo data</Button>}
      />

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
              <option value="analyst">Engineer (fills daily update)</option>
              <option value="manager">Team lead (monitoring only)</option>
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
                <Th align="right">Updates</Th>
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
                    <Td>{e.role === "analyst" ? "Engineer" : "Team lead"}</Td>
                    <Td align="right" mono>{usage.plants}</Td>
                    <Td align="right" mono>{usage.updates}</Td>
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
          const list = data.updates.filter((u) => u.engineerId === a.id && u.date >= from);
          return (
            <Panel
              key={a.id}
              title={a.name}
              meta={<Chip severity={s.submittedToday ? "low" : "high"} label={s.submittedToday ? "Today updated" : "Today pending"} />}
            >
              <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
                <Kpi label="Days updated" value={`${s.daysUpdated}/${s.days}`} tone={s.daysUpdated >= 6 ? "low" : "medium"} />
                <Kpi label="Machines checked" value={s.machinesChecked} hint={`Trend ${s.trend} · KPI ${s.kpi} · FFT ${s.fft}`} />
                <Kpi label="Abnormal found" value={s.abnormal} tone={s.abnormal ? "medium" : "low"} />
                <Kpi label="Reports late" value={s.reportsLate} tone={s.reportsLate ? "high" : "low"} hint={`${s.reportsSent} sent`} />
              </div>
              <div className="px-4 pb-3">
                <SpecRow label="Plants covered" value={s.plantsCovered} />
                <SpecRow label="Updates submitted" value={s.entries} />
                <SpecRow label="Reports pending" value={s.reportsPending} />
                <SpecRow label="Reports overdue" value={s.reportsOverdue} />
              </div>
              <div className="border-t border-line/60 px-4 py-3">
                <div className="label-caps mb-2">Daily submission — last 7 days</div>
                <div className="flex flex-wrap gap-2">
                  {days.map((d) => {
                    const done = list.some((u) => u.date === d);
                    return (
                      <span
                        key={d}
                        className={`num rounded-md px-2 py-1 text-[11px] ${done ? "bg-sev-low/10 text-sev-low" : "bg-sev-high/10 text-sev-high"}`}
                      >
                        {fmtDate(d).slice(0, 6)}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-3"><Bar pct={(s.daysUpdated / s.days) * 100} severity={s.daysUpdated >= 6 ? "low" : "medium"} /></div>
              </div>
              {list.length ? (
                <div className="overflow-x-auto border-t border-line/60">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <Th>Date</Th>
                        <Th>Plant</Th>
                        <Th align="right">Machines</Th>
                        <Th align="right">FFT</Th>
                        <Th align="right">Abnormal</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {list
                        .sort((x, y) => (x.date < y.date ? 1 : -1))
                        .map((u) => (
                          <Tr key={u.id}>
                            <Td mono>{fmtDate(u.date)}</Td>
                            <Td className="max-w-[12rem] truncate">{plantName(data, u.plantId)}</Td>
                            <Td align="right" mono>{u.machinesChecked}</Td>
                            <Td align="right" mono>{u.fft}</Td>
                            <Td align="right" mono className={u.abnormal ? "text-sev-medium" : undefined}>{u.abnormal}</Td>
                          </Tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty>No updates in the last 7 days.</Empty>
              )}
            </Panel>
          );
        })}
      </div>
    </AppShell>
  );
}
