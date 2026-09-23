import { useSyncExternalStore } from "react";

// ---------------------------------------------------------------- types

export type Frequency = "weekly" | "monthly" | "on-demand";
export type ReportStatus = "pending" | "prepared" | "sent";
export type Severity = "advisory" | "low" | "medium" | "high" | "critical";

export interface Engineer {
  id: string;
  name: string;
  initials: string;
  role: "analyst" | "manager";
}

export interface Plant {
  id: string;
  name: string;
  customer: string;
  location: string;
  machines: number;
  /** Total assets covered under monitoring at this plant. */
  assets: number;
  /** Installed Node 6 sensor quantity. */
  node6: number;
  /** Installed Node X sensor quantity. */
  nodeX: number;
  /** One or more report cycles agreed with the customer. */
  frequencies: Frequency[];
  contact: string;
  contactPhone: string;
  engineerId: string;
}

export interface DailyUpdate {
  id: string;
  date: string; // yyyy-mm-dd
  engineerId: string;
  plantId: string;
  machinesChecked: number;
  /** High risk found (count). */
  abnormal: number;
  /** Of the high risk found, how many are repeat cases. */
  repeatHighRisk: number;
  /** Of the high risk found, how many are new. */
  newHighRisk: number;
  remark: string;
  submittedAt: string; // HH:MM
}

export interface ReportRow {
  id: string;
  docNo: string;
  plantId: string;
  type: Frequency;
  period: string;
  dueDate: string;
  status: ReportStatus;
  sentDate?: string | undefined;
  byEngineerId: string;
}

/** What the engineer needs back from the manager. */
export type AskFor = "observation" | "recommendation" | "both";

export type TicketStatus = "open" | "in-discussion" | "responded" | "closed";

export type TicketPriority = "low" | "medium" | "high" | "critical";

export interface Ticket {
  id: string;
  ticketNo: string;
  plantId: string;
  area: string;
  machine: string;
  subject: string;
  observation: string;
  askFor: AskFor;
  priority: TicketPriority;
  status: TicketStatus;
  raisedBy: string;
  raisedOn: string; // yyyy-mm-dd
  raisedAt: string; // HH:MM
  assignedTo: string; // manager
  response?: string | undefined;
  respondedOn?: string | undefined;
  closedOn?: string | undefined;
}

/** A chat message. `thread` is `ticket:<id>` for a ticket or `plant:<id>` for a plant channel. */
export interface ChatMessage {
  id: string;
  thread: string;
  authorId: string;
  text: string;
  date: string; // yyyy-mm-dd
  at: string; // HH:MM
  readBy: string[];
}

export interface AppData {
  engineers: Engineer[];
  plants: Plant[];
  updates: DailyUpdate[];
  reports: ReportRow[];
  tickets: Ticket[];
  messages: ChatMessage[];
  /** Who is using the portal right now (no auth yet). */
  currentUserId: string;
}

export const askForLabel: Record<AskFor, string> = {
  observation: "Observation required",
  recommendation: "Recommendation required",
  both: "Observation + recommendation required",
};

export const ticketStatusLabel: Record<TicketStatus, string> = {
  open: "Open",
  "in-discussion": "In discussion",
  responded: "Responded",
  closed: "Closed",
};

export const priorityLabel: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const allAskFor: AskFor[] = ["observation", "recommendation", "both"];
export const allPriorities: TicketPriority[] = ["low", "medium", "high", "critical"];
export const allTicketStatuses: TicketStatus[] = ["open", "in-discussion", "responded", "closed"];

export function ticketSeverity(p: TicketPriority): Severity {
  return p === "critical" ? "critical" : p === "high" ? "high" : p === "medium" ? "medium" : "low";
}

export function ticketStatusSeverity(s: TicketStatus): Severity {
  return s === "open" ? "high" : s === "in-discussion" ? "medium" : s === "responded" ? "low" : "advisory";
}

export function plantThread(plantId: string) {
  return `plant:${plantId}`;
}

export function ticketThread(ticketId: string) {
  return `ticket:${ticketId}`;
}

// ---------------------------------------------------------------- constants

export const TODAY = "2026-09-22";

export const defaultEngineers: Engineer[] = [
  { id: "eng-1", name: "R. Ahuja", initials: "RA", role: "analyst" },
  { id: "eng-2", name: "M. Desai", initials: "MD", role: "analyst" },
  { id: "mgr-1", name: "P. Pawar", initials: "PP", role: "manager" },
];

