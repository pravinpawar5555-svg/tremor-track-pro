import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/console/AppShell";
import {
  Button,
  Empty,
  Field,
  FrequencyChip,
  PageHeader,
  Panel,
  Select,
  Td,
  TextInput,
  Th,
  Tr,
} from "@/components/console/ui";
import {
  TODAY,
  analystsOf,
  engineerName,
  fmtDate,
  plantSummary,
  removePlant,
  savePlant,
  shiftDate,
  useData,
  type Frequency,
  type Plant,
} from "@/lib/store";

export const Route = createFileRoute("/plants")({
  head: () => ({
    meta: [
      { title: "Plants — Forbes Marshall CM Portal" },
      {
        name: "description",
        content: "Plant master: customer, location, machine count, report cycle, contact person and assigned engineer.",
      },
      { property: "og:title", content: "Plants — Forbes Marshall CM Portal" },
      {
        property: "og:description",
        content: "Set up each plant once with its report cycle and assigned engineer, then track observation and report history.",
      },
    ],
  }),
  component: PlantsPage,
});

const blank = {
  name: "",
  customer: "",
  location: "",
  machines: "",
  frequency: "weekly" as Frequency,
  contact: "",
  engineerId: "",
};

function PlantsPage() {
  const data = useData();
  const team = analystsOf(data);
  const [form, setForm] = useState<typeof blank & { id?: string }>(blank);
  const [open, setOpen] = useState(false);

  const edit = (p: Plant) => {
    setForm({ ...p, machines: String(p.machines) });
    setOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) return;
    savePlant({
      ...(form.id ? { id: form.id } : {}),
      name: form.name.trim(),
      customer: form.customer.trim(),
      location: form.location.trim(),
      machines: Math.max(0, Number(form.machines) || 0),
      frequency: form.frequency,
      contact: form.contact.trim(),
      engineerId: form.engineerId,
    });
    setForm(blank);
    setOpen(false);
  };

  return (
    <AppShell>
      <PageHeader
        title="Plants"
        subtitle="Add each plant once — customer, machine count, report cycle and assigned engineer"
        actions={
          <Button
            variant={open ? "ghost" : "solid"}
            onClick={() => {
              setForm(blank);
              setOpen((o) => !o);
            }}
          >
            {open ? "Cancel" : "Add plant"}
          </Button>
        }
      />

      {open ? (
        <Panel className="mb-4" title={form.id ? "Edit plant" : "Add plant"}>
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Plant name">
              <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tata Steel — Kalinganagar CPP" />
            </Field>
            <Field label="Customer">
              <TextInput value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} />
            </Field>
            <Field label="Location">
              <TextInput value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Field>
            <Field label="Total machines">
              <TextInput type="number" min={0} value={form.machines} onChange={(e) => setForm({ ...form, machines: e.target.value })} />
            </Field>
            <Field label="Report cycle">
              <Select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as Frequency })}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="on-demand">On demand</option>
              </Select>
            </Field>
            <Field label="Customer contact">
              <TextInput value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </Field>
            <Field label="Assigned engineer">
              <Select value={form.engineerId} onChange={(e) => setForm({ ...form, engineerId: e.target.value })}>
                {team.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            </Field>
            <div className="flex items-end">
              <Button variant="solid" onClick={save} disabled={!form.name.trim()}>{form.id ? "Save changes" : "Add plant"}</Button>
            </div>
          </div>
        </Panel>
      ) : null}

      <Panel title="Plant master" meta={`${data.plants.length} plants`}>
        {data.plants.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Plant</Th>
                  <Th>Customer / contact</Th>
                  <Th>Location</Th>
                  <Th align="right">Machines</Th>
                  <Th>Report cycle</Th>
                  <Th>Engineer</Th>
                  <Th>Last observed</Th>
                  <Th>Last report sent</Th>
                  <Th align="right"> </Th>
                </tr>
              </thead>
              <tbody>
                {data.plants.map((p) => {
                  const s = plantSummary(data, p.id);
                  const stale = !s.lastObserved || s.lastObserved < shiftDate(TODAY, -7);
                  return (
                    <Tr key={p.id}>
                      <Td className="font-medium">{p.name}</Td>
                      <Td>
                        <div>{p.customer || "—"}</div>
                        <div className="text-xs text-mute">{p.contact || "—"}</div>
                      </Td>
                      <Td className="text-mute">{p.location || "—"}</Td>
                      <Td align="right" mono>{p.machines}</Td>
                      <Td><FrequencyChip frequency={p.frequency} /></Td>
                      <Td>{engineerName(data, p.engineerId)}</Td>
                      <Td mono className={stale ? "text-sev-high" : undefined}>{fmtDate(s.lastObserved)}</Td>
                      <Td mono>{fmtDate(s.lastReportSent)}</Td>
                      <Td align="right">
                        <span className="flex justify-end gap-1">
                          <Button variant="ghost" onClick={() => edit(p)}>Edit</Button>
                          <Button variant="ghost" onClick={() => removePlant(p.id)}>Delete</Button>
                        </span>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No plants yet. Add your first plant to start recording daily work.</Empty>
        )}
      </Panel>
    </AppShell>
  );
}
