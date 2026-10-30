import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { analysisRows, type MachineAnalysis } from "@/lib/ticket-analysis";
import type { Ticket } from "@/lib/store";

type T = Database["public"]["Tables"];
export type Area = T["plant_areas"]["Row"];
export type Machine = T["plant_machines"]["Row"];
export type Point = T["measurement_points"]["Row"];
export type Gateway = T["plant_gateways"]["Row"];
export type Sensor = T["plant_sensors"]["Row"];
export type TechEvent = T["technical_events"]["Row"];

export const MACHINE_TYPES = ["Motor", "Pump", "Fan", "Blower", "Compressor", "Gearbox", "Turbine", "Agitator", "Conveyor", "Cooling Tower Fan", "Other"];
export const MACHINE_STATUS = { running: "Running", standby: "Standby", maintenance: "Under Maintenance", inactive: "Inactive" } as const;
export const STANDARD_POINTS = ["Motor DE", "Motor NDE", "Pump DE", "Pump NDE", "Fan DE", "Fan NDE", "Gearbox Input DE", "Gearbox Input NDE", "Gearbox Output DE", "Gearbox Output NDE", "Compressor DE", "Compressor NDE", "Bearing-1", "Bearing-2", "Bearing-3", "Bearing-4"];
export const SENSOR_TYPES = ["Node 6", "Node X", "VibAssist", "Other"];
export const SENSOR_STATUS = { installed: "Installed", available: "Available", faulty: "Faulty", troubleshooting: "Under Troubleshooting", removed: "Removed", replaced: "Replaced", returned: "Returned", inactive: "Inactive" } as const;
export const GATEWAY_STATUS = { online: "Online", offline: "Offline", troubleshooting: "Under Troubleshooting", faulty: "Faulty", replaced: "Replaced", inactive: "Inactive" } as const;
export const SENSOR_ISSUES = ["No Data", "Intermittent Data", "Battery Issue", "Communication Issue", "Abnormal Sensor Behaviour", "Physical Damage", "Configuration Issue", "Other"];
export const GATEWAY_ISSUES = ["Offline", "Network Issue", "SIM Issue", "Power Issue", "Communication Issue", "Configuration Issue", "Hardware Failure", "Other"];

/** Sensor states that no longer occupy a serial number (history only). */
export const RETIRED = ["replaced", "removed", "returned", "inactive"];
export const isActiveSensor = (s: Pick<Sensor, "status">) => !RETIRED.includes(s.status);
export const hasIssue = (s: Pick<Sensor, "status">) => s.status === "faulty" || s.status === "troubleshooting";

export interface TechData { areas: Area[]; machines: Machine[]; points: Point[]; gateways: Gateway[]; sensors: Sensor[]; events: TechEvent[] }
const EMPTY: TechData = { areas: [], machines: [], points: [], gateways: [], sensors: [], events: [] };

// ---------- pure helpers

export function techTotals(d: TechData) {
  return {
    areas: d.areas.filter((a) => a.status === "active").length,
    machines: d.machines.filter((m) => m.status !== "inactive").length,
    points: d.points.filter((p) => p.status === "active").length,
    sensors: d.sensors.filter((s) => s.status === "installed" || hasIssue(s)).length,
    gateways: d.gateways.filter((g) => !["replaced", "inactive"].includes(g.status)).length,
    issues: d.sensors.filter(hasIssue).length + d.gateways.filter((g) => ["offline", "troubleshooting", "faulty"].includes(g.status)).length,
  };
}

/** Current sensor at a point plus previous (retired) ones, newest first. */
export function pointSensors(d: TechData, pointId: string) {
  const all = d.sensors.filter((s) => s.point_id === pointId).sort((a, b) => (b.install_date ?? b.created_at).localeCompare(a.install_date ?? a.created_at));
  return { current: all.find(isActiveSensor) ?? null, previous: all.filter((s) => !isActiveSensor(s)) };
}

export function sensorPath(d: TechData, s: Pick<Sensor, "point_id">) {
  const point = d.points.find((p) => p.id === s.point_id) ?? null;
  const machine = point ? d.machines.find((m) => m.id === point.machine_id) ?? null : null;
  const area = machine ? d.areas.find((a) => a.id === machine.area_id) ?? null : null;
  return { point, machine, area };
}

export const gatewaySensorCount = (d: TechData, gatewayId: string) => d.sensors.filter((s) => s.gateway_id === gatewayId && isActiveSensor(s)).length;