export function initialsOf(name: string) {
  const parts = name.replace(/[^A-Za-z .]/g, "").split(/[ .]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

export function analystsOf(d: AppData) {
  return d.engineers.filter((e) => e.role === "analyst");
}

export function managersOf(d: AppData) {
  return d.engineers.filter((e) => e.role === "manager");
}

export const frequencyLabel: Record<Frequency, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  "on-demand": "On demand",
};

export const allFrequencies: Frequency[] = ["weekly", "monthly", "on-demand"];

/** Report cycles for a plant, tolerant of older single-cycle records. */
export function plantFrequencies(p: Plant): Frequency[] {
  const list = (p as Plant & { frequency?: Frequency }).frequencies;
  if (list?.length) return list;
  const legacy = (p as Plant & { frequency?: Frequency }).frequency;
  return legacy ? [legacy] : [];
}

export function frequencyText(p: Plant) {
  const list = plantFrequencies(p);
  return list.length ? list.map((f) => frequencyLabel[f]).join(" · ") : "—";
}

export const reportStatusLabel: Record<ReportStatus, string> = {
  pending: "Pending",
  prepared: "Prepared",
  sent: "Sent",
};

export function engineerName(d: AppData, id: string) {
  return d.engineers.find((e) => e.id === id)?.name ?? "—";
}

// ---------------------------------------------------------------- dates

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtDate(iso?: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
}

export function shiftDate(iso: string, days: number) {
  const dt = new Date(`${iso}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string) {
  const ms = new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime();
  return Math.round(ms / 86400000);
}

/** A report is late when it was sent after its due date, or is still unsent past due. */
export function reportTiming(r: ReportRow, today = TODAY): { late: boolean; days: number; label: string } {
  if (r.status === "sent" && r.sentDate) {
    const d = daysBetween(r.dueDate, r.sentDate);
    return { late: d > 0, days: d, label: d > 0 ? `Late by ${d} d` : "On time" };
  }
  const d = daysBetween(r.dueDate, today);
  if (d > 0) return { late: true, days: d, label: `Overdue ${d} d` };
  return { late: false, days: d, label: d === 0 ? "Due today" : `Due in ${-d} d` };
}

// ---------------------------------------------------------------- seed

function seed(): AppData {
  const plants: Plant[] = [
    { id: "pl-1", name: "Tata Steel — Kalinganagar CPP", customer: "Tata Steel", location: "Jajpur, Odisha", machines: 42, assets: 48, node6: 26, nodeX: 12, frequencies: ["weekly", "monthly"], contact: "S. Mohanty", contactPhone: "+91 98200 11223", engineerId: "eng-1" },
    { id: "pl-2", name: "Reliance — Jamnagar Utilities", customer: "Reliance Industries", location: "Jamnagar, Gujarat", machines: 36, assets: 40, node6: 22, nodeX: 9, frequencies: ["weekly"], contact: "A. Trivedi", contactPhone: "+91 99040 55117", engineerId: "eng-2" },
    { id: "pl-3", name: "UltraTech — Awarpur Line 2", customer: "UltraTech Cement", location: "Chandrapur, MH", machines: 28, assets: 31, node6: 18, nodeX: 6, frequencies: ["monthly", "on-demand"], contact: "R. Kulkarni", contactPhone: "+91 98220 47761", engineerId: "eng-1" },
    { id: "pl-4", name: "Hindalco — Renukoot Smelter", customer: "Hindalco", location: "Sonbhadra, UP", machines: 24, assets: 27, node6: 14, nodeX: 5, frequencies: ["monthly"], contact: "V. Singh", contactPhone: "+91 94150 30982", engineerId: "eng-2" },
    { id: "pl-5", name: "Grasim — Nagda Pulp", customer: "Grasim Industries", location: "Nagda, MP", machines: 18, assets: 20, node6: 11, nodeX: 4, frequencies: ["weekly"], contact: "D. Jain", contactPhone: "+91 94250 66104", engineerId: "eng-1" },
    { id: "pl-6", name: "Deepak Fertilisers — Taloja", customer: "Deepak Fertilisers", location: "Taloja, MH", machines: 15, assets: 16, node6: 9, nodeX: 3, frequencies: ["on-demand"], contact: "N. Shetty", contactPhone: "+91 98330 27745", engineerId: "eng-2" },
  ];

  const u = (
    n: number,
    dayOffset: number,
    engineerId: string,
    plantId: string,
    machinesChecked: number,
    abnormal: number,
    remark: string,
    submittedAt: string,
    repeatHighRisk = 0,
    newHighRisk = abnormal,
  ): DailyUpdate => ({
    id: `up-${n}`,
    date: shiftDate(TODAY, dayOffset),
    engineerId,
    plantId,
    machinesChecked,
    abnormal,
    repeatHighRisk,
    newHighRisk,
    remark,
    submittedAt,
  });

  const updates: DailyUpdate[] = [
    u(1, 0, "eng-1", "pl-1", 14, 2, "Boiler feed pump 2A observed rising, informed site.", "09:10", 1, 1),
    u(2, 0, "eng-1", "pl-5", 8, 0, "All within limits.", "11:40"),
    u(3, -1, "eng-1", "pl-3", 12, 1, "Raw mill fan bearing under watch, steady this week.", "09:25", 1, 0),
    u(4, -1, "eng-2", "pl-2", 16, 1, "Cooling tower fan 4 above alert, to be re-checked.", "09:05", 0, 1),
    u(5, -2, "eng-2", "pl-4", 10, 0, "Normal. Two machines were not running.", "09:35"),
    u(6, -2, "eng-1", "pl-1", 13, 1, "Observation continued on BFP 2A.", "09:15", 1, 0),
    u(7, -3, "eng-2", "pl-2", 15, 0, "Normal across compressors.", "09:20"),
    u(8, -3, "eng-1", "pl-5", 9, 1, "Pulp pump 3 to be re-checked.", "10:05", 0, 1),
    u(9, -4, "eng-2", "pl-6", 7, 2, "On-demand study after site complaint — two high risk machines.", "14:10", 0, 2),
    u(10, -4, "eng-1", "pl-3", 11, 0, "Normal.", "09:30"),
  ];

  const r = (
    n: number,
    plantId: string,
    type: Frequency,
    period: string,
    dueOffset: number,
    status: ReportStatus,
    sentOffset: number | null,
    byEngineerId: string,
  ): ReportRow => ({
    id: `rp-${n}`,
    docNo: `FM-VM-2026-0${100 + n}`,
    plantId,
    type,
    period,
    dueDate: shiftDate(TODAY, dueOffset),
    status,
    ...(sentOffset === null ? {} : { sentDate: shiftDate(TODAY, sentOffset) }),
    byEngineerId,
  });

  const reports: ReportRow[] = [
    r(1, "pl-1", "weekly", "14–20 Sep 2026", -1, "sent", -1, "eng-1"),
    r(2, "pl-2", "weekly", "14–20 Sep 2026", -1, "sent", 0, "eng-2"),
    r(3, "pl-5", "weekly", "14–20 Sep 2026", -1, "prepared", null, "eng-1"),
    r(4, "pl-1", "weekly", "07–13 Sep 2026", -8, "sent", -8, "eng-1"),
    r(5, "pl-2", "weekly", "07–13 Sep 2026", -8, "sent", -6, "eng-2"),
    r(6, "pl-5", "weekly", "07–13 Sep 2026", -8, "sent", -8, "eng-1"),
    r(7, "pl-3", "monthly", "August 2026", -17, "sent", -15, "eng-1"),
    r(8, "pl-4", "monthly", "August 2026", -17, "sent", -17, "eng-2"),
    r(9, "pl-6", "on-demand", "Fan study — 18 Sep", -2, "pending", null, "eng-2"),
    r(10, "pl-1", "weekly", "21–27 Sep 2026", 6, "pending", null, "eng-1"),
    r(11, "pl-2", "weekly", "21–27 Sep 2026", 6, "pending", null, "eng-2"),
    r(12, "pl-5", "weekly", "21–27 Sep 2026", 6, "pending", null, "eng-1"),
    r(13, "pl-3", "monthly", "September 2026", 12, "pending", null, "eng-1"),
    r(14, "pl-4", "monthly", "September 2026", 12, "pending", null, "eng-2"),
  ];

  const tickets: Ticket[] = [
    {
      id: "tk-1",
      ticketNo: "FM-OBS-2026-001",
      plantId: "pl-1",
      area: "Boiler feed area",
      machine: "Boiler feed pump 2A",
      subject: "Rising vibration on NDE bearing",
      observation:
        "Overall velocity has risen over three weeks. Indication of possible bearing distress — requires verification. Site wants a view before the weekly report.",
      askFor: "both",
      priority: "high",
      status: "open",
      raisedBy: "eng-1",
      raisedOn: TODAY,
      raisedAt: "09:20",
      assignedTo: "mgr-1",
    },
    {
      id: "tk-2",
      ticketNo: "FM-OBS-2026-002",
      plantId: "pl-2",
      area: "Cooling tower",
      machine: "CT fan 4",
      subject: "Above alert after gearbox oil change",
      observation:
        "Suspected looseness at fan hub. Need your recommendation on whether to advise the customer to stop the fan or continue under watch.",
      askFor: "recommendation",
      priority: "medium",
      status: "in-discussion",
      raisedBy: "eng-2",
      raisedOn: shiftDate(TODAY, -1),
      raisedAt: "09:45",
      assignedTo: "mgr-1",
    },
    {
      id: "tk-3",
      ticketNo: "FM-OBS-2026-003",
      plantId: "pl-6",
      area: "Ammonia compressor house",
      machine: "Compressor 1 — motor DE",
      subject: "On-demand study finding",
      observation: "Two machines abnormal in the on-demand study. Observation needed before the report goes to the customer.",
      askFor: "observation",
      priority: "high",
      status: "responded",
      raisedBy: "eng-2",
      raisedOn: shiftDate(TODAY, -4),
      raisedAt: "15:05",
      assignedTo: "mgr-1",
      response:
        "Treat as indication of misalignment; ask site for shim records and re-measure after correction. Do not declare a fault in the report.",
      respondedOn: shiftDate(TODAY, -3),
    },
  ];

  const m = (
    n: number,
    thread: string,
    authorId: string,
    text: string,
    dayOffset: number,
    at: string,
  ): ChatMessage => ({
    id: `ms-${n}`,
    thread,
    authorId,
    text,
    date: shiftDate(TODAY, dayOffset),
    at,
    readBy: [authorId],
  });

  const messages: ChatMessage[] = [
    m(1, "ticket:tk-1", "eng-1", "Trend and last reading attached in the weekly folder. Please advise wording for the customer.", 0, "09:22"),
    m(2, "ticket:tk-2", "eng-2", "Site is asking for a decision today.", -1, "09:50"),
    m(3, "ticket:tk-2", "mgr-1", "Keep it under watch for now, re-measure tomorrow morning and update me here.", -1, "11:15"),
    m(4, "ticket:tk-3", "mgr-1", "Responded above. Share the draft before sending to the customer.", -3, "10:05"),
    m(5, "plant:pl-1", "eng-1", "Weekly report for 14–20 Sep sent to Mr. Mohanty.", -1, "17:30"),
    m(6, "plant:pl-1", "mgr-1", "Noted. Keep BFP 2A wording as 'under observation'.", -1, "18:02"),
    m(7, "plant:pl-2", "eng-2", "Customer visit planned next week, will cover CT fans.", -2, "12:20"),
  ];

  return {
    engineers: defaultEngineers.map((e) => ({ ...e })),
    plants,
    updates,
    reports,
    tickets,
    messages,
    currentUserId: "mgr-1",
  };
}

// ---------------------------------------------------------------- store (cloud-backed)

import { supabase } from "@/integrations/supabase/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

const emptyData: AppData = {
  engineers: [],
  plants: [],
  updates: [],
  reports: [],
  tickets: [],
  messages: [],
  currentUserId: "mgr-1",
};

let data: AppData = emptyData;
let loaded = false;
const listeners = new Set<() => void>();

// ---- row mappers (cloud columns <-> app shapes)

const rowToEngineer = (r: any): Engineer => ({
  id: r.id,
  name: r.name,
  initials: r.initials || initialsOf(r.name),
  role: r.role === "manager" ? "manager" : "analyst",
});
const engineerToRow = (e: Engineer) => ({ id: e.id, name: e.name, initials: e.initials, role: e.role });

const rowToPlant = (r: any): Plant => ({
  id: r.id,
  name: r.name,
  customer: r.customer ?? "",
  location: r.location ?? "",
  machines: r.machines ?? 0,
  assets: r.assets ?? 0,
  node6: r.node6 ?? 0,
  nodeX: r.node_x ?? 0,
  frequencies: (r.frequencies ?? []) as Frequency[],
  contact: r.contact ?? "",
  contactPhone: r.contact_phone ?? "",
  engineerId: r.engineer_id ?? "",
});
const plantToRow = (p: Plant) => ({
  id: p.id,
  name: p.name,
  customer: p.customer,
  location: p.location,
  machines: p.machines,
  assets: p.assets,
  node6: p.node6,
  node_x: p.nodeX,
  frequencies: plantFrequencies(p),
  contact: p.contact,
  contact_phone: p.contactPhone,
  engineer_id: p.engineerId,
});

const rowToUpdate = (r: any): DailyUpdate => ({
  id: r.id,
  date: r.date,
  engineerId: r.engineer_id ?? "",
  plantId: r.plant_id ?? "",
  machinesChecked: r.machines_checked ?? 0,
  abnormal: r.abnormal ?? 0,
  repeatHighRisk: r.repeat_high_risk ?? 0,
  newHighRisk: r.new_high_risk ?? 0,
  remark: r.remark ?? "",
  submittedAt: r.submitted_at ?? "",
});
const updateToRow = (u: DailyUpdate) => ({
  id: u.id,
  date: u.date,
  engineer_id: u.engineerId,
  plant_id: u.plantId,
  machines_checked: u.machinesChecked,
  abnormal: u.abnormal,
  repeat_high_risk: u.repeatHighRisk ?? 0,
  new_high_risk: u.newHighRisk ?? 0,
  remark: u.remark,
  submitted_at: u.submittedAt,
});

const rowToReport = (r: any): ReportRow =>
  ({
    id: r.id,
    docNo: r.doc_no ?? "",
    plantId: r.plant_id ?? "",
    type: r.type,
    period: r.period ?? "",
    dueDate: r.due_date,
    status: r.status,
    byEngineerId: r.by_engineer_id ?? "",
    ...(r.sent_date ? { sentDate: r.sent_date } : {}),
  }) as ReportRow;
const reportToRow = (r: ReportRow) => ({
  id: r.id,
  doc_no: r.docNo,
  plant_id: r.plantId,
  type: r.type,
  period: r.period,
  due_date: r.dueDate,
  status: r.status,
  sent_date: r.sentDate ?? null,
  by_engineer_id: r.byEngineerId,
});

const rowToTicket = (r: any): Ticket =>
  ({
    id: r.id,
    ticketNo: r.ticket_no ?? "",
    plantId: r.plant_id ?? "",
    area: r.area ?? "",
    machine: r.machine ?? "",
    subject: r.subject ?? "",
    observation: r.observation ?? "",
    askFor: r.ask_for,
    priority: r.priority,
    status: r.status,
    raisedBy: r.raised_by ?? "",
    raisedOn: r.raised_on,
    raisedAt: r.raised_at ?? "",
    assignedTo: r.assigned_to ?? "",
    ...(r.response ? { response: r.response } : {}),
    ...(r.responded_on ? { respondedOn: r.responded_on } : {}),
    ...(r.closed_on ? { closedOn: r.closed_on } : {}),
  }) as Ticket;
const ticketToRow = (t: Ticket) => ({
  id: t.id,
  ticket_no: t.ticketNo,
  plant_id: t.plantId,
  area: t.area,
  machine: t.machine,
  subject: t.subject,
  observation: t.observation,
  ask_for: t.askFor,
  priority: t.priority,
  status: t.status,
  raised_by: t.raisedBy,
  raised_on: t.raisedOn,
  raised_at: t.raisedAt,
  assigned_to: t.assignedTo,
  response: t.response ?? null,
  responded_on: t.respondedOn ?? null,
  closed_on: t.closedOn ?? null,
});

const rowToMessage = (r: any): ChatMessage => ({
  id: r.id,
  thread: r.thread,
  authorId: r.author_id ?? "",
  text: r.text ?? "",
  date: r.date,
  at: r.at ?? "",
  readBy: r.read_by ?? [],
});
const messageToRow = (m: ChatMessage) => ({
  id: m.id,
  thread: m.thread,
  author_id: m.authorId,
  text: m.text,
  date: m.date,
  at: m.at,
  read_by: m.readBy ?? [],
});

// ---- load / sync

async function loadFromCloud() {
  const [e, p, u, r, t, m] = await Promise.all([
    db.from("engineers").select("*"),
    db.from("plants").select("*"),
    db.from("daily_updates").select("*"),
    db.from("reports").select("*"),
    db.from("tickets").select("*"),
    db.from("messages").select("*"),
  ]);
  data = {
    engineers: (e.data ?? []).map(rowToEngineer),
    plants: (p.data ?? []).map(rowToPlant).sort((a: Plant, b: Plant) => a.id.localeCompare(b.id)),
    updates: (u.data ?? [])
      .map(rowToUpdate)
      .sort((a: DailyUpdate, b: DailyUpdate) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1)),
    reports: (r.data ?? []).map(rowToReport),
    tickets: (t.data ?? [])
      .map(rowToTicket)
      .sort((a: Ticket, b: Ticket) => (a.raisedOn === b.raisedOn ? 0 : a.raisedOn < b.raisedOn ? 1 : -1)),
    messages: (m.data ?? []).map(rowToMessage),
    currentUserId: data.currentUserId,
  };
  listeners.forEach((l) => l());
}

function pushDiff<T extends { id: string }>(table: string, prev: T[], next: T[], toRow: (x: T) => unknown) {
  const before = new Map(prev.map((x) => [x.id, JSON.stringify(x)]));
  const ups = next.filter((x) => before.get(x.id) !== JSON.stringify(x)).map(toRow);
  const keep = new Set(next.map((x) => x.id));
  const dels = prev.filter((x) => !keep.has(x.id)).map((x) => x.id);
  if (ups.length) {
    db.from(table)
      .upsert(ups)
      .then((res: { error?: unknown }) => {
        if (res?.error) console.error(`cloud save failed (${table})`, res.error);
      });
  }
  if (dels.length) {
    db.from(table)
      .delete()
      .in("id", dels)
      .then((res: { error?: unknown }) => {
        if (res?.error) console.error(`cloud delete failed (${table})`, res.error);
      });
  }
}

function syncToCloud(prev: AppData, next: AppData) {
  if (typeof window === "undefined") return;
  pushDiff("engineers", prev.engineers, next.engineers, engineerToRow);
  pushDiff("plants", prev.plants, next.plants, plantToRow);
  pushDiff("daily_updates", prev.updates, next.updates, updateToRow);
  pushDiff("reports", prev.reports, next.reports, reportToRow);
  pushDiff("tickets", prev.tickets, next.tickets, ticketToRow);
  pushDiff("messages", prev.messages, next.messages, messageToRow);
}

function commit(next: AppData) {
  const prev = data;
  data = next;
  syncToCloud(prev, next);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    void loadFromCloud();
  }
  return () => listeners.delete(cb);
}

export function useData(): AppData {
  return useSyncExternalStore(
    subscribe,
    () => data,
    () => data,
  );
}

/** Pull the latest cloud data again (after another user's change). */
export function refreshData() {
  return loadFromCloud();
}

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

export function saveEngineer(input: { id?: string; name: string; role: Engineer["role"] }) {
  const name = input.name.trim();
  if (!name) return { ok: false, message: "Enter a name." };
  const clash = data.engineers.some((e) => e.id !== input.id && e.name.toLowerCase() === name.toLowerCase());
  if (clash) return { ok: false, message: "An engineer with this name already exists." };
  const engineers = input.id
    ? data.engineers.map((e) => (e.id === input.id ? { ...e, name, role: input.role, initials: initialsOf(name) } : e))
    : [...data.engineers, { id: uid("eng"), name, role: input.role, initials: initialsOf(name) }];
  commit({ ...data, engineers });
  return { ok: true, message: input.id ? "Name updated." : "Engineer added." };
}

/** Work already recorded against an engineer, to warn before deletion. */
export function engineerUsage(d: AppData, id: string) {
  return {
    updates: d.updates.filter((u) => u.engineerId === id).length,
    plants: d.plants.filter((p) => p.engineerId === id).length,
    reports: d.reports.filter((r) => r.byEngineerId === id).length,
  };
}

/** Remove an engineer. Their plants/reports must first be reassigned to `reassignTo`. */
export function removeEngineer(id: string, reassignTo?: string) {
  const engineers = data.engineers.filter((e) => e.id !== id);
  if (!engineers.some((e) => e.role === "analyst")) {
    return { ok: false, message: "Keep at least one engineer in the team." };
  }
  const usage = engineerUsage(data, id);
  if ((usage.plants || usage.reports || usage.updates) && !reassignTo) {
    return { ok: false, message: "Choose an engineer to move this work to first." };
  }
  const to = reassignTo ?? "";
  commit({
    ...data,
    engineers,
    currentUserId: data.currentUserId === id ? engineers[0]?.id ?? "" : data.currentUserId,
    plants: data.plants.map((p) => (p.engineerId === id ? { ...p, engineerId: to } : p)),
    updates: data.updates.map((u) => (u.engineerId === id ? { ...u, engineerId: to } : u)),
    reports: data.reports.map((r) => (r.byEngineerId === id ? { ...r, byEngineerId: to } : r)),
    tickets: data.tickets.map((t) => ({
      ...t,
      raisedBy: t.raisedBy === id ? to : t.raisedBy,
      assignedTo: t.assignedTo === id ? to : t.assignedTo,
    })),
  });
  return { ok: true, message: "Engineer removed and their work reassigned." };
}

export function savePlant(plant: Omit<Plant, "id"> & { id?: string }) {
  const plants = plant.id
    ? data.plants.map((p) => (p.id === plant.id ? ({ ...p, ...plant } as Plant) : p))
    : [...data.plants, { ...plant, id: uid("pl") } as Plant];
  commit({ ...data, plants });
}

export function removePlant(id: string) {
  const dropped = data.tickets.filter((t) => t.plantId === id).map((t) => ticketThread(t.id));
  commit({
    ...data,
    plants: data.plants.filter((p) => p.id !== id),
    updates: data.updates.filter((u) => u.plantId !== id),
    reports: data.reports.filter((r) => r.plantId !== id),
    tickets: data.tickets.filter((t) => t.plantId !== id),
    messages: data.messages.filter((x) => x.thread !== plantThread(id) && !dropped.includes(x.thread)),
  });
}

export function addUpdate(entry: Omit<DailyUpdate, "id" | "submittedAt"> & { submittedAt?: string }) {
  const submittedAt =
    entry.submittedAt ??
    (typeof window === "undefined" ? "09:00" : new Date().toTimeString().slice(0, 5));
  commit({ ...data, updates: [{ ...entry, submittedAt, id: uid("up") }, ...data.updates] });
}

export function removeUpdate(id: string) {
  commit({ ...data, updates: data.updates.filter((u) => u.id !== id) });
}

export function saveReport(row: Omit<ReportRow, "id" | "docNo"> & { id?: string; docNo?: string }) {
  const reports = row.id
    ? data.reports.map((r) => (r.id === row.id ? ({ ...r, ...row } as ReportRow) : r))
    : [
        ...data.reports,
        { ...row, id: uid("rp"), docNo: row.docNo ?? `FM-VM-2026-0${200 + data.reports.length}` } as ReportRow,
      ];
  commit({ ...data, reports });
}

export function setReportStatus(id: string, status: ReportStatus, sentDate?: string) {
  commit({
    ...data,
    reports: data.reports.map((r) =>
      r.id === id
        ? status === "sent"
          ? { ...r, status, sentDate: sentDate ?? TODAY }
          : { ...r, status, sentDate: undefined }
        : r,
    ),
  });
}

export function resetDemoData() {
  commit(seed());
}

// ---------------------------------------------------------------- derived

export function plantName(d: AppData, id: string) {
  return d.plants.find((p) => p.id === id)?.name ?? "—";
}

export function todaysUpdates(d: AppData, date = TODAY) {
  return d.updates.filter((u) => u.date === date);
}

export function sumUpdates(list: DailyUpdate[]) {
  return list.reduce(
    (a, u) => ({
      machinesChecked: a.machinesChecked + u.machinesChecked,
      abnormal: a.abnormal + u.abnormal,
      repeatHighRisk: a.repeatHighRisk + (u.repeatHighRisk ?? 0),
      newHighRisk: a.newHighRisk + (u.newHighRisk ?? 0),
    }),
    { machinesChecked: 0, abnormal: 0, repeatHighRisk: 0, newHighRisk: 0 },
  );
}

/** Installed base across all plants — machines, assets and sensor quantities. */
export function fleetTotals(d: AppData) {
  return d.plants.reduce(
    (a, p) => ({
      machines: a.machines + (p.machines ?? 0),
      assets: a.assets + (p.assets ?? 0),
      node6: a.node6 + (p.node6 ?? 0),
      nodeX: a.nodeX + (p.nodeX ?? 0),
    }),
    { machines: 0, assets: 0, node6: 0, nodeX: 0 },
  );
}

export function engineerSummary(d: AppData, engineerId: string, days = 7) {
  const from = shiftDate(TODAY, -(days - 1));
  const list = d.updates.filter((u) => u.engineerId === engineerId && u.date >= from);
  const totals = sumUpdates(list);
  const reports = d.reports.filter((r) => r.byEngineerId === engineerId);
  const sent = reports.filter((r) => r.status === "sent");
  const late = sent.filter((r) => reportTiming(r).late);
  const pending = reports.filter((r) => r.status !== "sent");
  const overdue = pending.filter((r) => reportTiming(r).late);
  const submittedToday = d.updates.some((u) => u.engineerId === engineerId && u.date === TODAY);
  const daysUpdated = new Set(list.map((u) => u.date)).size;
  return {
    ...totals,
    plantsCovered: new Set(list.map((u) => u.plantId)).size,
    entries: list.length,
    daysUpdated,
    days,
    submittedToday,
    reportsSent: sent.length,
    reportsLate: late.length,
    reportsPending: pending.length,
    reportsOverdue: overdue.length,
  };
}

export function plantSummary(d: AppData, plantId: string) {
  const list = d.updates.filter((u) => u.plantId === plantId).sort((a, b) => (a.date < b.date ? 1 : -1));
  const reports = d.reports.filter((r) => r.plantId === plantId);
  const sent = reports.filter((r) => r.status === "sent").sort((a, b) => ((a.sentDate ?? "") < (b.sentDate ?? "") ? 1 : -1));
  const next = reports.filter((r) => r.status !== "sent").sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1))[0];
  return {
    lastObserved: list[0]?.date,
    lastRemark: list[0]?.remark,
    observations: list.length,
    abnormal: sumUpdates(list).abnormal,
    lastReportSent: sent[0]?.sentDate,
    nextReport: next,
  };
}

export function reportKpis(d: AppData) {
  const sent = d.reports.filter((r) => r.status === "sent");
  const pending = d.reports.filter((r) => r.status !== "sent");
  const overdue = pending.filter((r) => reportTiming(r).late);
  const late = sent.filter((r) => reportTiming(r).late);
  const dueThisWeek = pending.filter((r) => daysBetween(TODAY, r.dueDate) <= 7);
  const onTimePct = sent.length ? Math.round(((sent.length - late.length) / sent.length) * 100) : 100;
  return { sent: sent.length, late: late.length, onTimePct, pending: pending.length, overdue: overdue.length, dueThisWeek: dueThisWeek.length };
}

// ---------------------------------------------------------------- tickets & chat

function nowTime() {
  return typeof window === "undefined" ? "09:00" : new Date().toTimeString().slice(0, 5);
}

export function setCurrentUser(id: string) {
  commit({ ...data, currentUserId: id });
}

export function currentUser(d: AppData): Engineer | undefined {
  return d.engineers.find((e) => e.id === d.currentUserId) ?? d.engineers[0];
}

export function isManager(d: AppData, id = d.currentUserId) {
  return d.engineers.find((e) => e.id === id)?.role === "manager";
}

function nextTicketNo() {
  const n = data.tickets.length + 1;
  return `FM-OBS-2026-${String(n).padStart(3, "0")}`;
}

/** Engineer raises a ticket for the manager: plant → area → machine → what is required. */
export function createTicket(input: {
  plantId: string;
  area: string;
  machine: string;
  subject: string;
  observation: string;
  askFor: AskFor;
  priority: TicketPriority;
  raisedBy: string;
  assignedTo?: string;
}) {
  if (!input.plantId) return { ok: false, message: "Select a plant." };
  if (!input.machine.trim()) return { ok: false, message: "Enter the machine name." };
  if (!input.subject.trim()) return { ok: false, message: "Enter a short subject." };
  const manager = input.assignedTo || managersOf(data)[0]?.id || "";
  const ticket: Ticket = {
    id: uid("tk"),
    ticketNo: nextTicketNo(),
    plantId: input.plantId,
    area: input.area.trim(),
    machine: input.machine.trim(),
    subject: input.subject.trim(),
    observation: input.observation.trim(),
    askFor: input.askFor,
    priority: input.priority,
    status: "open",
    raisedBy: input.raisedBy,
    raisedOn: TODAY,
    raisedAt: nowTime(),
    assignedTo: manager,
  };
  commit({ ...data, tickets: [ticket, ...data.tickets] });
  return { ok: true, message: `Ticket ${ticket.ticketNo} raised with ${engineerName(data, manager)}.`, id: ticket.id };
}

export function sendMessage(thread: string, authorId: string, text: string) {
  const body = text.trim();
  if (!body) return { ok: false, message: "Type a message." };
  const msg: ChatMessage = {
    id: uid("ms"),
    thread,
    authorId,
    text: body,
    date: TODAY,
    at: nowTime(),
    readBy: [authorId],
  };
  const tickets = thread.startsWith("ticket:")
    ? data.tickets.map((t) =>
        ticketThread(t.id) === thread && t.status === "open" ? { ...t, status: "in-discussion" as TicketStatus } : t,
      )
    : data.tickets;
  commit({ ...data, messages: [...data.messages, msg], tickets });
  return { ok: true, message: "Sent." };
}

export function markThreadRead(thread: string, userId: string) {
  const need = data.messages.some((x) => x.thread === thread && !x.readBy.includes(userId));
  if (!need) return;
  commit({
    ...data,
    messages: data.messages.map((x) =>
      x.thread === thread && !x.readBy.includes(userId) ? { ...x, readBy: [...x.readBy, userId] } : x,
    ),
  });
}

/** Manager gives the observation / recommendation the engineer asked for. */
export function respondToTicket(id: string, authorId: string, text: string) {
  const body = text.trim();
  if (!body) return { ok: false, message: "Enter your observation / recommendation." };
  const msg: ChatMessage = {
    id: uid("ms"),
    thread: ticketThread(id),
    authorId,
    text: body,
    date: TODAY,
    at: nowTime(),
    readBy: [authorId],
  };
  commit({
    ...data,
    messages: [...data.messages, msg],
    tickets: data.tickets.map((t) =>
      t.id === id ? { ...t, status: "responded" as TicketStatus, response: body, respondedOn: TODAY } : t,
    ),
  });
  return { ok: true, message: "Recommendation recorded and shared in the chat." };
}

export function setTicketStatus(id: string, status: TicketStatus) {
  commit({
    ...data,
    tickets: data.tickets.map((t) =>
      t.id === id
        ? status === "closed"
          ? { ...t, status, closedOn: TODAY }
          : { ...t, status, closedOn: undefined }
        : t,
    ),
  });
}

export function removeTicket(id: string) {
  commit({
    ...data,
    tickets: data.tickets.filter((t) => t.id !== id),
    messages: data.messages.filter((x) => x.thread !== ticketThread(id)),
  });
}

export function threadMessages(d: AppData, thread: string) {
  return (d.messages ?? [])
    .filter((x) => x.thread === thread)
    .sort((a, b) => (a.date === b.date ? (a.at > b.at ? 1 : -1) : a.date > b.date ? 1 : -1));
}

export function unreadCount(d: AppData, thread: string, userId = d.currentUserId) {
  return (d.messages ?? []).filter((x) => x.thread === thread && !x.readBy.includes(userId) && x.authorId !== userId).length;
}

export function totalUnread(d: AppData, userId = d.currentUserId) {
  return (d.messages ?? []).filter((x) => !x.readBy.includes(userId) && x.authorId !== userId).length;
}

export function ticketKpis(d: AppData, userId = d.currentUserId) {
  const all = d.tickets ?? [];
  const open = all.filter((t) => t.status !== "closed");
  const waitingOnManager = open.filter((t) => t.status !== "responded");
  const mine = open.filter((t) => t.assignedTo === userId || t.raisedBy === userId);
  const critical = open.filter((t) => t.priority === "critical" || t.priority === "high");
  return {
    open: open.length,
    waitingOnManager: waitingOnManager.length,
    mine: mine.length,
    critical: critical.length,
    responded: all.filter((t) => t.status === "responded").length,
    closed: all.filter((t) => t.status === "closed").length,
  };
}

export function plantTickets(d: AppData, plantId: string) {
  return d.tickets.filter((t) => t.plantId === plantId);
}
