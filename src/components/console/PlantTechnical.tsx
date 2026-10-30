import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ChevronRight, Download, Plus, Search } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button, Empty, Field, Select, TextArea, TextInput } from "@/components/console/ui";
import { TODAY, engineerName, fmtDate, useData, type Plant } from "@/lib/store";
import { conditionLabel } from "@/lib/ticket-analysis";
import {
  GATEWAY_ISSUES, GATEWAY_STATUS, MACHINE_STATUS, MACHINE_TYPES, SENSOR_ISSUES, SENSOR_STATUS, SENSOR_TYPES, STANDARD_POINTS,
  buildTechCsv, faultHistory, gatewaySensorCount, hasIssue, isActiveSensor, moveSensor, pointSensors, replaceSensor, reportIssue,
  resolveIssue, saveRecord, searchTech, sensorPath, techTotals, useTechnical,
  type Area, type Gateway, type Machine, type Point, type Sensor, type TechData,
} from "@/lib/technical";

type Tab = "overview" | "machines" | "sensors" | "gateways" | "history";
type Form =
  | { kind: "area"; row: Partial<Area> }
  | { kind: "machine"; row: Partial<Machine> }
  | { kind: "point"; row: Partial<Point> }
  | { kind: "sensor"; row: Partial<Sensor> }
  | { kind: "gateway"; row: Partial<Gateway> };

const tone = (s: string) =>
  ["installed", "online", "running", "active"].includes(s) ? "bg-sev-low/10 text-sev-low"
  : ["faulty", "troubleshooting", "offline"].includes(s) ? "bg-sev-high/10 text-sev-high"
  : "bg-black/5 text-mute";
