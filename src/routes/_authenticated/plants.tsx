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
  allFrequencies,
  analystsOf,
  customerCategoryLabel,
  engineerName,
  fmtDate,
  frequencyLabel,
  plantFrequencies,
  plantSummary,
  removePlant,
  savePlant,
  shiftDate,
  useData,
  type CustomerCategory,
  type Frequency,
  type Plant,
} from "@/lib/store";

export const Route = createFileRoute("/_authenticated/plants")({
  head: () => ({
    meta: [
      { title: "Plants — Forbes Marshall CM Portal" },
      {
        name: "description",
        content: "Plant master: customer, location, machine count, report cycles, contact person with phone number and assigned engineer.",
      },
      { property: "og:title", content: "Plants — Forbes Marshall CM Portal" },
      {
        property: "og:description",
        content: "Set up each plant once with its report cycles and assigned engineer, then track observation and report history.",
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
  assets: "",
  node6: "",
  nodeX: "",
  frequencies: ["weekly"] as Frequency[],
  contact: "",
  contactPhone: "",
  engineerId: "",
  category: "order" as CustomerCategory,
};

function PlantsPage() {
  const data = useData();
  const team = analystsOf(data);
  const manager = data.role === "manager";
  const me = data.currentUserId;
  const plants = manager ? data.plants : data.plants.filter((p) => p.engineerId === me);
  const [form, setForm] = useState<typeof blank & { id?: string }>(blank);
  const [open, setOpen] = useState(false);

  const edit = (p: Plant) => {
    setForm({
      id: p.id,
      name: p.name,
      customer: p.customer,
      location: p.location,
      machines: String(p.machines),
      assets: String(p.assets ?? 0),
      node6: String(p.node6 ?? 0),
      nodeX: String(p.nodeX ?? 0),
      frequencies: plantFrequencies(p),
      contact: p.contact,
      contactPhone: p.contactPhone ?? "",
      engineerId: p.engineerId,
    });
    setOpen(true);
  };

  const toggleFreq = (f: Frequency) =>
    setForm((prev) => ({
      ...prev,
      frequencies: prev.frequencies.includes(f) ? prev.frequencies.filter((x) => x !== f) : [...prev.frequencies, f],
    }));

  const canSave = !!form.name.trim() && form.frequencies.length > 0;

  const save = () => {
    if (!canSave) return;
    savePlant({
      ...(form.id ? { id: form.id } : {}),
      name: form.name.trim(),
      customer: form.customer.trim(),
      location: form.location.trim(),
      machines: Math.max(0, Number(form.machines) || 0),
      assets: Math.max(0, Number(form.assets) || 0),
      node6: Math.max(0, Number(form.node6) || 0),
      nodeX: Math.max(0, Number(form.nodeX) || 0),
      frequencies: allFrequencies.filter((f) => form.frequencies.includes(f)),
      contact: form.contact.trim(),
      contactPhone: form.contactPhone.trim(),
      engineerId: form.engineerId || team[0]?.id || "",
    });
    setForm(blank);
    setOpen(false);
  };

  return (
    <AppShell>
      <PageHeader
        title="Plants"
        subtitle="Add each plant once — customer, machine count, report cycles, contact details and assigned engineer"
        actions={
          manager ? (
            <Button
              variant={open ? "ghost" : "solid"}
              onClick={() => {
                setForm(blank);
                setOpen((o) => !o);
              }}
            >
              {open ? "Cancel" : "Add plant"}
            </Button>
          ) : null
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
            <Field label="Total assets">
              <TextInput type="number" min={0} value={form.assets} onChange={(e) => setForm({ ...form, assets: e.target.value })} />
            </Field>
            <Field label="Node 6 sensors (qty)">
              <TextInput type="number" min={0} value={form.node6} onChange={(e) => setForm({ ...form, node6: e.target.value })} />
            </Field>
            <Field label="Node X sensors (qty)">
              <TextInput type="number" min={0} value={form.nodeX} onChange={(e) => setForm({ ...form, nodeX: e.target.value })} />
            </Field>
            <Field label="Customer contact name">
              <TextInput value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="S. Mohanty" />
            </Field>
            <Field label="Customer contact number">
              <TextInput
                type="tel"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                placeholder="+91 98200 11223"
              />
            </Field>
            <Field label="Assigned engineer">
              <Select value={form.engineerId || team[0]?.id || ""} onChange={(e) => setForm({ ...form, engineerId: e.target.value })}>
                {team.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2 xl:col-span-4">
              <Field label="Report cycle" hint="Choose every cycle agreed with this customer.">
                <span className="flex flex-wrap gap-2">
                  {allFrequencies.map((f) => {
                    const on = form.frequencies.includes(f);
                    return (
                      <label
                        key={f}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-xs ring-1 transition-[background-color] ${
                          on ? "bg-signal/10 text-signal ring-signal/40" : "text-mute ring-line/80 hover:bg-black/5"
                        }`}
                      >
                        <input type="checkbox" className="accent-signal" checked={on} onChange={() => toggleFreq(f)} />
                        {frequencyLabel[f]}
                      </label>
                    );
                  })}
                </span>
              </Field>
            </div>
            <div className="flex items-end sm:col-span-2 xl:col-span-4">
              <Button variant="solid" onClick={save} disabled={!canSave}>{form.id ? "Save changes" : "Add plant"}</Button>
            </div>
          </div>
        </Panel>
      ) : null}

      <Panel title="Plant master" meta={`${plants.length} plants`}>
        {plants.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Plant</Th>
                  <Th>Customer / contact</Th>
                  <Th>Location</Th>
                  <Th align="right">Machines</Th>
                  <Th align="right">Assets</Th>
                  <Th align="right">Node 6</Th>
                  <Th align="right">Node X</Th>
                  <Th>Report cycle</Th>
                  <Th>Engineer</Th>
                  <Th>Last report sent</Th>
                  <Th align="right"> </Th>
                </tr>
              </thead>
              <tbody>
                {plants.map((p) => {
                  const s = plantSummary(data, p.id);
                  const cycles = plantFrequencies(p);
                  return (
                    <Tr key={p.id}>
                      <Td className="font-medium">{p.name}</Td>
                      <Td>
                        <div>{p.customer || "—"}</div>
                        <div className="text-xs text-mute">{p.contact || "—"}</div>
                        <div className="num text-xs text-mute">{p.contactPhone || "—"}</div>
                      </Td>
                      <Td className="text-mute">{p.location || "—"}</Td>
                      <Td align="right" mono>{p.machines}</Td>
                      <Td align="right" mono>{p.assets ?? 0}</Td>
                      <Td align="right" mono>{p.node6 ?? 0}</Td>
                      <Td align="right" mono>{p.nodeX ?? 0}</Td>
                      <Td>
                        <span className="flex flex-wrap gap-1">
                          {cycles.length ? cycles.map((f) => <FrequencyChip key={f} frequency={f} />) : "—"}
                        </span>
                      </Td>
                      <Td>{engineerName(data, p.engineerId)}</Td>
                      <Td mono>{fmtDate(s.lastReportSent)}</Td>
                      <Td align="right">
                        {manager ? (
                          <span className="flex justify-end gap-1">
                            <Button variant="ghost" onClick={() => edit(p)}>Edit</Button>
                            <Button variant="ghost" onClick={() => removePlant(p.id)}>Delete</Button>
                          </span>
                        ) : null}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No plants yet. Add your first plant.</Empty>
        )}
      </Panel>
    </AppShell>
  );
}