export type Hit = { kind: "area" | "machine" | "point" | "sensor" | "gateway"; id: string; label: string; sub: string };
export function searchTech(d: TechData, q: string): Hit[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const has = (...v: string[]) => v.some((x) => x.toLowerCase().includes(s));
  const area = (id: string) => d.areas.find((a) => a.id === id)?.name ?? "";
  const hits: Hit[] = [];
  d.areas.forEach((a) => has(a.name, a.code) && hits.push({ kind: "area", id: a.id, label: a.name, sub: "Area" }));
  d.machines.forEach((m) => has(m.name, m.tag, m.machine_type) && hits.push({ kind: "machine", id: m.id, label: m.name, sub: [m.tag, area(m.area_id)].filter(Boolean).join(" · ") }));
  d.points.forEach((p) => has(p.name, p.bearing_no) && hits.push({ kind: "point", id: p.machine_id, label: p.name, sub: d.machines.find((m) => m.id === p.machine_id)?.name ?? "" }));
  d.sensors.forEach((x) => has(x.serial_no, x.model) && hits.push({ kind: "sensor", id: x.id, label: x.serial_no, sub: `${x.sensor_type} · ${SENSOR_STATUS[x.status as keyof typeof SENSOR_STATUS] ?? x.status}` }));
  d.gateways.forEach((g) => has(g.name, g.serial_no) && hits.push({ kind: "gateway", id: g.id, label: g.name, sub: g.serial_no }));
  return hits.slice(0, 30);
}

export interface FaultEntry { date: string; ticketNo: string; ticketId: string; area: string; machine: string; a: MachineAnalysis }
/** Reviewed machine rows from this plant's tickets, newest first. Matches by machine name (tickets store names). */
export function faultHistory(tickets: Ticket[], plantId: string, machineName?: string): FaultEntry[] {
  const n = machineName?.trim().toLowerCase();
  const out: FaultEntry[] = [];
  for (const t of tickets) {
    if (t.plantId !== plantId) continue;
    for (const a of analysisRows(t)) {
      if (n && a.machine.trim().toLowerCase() !== n) continue;
      if (!a.condition && !a.fault && !a.observation) continue;
      out.push({ date: t.publishedOn || t.raisedOn, ticketNo: t.ticketNo, ticketId: t.id, area: a.area, machine: a.machine, a });
    }
  }
  return out.sort((x, y) => y.date.localeCompare(x.date));
}

function cell(v: unknown) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export const TECH_HEADERS = ["Plant Name", "Area Name", "Machine Name", "Machine Tag", "Machine Type", "Measurement Point", "Component", "Position", "Bearing Number", "Sensor Serial Number", "Sensor Type", "Sensor Model", "Gateway Serial Number", "Installation Date", "Status"];
/** One row per measurement point (with its current sensor); machines with no points get one row. */
export function buildTechCsv(d: TechData, plantName: string, areaId?: string) {
  const lines = [TECH_HEADERS.join(",")];
  for (const m of d.machines) {
    if (areaId && m.area_id !== areaId) continue;
    const area = d.areas.find((a) => a.id === m.area_id)?.name ?? "";
    const pts = d.points.filter((p) => p.machine_id === m.id);
    if (!pts.length) lines.push([plantName, area, m.name, m.tag, m.machine_type, "", "", "", "", "", "", "", "", "", m.status].map(cell).join(","));
    for (const p of pts) {
      const s = pointSensors(d, p.id).current;
      const gw = s?.gateway_id ? d.gateways.find((g) => g.id === s.gateway_id)?.serial_no ?? "" : "";
      lines.push([plantName, area, m.name, m.tag, m.machine_type, p.name, p.component, p.position, p.bearing_no, s?.serial_no ?? "", s?.sensor_type ?? "", s?.model ?? "", gw, s?.install_date ?? "", s?.status ?? p.status].map(cell).join(","));
    }
  }
  return lines.join("\r\n");
}

const TODAY_ISO = () => new Date().toISOString().slice(0, 10);

// ---------- cloud store

const key = (plantId: string) => ["technical", plantId];

export function useTechnical(plantId: string) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: key(plantId),
    enabled: !!plantId,
    queryFn: async (): Promise<TechData> => {
      const [a, m, p, g, s, e] = await Promise.all([
        supabase.from("plant_areas").select("*").eq("plant_id", plantId).order("name"),
        supabase.from("plant_machines").select("*").eq("plant_id", plantId).order("name"),
        supabase.from("measurement_points").select("*").eq("plant_id", plantId).order("name"),
        supabase.from("plant_gateways").select("*").eq("plant_id", plantId).order("name"),
        supabase.from("plant_sensors").select("*").eq("plant_id", plantId).order("serial_no"),
        supabase.from("technical_events").select("*").eq("plant_id", plantId).order("created_at", { ascending: false }),
      ]);
      const err = [a, m, p, g, s, e].find((r) => r.error)?.error;
      if (err) throw new Error(err.message);
      return { areas: a.data ?? [], machines: m.data ?? [], points: p.data ?? [], gateways: g.data ?? [], sensors: s.data ?? [], events: e.data ?? [] };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: key(plantId) });
  return { data: q.data ?? EMPTY, loading: q.isPending, error: q.error, refresh };
}

const friendly = (m: string) => (/plant_sensors_active_serial/.test(m) ? "This sensor serial number is already active on another record." : /plant_gateways_serial/.test(m) ? "This gateway serial number already exists." : m);