const label = (map: Record<string, string>, s: string) => map[s] ?? s;
function Pill({ s, map }: { s: string; map: Record<string, string> }) {
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${tone(s)}`}>{label(map, s)}</span>;
}
function Stat({ n, l, warn }: { n: number; l: string; warn?: boolean }) {
  return <div className="rounded-md px-3 py-2 ring-1 ring-line"><div className={`num text-xl font-semibold ${warn && n ? "text-sev-high" : ""}`}>{n}</div><div className="text-xs text-mute">{l}</div></div>;
}

export function PlantTechnical({ plant, onClose }: { plant: Plant | null; onClose: () => void }) {
  return (
    <Sheet open={!!plant} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        {plant ? <Body plant={plant} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function Body({ plant }: { plant: Plant }) {
  const app = useData();
  const by = engineerName(app, app.currentUserId);
  const { data, loading, error, refresh } = useTechnical(plant.id);
  const [tab, setTab] = useState<Tab>("overview");
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [machineId, setMachineId] = useState<string | null>(null);
  const [sensorId, setSensorId] = useState<string | null>(null);
  const [gatewayId, setGatewayId] = useState<string | null>(null);
  const t = techTotals(data);
  const hits = useMemo(() => searchTech(data, q), [data, q]);
  const ctx = { plant, data, by, refresh, setForm, openMachine: setMachineId, openSensor: setSensorId, openGateway: setGatewayId };

  const exportCsv = (areaId?: string) => {
    const blob = new Blob(["\uFEFF" + buildTechCsv(data, plant.name, areaId)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${plant.name.replace(/[^\w-]+/g, "_")}_technical_${TODAY}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const openHit = (h: ReturnType<typeof searchTech>[number]) => {
    setQ("");
    if (h.kind === "machine" || h.kind === "point") setMachineId(h.id);
    else if (h.kind === "sensor") setSensorId(h.id);
    else if (h.kind === "gateway") setGatewayId(h.id);
    else setTab("machines");
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>{plant.name} · Technical register</SheetTitle>
        <p className="text-xs text-mute">{plant.customer}{plant.location ? ` · ${plant.location}` : ""}</p>
      </SheetHeader>
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-mute" />
        <TextInput className="pl-8" placeholder="Search area, machine, tag, point, sensor or gateway serial…" value={q} onChange={(e) => setQ(e.target.value)} />
        {q ? (
          <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md bg-panel p-1 shadow-lg ring-1 ring-line">
            {hits.length ? hits.map((h) => (
              <button key={h.kind + h.id + h.label} type="button" onClick={() => openHit(h)} className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-black/5">
                <span className="min-w-0 truncate"><span className="font-medium">{h.label}</span> <span className="text-xs text-mute">{h.sub}</span></span>
                <span className="label-caps shrink-0">{h.kind}</span>
              </button>
            )) : <p className="px-2 py-2 text-sm text-mute">No match</p>}
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-1 border-b border-line pb-2">
        {([["overview", "Overview"], ["machines", "Areas & Machines"], ["sensors", "Sensors"], ["gateways", "Gateways"], ["history", "Analysis History"]] as [Tab, string][]).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`rounded px-3 py-1.5 text-sm ${tab === k ? "bg-signal/10 text-signal" : "text-mute hover:bg-black/5"}`}>{l}</button>
        ))}
      </div>
      {error ? <p className="mt-3 text-sm text-sev-high">Could not load: {error.message}</p> : loading ? <p className="mt-3 text-sm text-mute">Loading…</p> : (
        <div className="mt-3 text-sm">
          {tab === "overview" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                <Stat n={t.areas} l="Areas" /><Stat n={t.machines} l="Machines" /><Stat n={t.points} l="Points" />
                <Stat n={t.sensors} l="Sensors" /><Stat n={t.gateways} l="Gateways" /><Stat n={t.issues} l="Issues" warn />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setForm({ kind: "area", row: { plant_id: plant.id } })}><Plus className="size-3.5" />Area</Button>
                <Button onClick={() => data.areas.length ? setForm({ kind: "machine", row: { plant_id: plant.id, area_id: data.areas[0]!.id } }) : toast.error("Add an area first")}><Plus className="size-3.5" />Machine</Button>
                <Button onClick={() => setForm({ kind: "sensor", row: { plant_id: plant.id } })}><Plus className="size-3.5" />Sensor</Button>
                <Button onClick={() => setForm({ kind: "gateway", row: { plant_id: plant.id } })}><Plus className="size-3.5" />Gateway</Button>
                <Button variant="ghost" onClick={() => exportCsv()}><Download className="size-3.5" />Export CSV</Button>
              </div>
              <div>
                <div className="label-caps mb-1">Open issues</div>
                {[...data.sensors.filter(hasIssue).map((s) => ({ id: s.id, t: `Sensor ${s.serial_no}`, f: () => setSensorId(s.id) })), ...data.gateways.filter((g) => ["offline", "troubleshooting", "faulty"].includes(g.status)).map((g) => ({ id: g.id, t: `Gateway ${g.name}`, f: () => setGatewayId(g.id) }))].map((x) => (
                  <button key={x.id} type="button" onClick={x.f} className="block text-left text-signal hover:underline">{x.t}</button>
                ))}
                {!t.issues ? <p className="text-mute">No open sensor or gateway issues.</p> : null}
              </div>
              <RecentEvents data={data} />
            </div>
          ) : tab === "machines" ? <MachinesTab {...ctx} onExport={exportCsv} />
            : tab === "sensors" ? <SensorsTab {...ctx} />
            : tab === "gateways" ? <GatewaysTab {...ctx} />
            : <HistoryList entries={faultHistory(app.tickets, plant.id)} showMachine />}
        </div>
      )}
      {form ? <RecordForm form={form} ctx={ctx} onClose={() => setForm(null)} /> : null}
      {machineId ? <MachineDetail id={machineId} ctx={ctx} onClose={() => setMachineId(null)} /> : null}
      {sensorId ? <SensorDetail id={sensorId} ctx={ctx} onClose={() => setSensorId(null)} /> : null}
      {gatewayId ? <GatewayDetail id={gatewayId} ctx={ctx} onClose={() => setGatewayId(null)} /> : null}
    </>
  );
}

type Ctx = {
  plant: Plant; data: TechData; by: string; refresh: () => Promise<void>;
  setForm: (f: Form) => void; openMachine: (id: string) => void; openSensor: (id: string) => void; openGateway: (id: string) => void;
};

function RecentEvents({ data, entityId }: { data: TechData; entityId?: string }) {
  const ev = data.events.filter((e) => !entityId || e.entity_id === entityId).slice(0, entityId ? 50 : 8);
  return (
    <div>
      <div className="label-caps mb-1">{entityId ? "History" : "Recent changes"}</div>
      {ev.length ? (
        <ol className="space-y-1.5 border-l border-line pl-3">
          {ev.map((e) => {
            const d = e.detail as Record<string, string>;
            return (
              <li key={e.id} className="text-xs">
                <span className="num text-mute">{fmtDate(e.event_date)}</span> · <span className="font-medium capitalize">{e.kind}</span>
                {e.issue_type ? ` · ${e.issue_type}` : ""}{e.remark ? ` — ${e.remark}` : ""}
                {d?.old && d?.new ? <span className="text-mute"> ({d.old} → {d.new})</span> : null}
                {d?.from && d?.to ? <span className="text-mute"> ({d.from} → {d.to})</span> : null}
                <span className="text-mute"> · {e.by_user || "—"}</span>
              </li>
            );
          })}
        </ol>
      ) : <p className="text-xs text-mute">No history yet.</p>}
    </div>
  );
}

function MachinesTab({ plant, data, setForm, openMachine, onExport }: Ctx & { onExport: (areaId?: string) => void }) {
  const [area, setArea] = useState("");
  const areas = data.areas.filter((a) => !area || a.id === area);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={area} onChange={(e) => setArea(e.target.value)} className="max-w-56"><option value="">All areas</option>{data.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
        <Button onClick={() => setForm({ kind: "area", row: { plant_id: plant.id } })}><Plus className="size-3.5" />Add Area</Button>
        <Button variant="ghost" onClick={() => onExport(area || undefined)}><Download className="size-3.5" />{area ? "Export filtered" : "Export CSV"}</Button>
      </div>
      {!data.areas.length ? <Empty>No areas yet. Add the first area, e.g. Boiler House.</Empty> : areas.map((a) => {
        const ms = data.machines.filter((m) => m.area_id === a.id);
        return (
          <div key={a.id} className="rounded-md ring-1 ring-line">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 px-3 py-2">
              <div><span className="font-semibold">{a.name}</span>{a.code ? <span className="text-xs text-mute"> · {a.code}</span> : null} <Pill s={a.status} map={{ active: "Active", inactive: "Inactive" }} /></div>
              <div className="flex gap-1">
                <Button variant="ghost" onClick={() => setForm({ kind: "area", row: a })}>Edit</Button>
                <Button onClick={() => setForm({ kind: "machine", row: { plant_id: plant.id, area_id: a.id } })}><Plus className="size-3.5" />Machine</Button>
              </div>
            </div>
            {ms.length ? ms.map((m) => {
              const pts = data.points.filter((p) => p.machine_id === m.id);
              const sens = pts.filter((p) => pointSensors(data, p.id).current).length;
              return (
                <button key={m.id} type="button" onClick={() => openMachine(m.id)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-black/5">
                  <span className="min-w-0"><span className="font-medium">{m.name}</span> <span className="text-xs text-mute">{[m.tag, m.machine_type].filter(Boolean).join(" · ")}</span></span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-mute"><span className="num">{pts.length} pts · {sens} sensors</span><Pill s={m.status} map={MACHINE_STATUS} /><ChevronRight className="size-4" /></span>
                </button>
              );
            }) : <p className="px-3 py-2 text-xs text-mute">No machines in this area.</p>}
          </div>
        );
      })}
    </div>
  );
}

function SensorsTab({ plant, data, setForm, openSensor }: Ctx) {
  const [st, setSt] = useState("active");
  const rows = data.sensors.filter((s) => st === "all" || (st === "active" ? isActiveSensor(s) : st === "issue" ? hasIssue(s) : !isActiveSensor(s)));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select value={st} onChange={(e) => setSt(e.target.value)} className="max-w-48"><option value="active">Active</option><option value="issue">With issues</option><option value="history">Retired / history</option><option value="all">All</option></Select>
        <Button onClick={() => setForm({ kind: "sensor", row: { plant_id: plant.id } })}><Plus className="size-3.5" />Add Sensor</Button>
      </div>
      {rows.length ? rows.map((s) => {
        const p = sensorPath(data, s);
        return (
          <button key={s.id} type="button" onClick={() => openSensor(s.id)} className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left ring-1 ring-line hover:bg-black/5">
            <span className="min-w-0"><span className="num font-medium">{s.serial_no}</span> <span className="text-xs text-mute">{s.sensor_type}</span>
              <span className="block truncate text-xs text-mute">{[p.area?.name, p.machine?.name, p.point?.name].filter(Boolean).join(" / ") || "Not mapped to a point"}</span></span>
            <Pill s={s.status} map={SENSOR_STATUS} />
          </button>
        );
      }) : <Empty>No sensors in this view.</Empty>}
    </div>
  );
}

function GatewaysTab({ plant, data, setForm, openGateway }: Ctx) {
  return (
    <div className="space-y-3">
      <Button onClick={() => setForm({ kind: "gateway", row: { plant_id: plant.id } })}><Plus className="size-3.5" />Add Gateway</Button>
      {data.gateways.length ? data.gateways.map((g) => (
        <button key={g.id} type="button" onClick={() => openGateway(g.id)} className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left ring-1 ring-line hover:bg-black/5">
          <span className="min-w-0"><span className="font-medium">{g.name}</span> <span className="num text-xs text-mute">{g.serial_no}</span>
            <span className="block text-xs text-mute">{gatewaySensorCount(data, g.id)} connected sensors{g.location ? ` · ${g.location}` : ""}</span></span>
          <Pill s={g.status} map={GATEWAY_STATUS} />
        </button>
      )) : <Empty>No gateways yet.</Empty>}
    </div>
  );
}

function HistoryList({ entries, showMachine }: { entries: ReturnType<typeof faultHistory>; showMachine?: boolean }) {
  if (!entries.length) return <p className="text-xs text-mute">No reviewed ticket analysis yet.</p>;
  return (
    <ol className="space-y-2">
      {entries.map((e, i) => (
        <li key={e.ticketId + i} className="rounded-md px-3 py-2 text-xs ring-1 ring-line">
          <div className="flex flex-wrap items-center gap-2"><span className="num font-medium">{fmtDate(e.date)}</span>{showMachine ? <span className="font-medium">{e.machine}</span> : null}{e.area ? <span className="text-mute">{e.area}</span> : null}<span className="num text-mute">{e.ticketNo}</span></div>
          <div className="mt-1">{e.a.fault || (e.a.condition ? conditionLabel[e.a.condition] : "—")}{e.a.severity ? ` · ${e.a.severity}` : ""}</div>
          {e.a.observation ? <div className="text-mute">Observation: {e.a.observation}</div> : null}
          {e.a.recommendation ? <div className="text-mute">Recommendation: {e.a.recommendation}</div> : null}
        </li>
      ))}
    </ol>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader><SheetTitle>{title}</SheetTitle></SheetHeader>
        <div className="mt-4 text-sm">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
const Info = ({ l, v }: { l: string; v: ReactNode }) => <div><div className="label-caps">{l}</div><div>{v || "—"}</div></div>;

function MachineDetail({ id, ctx, onClose }: { id: string; ctx: Ctx; onClose: () => void }) {
  const app = useData();
  const { data, plant, setForm, openSensor } = ctx;
  const m = data.machines.find((x) => x.id === id);
  if (!m) return null;
  const area = data.areas.find((a) => a.id === m.area_id);
  const pts = data.points.filter((p) => p.machine_id === m.id);
  const hist = faultHistory(app.tickets, plant.id, m.name);
  return (
    <Modal title={m.name} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Info l="Area" v={area?.name} /><Info l="Tag" v={m.tag} /><Info l="Type" v={m.machine_type} />
        <Info l="Status" v={<Pill s={m.status} map={MACHINE_STATUS} />} /><Info l="Operating RPM" v={m.operating_rpm || m.rated_rpm} /><Info l="Power kW" v={m.rated_kw} />
        <Info l="Make / model" v={[m.manufacturer, m.model].filter(Boolean).join(" ")} /><Info l="Criticality" v={m.criticality} />
      </div>
      <div className="mt-3 flex gap-2"><Button variant="ghost" onClick={() => setForm({ kind: "machine", row: m })}>Edit machine</Button><Button onClick={() => setForm({ kind: "point", row: { plant_id: plant.id, machine_id: m.id } })}><Plus className="size-3.5" />Measurement point</Button></div>
      <div className="label-caps mb-1 mt-4">Measurement points</div>
      {pts.length ? pts.map((p) => {
        const s = pointSensors(data, p.id);
        const ph = hist.filter((h) => h.a.note.toLowerCase().includes(p.name.toLowerCase()) || h.a.observation.toLowerCase().includes(p.name.toLowerCase()));
        return (
          <div key={p.id} className="mb-2 rounded-md px-3 py-2 ring-1 ring-line">
            <div className="flex items-center justify-between gap-2"><span className="font-medium">{p.name}</span><Button variant="ghost" onClick={() => setForm({ kind: "point", row: p })}>Edit</Button></div>
            <div className="text-xs">
              {s.current ? <>Current sensor: <button type="button" className="num text-signal hover:underline" onClick={() => openSensor(s.current!.id)}>{s.current.serial_no}</button> · installed {fmtDate(s.current.install_date ?? undefined)} <Pill s={s.current.status} map={SENSOR_STATUS} /></>
                : <span className="text-mute">No sensor installed · <button type="button" className="text-signal hover:underline" onClick={() => setForm({ kind: "sensor", row: { plant_id: plant.id, point_id: p.id } })}>Add sensor</button></span>}
            </div>
            {s.previous.length ? <div className="text-xs text-mute">Previous: {s.previous.map((x) => `${x.serial_no} (${label(SENSOR_STATUS, x.status)}${x.removed_date ? ` ${fmtDate(x.removed_date)}` : ""})`).join(", ")}</div> : null}
            {ph.length ? <div className="text-xs text-mute">Analysis: {ph.map((h) => `${h.a.fault || h.a.condition} ${fmtDate(h.date)}`).join(" · ")}</div> : null}
          </div>
        );
      }) : <p className="text-xs text-mute">No measurement points yet (e.g. Motor DE, Pump NDE).</p>}
      <div className="label-caps mb-1 mt-4">Analysis & fault history</div>
      <HistoryList entries={hist} />
    </Modal>
  );
}

function IssueBox({ entity, issues, onDone }: { entity: "sensor" | "gateway"; issues: string[]; onDone: (issue: string, remark: string) => Promise<void> }) {
  const [issue, setIssue] = useState(issues[0]!);
  const [remark, setRemark] = useState("");
  return (
    <div className="mt-3 space-y-2 rounded-md p-3 ring-1 ring-line">
      <Field label="Issue type"><Select value={issue} onChange={(e) => setIssue(e.target.value)}>{issues.map((i) => <option key={i}>{i}</option>)}</Select></Field>
      <Field label="Troubleshooting remark"><TextArea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} /></Field>
      <Button variant="solid" onClick={() => onDone(issue, remark)}>Report {entity} issue</Button>
    </div>
  );
}

function SensorDetail({ id, ctx, onClose }: { id: string; ctx: Ctx; onClose: () => void }) {
  const { data, by, refresh, setForm } = ctx;
  const s = data.sensors.find((x) => x.id === id);
  const [mode, setMode] = useState<"" | "issue" | "resolve" | "replace" | "move">("");
  const [r, setR] = useState({ removalDate: TODAY, reason: "Sensor Faulty", newSerial: "", newType: "", installDate: TODAY, comments: "", toPoint: "", remark: "" });
  if (!s) return null;
  const p = sensorPath(data, s);
  const gw = data.gateways.find((g) => g.id === s.gateway_id);
  const run = async (f: () => Promise<unknown>, ok: string) => {
    try { await f(); await refresh(); toast.success(ok); setMode(""); } catch (e) { toast.error((e as Error).message); }
  };
  const active = isActiveSensor(s);
  return (
    <Modal title={`Sensor ${s.serial_no}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Info l="Type" v={`${s.sensor_type}${s.model ? ` · ${s.model}` : ""}`} /><Info l="Status" v={<Pill s={s.status} map={SENSOR_STATUS} />} /><Info l="Installed" v={fmtDate(s.install_date ?? undefined)} />
        <Info l="Area" v={p.area?.name} /><Info l="Machine" v={p.machine?.name} /><Info l="Measurement point" v={p.point?.name} />
        <Info l="Gateway" v={gw?.name} /><Info l="Battery" v={s.battery} /><Info l="Firmware" v={s.firmware} />
      </div>
      {active ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => setMode("issue")}>Report Issue</Button>
          {hasIssue(s) ? <Button onClick={() => setMode("resolve")}>Resolved</Button> : null}
          <Button onClick={() => setMode("replace")}>Replace Sensor</Button>
          <Button onClick={() => setMode("move")}>Move Sensor</Button>
          <Button variant="ghost" onClick={() => setForm({ kind: "sensor", row: s })}>Edit details</Button>
        </div>
      ) : <p className="mt-3 text-xs text-mute">This sensor is retired; its history is kept below.</p>}
      {mode === "issue" ? <IssueBox entity="sensor" issues={SENSOR_ISSUES} onDone={(i, rm) => run(() => reportIssue("sensor", s, i, rm, by), "Issue recorded — status Under Troubleshooting")} /> : null}
      {mode === "resolve" ? (
        <div className="mt-3 space-y-2 rounded-md p-3 ring-1 ring-line">
          <Field label="Resolution"><TextArea rows={2} value={r.remark} onChange={(e) => setR({ ...r, remark: e.target.value })} /></Field>
          <Button variant="solid" onClick={() => run(() => resolveIssue("sensor", s, r.remark, by), "Marked resolved")}>Save resolution</Button>
        </div>
      ) : null}
      {mode === "replace" ? (
        <div className="mt-3 grid gap-2 rounded-md p-3 ring-1 ring-line sm:grid-cols-2">
          <Field label="Old sensor"><TextInput value={s.serial_no} disabled /></Field>
          <Field label="Removal date"><TextInput type="date" value={r.removalDate} onChange={(e) => setR({ ...r, removalDate: e.target.value })} /></Field>
          <Field label="Replacement reason"><TextInput value={r.reason} onChange={(e) => setR({ ...r, reason: e.target.value })} /></Field>
          <Field label="New sensor serial *"><TextInput value={r.newSerial} onChange={(e) => setR({ ...r, newSerial: e.target.value })} /></Field>
          <Field label="New sensor type"><Select value={r.newType || s.sensor_type} onChange={(e) => setR({ ...r, newType: e.target.value })}>{SENSOR_TYPES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
          <Field label="New installation date"><TextInput type="date" value={r.installDate} onChange={(e) => setR({ ...r, installDate: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Comments"><TextArea rows={2} value={r.comments} onChange={(e) => setR({ ...r, comments: e.target.value })} /></Field></div>
          <div><Button variant="solid" onClick={() => r.newSerial.trim() ? run(() => replaceSensor(s, r, by), "Sensor replaced — old record kept in history") : toast.error("Enter the new serial number")}>Save replacement</Button></div>
        </div>
      ) : null}
      {mode === "move" ? (
        <div className="mt-3 space-y-2 rounded-md p-3 ring-1 ring-line">
          <Field label="New measurement point"><PointSelect data={data} value={r.toPoint} onChange={(v) => setR({ ...r, toPoint: v })} /></Field>
          <Field label="Movement date"><TextInput type="date" value={r.removalDate} onChange={(e) => setR({ ...r, removalDate: e.target.value })} /></Field>
          <Field label="Reason"><TextInput value={r.remark} onChange={(e) => setR({ ...r, remark: e.target.value })} /></Field>
          <Button variant="solid" onClick={() => r.toPoint ? run(() => moveSensor(s, r.toPoint, r.removalDate, r.remark, by, data), "Sensor moved — old location kept in history") : toast.error("Pick the new point")}>Save move</Button>
        </div>
      ) : null}
      <div className="mt-4"><RecentEvents data={data} entityId={s.id} /></div>
    </Modal>
  );
}

function GatewayDetail({ id, ctx, onClose }: { id: string; ctx: Ctx; onClose: () => void }) {
  const { data, by, refresh, setForm, openSensor } = ctx;
  const g = data.gateways.find((x) => x.id === id);
  const [mode, setMode] = useState<"" | "issue" | "resolve">("");
  const [remark, setRemark] = useState("");
  if (!g) return null;
  const run = async (f: () => Promise<unknown>, ok: string) => {
    try { await f(); await refresh(); toast.success(ok); setMode(""); } catch (e) { toast.error((e as Error).message); }
  };
  const sensors = data.sensors.filter((s) => s.gateway_id === g.id && isActiveSensor(s));
  return (
    <Modal title={`Gateway ${g.name}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Info l="Serial" v={g.serial_no} /><Info l="Status" v={<Pill s={g.status} map={GATEWAY_STATUS} />} /><Info l="Installed" v={fmtDate(g.install_date ?? undefined)} />
        <Info l="Model" v={g.model} /><Info l="Location" v={g.location} /><Info l="Connectivity" v={[g.connectivity, g.network_type].filter(Boolean).join(" · ")} />
        <Info l="IP address" v={g.ip_address} /><Info l="Firmware" v={g.firmware} /><Info l="Connected sensors" v={sensors.length} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => setMode("issue")}>Report Issue</Button>
        {["troubleshooting", "offline", "faulty"].includes(g.status) ? <Button onClick={() => setMode("resolve")}>Resolved</Button> : null}
        <Button variant="ghost" onClick={() => setForm({ kind: "gateway", row: g })}>Edit / replace</Button>
      </div>
      {mode === "issue" ? <IssueBox entity="gateway" issues={GATEWAY_ISSUES} onDone={(i, rm) => run(() => reportIssue("gateway", g, i, rm, by), "Issue recorded")} /> : null}
      {mode === "resolve" ? (
        <div className="mt-3 space-y-2 rounded-md p-3 ring-1 ring-line">
          <Field label="Resolution"><TextArea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} /></Field>
          <Button variant="solid" onClick={() => run(() => resolveIssue("gateway", g, remark, by), "Marked online")}>Save resolution</Button>
        </div>
      ) : null}
      <div className="label-caps mb-1 mt-4">Connected sensors</div>
      {sensors.length ? <div className="flex flex-wrap gap-1">{sensors.map((s) => <button key={s.id} type="button" onClick={() => openSensor(s.id)} className="num rounded px-1.5 py-0.5 text-xs ring-1 ring-line hover:bg-black/5">{s.serial_no}</button>)}</div> : <p className="text-xs text-mute">None linked.</p>}
      <div className="mt-4"><RecentEvents data={data} entityId={g.id} /></div>
    </Modal>
  );
}

function PointSelect({ data, value, onChange }: { data: TechData; value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— Not mapped —</option>
      {data.machines.map((m) => (
        <optgroup key={m.id} label={`${data.areas.find((a) => a.id === m.area_id)?.name ?? ""} / ${m.name}`}>
          {data.points.filter((p) => p.machine_id === m.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </optgroup>
      ))}
    </Select>
  );
}

function RecordForm({ form, ctx, onClose }: { form: Form; ctx: Ctx; onClose: () => void }) {
  const { data, by, refresh } = ctx;
  const [row, setRow] = useState<Record<string, unknown>>({ ...form.row });
  const [custom, setCustom] = useState(form.kind === "point" && !!form.row.name && !STANDARD_POINTS.includes(form.row.name));
  const v = (k: string) => (row[k] as string | null | undefined) ?? "";
  const set = (k: string, val: string | null) => setRow((r) => ({ ...r, [k]: val }));
  const txt = (k: string, l: string, type = "text") => <Field label={l}><TextInput type={type} value={v(k)} onChange={(e) => set(k, type === "date" ? e.target.value || null : e.target.value)} /></Field>;
  const sel = (k: string, l: string, opts: [string, string][], blank?: string) => (
    <Field label={l}><Select value={v(k)} onChange={(e) => set(k, e.target.value || (blank !== undefined ? null : ""))}>{blank !== undefined ? <option value="">{blank}</option> : null}{opts.map(([a, b]) => <option key={a} value={a}>{b}</option>)}</Select></Field>
  );
  const isEdit = !!form.row.id;
  const titles = { area: "Area", machine: "Machine", point: "Measurement Point", sensor: "Sensor", gateway: "Gateway" };
  const table = { area: "plant_areas", machine: "plant_machines", point: "measurement_points", sensor: "plant_sensors", gateway: "plant_gateways" } as const;
  const required: Record<Form["kind"], [string, string][]> = { area: [["name", "Area name"]], machine: [["name", "Machine name"], ["area_id", "Area"]], point: [["name", "Point name"]], sensor: [["serial_no", "Serial number"], ["sensor_type", "Sensor type"]], gateway: [["name", "Gateway name"], ["serial_no", "Serial number"]] };
  const save = async () => {
    const missing = required[form.kind].find(([k]) => !v(k).trim());
    if (missing) { toast.error(`${missing[1]} is required`); return; }
    const clean = Object.fromEntries(Object.entries(row).filter(([k]) => !["created_at", "updated_at"].includes(k)));
    const lbl = `${titles[form.kind].toLowerCase()} ${v("name") || v("serial_no")}`;
    try { await saveRecord(table[form.kind], clean as never, by, lbl); await refresh(); toast.success(`${titles[form.kind]} saved`); onClose(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const areaOpts = data.areas.map((a) => [a.id, a.name] as [string, string]);
  return (
    <Modal title={`${isEdit ? "Edit" : "Add"} ${titles[form.kind]}`} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        {form.kind === "area" ? <>{txt("name", "Area name *")}{txt("code", "Area code")}{sel("status", "Status", [["active", "Active"], ["inactive", "Inactive"]])}<div className="sm:col-span-2"><Field label="Description"><TextArea rows={2} value={v("description")} onChange={(e) => set("description", e.target.value)} /></Field></div></> : null}
        {form.kind === "machine" ? <>
          {txt("name", "Machine name *")}{sel("area_id", "Area *", areaOpts)}{txt("tag", "Machine tag / equipment ID")}
          {sel("machine_type", "Machine type", MACHINE_TYPES.map((x) => [x, x]), "—")}{sel("status", "Status", Object.entries(MACHINE_STATUS))}
          {sel("criticality", "Criticality", [["High", "High"], ["Medium", "Medium"], ["Low", "Low"]], "—")}
          {txt("manufacturer", "Manufacturer")}{txt("model", "Model")}{txt("rated_kw", "Rated power (kW)")}{txt("rated_rpm", "Rated RPM")}{txt("operating_rpm", "Operating RPM")}
          <div className="sm:col-span-2"><Field label="Notes"><TextArea rows={2} value={v("notes")} onChange={(e) => set("notes", e.target.value)} /></Field></div>
        </> : null}
        {form.kind === "point" ? <>
          <Field label="Measurement point *">
            {custom ? <TextInput value={v("name")} onChange={(e) => set("name", e.target.value)} placeholder="Custom name" />
              : <Select value={v("name")} onChange={(e) => { if (e.target.value === "__other") { setCustom(true); set("name", ""); } else set("name", e.target.value); }}><option value="">Choose…</option>{STANDARD_POINTS.map((x) => <option key={x}>{x}</option>)}<option value="__other">Other (type name)</option></Select>}
          </Field>
          {txt("component", "Component")}{txt("position", "Position")}{txt("orientation", "Orientation")}{txt("bearing_no", "Bearing number")}
          {sel("status", "Status", [["active", "Active"], ["inactive", "Inactive"]])}
          <div className="sm:col-span-2"><Field label="Notes"><TextArea rows={2} value={v("notes")} onChange={(e) => set("notes", e.target.value)} /></Field></div>
        </> : null}
        {form.kind === "sensor" ? <>
          {isEdit ? <Field label="Serial number"><TextInput value={v("serial_no")} disabled /></Field> : txt("serial_no", "Sensor serial number *")}
          {sel("sensor_type", "Sensor type *", SENSOR_TYPES.map((x) => [x, x]), "Choose…")}{txt("model", "Sensor model")}
          {isEdit ? <Field label="Measurement point" hint="Use Move Sensor to change location — keeps history."><TextInput value={sensorPath(data, { point_id: v("point_id") || null }).point?.name ?? "Not mapped"} disabled /></Field>
            : <Field label="Measurement point"><PointSelect data={data} value={v("point_id")} onChange={(x) => set("point_id", x || null)} /></Field>}
          {sel("gateway_id", "Gateway", data.gateways.map((g) => [g.id, `${g.name} (${g.serial_no})`]), "— None —")}
          {txt("install_date", "Installation date", "date")}{txt("commission_date", "Commissioning date", "date")}
          {txt("firmware", "Firmware version")}{txt("battery", "Battery status")}{txt("comm_status", "Communication status")}
          {isEdit ? null : sel("status", "Current status", [["installed", "Installed"], ["available", "Available"]])}
          <div className="sm:col-span-2"><Field label="Notes"><TextArea rows={2} value={v("notes")} onChange={(e) => set("notes", e.target.value)} /></Field></div>
        </> : null}
        {form.kind === "gateway" ? <>
          {txt("name", "Gateway name *")}{txt("serial_no", "Gateway serial number *")}{txt("model", "Type / model")}
          {sel("area_id", "Area", areaOpts, "— None —")}{txt("location", "Installation location")}{txt("install_date", "Installation date", "date")}
          {txt("ip_address", "IP address")}{txt("connectivity", "SIM / connectivity")}{txt("network_type", "Network type")}{txt("firmware", "Firmware version")}
          {sel("status", "Status", Object.entries(GATEWAY_STATUS))}
          <div className="sm:col-span-2"><Field label="Notes"><TextArea rows={2} value={v("notes")} onChange={(e) => set("notes", e.target.value)} /></Field></div>
        </> : null}
      </div>
      <div className="mt-4 flex gap-2"><Button variant="solid" onClick={save}>Save</Button><Button variant="ghost" onClick={onClose}>Cancel</Button></div>
      <p className="mt-2 text-xs text-mute">Records are never deleted — set the status to Inactive instead, so ticket and report history stays intact.</p>
    </Modal>
  );
}
