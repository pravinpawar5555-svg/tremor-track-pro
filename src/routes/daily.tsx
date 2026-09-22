import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/console/AppShell";
import { Button, Empty, Field, Kpi, Panel, PageHeader, Select, Td, TextArea, TextInput, Th, Tr } from "@/components/console/ui";
import {
  TODAY,
  addUpdate,
  analystsOf,
  engineerName,
  fmtDate,
  plantName,
  removeUpdate,
  shiftDate,
  sumUpdates,
  useData,
} from "@/lib/store";

export const Route = createFileRoute("/daily")({
  head: () => ({
    meta: [
      { title: "Daily Work Update — Forbes Marshall CM Portal" },
      {
        name: "description",
        content:
          "Engineers log each morning which plant they observed and how many machines were checked by trend, KPI value and FFT.",
      },
      { property: "og:title", content: "Daily Work Update — Forbes Marshall CM Portal" },
      {
        property: "og:description",
        content: "Morning log of plant observed, machines checked by trend/KPI/FFT, abnormalities found and remarks.",
      },
    ],
  }),
  component: DailyPage,
});

const empty = {
  date: TODAY,
  engineerId: "",
  plantId: "",
  machinesChecked: "",
  trend: "",
  kpi: "",
  fft: "",
  abnormal: "",
  remark: "",
};

function DailyPage() {
  const data = useData();
  const [form, setForm] = useState(empty);
  const [filterEng, setFilterEng] = useState("all");
  const [saved, setSaved] = useState(false);

  const set = (k: keyof typeof empty, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const n = (v: string) => (v === "" ? 0 : Math.max(0, Number(v) || 0));

  const submit = () => {
    if (!form.plantId) return;
    addUpdate({
      date: form.date,
      engineerId: form.engineerId,
      plantId: form.plantId,
      machinesChecked: n(form.machinesChecked),
      trend: n(form.trend),
      kpi: n(form.kpi),
      fft: n(form.fft),
      abnormal: n(form.abnormal),
      remark: form.remark.trim(),
    });
    setForm({ ...empty, engineerId: form.engineerId, date: form.date });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const list = data.updates
    .filter((u) => (filterEng === "all" ? true : u.engineerId === filterEng))
    .sort((a, b) => (a.date === b.date ? (a.submittedAt < b.submittedAt ? 1 : -1) : a.date < b.date ? 1 : -1));

  const week = shiftDate(TODAY, -6);
  const totals = sumUpdates(list.filter((u) => u.date >= week));

  return (
    <AppShell>
      <PageHeader
        title="Daily Work Update"
        subtitle="Fill this in every morning before starting work — plant observed and machines checked"
      />

      <div className="grid items-start gap-4 xl:grid-cols-[22rem_1fr]">
        <Panel title="New update" meta={saved ? <span className="text-sev-low">Saved</span> : `${fmtDate(TODAY)}`}>
          <div className="grid gap-3 p-4">
            <Field label="Date">
              <TextInput type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
            </Field>
            <Field label="Engineer">
              <Select value={form.engineerId} onChange={(e) => set("engineerId", e.target.value)}>
                {team.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Plant observed">
              <Select value={form.plantId} onChange={(e) => set("plantId", e.target.value)}>
                <option value="">Select plant…</option>
                {data.plants.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Machines checked">
              <TextInput type="number" min={0} value={form.machinesChecked} onChange={(e) => set("machinesChecked", e.target.value)} placeholder="0" />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Trend">
                <TextInput type="number" min={0} value={form.trend} onChange={(e) => set("trend", e.target.value)} placeholder="0" />
              </Field>
              <Field label="KPI value">
                <TextInput type="number" min={0} value={form.kpi} onChange={(e) => set("kpi", e.target.value)} placeholder="0" />
              </Field>
              <Field label="FFT">
                <TextInput type="number" min={0} value={form.fft} onChange={(e) => set("fft", e.target.value)} placeholder="0" />
              </Field>
            </div>
            <Field label="Abnormal found">
              <TextInput type="number" min={0} value={form.abnormal} onChange={(e) => set("abnormal", e.target.value)} placeholder="0" />
            </Field>
            <Field label="Remark" hint="What was observed, what was informed to the site.">
              <TextArea value={form.remark} onChange={(e) => set("remark", e.target.value)} placeholder="Short observation / action taken" />
            </Field>
            <div className="flex items-center gap-2">
              <Button variant="solid" onClick={submit} disabled={!form.plantId}>Submit update</Button>
              <Button variant="ghost" onClick={() => setForm(empty)}>Clear</Button>
            </div>
          </div>
        </Panel>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-5">
            <Kpi label="Machines · 7 d" value={totals.machinesChecked} />
            <Kpi label="Trend · 7 d" value={totals.trend} />
            <Kpi label="KPI · 7 d" value={totals.kpi} />
            <Kpi label="FFT · 7 d" value={totals.fft} />
            <Kpi label="Abnormal · 7 d" value={totals.abnormal} tone={totals.abnormal ? "medium" : "low"} />
          </div>

          <Panel
            title="Update log"
            meta={
              <Select className="w-40" value={filterEng} onChange={(e) => setFilterEng(e.target.value)}>
                <option value="all">All engineers</option>
                {team.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            }
          >
            {list.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Engineer</Th>
                      <Th>Plant</Th>
                      <Th align="right">Machines</Th>
                      <Th align="right">Trend</Th>
                      <Th align="right">KPI</Th>
                      <Th align="right">FFT</Th>
                      <Th align="right">Abnormal</Th>
                      <Th>Remark</Th>
                      <Th align="right"> </Th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((u) => (
                      <Tr key={u.id}>
                        <Td mono>{fmtDate(u.date)}</Td>
                        <Td>{engineerName(data, u.engineerId)}</Td>
                        <Td className="max-w-[14rem] truncate">{plantName(data, u.plantId)}</Td>
                        <Td align="right" mono>{u.machinesChecked}</Td>
                        <Td align="right" mono>{u.trend}</Td>
                        <Td align="right" mono>{u.kpi}</Td>
                        <Td align="right" mono>{u.fft}</Td>
                        <Td align="right" mono className={u.abnormal ? "text-sev-medium" : undefined}>{u.abnormal}</Td>
                        <Td className="max-w-[20rem] text-xs text-mute">{u.remark || "—"}</Td>
                        <Td align="right">
                          <Button variant="ghost" onClick={() => removeUpdate(u.id)}>Delete</Button>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>No updates recorded yet.</Empty>
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