async function logEvent(e: T["technical_events"]["Insert"]) {
  const { error } = await supabase.from("technical_events").insert(e);
  if (error) throw new Error(error.message);
}

type Table = "plant_areas" | "plant_machines" | "measurement_points" | "plant_gateways" | "plant_sensors";
const entityOf: Record<Table, string> = { plant_areas: "area", plant_machines: "machine", measurement_points: "point", plant_gateways: "gateway", plant_sensors: "sensor" };

/** Create or edit a register record and write an audit event. */
export async function saveRecord<K extends Table>(table: K, row: T[K]["Insert"] & { plant_id: string; id?: string }, by: string, label: string) {
  const isNew = !row.id;
  const payload = { ...row, updated_at: new Date().toISOString(), ...(isNew ? { created_by: by } : {}) };
  const { data, error } = await supabase.from(table).upsert(payload as never).select().single();
  if (error) throw new Error(friendly(error.message));
  const saved = data as unknown as { id: string };
  await logEvent({ plant_id: row.plant_id, entity: entityOf[table], entity_id: saved.id, kind: isNew ? "created" : "updated", remark: `${isNew ? "Added" : "Updated"} ${label}`, by_user: by });
  return saved;
}

export async function reportIssue(entity: "sensor" | "gateway", rec: { id: string; plant_id: string }, issue: string, remark: string, by: string) {
  const table = entity === "sensor" ? "plant_sensors" : "plant_gateways";
  const { error } = await supabase.from(table).update({ status: "troubleshooting", updated_at: new Date().toISOString() }).eq("id", rec.id);
  if (error) throw new Error(error.message);
  await logEvent({ plant_id: rec.plant_id, entity, entity_id: rec.id, kind: "issue", issue_type: issue, remark, by_user: by });
}

export async function resolveIssue(entity: "sensor" | "gateway", rec: { id: string; plant_id: string }, remark: string, by: string) {
  const table = entity === "sensor" ? "plant_sensors" : "plant_gateways";
  const { error } = await supabase.from(table).update({ status: entity === "sensor" ? "installed" : "online", updated_at: new Date().toISOString() }).eq("id", rec.id);
  if (error) throw new Error(error.message);
  await logEvent({ plant_id: rec.plant_id, entity, entity_id: rec.id, kind: "resolved", remark, by_user: by });
}

/** Old sensor -> replaced (kept), new sensor installed at the same point/gateway. */
export async function replaceSensor(old: Sensor, input: { removalDate: string; reason: string; newSerial: string; newType: string; installDate: string; comments: string }, by: string) {
  const now = new Date().toISOString();
  const r1 = await supabase.from("plant_sensors").update({ status: "replaced", removed_date: input.removalDate || null, updated_at: now }).eq("id", old.id);
  if (r1.error) throw new Error(r1.error.message);
  const r2 = await supabase.from("plant_sensors").insert({ plant_id: old.plant_id, point_id: old.point_id, gateway_id: old.gateway_id, serial_no: input.newSerial.trim(), sensor_type: input.newType || old.sensor_type, install_date: input.installDate || null, status: "installed", created_by: by }).select().single();
  if (r2.error) {
    await supabase.from("plant_sensors").update({ status: old.status, removed_date: old.removed_date }).eq("id", old.id);
    throw new Error(friendly(r2.error.message));
  }
  await supabase.from("plant_sensors").update({ replaced_by: r2.data.id }).eq("id", old.id);
  const detail = { old: old.serial_no, new: r2.data.serial_no, reason: input.reason };
  await logEvent({ plant_id: old.plant_id, entity: "sensor", entity_id: old.id, kind: "replaced", issue_type: input.reason, remark: input.comments, detail, event_date: input.removalDate || TODAY_ISO(), by_user: by });
  await logEvent({ plant_id: old.plant_id, entity: "sensor", entity_id: r2.data.id, kind: "installed", remark: `Replaced ${old.serial_no}`, detail, event_date: input.installDate || TODAY_ISO(), by_user: by });
  return r2.data;
}

export async function moveSensor(s: Sensor, toPointId: string, date: string, reason: string, by: string, d: TechData) {
  const from = sensorPath(d, s);
  const to = sensorPath(d, { point_id: toPointId });
  const { error } = await supabase.from("plant_sensors").update({ point_id: toPointId || null, updated_at: new Date().toISOString() }).eq("id", s.id);
  if (error) throw new Error(error.message);
  const name = (p: ReturnType<typeof sensorPath>) => [p.area?.name, p.machine?.name, p.point?.name].filter(Boolean).join(" / ") || "Not mapped";
  await logEvent({ plant_id: s.plant_id, entity: "sensor", entity_id: s.id, kind: "moved", remark: reason, detail: { from: name(from), to: name(to) }, event_date: date || TODAY_ISO(), by_user: by });
}
