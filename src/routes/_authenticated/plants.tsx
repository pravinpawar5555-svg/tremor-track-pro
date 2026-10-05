import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ownershipOf, useBranches } from "@/lib/branches";
import { useDomain } from "@/lib/domain";
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
  vibassist: "",
  frequencies: ["weekly"] as Frequency[],
  contact: "",
  contactPhone: "",
  engineerId: "",
  category: "order" as CustomerCategory,
  branchId: "",
  salesEngineerId: "",
};

function PlantsPage() {
  const data = useData();
  const team = analystsOf(data);
  const manager = true; // full access for manager and engineers
  const me = data.currentUserId;
  const plants = manager ? data.plants : data.plants.filter((p) => p.engineerId === me);
  const [catFilter, setCatFilter] = useState<"total" | CustomerCategory>("total");
  const [form, setForm] = useState<typeof blank & { id?: string }>(blank);
  const bs = useBranches();
  const isManager = useDomain() === "manager";
  const [kamF, setKamF] = useState("");
  const [branchF, setBranchF] = useState("");
  const [salesF, setSalesF] = useState("");
  const [csF, setCsF] = useState("");
  const [q, setQ] = useState("");
  const branchOpts = bs.branches.filter((b) => !kamF || b.kamId === kamF);
  const salesOpts = bs.sales.filter((x) => !branchF || x.branchId === branchF);
  const shownPlants = (catFilter === "total" ? plants : plants.filter((p) => (p.category ?? "order") === catFilter)).filter((p) => {
    const o = ownershipOf(bs, p);
    if (kamF && o.kam?.id !== kamF) return false;
    if (branchF && p.branchId !== branchF) return false;
    if (salesF && p.salesEngineerId !== salesF) return false;
    if (csF && p.engineerId !== csF) return false;
    if (!q.trim()) return true;
    const hay = [p.name, p.customer, p.location, o.branch?.name, o.branch?.rmName, o.sales?.name, o.kam?.name].join(" ").toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });
  const formBranch = bs.branches.find((b) => b.id === form.branchId);
  const formKam = bs.kams.find((k) => k.id === formBranch?.kamId);
  const formSales = [...bs.sales].filter((x) => x.status === "active" || x.id === form.salesEngineerId).sort((a, b) => Number(b.branchId === form.branchId) - Number(a.branchId === form.branchId));
  const catCounts = {
    order: plants.filter((p) => (p.category ?? "order") === "order").length,
    demo: plants.filter((p) => (p.category ?? "order") === "demo").length,
  };
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
      vibassist: String(p.vibassist ?? 0),
      frequencies: plantFrequencies(p),
      contact: p.contact,
      contactPhone: p.contactPhone ?? "",
      engineerId: p.engineerId,
      category: (p.category ?? "order") as CustomerCategory,
      branchId: p.branchId ?? "",
      salesEngineerId: p.salesEngineerId ?? "",
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
      vibassist: Math.max(0, Number(form.vibassist) || 0),
      frequencies: allFrequencies.filter((f) => form.frequencies.includes(f)),
      contact: form.contact.trim(),
      contactPhone: form.contactPhone.trim(),
      engineerId: form.engineerId || team[0]?.id || "",
      category: form.category,
      branchId: form.branchId,
      salesEngineerId: form.salesEngineerId,
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
            <Field label="VibAssist sensors (qty)">
              <TextInput type="number" min={0} value={form.vibassist} onChange={(e) => setForm({ ...form, vibassist: e.target.value })} />
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
            <Field label="Customer category">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as CustomerCategory })}>
                <option value="order">Order</option>
                <option value="demo">Demo</option>
              </Select>
            </Field>
            <Field label="Assigned engineer">
              <Select value={form.engineerId || team[0]?.id || ""} onChange={(e) => setForm({ ...form, engineerId: e.target.value })}>
                {team.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            </Field>
            <div className="panel-inset grid gap-3 p-3 sm:col-span-2 sm:grid-cols-2 xl:col-span-4 xl:grid-cols-4">
              <div className="label-caps sm:col-span-2 xl:col-span-4">Branch & commercial ownership</div>
              <Field label="Branch">
                <Select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                  <option value="">Select branch</option>
                  {bs.branches.filter((b) => b.status === "active" || b.id === form.branchId).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
              <Field label="Sales Engineer">
                <Select value={form.salesEngineerId} onChange={(e) => setForm({ ...form, salesEngineerId: e.target.value })}>
                  <option value="">Select Sales Engineer</option>
                  {formSales.map((x) => <option key={x.id} value={x.id}>{x.name}{x.branchId === form.branchId ? "" : ` (${bs.branches.find((b) => b.id === x.branchId)?.name ?? "—"})`}{x.status === "inactive" ? " — inactive" : ""}</option>)}
                </Select>
              </Field>
              <div className="text-xs"><div className="label-caps">HO Division KAM</div><div className="mt-1">{formKam?.name ?? "—"}</div></div>
              <div className="text-xs"><div className="label-caps">Branch RM</div><div className="mt-1">{formBranch?.rmName || "—"}</div><div className="num text-mute">{formBranch?.rmContact}</div><div className="text-mute">{formBranch?.rmEmail}</div></div>
              {isManager ? <Link to="/settings" className="text-xs text-signal sm:col-span-2 xl:col-span-4">Edit branch mapping</Link> : null}
            </div>
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

      <div className="mb-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <TextInput placeholder="Search plant, branch, RM, KAM, sales…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={kamF} onChange={(e) => { setKamF(e.target.value); setBranchF(""); setSalesF(""); }}>
          <option value="">All HO Division KAMs</option>{bs.kams.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
        </Select>
        <Select value={branchF} onChange={(e) => { setBranchF(e.target.value); setSalesF(""); }}>
          <option value="">All branches</option>{branchOpts.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
        <Select value={salesF} onChange={(e) => setSalesF(e.target.value)}>
          <option value="">All Sales Engineers</option>{salesOpts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </Select>
        <Select value={csF} onChange={(e) => setCsF(e.target.value)}>
          <option value="">All CS engineers</option>{team.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        {(q || kamF || branchF || salesF || csF) ? <Button variant="ghost" onClick={() => { setQ(""); setKamF(""); setBranchF(""); setSalesF(""); setCsF(""); }}>Clear filters</Button> : null}
      </div>
      <Panel
        title="Plant master"
        meta={
          <span className="flex items-center gap-3">
            <span className="inline-flex rounded-md ring-1 ring-line/80 p-0.5">
              {(["total", "order", "demo"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCatFilter(c)}
                  className={`rounded px-2.5 py-1 text-xs capitalize transition-[background-color] ${
                    catFilter === c ? "bg-signal/10 text-signal" : "text-mute hover:bg-black/5"
                  }`}
                >
                  {c === "total" ? `Total (${plants.length})` : `${c} (${catCounts[c]})`}
                </button>
              ))}
            </span>
            <span>{shownPlants.length} plants</span>
          </span>
        }
      >
        {shownPlants.length ? (
          <>
          <ul className="divide-y divide-line/60 md:hidden">
            {shownPlants.map((p) => {
              const s = plantSummary(data, p.id);
              const cycles = plantFrequencies(p);
              return (
                <li key={p.id} className="px-4 py-3">
                  <div className="text-[15px] font-semibold">{p.name}</div>
                  <div className="text-sm text-mute">{p.customer || "—"} · {p.machines} machines</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {cycles.length ? cycles.map((f) => <FrequencyChip key={f} frequency={f} />) : <span className="text-sm text-mute">No report cycle</span>}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                    <span className="text-mute">CS Engineer</span><span>{engineerName(data, p.engineerId)}</span>
                    <span className="text-mute">Branch</span><span>{ownershipOf(bs, p).branch?.name ?? "—"}</span>
                    <span className="text-mute">HO Division KAM</span><span>{ownershipOf(bs, p).kam?.name ?? "—"}</span>
                    <span className="text-mute">Branch RM</span><span>{ownershipOf(bs, p).branch?.rmName || "—"}</span>
                    <span className="text-mute">Sales Engineer</span><span>{ownershipOf(bs, p).sales?.name ?? "—"}</span>
                    <span className="text-mute">Contact</span><span className="truncate">{p.contact || "—"} {p.contactPhone ? <a className="num text-signal" href={`tel:${p.contactPhone}`}>{p.contactPhone}</a> : null}</span>
                    <span className="text-mute">Last report</span><span className="num">{fmtDate(s.lastReportSent)}</span>
                    <span className="text-mute">Sensors</span><span className="num">N6 {p.node6 ?? 0} · NX {p.nodeX ?? 0} · VA {p.vibassist ?? 0}</span>
                  </div>
                  <Ownership o={ownershipOf(bs, p)} />
                  <div className="mt-3 flex gap-2">
                    <Link to="/visits" search={{ plant: p.id }} className="grid h-11 flex-1 place-items-center rounded-md bg-signal text-sm font-medium text-signal-foreground">Visit history</Link>
                    {manager ? (
                      <>
                        <button onClick={() => edit(p)} className="h-11 rounded-md px-4 text-sm ring-1 ring-line">Edit</button>
                        <button onClick={() => { if (window.confirm(`Delete ${p.name}?`)) removePlant(p.id); }} className="h-11 rounded-md px-4 text-sm text-red-600 ring-1 ring-line">Delete</button>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto md:block">
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
                  <Th align="right">VibAssist</Th>
                  <Th>Report cycle</Th>
                  <Th>Category</Th>
                  <Th>Engineer</Th>
                  <Th>Branch / Sales</Th>
                  <Th>Last report sent</Th>
                  <Th align="right"> </Th>
                </tr>
              </thead>
              <tbody>
                {shownPlants.map((p) => {
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
                      <Td align="right" mono>{p.vibassist ?? 0}</Td>
                      <Td>
                        <span className="flex flex-wrap gap-1">
                          {cycles.length ? cycles.map((f) => <FrequencyChip key={f} frequency={f} />) : "—"}
                        </span>
                      </Td>
                      <Td className="text-mute">{customerCategoryLabel[(p.category ?? "order") as CustomerCategory]}</Td>
                      <Td>{engineerName(data, p.engineerId)}</Td>
                      <Td>
                        {(() => { const o = ownershipOf(bs, p); return o.branch ? (
                          <details>
                            <summary className="cursor-pointer text-xs"><span className="font-medium">{o.branch.name}</span> · {o.sales?.name ?? "No sales eng."}</summary>
                            <OwnershipBody o={o} />
                          </details>
                        ) : <span className="text-xs text-mute">—</span>; })()}
                      </Td>
                      <Td mono>{fmtDate(s.lastReportSent)}</Td>
                      <Td align="right">
                        <Link to="/visits" search={{ plant: p.id }} className="mr-1 text-xs text-signal">Visit history</Link>
                        {manager ? (
                          <span className="inline-flex justify-end gap-1">
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
          </>
        ) : (
          <Empty>No plants yet. Add your first plant.</Empty>
        )}
      </Panel>
    </AppShell>
  );
}

function OwnershipBody({ o }: { o: ReturnType<typeof ownershipOf> }) {
  return (
    <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
      <span className="text-mute">Branch</span><span>{o.branch?.name ?? "—"}</span>
      <span className="text-mute">HO Division KAM</span><span>{o.kam?.name ?? "—"}</span>
      <span className="text-mute">Branch RM</span><span>{o.branch?.rmName || "—"}</span>
      <span className="text-mute">RM Contact</span>{o.branch?.rmContact ? <a className="num text-signal" href={`tel:${o.branch.rmContact}`}>{o.branch.rmContact}</a> : <span>—</span>}
      <span className="text-mute">RM Email</span>{o.branch?.rmEmail ? <a className="truncate text-signal" href={`mailto:${o.branch.rmEmail}`}>{o.branch.rmEmail}</a> : <span>—</span>}
      <span className="text-mute">Sales Engineer</span><span>{o.sales?.name ?? "—"}</span>
    </div>
  );
}

function Ownership({ o }: { o: ReturnType<typeof ownershipOf> }) {
  return (
    <details className="mt-2 rounded-md p-2 ring-1 ring-line/70">
      <summary className="cursor-pointer text-sm font-medium">Commercial ownership</summary>
      <OwnershipBody o={o} />
      {o.branch?.rmContact || o.branch?.rmEmail ? (
        <div className="mt-2 flex gap-2">
          {o.branch?.rmContact ? <a href={`tel:${o.branch.rmContact}`} className="grid h-10 flex-1 place-items-center rounded-md text-sm text-signal ring-1 ring-signal/40">Call RM</a> : null}
          {o.branch?.rmEmail ? <a href={`mailto:${o.branch.rmEmail}`} className="grid h-10 flex-1 place-items-center rounded-md text-sm text-signal ring-1 ring-signal/40">Email RM</a> : null}
        </div>
      ) : null}
    </details>
  );
}
