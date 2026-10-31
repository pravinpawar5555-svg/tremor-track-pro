import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ownershipOf, useBranches } from "@/lib/branches";
import { useDomain } from "@/lib/domain";
import { amcStatus } from "@/lib/amc";
import { BillingDialog, BillingFormSection, BillingLine, BillingTracker } from "@/components/console/PlantBilling";
import { blankConfig, plantBilling, saveBillingConfig, useBilling, type BillingConfig } from "@/lib/billing";
import { toast } from "sonner";
import { PlantTechnical } from "@/components/console/PlantTechnical";
import { CustomerContacts } from "@/components/console/CustomerContacts";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  amcStart: "",
  amcEnd: "",
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
  const domain = useDomain();
  const isManager = domain === "manager";
  const canBilling = domain === "manager" || domain === "customer_success";
  const billing = useBilling();
  const [bill, setBill] = useState<BillingConfig>(blankConfig());
  const [billPlant, setBillPlant] = useState<Plant | null>(null);
  const [tab, setTab] = useState<"master" | "billing">("master");
  const bv = (p: Plant) => plantBilling(billing.configOf(p.id), p.id, data.reports, billing.records, TODAY);
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [techPlant, setTechPlant] = useState<Plant | null>(null);

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
      amcStart: p.amcStart ?? "",
      amcEnd: p.amcEnd ?? "",
    });
    setBill(billing.configOf(p.id) ?? blankConfig(p.id));
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
    const cfg = bill;
    const plantId = savePlant({
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
      amcStart: form.amcStart,
      amcEnd: form.amcEnd,
    });
    const prev = billing.configOf(plantId);
    if (isManager && (prev || cfg.model !== "none")) {
      const attempt = async (n: number): Promise<void> => {
        try { await saveBillingConfig({ ...cfg, plantId }, engineerName(data, data.currentUserId)); await billing.refresh(); }
        catch (e) { if (n > 0) { await new Promise((r) => setTimeout(r, 1500)); return attempt(n - 1); } toast.error(`Billing settings not saved: ${e instanceof Error ? e.message : "error"}`); }
      };
      void attempt(form.id ? 1 : 4);
    }
    setBill(blankConfig());
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
                setBill(blankConfig());
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
              <Field label="AMC start date">
                <TextInput type="date" value={form.amcStart} onChange={(e) => setForm({ ...form, amcStart: e.target.value })} />
              </Field>
              <Field label="AMC end date" hint="Renewal alert starts 60 days before.">
                <TextInput type="date" value={form.amcEnd} onChange={(e) => setForm({ ...form, amcEnd: e.target.value })} />
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
            {isManager ? <BillingFormSection value={bill} onChange={setBill} /> : null}
            <div className="flex items-end sm:col-span-2 xl:col-span-4">
              <Button variant="solid" onClick={save} disabled={!canSave}>{form.id ? "Save changes" : "Add plant"}</Button>
            </div>
          </div>
        </Panel>
      ) : null}

      <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          { l: "Plants", v: String(shownPlants.length), h: `${shownPlants.filter((p) => (p.category ?? "order") === "order").length} order · ${shownPlants.filter((p) => p.category === "demo").length} demo` },
          { l: "Machines / Assets", v: `${shownPlants.reduce((a, p) => a + (p.machines || 0), 0)} / ${shownPlants.reduce((a, p) => a + (p.assets ?? 0), 0)}`, h: "Across shown plants" },
          { l: "Sensors", v: String(shownPlants.reduce((a, p) => a + (p.node6 ?? 0) + (p.nodeX ?? 0) + (p.vibassist ?? 0), 0)), h: `N6 ${shownPlants.reduce((a, p) => a + (p.node6 ?? 0), 0)} · NX ${shownPlants.reduce((a, p) => a + (p.nodeX ?? 0), 0)} · VA ${shownPlants.reduce((a, p) => a + (p.vibassist ?? 0), 0)}` },
          { l: "CS Engineers", v: String(team.length), h: team.map((t) => `${t.name.split(" ")[0]} ${shownPlants.filter((p) => p.engineerId === t.id).length}`).join(" · ") },
        ].map((k) => (
          <div key={k.l} className="panel-glass min-w-0 px-3 py-2">
            <div className="label-caps">{k.l}</div>
            <div className="num text-lg font-semibold text-ink">{k.v}</div>
            <div className="truncate text-xs text-mute">{k.h}</div>
          </div>
        ))}
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6 [&>*:first-child]:col-span-2 sm:[&>*:first-child]:col-span-1">
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
      {canBilling ? (
        <div className="mb-3 inline-flex rounded-md p-0.5 ring-1 ring-line/80">
          {([["master", "Plant master"], ["billing", "Billing tracker"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={`rounded px-3 py-1.5 text-sm ${tab === k ? "bg-signal/10 text-signal" : "text-mute hover:bg-black/5"}`}>{l}</button>
          ))}
        </div>
      ) : null}
      <PlantTechnical plant={techPlant} onClose={() => setTechPlant(null)} />
      {canBilling ? <BillingDialog plant={billPlant} open={!!billPlant} onClose={() => setBillPlant(null)} /> : null}
      {tab === "billing" && canBilling ? (
        <Panel title="Billing tracker" meta="Current billing period per rental plant"><BillingTracker plants={shownPlants} onOpen={setBillPlant} /></Panel>
      ) : (
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
                <li key={p.id} className="px-3 py-3">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-semibold">{p.name}</div>
                      <div className="truncate text-sm text-mute">{p.customer || "—"}{p.location ? ` · ${p.location}` : ""}</div>
                    </div>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ring-1 ${p.category === "demo" ? "text-sev-med ring-sev-med/40" : "text-signal ring-signal/40"}`}>{p.category ?? "order"}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
                    {[["Machines", p.machines || 0], ["N6", p.node6 ?? 0], ["NX", p.nodeX ?? 0], ["VA", p.vibassist ?? 0]].map(([l, v]) => (
                      <div key={l as string} className="rounded-md py-1 ring-1 ring-line/70"><div className="num text-sm font-semibold">{v}</div><div className="text-[10px] text-mute">{l}</div></div>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {cycles.length ? cycles.map((f) => <FrequencyChip key={f} frequency={f} />) : <span className="text-xs text-mute">No report cycle</span>}
                  </div>
                  {canBilling ? <BillingLine view={bv(p)} onOpen={() => setBillPlant(p)} /> : null}
                  <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
                    <span className="text-mute">CS Engineer</span><span className="truncate">{engineerName(data, p.engineerId)}</span>
                    <span className="text-mute">Last report</span><span className="num">{fmtDate(s.lastReportSent)}</span>
                    <span className="text-mute">Contact</span><span className="truncate">{p.contact || "—"} {p.contactPhone ? <a className="num text-signal" href={`tel:${p.contactPhone}`}>{p.contactPhone}</a> : null}</span>
                  </div>
                  <details className="mt-2 rounded-md ring-1 ring-line/70">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-signal">Ownership & more details</summary>
                    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 px-3 pb-2 text-sm">
                      <span className="text-mute">Branch</span><span className="truncate">{ownershipOf(bs, p).branch?.name ?? "—"}</span>
                      <span className="text-mute">HO KAM</span><span className="truncate">{ownershipOf(bs, p).kam?.name ?? "—"}</span>
                      <span className="text-mute">Branch RM</span><span className="truncate">{ownershipOf(bs, p).branch?.rmName || "—"}</span>
                      <span className="text-mute">Sales Eng.</span><span className="truncate">{ownershipOf(bs, p).sales?.name ?? "—"}</span>
                    </div>
                    <div className="px-3 pb-2"><Ownership o={ownershipOf(bs, p)} /></div>
                  </details>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setTechPlant(p)} className="h-11 rounded-md bg-signal text-sm font-medium text-signal-foreground">Technical</button>
                    <Link to="/visits" search={{ plant: p.id }} className="grid h-11 place-items-center rounded-md text-sm font-medium text-signal ring-1 ring-signal/40">Visit history</Link>
                    <Link to="/contacts" search={{ plant: p.id }} className="grid h-11 place-items-center rounded-md text-sm ring-1 ring-line">Contacts</Link>
                    {manager ? (
                      <>
                        <Link to="/opportunities" search={{ plant: p.id }} className="grid h-11 place-items-center rounded-md text-sm text-signal ring-1 ring-line">+ Opportunity</Link>
                        <button onClick={() => edit(p)} className="h-11 rounded-md text-sm ring-1 ring-line">Edit</button>
                        <button onClick={() => { if (window.confirm(`Delete ${p.name}?`)) removePlant(p.id); }} className="h-11 rounded-md text-sm text-sev-high ring-1 ring-line">Delete</button>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="hidden md:block">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[20%]" />
                <col className="w-[18%]" />
                <col className="w-[20%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr>
                  <Th>Plant & customer</Th>
                  <Th>Equipment & sensors</Th>
                  <Th>Report cycle</Th>
                  <Th>Assignment & branch</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {shownPlants.map((p) => {
                  const s = plantSummary(data, p.id);
                  const cycles = plantFrequencies(p);
                  const o = ownershipOf(bs, p);
                  const isOpen = expanded === p.id;
                  const cat = (p.category ?? "order") as CustomerCategory;
                  return (
                    <Fragment key={p.id}>
                      <Tr>
                        <Td className="align-top">
                          <button type="button" onClick={() => setExpanded(isOpen ? null : p.id)} className="flex w-full min-w-0 items-start gap-1.5 text-left" aria-expanded={isOpen}>
                            <ChevronRight className={`mt-0.5 size-4 shrink-0 text-mute transition-transform ${isOpen ? "rotate-90" : ""}`} />
                            <span className="min-w-0">
                              <span className="flex flex-wrap items-center gap-1.5">
                                <span className="break-words font-semibold">{p.name}</span>
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${cat === "demo" ? "bg-sev-medium/10 text-sev-medium" : "bg-signal/10 text-signal"}`}>{customerCategoryLabel[cat]}</span>
                              </span>
                              <span className="block truncate text-xs text-mute">{p.customer || "—"}{p.location ? ` · ${p.location}` : ""}</span>
                              <span className="block truncate text-xs text-mute">{p.contact || "—"}{p.contactPhone ? <span className="num"> · {p.contactPhone}</span> : null}</span>
                            </span>
                          </button>
                        </Td>
                        <Td className="align-top">
                          <div className="num text-xs"><span className="font-semibold text-ink">{p.machines}</span> machines · <span className="font-semibold text-ink">{p.assets ?? 0}</span> assets</div>
                          <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                            <span className="num rounded px-1.5 py-0.5 ring-1 ring-line">N6 {p.node6 ?? 0}</span>
                            <span className="num rounded px-1.5 py-0.5 ring-1 ring-line">NX {p.nodeX ?? 0}</span>
                            <span className="num rounded px-1.5 py-0.5 ring-1 ring-line">VA {p.vibassist ?? 0}</span>
                          </div>
                        </Td>
                        <Td className="align-top">
                          <span className="flex flex-wrap gap-1">{cycles.length ? cycles.map((f) => <FrequencyChip key={f} frequency={f} />) : "—"}</span>
                          <div className="num mt-1 text-xs text-mute">Last: {fmtDate(s.lastReportSent)}</div>
                          {canBilling ? <BillingLine view={bv(p)} onOpen={() => setBillPlant(p)} /> : null}
                        </Td>
                        <Td className="align-top">
                          <div className="truncate text-xs"><span className="text-mute">CS:</span> {engineerName(data, p.engineerId)}</div>
                          <div className="truncate text-xs text-mute">{o.branch?.name ?? "No branch"} · {o.sales?.name ?? "No sales eng."}</div>
                          <AmcChip end={p.amcEnd} />
                        </Td>
                        <Td align="right" className="align-top">
                          <span className="inline-flex items-center justify-end gap-1">
                            <button type="button" onClick={() => setTechPlant(p)} className="rounded-md px-2 py-1 text-xs text-signal ring-1 ring-signal/40 hover:bg-signal/10">Technical</button>
<Link to="/visits" search={{ plant: p.id }} className="rounded-md px-2 py-1 text-xs text-signal ring-1 ring-signal/40 hover:bg-signal/10">Visits</Link>
                            {manager ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button type="button" aria-label={`More actions for ${p.name}`} className="grid size-7 place-items-center rounded-md text-mute ring-1 ring-line hover:bg-black/5"><MoreHorizontal className="size-4" /></button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-44 p-1">
                                  <button type="button" onClick={() => setExpanded(p.id)} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-black/5">View plant</button>
                                  <button type="button" onClick={() => edit(p)} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-black/5">Edit plant</button>
                                  {canBilling ? <button type="button" onClick={() => setBillPlant(p)} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-black/5">Billing & Invoice</button> : null}
                                  <Link to="/opportunities" search={{ plant: p.id }} className="block rounded px-3 py-2 text-sm text-signal hover:bg-black/5">+ Opportunity</Link>
                                  <button type="button" onClick={() => { if (window.confirm(`Delete ${p.name}?`)) removePlant(p.id); }} className="block w-full rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-black/5">Delete</button>
                                </PopoverContent>
                              </Popover>
                            ) : null}
                          </span>
                        </Td>
                      </Tr>
                      {isOpen ? (
                        <tr className="bg-base/60">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="grid gap-4 text-xs lg:grid-cols-3">
                              <div><div className="label-caps mb-1">Commercial ownership</div><OwnershipBody o={o} /></div>
                              <div>
                                <div className="label-caps mb-1">Customer contact</div>
                                <div>{p.contact || "—"}</div>
                                {p.contactPhone ? <a className="num text-signal" href={`tel:${p.contactPhone}`}>{p.contactPhone}</a> : null}
                                <div className="mt-1 text-mute">{p.location || "—"}</div>
                              </div>
                              <div>
                                <div className="label-caps mb-1">Quick links</div>
                                <div className="flex flex-wrap gap-2">
                                  <button type="button" onClick={() => setTechPlant(p)} className="rounded-md px-2 py-1 text-xs text-signal ring-1 ring-signal/40 hover:bg-signal/10">Technical</button>
<Link to="/visits" search={{ plant: p.id }} className="text-signal">Visit history</Link>
                                  {manager ? <><Link to="/opportunities" search={{ plant: p.id }} className="text-signal">+ Opportunity</Link><button type="button" onClick={() => edit(p)} className="text-signal">Edit plant</button></> : null}
                                </div>
                              </div>
                            </div>
                            {canBilling ? (() => { const v = bv(p); return (
                              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-xs">
                                <span className="label-caps">Billing</span>
                                <span><span className="text-mute">Model:</span> {v.config.model === "rental" ? "Rental" : v.config.model === "none" ? "Not configured" : v.config.model === "one_time" ? "One-Time / Order" : "Not Applicable"}</span>
                                {v.period ? <><span><span className="text-mute">Cycle:</span> {v.config.frequency.replace("_", "-")}</span><span><span className="text-mute">Reports:</span> <span className="num">{v.sent} / {v.total}</span></span></> : null}
                                <BillingLine view={v} />
                                <button type="button" onClick={() => setBillPlant(p)} className="text-signal">Open billing</button>
                              </div>
                            ); })() : null}
                            <div className="mt-4 border-t border-line pt-4"><CustomerContacts plantId={p.id} /></div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
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
      )}
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

function AmcChip({ end }: { end?: string | undefined }) {
  const a = amcStatus(end, TODAY);
  if (a.state === "none") return <div className="mt-1 text-[11px] text-mute">AMC: not set</div>;
  const cls = a.state === "expired" ? "bg-sev-high/10 text-sev-high" : a.state === "renewal" ? "bg-sev-medium/10 text-sev-medium" : "bg-signal/10 text-signal";
  const txt = a.state === "expired" ? `AMC expired ${-a.days!}d ago` : a.state === "renewal" ? `AMC renewal in ${a.days}d` : `AMC till ${fmtDate(end!)}`;
  return <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>{txt}</span>;
}
