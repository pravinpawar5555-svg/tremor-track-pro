import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { peekDomain } from "@/lib/domain";
import { AppShell } from "@/components/console/AppShell";
import { ExecSiteVisits } from "@/components/console/ExecSiteVisits";
import { Button, Empty, Field, Kpi, Panel, PageHeader, Select, TextArea, TextInput, Td, Th, Tr } from "@/components/console/ui";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { currentUser, fmtDate, todayIso, useData } from "@/lib/store";
import {
  activityFor,
  addComment,
  addDailyUpdate,
  blankJob,
  dateRange,
  deleteDailyUpdate,
  deleteEngineer,
  deleteJob,
  execEngineerName,
  execStatusLabel,
  execStatusTone,
  installTypeLabel,
  pendingReasons,
  reassignJobs,
  saveEngineer,
  saveJob,
  updatesFor,
  useExecution,
  yesNoNaLabel,
  type ExecEngineer,
  type ExecJob,
  type ExecStatus,
  type YesNoNa,
} from "@/lib/execution";

export const Route = createFileRoute("/_authenticated/execution")({
  beforeLoad: () => {
    const d = peekDomain();
    if (d !== "manager" && d !== "execution") throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Execution — Forbes Marshall CM Portal" },
      { name: "description", content: "Demo installations, order execution and troubleshooting jobs for site engineers." },
      { property: "og:title", content: "Execution — Forbes Marshall CM Portal" },
      { property: "og:description", content: "Leads, schedules, daily site updates and job completion for the execution team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExecutionPage,
});

type Tab = "overview" | "leads" | "schedule" | "jobs" | "visits" | "team";
const iso = (v: string | null | undefined) => v ?? undefined;
const closed = (s: ExecStatus) => s === "completed" || s === "cancelled";

function StatusBadge({ s }: { s: ExecStatus }) {
  return <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1", execStatusTone[s])}>{execStatusLabel[s]}</span>;
}

function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <span className="inline-flex flex-wrap rounded-md p-0.5 ring-1 ring-line/80">
      {options.map((o) => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)} className={cn("rounded px-2.5 py-1 text-xs", value === o.v ? "bg-signal text-signal-foreground" : "text-mute hover:bg-base")}>
          {o.label}
        </button>
      ))}
    </span>
  );
}

function ExecutionPage() {
  const data = useData();
  const ex = useExecution();
  const manager = data.role === "manager";
  const me = currentUser(data);
  const myName = me?.name ?? "";
  const meExec = ex.engineers.find((e) => e.linkedUserId && e.linkedUserId === data.currentUserId);
  const mineOnly = !manager && !!meExec;
  const search = Route.useSearch();
  const [tab, setTab] = useState<Tab>(search.add === "visit" ? "visits" : "overview");
  const [editing, setEditing] = useState<{ job: ExecJob; isNew: boolean } | null>(
    search.add === "lead" ? { job: { ...blankJob(myName), assignedEngineerId: meExec?.id ?? "" }, isNew: true } : null,
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const today = todayIso();
  const [quickVisit, setQuickVisit] = useState<ExecSiteVisit | null>(search.add === "visit" ? blankSiteVisit(today, meExec?.id ?? "", myName) : null);

  const visible = useMemo(
    () => (mineOnly ? ex.jobs.filter((j) => j.assignedEngineerId === meExec!.id || j.secondaryEngineerId === meExec!.id) : ex.jobs),
    [ex.jobs, mineOnly, meExec],
  );
  const myVisits = mineOnly ? ex.siteVisits.filter((v) => v.engineerIds.includes(meExec!.id)) : ex.siteVisits;
  const open = openId ? ex.jobs.find((j) => j.id === openId) : undefined;
  const newLead = () => setEditing({ job: { ...blankJob(myName), assignedEngineerId: meExec?.id ?? "" }, isNew: true });
  const newVisit = (t?: SiteVisitType) => setQuickVisit({ ...blankSiteVisit(today, meExec?.id ?? "", myName), ...(t ? { visitType: t } : {}) });
  const leadCount = visible.filter((j) => j.status === "lead" || j.status === "planning").length;
  const visitsMonth = myVisits.filter((v) => v.visitDate.slice(0, 7) === today.slice(0, 7)).length;

  const tabs: { v: Tab; label: string }[] = mineOnly
    ? [{ v: "overview", label: "My Work" }, { v: "visits", label: `📍 My Site Visits (${visitsMonth})` }, { v: "schedule", label: "My Schedule" }, { v: "jobs", label: `My Jobs (${visible.length})` }]
    : [
        { v: "overview", label: "Overview" },
        { v: "visits", label: `📍 Site Visits (${visitsMonth})` },
        { v: "leads", label: `Leads (${leadCount})` },
        { v: "schedule", label: "Schedule" },
        { v: "jobs", label: `All Jobs (${visible.length})` },
        ...(manager ? [{ v: "team" as Tab, label: "Execution Team" }] : []),
      ];

  return (
    <AppShell>
      <PageHeader
        title="Execution"
        subtitle="Demo installation, order execution and troubleshooting site work"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="solid" onClick={() => newVisit()}>📍 Record Site Visit</Button>
            <Button onClick={newLead}>+ New Execution Lead</Button>
          </div>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <button type="button" onClick={() => newVisit()} className="rounded-xl bg-signal p-4 text-left text-signal-foreground shadow-sm active:scale-[0.99]">
          <div className="text-base font-semibold">📍 Record Site Visit</div>
          <div className="mt-0.5 text-xs opacity-80">Factory inspection, sensor collection, pickup, meeting</div>
          <div className="mt-3 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
            {(["factory_inspection", "sensor_collection", "material_delivery"] as SiteVisitType[]).filter((t) => t in siteVisitTypeLabel).map((t) => (
              <span key={t} role="button" tabIndex={0} onClick={() => newVisit(t)} onKeyDown={(e) => e.key === "Enter" && newVisit(t)}
                className="rounded-full bg-signal-foreground/15 px-2.5 py-1 text-[11px] font-medium ring-1 ring-signal-foreground/30">{siteVisitTypeLabel[t]}</span>
            ))}
          </div>
        </button>
        <button type="button" onClick={newLead} className="rounded-xl bg-panel p-4 text-left ring-1 ring-line shadow-sm active:scale-[0.99]">
          <div className="text-base font-semibold text-ink">➕ New Execution Lead</div>
          <div className="mt-0.5 text-xs text-mute">New demo, order installation or troubleshooting job</div>
          <div className="mt-3 text-xs font-medium text-signal">{leadCount} open leads →</div>
        </button>
      </div>
      <div className="mb-4 overflow-x-auto"><Seg value={tab} options={tabs} onChange={setTab} /></div>

      {tab === "overview" ? (mineOnly ? <EngineerOverview jobs={visible} onOpen={setOpenId} /> : <ManagerOverview jobs={visible} onOpen={setOpenId} />) : null}
      {tab === "leads" ? <JobsList jobs={visible.filter((j) => j.status === "lead" || j.status === "planning")} onOpen={setOpenId} title="Leads" /> : null}
      {tab === "schedule" ? <ScheduleView jobs={visible} onOpen={setOpenId} /> : null}
      {tab === "jobs" ? <JobsPage jobs={visible} onOpen={setOpenId} /> : null}
      {tab === "visits" ? (
        <ExecSiteVisits data={data} manager={!mineOnly} meId={meExec?.id ?? ""} myName={myName} engineers={ex.engineers} jobs={visible}
          visits={myVisits} />
      ) : null}
      {tab === "team" && manager ? <TeamPanel /> : null}
      {quickVisit ? <VisitForm v={quickVisit} data={data} engineers={ex.engineers} jobs={visible} onClose={() => setQuickVisit(null)} /> : null}

      {editing ? (
        <JobForm
          job={editing.job}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onSave={async (j) => {
            try {
              await saveJob(j, editing.isNew ? undefined : ex.jobs.find((x) => x.id === j.id), myName);
              toast.success(editing.isNew ? "Lead created" : "Job saved");
              setEditing(null);
            } catch {
              toast.error("Could not save");
            }
          }}
        />
      ) : null}

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          {open ? (
            <JobDetail
              job={open}
              byUser={myName}
              canEdit={manager || !mineOnly || open.assignedEngineerId === meExec?.id || open.secondaryEngineerId === meExec?.id}
              onEdit={() => setEditing({ job: open, isNew: false })}
              onDelete={() => setOpenId(null)}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

// ---------- overview

function JobLine({ j, onOpen, extra, cta = "Open" }: { j: ExecJob; onOpen: (id: string) => void; extra?: ReactNode; cta?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line/60 px-4 py-2.5 text-sm first:border-t-0">
      <div className="min-w-0 flex-1">
        <div className="font-medium">{j.customerName || "—"}{j.plantName ? <span className="text-mute"> · {j.plantName}</span> : null}</div>
        <div className="text-xs text-mute">
          {installTypeLabel[j.installationType]} · <span className="num">{dateRange(j)}</span> · {execEngineerName(j.assignedEngineerId) || "Unassigned"}
          {extra ? <> · {extra}</> : null}
        </div>
      </div>
      <StatusBadge s={j.status} />
      <Button onClick={() => onOpen(j.id)}>{cta}</Button>
    </div>
  );
}

function ManagerOverview({ jobs, onOpen }: { jobs: ExecJob[]; onOpen: (id: string) => void }) {
  const month = todayIso().slice(0, 7);
  const count = (s: ExecStatus) => jobs.filter((j) => j.status === s).length;
  const doneMonth = jobs.filter((j) => j.status === "completed" && (j.completedAt ?? "").slice(0, 7) === month).length;
  const upcoming = jobs.filter((j) => j.status === "scheduled" || j.status === "planning").sort((a, b) => ((a.plannedStart ?? "9") < (b.plannedStart ?? "9") ? -1 : 1));
  const pending = jobs.filter((j) => j.status === "pending");
  const awaitingCustomer = pending.filter((j) => j.pendingReason === "Customer Confirmation Pending").length;
  const notClosed = jobs.filter((j) => j.status === "in_progress" && j.plannedEnd && j.plannedEnd < todayIso()).length;
  const aipPending = jobs.filter((j) => !closed(j.status) && j.status !== "lead" && j.installationType !== "troubleshooting" && j.aip === "no" && (j.status === "in_progress" || j.status === "pending")).length;
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="New leads" value={count("lead")} />
        <Kpi label="Scheduled" value={count("scheduled")} />
        <Kpi label="In progress" value={count("in_progress")} />
        <Kpi label="Pending" value={count("pending")} tone={count("pending") ? "medium" : "low"} />
        <Kpi label="Completed this month" value={doneMonth} tone="low" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Panel title={`Upcoming execution (${upcoming.length})`}>
          {upcoming.length ? upcoming.slice(0, 10).map((j) => <JobLine key={j.id} j={j} onOpen={onOpen} />) : <Empty>No upcoming jobs scheduled.</Empty>}
        </Panel>
        <Panel title="Needs attention">
          <div className="grid gap-2 p-4 text-sm">
            {[
              [pending.length, "Pending jobs"],
              [awaitingCustomer, "Awaiting customer"],
              [notClosed, "Execution past end date, not closed"],
              [aipPending, "AIP sheet pending"],
            ].map(([n, l]) => (
              <div key={l as string} className="flex items-center justify-between rounded-md px-3 py-2 ring-1 ring-line">
                <span>{l}</span>
                <span className={cn("num font-semibold", n ? "text-sev-high" : "text-sev-low")}>{n}</span>
              </div>
            ))}
          </div>
          {pending.map((j) => <JobLine key={j.id} j={j} onOpen={onOpen} extra={j.pendingReason || "No reason given"} />)}
        </Panel>
      </div>
    </div>
  );
}

function EngineerOverview({ jobs, onOpen }: { jobs: ExecJob[]; onOpen: (id: string) => void }) {
  const next = jobs.filter((j) => j.status === "scheduled" || j.status === "planning" || j.status === "lead").sort((a, b) => ((a.plannedStart ?? "9") < (b.plannedStart ?? "9") ? -1 : 1));
  const active = jobs.filter((j) => j.status === "in_progress");
  const pending = jobs.filter((j) => j.status === "pending" || j.status === "on_hold");
  const recent = jobs.filter((j) => j.status === "completed").sort((a, b) => ((a.completedAt ?? "") > (b.completedAt ?? "") ? -1 : 1)).slice(0, 5);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="My next execution">{next.length ? next.slice(0, 5).map((j) => <JobLine key={j.id} j={j} onOpen={onOpen} cta="Open Job" />) : <Empty>Nothing scheduled.</Empty>}</Panel>
      <Panel title="Current / active">{active.length ? active.map((j) => <JobLine key={j.id} j={j} onOpen={onOpen} cta="Continue" />) : <Empty>No job in progress.</Empty>}</Panel>
      <Panel title="My pending">{pending.length ? pending.map((j) => <JobLine key={j.id} j={j} onOpen={onOpen} extra={j.pendingReason} />) : <Empty>No pending jobs.</Empty>}</Panel>
      <Panel title="Recently completed">{recent.length ? recent.map((j) => <JobLine key={j.id} j={j} onOpen={onOpen} />) : <Empty>No completed jobs yet.</Empty>}</Panel>
    </div>
  );
}

// ---------- lists

function JobCards({ jobs, onOpen }: { jobs: ExecJob[]; onOpen: (id: string) => void }) {
  return (
    <div className="grid gap-2 p-3 md:hidden">
      {jobs.map((j) => (
        <button key={j.id} type="button" onClick={() => onOpen(j.id)} className="rounded-lg p-3 text-left ring-1 ring-line">
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold">{j.customerName || "—"}</div>
            <StatusBadge s={j.status} />
          </div>
          <div className="text-xs text-mute">{installTypeLabel[j.installationType]}{j.location ? ` · ${j.location}` : ""}</div>
          <div className="num mt-1 text-xs">{dateRange(j)}</div>
          <div className="mt-1 text-xs">Engineer: {execEngineerName(j.assignedEngineerId) || "Unassigned"}</div>
          <div className="mt-2 text-xs font-medium text-signal">Open Job →</div>
        </button>
      ))}
    </div>
  );
}

function JobsTable({ jobs, onOpen }: { jobs: ExecJob[]; onOpen: (id: string) => void }) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead>
          <tr><Th>Customer / Plant</Th><Th>Type</Th><Th>Location</Th><Th>Engineer</Th><Th>Planned</Th><Th>Actual</Th><Th align="right">Sensors</Th><Th align="right">Machines</Th><Th>Status</Th><Th>Action</Th></tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <Tr key={j.id}>
              <Td><div className="font-medium">{j.customerName}</div><div className="text-xs text-mute">{j.plantName}</div></Td>
              <Td>{installTypeLabel[j.installationType]}{j.priority === "high" ? <span className="ml-1 text-[10px] font-semibold text-sev-high">HIGH</span> : null}</Td>
              <Td>{j.location}</Td>
              <Td>{execEngineerName(j.assignedEngineerId) || "—"}{j.secondaryEngineerId ? <div className="text-xs text-mute">+ {execEngineerName(j.secondaryEngineerId)}</div> : null}</Td>
              <Td mono>{dateRange(j)}</Td>
              <Td mono>{j.actualStart ? dateRange({ plannedStart: j.actualStart, plannedEnd: j.actualEnd }) : "—"}</Td>
              <Td align="right" mono>{j.sensorsInstalled}</Td>
              <Td align="right" mono>{j.machinesCovered}</Td>
              <Td><StatusBadge s={j.status} /></Td>
              <Td><Button onClick={() => onOpen(j.id)}>Open</Button></Td>
            </Tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JobsList({ jobs, onOpen, title }: { jobs: ExecJob[]; onOpen: (id: string) => void; title: string }) {
  return (
    <Panel title={`${title} (${jobs.length})`}>
      {jobs.length ? <><JobsTable jobs={jobs} onOpen={onOpen} /><JobCards jobs={jobs} onOpen={onOpen} /></> : <Empty>Nothing here yet.</Empty>}
    </Panel>
  );
}

type QF = "all" | "lead" | "scheduled" | "in_progress" | "pending" | "completed";
function JobsPage({ jobs, onOpen }: { jobs: ExecJob[]; onOpen: (id: string) => void }) {
  const ex = useExecution();
  const [qf, setQf] = useState<QF>("all");
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [eng, setEng] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const list = jobs.filter((j) => {
    if (qf === "lead" && !(j.status === "lead" || j.status === "planning")) return false;
    if (qf === "pending" && !(j.status === "pending" || j.status === "on_hold")) return false;
    if (!["all", "lead", "pending"].includes(qf) && j.status !== qf) return false;
    if (type !== "all" && j.installationType !== type) return false;
    if (eng !== "all" && j.assignedEngineerId !== eng && j.secondaryEngineerId !== eng) return false;
    const d = j.plannedStart ?? j.expectedDate ?? "";
    if (from && d && d < from) return false;
    if (to && d && d > to) return false;
    const s = q.trim().toLowerCase();
    if (s && ![j.customerName, j.plantName, j.location, execEngineerName(j.assignedEngineerId)].join(" ").toLowerCase().includes(s)) return false;
    return true;
  });
  const n = (f: QF) => jobs.filter((j) => (f === "all" ? true : f === "lead" ? j.status === "lead" || j.status === "planning" : f === "pending" ? j.status === "pending" || j.status === "on_hold" : j.status === f)).length;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Seg value={qf} onChange={setQf} options={(["all", "lead", "scheduled", "in_progress", "pending", "completed"] as QF[]).map((v) => ({ v, label: `${v === "all" ? "All" : v === "lead" ? "Lead" : v === "pending" ? "Pending" : execStatusLabel[v as ExecStatus]} (${n(v)})` }))} />
      </div>
      <div className="grid gap-2 md:grid-cols-5">
        <TextInput placeholder="Search customer, plant, location, engineer" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">All types</option>
          {Object.entries(installTypeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select value={eng} onChange={(e) => setEng(e.target.value)}>
          <option value="all">All engineers</option>
          {ex.engineers.map((e) => <option key={e.id} value={e.id}>{e.name}{e.status === "inactive" ? " (inactive)" : ""}</option>)}
        </Select>
        <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <JobsList jobs={list} onOpen={onOpen} title="Jobs" />
    </div>
  );
}

function ScheduleView({ jobs, onOpen }: { jobs: ExecJob[]; onOpen: (id: string) => void }) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [month, setMonth] = useState(todayIso().slice(0, 7));
  const scheduled = jobs.filter((j) => j.plannedStart && !["cancelled"].includes(j.status)).sort((a, b) => (a.plannedStart! < b.plannedStart! ? -1 : 1));
  const [y = 2026, m = 1] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const days = new Date(y, m, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const shiftMonth = (d: number) => {
    const t = new Date(y, m - 1 + d, 1);
    setMonth(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`);
  };
  return (
    <Panel
      title="Schedule"
      meta={<Seg value={view} onChange={setView} options={[{ v: "list", label: "List View" }, { v: "calendar", label: "Calendar View" }]} />}
    >
      {view === "list" ? (
        scheduled.length ? scheduled.map((j) => <JobLine key={j.id} j={j} onOpen={onOpen} />) : <Empty>No scheduled jobs yet. Open a lead and set planned dates.</Empty>
      ) : (
        <div className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <Button variant="ghost" onClick={() => shiftMonth(-1)}>‹ Prev</Button>
            <span className="font-medium">{first.toLocaleString("en-GB", { month: "long", year: "numeric" })}</span>
            <Button variant="ghost" onClick={() => shiftMonth(1)}>Next ›</Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[11px]">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="label-caps text-center">{d}</div>)}
            {Array.from({ length: lead }, (_, i) => <div key={`b${i}`} />)}
            {Array.from({ length: days }, (_, i) => {
              const d = `${month}-${String(i + 1).padStart(2, "0")}`;
              const on = scheduled.filter((j) => j.plannedStart! <= d && (j.plannedEnd ?? j.plannedStart)! >= d);
              return (
                <div key={d} className={cn("min-h-16 rounded p-1 ring-1 ring-line/70", d === todayIso() && "ring-signal")}>
                  <div className="num text-mute">{i + 1}</div>
                  {on.map((j) => (
                    <button key={j.id} type="button" onClick={() => onOpen(j.id)} className={cn("mt-0.5 block w-full truncate rounded px-1 text-left ring-1", execStatusTone[j.status])}>
                      {j.customerName}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Panel>
  );
}

// ---------- lead / job form

function JobForm({ job, isNew, onClose, onSave }: { job: ExecJob; isNew: boolean; onClose: () => void; onSave: (j: ExecJob) => void }) {
  const data = useData();
  const ex = useExecution();
  const [j, setJ] = useState(job);
  const set = (p: Partial<ExecJob>) => setJ((x) => ({ ...x, ...p }));
  const active = ex.engineers.filter((e) => e.status === "active" || e.id === j.assignedEngineerId || e.id === j.secondaryEngineerId);
  const pickPlant = (id: string) => {
    const p = data.plants.find((x) => x.id === id);
    if (!p) { set({ plantId: "" }); return; }
    set({ plantId: id, customerName: p.customer, plantName: p.name, location: p.location, contactPerson: p.contact ?? "", contactNumber: p.contactPhone ?? "" });
  };
  const submit = () => {
    if (!j.customerName.trim()) { toast.error("Customer name is required"); return; }
    let status = j.status;
    if (status === "lead" && j.plannedStart && j.assignedEngineerId) status = "scheduled";
    onSave({ ...j, status, plannedEnd: j.plannedEnd || j.plannedStart });
  };
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader><SheetTitle>{isNew ? "New Execution Lead" : "Edit job"}</SheetTitle></SheetHeader>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Field label="Installation type">
            <Select value={j.installationType} onChange={(e) => set({ installationType: e.target.value as ExecJob["installationType"] })}>
              {Object.entries(installTypeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={j.priority} onChange={(e) => set({ priority: e.target.value as ExecJob["priority"] })}>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Existing plant (optional)" hint="Pick from Plants to fill customer details, or type them below for a new customer.">
              <Select value={j.plantId} onChange={(e) => pickPlant(e.target.value)}>
                <option value="">— New customer / manual entry —</option>
                {data.plants.map((p) => <option key={p.id} value={p.id}>{p.customer} · {p.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Customer name *"><TextInput value={j.customerName} onChange={(e) => set({ customerName: e.target.value })} /></Field>
          <Field label="Plant / site name"><TextInput value={j.plantName} onChange={(e) => set({ plantName: e.target.value })} /></Field>
          <Field label="Location"><TextInput value={j.location} onChange={(e) => set({ location: e.target.value })} /></Field>
          <Field label="Contact person"><TextInput value={j.contactPerson} onChange={(e) => set({ contactPerson: e.target.value })} /></Field>
          <Field label="Contact number"><TextInput type="tel" value={j.contactNumber} onChange={(e) => set({ contactNumber: e.target.value })} /></Field>
          <Field label="Email"><TextInput type="email" value={j.email} onChange={(e) => set({ email: e.target.value })} /></Field>
          <Field label="Expected execution date"><TextInput type="date" value={j.expectedDate ?? ""} onChange={(e) => set({ expectedDate: e.target.value || null })} /></Field>
          <Field label="Status">
            <Select value={j.status} onChange={(e) => set({ status: e.target.value as ExecStatus })}>
              {Object.entries(execStatusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Assigned engineer">
            <Select value={j.assignedEngineerId} onChange={(e) => set({ assignedEngineerId: e.target.value })}>
              <option value="">— Unassigned —</option>
              {active.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
          </Field>
          <Field label="Second engineer (optional)">
            <Select value={j.secondaryEngineerId} onChange={(e) => set({ secondaryEngineerId: e.target.value })}>
              <option value="">— None —</option>
              {active.filter((e) => e.id !== j.assignedEngineerId).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
          </Field>
          <Field label="Planned start"><TextInput type="date" value={j.plannedStart ?? ""} onChange={(e) => set({ plannedStart: e.target.value || null })} /></Field>
          <Field label="Planned end"><TextInput type="date" value={j.plannedEnd ?? ""} onChange={(e) => set({ plannedEnd: e.target.value || null })} /></Field>
          <div className="sm:col-span-2"><Field label="Lead notes"><TextArea rows={2} value={j.notes} onChange={(e) => set({ notes: e.target.value })} /></Field></div>
          <div className="sm:col-span-2"><Field label="Schedule notes"><TextArea rows={2} value={j.scheduleNotes} onChange={(e) => set({ scheduleNotes: e.target.value })} /></Field></div>
          {!ex.engineers.length ? <p className="text-xs text-sev-medium sm:col-span-2">No execution engineers yet — the manager can add them under Execution Team.</p> : null}
          <div className="flex gap-2 sm:col-span-2">
            <Button variant="solid" onClick={submit}>{isNew ? "Create lead" : "Save"}</Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------- detail

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-line/70 pt-3">
      <div className="label-caps mb-2">{title}</div>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return <div><div className="text-[11px] text-mute">{label}</div><div className="text-sm">{value || "—"}</div></div>;
}

function JobDetail({ job, byUser, canEdit, onEdit, onDelete }: { job: ExecJob; byUser: string; canEdit: boolean; onEdit: () => void; onDelete: () => void }) {
  useExecution();
  const [j, setJ] = useState(job);
  const [confirm, setConfirm] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [upd, setUpd] = useState({ workDate: todayIso(), remark: "", workCompleted: "", pendingNextAction: "", attachmentLink: "" });
  const [comment, setComment] = useState("");
  const [link, setLink] = useState({ label: "", url: "" });
  const set = (p: Partial<ExecJob>) => setJ((x) => ({ ...x, ...p }));
  const persist = async (next: ExecJob, msg = "Saved") => {
    try {
      await saveJob(next, job, byUser);
      setJ(next);
      toast.success(msg);
    } catch {
      toast.error("Could not save");
    }
  };
  const updates = updatesFor(job.id);
  const history = activityFor(job.id);
  const safeUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);
  const yn = (v: YesNoNa, on: (v: YesNoNa) => void) => (
    <Seg value={v} onChange={(x) => canEdit && on(x)} options={(["yes", "no", "na"] as YesNoNa[]).map((x) => ({ v: x, label: yesNoNaLabel[x] }))} />
  );

  return (
    <div className="grid gap-4 pb-10 text-sm">
      <SheetHeader>
        <SheetTitle>{job.customerName}{job.plantName ? ` · ${job.plantName}` : ""}</SheetTitle>
      </SheetHeader>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{installTypeLabel[job.installationType]} {job.installationType === "troubleshooting" ? "" : "Installation"}</span>
        <StatusBadge s={job.status} />
        {job.priority === "high" ? <span className="text-xs font-semibold text-sev-high">High priority</span> : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Info label="Assigned" value={[execEngineerName(job.assignedEngineerId), execEngineerName(job.secondaryEngineerId)].filter(Boolean).join(" + ")} />
        <Info label="Expected" value={fmtDate(iso(job.expectedDate))} />
      </div>
      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={onEdit}>Edit details / schedule</Button>
          {["lead", "planning", "scheduled", "pending", "on_hold"].includes(job.status) ? (
            <Button variant="solid" onClick={() => void persist({ ...j, status: "in_progress", actualStart: j.actualStart ?? todayIso() }, "Job started")}>Start Job</Button>
          ) : null}
          {job.status === "completed" || job.status === "cancelled" ? (
            <Button onClick={() => void persist({ ...j, status: "in_progress", completedAt: null, completedBy: "" }, "Job reopened")}>Reopen</Button>
          ) : null}
          {confirmDel ? (
            <>
              <Button
                variant="solid"
                className="bg-sev-high text-white ring-sev-high/40 hover:bg-sev-high/90"
                onClick={() => {
                  void (async () => {
                    try {
                      await deleteJob(job.id);
                      toast.success("Job deleted");
                      onDelete();
                    } catch {
                      toast.error("Could not delete");
                      setConfirmDel(false);
                    }
                  })();
                }}
              >
                Confirm delete
              </Button>
              <Button onClick={() => setConfirmDel(false)}>Cancel</Button>
            </>
          ) : (
            <Button className="text-sev-high ring-sev-high/40 hover:bg-sev-high/10" onClick={() => setConfirmDel(true)}>Delete job</Button>
          )}
        </div>
      ) : null}

      <Section title="Customer details">
        <div className="grid grid-cols-2 gap-3">
          <Info label="Customer" value={job.customerName} />
          <Info label="Plant / site" value={job.plantName} />
          <Info label="Location" value={job.location} />
          <Info label="Contact" value={job.contactPerson} />
          <Info label="Number" value={job.contactNumber ? <a className="text-signal" href={`tel:${job.contactNumber}`}>{job.contactNumber}</a> : ""} />
          <Info label="Email" value={job.email} />
        </div>
      </Section>

      <Section title="Schedule">
        <div className="grid grid-cols-2 gap-3">
          <Info label="Planned" value={dateRange(job)} />
          <Info label="Actual" value={job.actualStart ? dateRange({ plannedStart: job.actualStart, plannedEnd: job.actualEnd }) : ""} />
          <div className="col-span-2"><Info label="Notes" value={[job.notes, job.scheduleNotes].filter(Boolean).join(" · ")} /></div>
        </div>
      </Section>

      <Section title={`Daily work updates (${updates.length})`}>
        <ol className="grid gap-2">
          {updates.map((u) => (
            <li key={u.id} className="rounded-md p-2.5 ring-1 ring-line">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="num font-semibold">{fmtDate(u.workDate)}</span>
                <span className="text-mute">{u.createdBy}</span>
              </div>
              <div className="mt-1 whitespace-pre-wrap">{u.remark}</div>
              {u.workCompleted ? <div className="mt-1 text-xs"><span className="text-mute">Done: </span>{u.workCompleted}</div> : null}
              {u.pendingNextAction ? <div className="text-xs"><span className="text-mute">Next: </span>{u.pendingNextAction}</div> : null}
              {u.attachmentLink ? <a className="text-xs text-signal" href={safeUrl(u.attachmentLink)} target="_blank" rel="noopener noreferrer">Attachment link</a> : null}
              {canEdit && u.createdBy === byUser ? <button type="button" className="ml-2 text-xs text-mute" onClick={() => void deleteDailyUpdate(u.id)}>Delete</button> : null}
            </li>
          ))}
        </ol>
        {canEdit ? (
          <div className="mt-2 grid gap-2 rounded-md p-2.5 ring-1 ring-line sm:grid-cols-2">
            <Field label="Date"><TextInput type="date" value={upd.workDate} onChange={(e) => setUpd({ ...upd, workDate: e.target.value })} /></Field>
            <Field label="Attachment link (optional)"><TextInput placeholder="Drive / SharePoint link" value={upd.attachmentLink} onChange={(e) => setUpd({ ...upd, attachmentLink: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Work remark *"><TextArea rows={2} value={upd.remark} onChange={(e) => setUpd({ ...upd, remark: e.target.value })} /></Field></div>
            <Field label="Work completed today"><TextInput value={upd.workCompleted} onChange={(e) => setUpd({ ...upd, workCompleted: e.target.value })} /></Field>
            <Field label="Pending / next action"><TextInput value={upd.pendingNextAction} onChange={(e) => setUpd({ ...upd, pendingNextAction: e.target.value })} /></Field>
            <div className="sm:col-span-2">
              <Button
                variant="solid"
                onClick={async () => {
                  if (!upd.remark.trim()) { toast.error("Add a short work remark"); return; }
                  try {
                    await addDailyUpdate({ ...upd, jobId: job.id, createdBy: byUser }, byUser);
                    setUpd({ workDate: todayIso(), remark: "", workCompleted: "", pendingNextAction: "", attachmentLink: "" });
                    toast.success("Daily update added");
                  } catch {
                    toast.error("Could not add update");
                  }
                }}
              >
                + Add Daily Update
              </Button>
            </div>
          </div>
        ) : null}
      </Section>

      <Section title="Installation summary">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Sensors installed"><TextInput disabled={!canEdit} type="number" min={0} value={j.sensorsInstalled} onChange={(e) => set({ sensorsInstalled: Math.max(0, Number(e.target.value) || 0) })} /></Field>
          <Field label="Machines covered"><TextInput disabled={!canEdit} type="number" min={0} value={j.machinesCovered} onChange={(e) => set({ machinesCovered: Math.max(0, Number(e.target.value) || 0) })} /></Field>
          <Field label="Actual start"><TextInput disabled={!canEdit} type="date" value={j.actualStart ?? ""} onChange={(e) => set({ actualStart: e.target.value || null })} /></Field>
          <Field label="Actual end"><TextInput disabled={!canEdit} type="date" value={j.actualEnd ?? ""} onChange={(e) => set({ actualEnd: e.target.value || null })} /></Field>
          <div className="col-span-2"><Field label="Report link"><TextInput disabled={!canEdit} placeholder="URL / Google Drive / SharePoint" value={j.reportLink} onChange={(e) => set({ reportLink: e.target.value })} /></Field></div>
          {j.reportLink ? <a className="col-span-2 inline-flex w-fit items-center gap-1 text-signal" href={safeUrl(j.reportLink)} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-3.5" /> Open Report</a> : null}
          <div className="col-span-2"><Field label="Additional comments"><TextArea disabled={!canEdit} rows={2} value={j.comments} onChange={(e) => set({ comments: e.target.value })} /></Field></div>
        </div>
      </Section>

      <Section title="Completion checklist">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2"><span>Kickoff meeting completed?</span>{yn(j.kickoff, (v) => set({ kickoff: v }))}</div>
          <div className="flex flex-wrap items-center justify-between gap-2"><span>Machine sensor configuration completed?</span>{yn(j.configuration, (v) => set({ configuration: v }))}</div>
          <div className="flex flex-wrap items-center justify-between gap-2"><span>AIP sheet generated?</span>{yn(j.aip, (v) => set({ aip: v }))}</div>
        </div>
      </Section>

      {j.installationType === "demo" ? (
        <Section title="Demo removal / retrieval">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Removal planned date"><TextInput disabled={!canEdit} type="date" value={j.removalPlanned ?? ""} onChange={(e) => set({ removalPlanned: e.target.value || null })} /></Field>
            <Field label="Sensors removed"><TextInput disabled={!canEdit} type="number" min={0} value={j.sensorsRemoved} onChange={(e) => set({ sensorsRemoved: Math.max(0, Number(e.target.value) || 0) })} /></Field>
            <Field label="Removal completed date"><TextInput disabled={!canEdit} type="date" value={j.removalCompleted ?? ""} onChange={(e) => set({ removalCompleted: e.target.value || null })} /></Field>
            <div className="flex items-end">
              {canEdit && !j.removalCompleted ? (
                <Button onClick={() => void persist({ ...j, removalCompleted: todayIso() }, "Demo removal marked done")}>Mark removal done today</Button>
              ) : null}
            </div>
            <div className="col-span-2"><Field label="Hardware condition / retrieval notes"><TextArea disabled={!canEdit} rows={2} placeholder="Sensor & gateway condition, missing items, packing details" value={j.removalNotes} onChange={(e) => set({ removalNotes: e.target.value })} /></Field></div>
          </div>
        </Section>
      ) : null}

      {canEdit ? (
        <Section title="Job status">
          <div className="grid gap-2">
            <Seg
              value={(["pending", "completed", "on_hold"].includes(j.status) ? j.status : "in_progress") as ExecStatus}
              onChange={(s) => (s === "completed" ? setConfirm(true) : set({ status: s }))}
              options={[{ v: "in_progress" as ExecStatus, label: "In Progress" }, { v: "pending", label: "Pending" }, { v: "on_hold", label: "On Hold" }, { v: "completed", label: "Completed" }]}
            />
            {j.status === "pending" || j.status === "on_hold" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Pending reason">
                  <Select value={j.pendingReason} onChange={(e) => set({ pendingReason: e.target.value })}>
                    <option value="">— Select —</option>
                    {pendingReasons.map((r) => <option key={r} value={r}>{r}</option>)}
                  </Select>
                </Field>
                <Field label="Next planned date"><TextInput type="date" value={j.nextPlannedDate ?? ""} onChange={(e) => set({ nextPlannedDate: e.target.value || null })} /></Field>
                <div className="sm:col-span-2"><Field label="Pending remark"><TextArea rows={2} value={j.pendingRemark} onChange={(e) => set({ pendingRemark: e.target.value })} /></Field></div>
              </div>
            ) : null}
            <div><Button variant="solid" onClick={() => void persist(j)}>Save job updates</Button></div>
          </div>
        </Section>
      ) : null}

      {confirm ? (
        <div className="grid gap-2 rounded-lg p-3 ring-2 ring-signal">
          <div className="font-semibold">Confirm job completion</div>
          <div className="grid grid-cols-2 gap-2">
            <Info label="Customer" value={j.customerName} />
            <Info label="Installation type" value={installTypeLabel[j.installationType]} />
            <Info label="Visit dates" value={j.actualStart ? dateRange({ plannedStart: j.actualStart, plannedEnd: j.actualEnd ?? todayIso() }) : dateRange(j)} />
            <Info label="Sensors / machines" value={`${j.sensorsInstalled} / ${j.machinesCovered}`} />
            <Info label="Kickoff" value={yesNoNaLabel[j.kickoff]} />
            <Info label="Configuration" value={yesNoNaLabel[j.configuration]} />
            <Info label="AIP sheet" value={yesNoNaLabel[j.aip]} />
            {j.installationType === "demo" ? <Info label="Sensors removed" value={`${j.sensorsRemoved}${j.removalCompleted ? ` on ${fmtDate(j.removalCompleted)}` : " (removal pending)"}`} /> : null}
            <Info label="Report link" value={j.reportLink} />
            <div className="col-span-2"><Info label="Comments" value={j.comments} /></div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="solid"
              onClick={() => {
                setConfirm(false);
                void persist({ ...j, status: "completed", actualEnd: j.actualEnd ?? todayIso(), completedAt: new Date().toISOString(), completedBy: byUser }, "Job completed");
              }}
            >
              Confirm Job Completion
            </Button>
            <Button variant="ghost" onClick={() => setConfirm(false)}>Back</Button>
          </div>
        </div>
      ) : null}
      {job.completedAt ? <div className="text-xs text-mute">Completed {fmtDate(job.completedAt.slice(0, 10))} by {job.completedBy}</div> : null}

      <Section title="Documents / links">
        {j.links.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <a className="text-signal" href={safeUrl(l.url)} target="_blank" rel="noopener noreferrer">{l.label || l.url}</a>
            {canEdit ? <button type="button" className="text-xs text-mute" onClick={() => void persist({ ...j, links: j.links.filter((_, k) => k !== i) }, "Link removed")}>Remove</button> : null}
          </div>
        ))}
        {canEdit ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <TextInput className="max-w-40" placeholder="Label (e.g. AIP sheet)" value={link.label} onChange={(e) => setLink({ ...link, label: e.target.value })} />
            <TextInput placeholder="Link to photo, AIP sheet, document" value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} />
            <Button onClick={() => { if (!link.url.trim()) return; void persist({ ...j, links: [...j.links, { label: link.label.trim(), url: link.url.trim() }] }, "Link added"); setLink({ label: "", url: "" }); }}>Add</Button>
          </div>
        ) : null}
      </Section>

      <Section title="Comments">
        {history.filter((h) => h.kind === "comment").map((c) => (
          <div key={c.id} className="mb-1.5"><span className="font-medium">{c.byUser}</span> <span className="text-xs text-mute">{new Date(c.createdAt).toLocaleString("en-GB")}</span><div>{c.text}</div></div>
        ))}
        <div className="flex gap-2">
          <TextInput placeholder="Add a comment" value={comment} onChange={(e) => setComment(e.target.value)} />
          <Button onClick={() => { if (!comment.trim()) return; void addComment(job.id, comment.trim(), byUser); setComment(""); }}>Post</Button>
        </div>
      </Section>

      <Section title="Activity history">
        <ul className="grid gap-1 text-xs">
          {history.filter((h) => h.kind === "system").map((h) => (
            <li key={h.id}><span className="num text-mute">{new Date(h.createdAt).toLocaleString("en-GB")}</span> — {h.text}{h.byUser ? ` by ${h.byUser}` : ""}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

// ---------- team settings

function TeamPanel() {
  const data = useData();
  const ex = useExecution();
  const [edit, setEdit] = useState<ExecEngineer | null>(null);
  const [reassign, setReassign] = useState<{ from: ExecEngineer; to: string } | null>(null);
  const blank = (): ExecEngineer => ({ id: crypto.randomUUID(), name: "", employeeId: "", email: "", mobile: "", branch: "", role: "engineer", status: "active", linkedUserId: "" });
  const openCount = (id: string) => ex.jobs.filter((j) => !closed(j.status) && (j.assignedEngineerId === id || j.secondaryEngineerId === id)).length;
  const save = async (e: ExecEngineer) => {
    if (!e.name.trim()) { toast.error("Name is required"); return; }
    try {
      await saveEngineer({ ...e, name: e.name.trim() });
      toast.success("Engineer saved");
      setEdit(null);
    } catch {
      toast.error("Could not save engineer");
    }
  };
  return (
    <Panel title={`Execution Team (${ex.engineers.length})`} meta={<Button variant="solid" onClick={() => setEdit(blank())}>+ Add Engineer</Button>}>
      {ex.engineers.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><Th>Name</Th><Th>Role</Th><Th>Contact</Th><Th>Branch</Th><Th align="right">Open jobs</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
            <tbody>
              {ex.engineers.map((e) => (
                <Tr key={e.id}>
                  <Td><div className="font-medium">{e.name}</div>{e.employeeId ? <div className="text-xs text-mute">{e.employeeId}</div> : null}</Td>
                  <Td>{e.role === "manager" ? "Execution Manager" : "Execution Engineer"}</Td>
                  <Td><div>{e.email}</div><div className="text-xs text-mute">{e.mobile}</div></Td>
                  <Td>{e.branch}</Td>
                  <Td align="right" mono>{openCount(e.id)}</Td>
                  <Td><span className={cn("rounded-full px-2 py-0.5 text-[11px] ring-1", e.status === "active" ? "text-sev-low ring-sev-low/40" : "text-mute ring-line")}>{e.status === "active" ? "Active" : "Inactive"}</span></Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      <Button onClick={() => setEdit(e)}>Edit</Button>
                      {openCount(e.id) ? <Button onClick={() => setReassign({ from: e, to: "" })}>Reassign</Button> : null}
                      {e.status === "active" ? (
                        <Button variant="ghost" onClick={() => { if (window.confirm("Deactivate this engineer?\nHistorical execution records will remain available.")) void saveEngineer({ ...e, status: "inactive" }); }}>Deactivate</Button>
                      ) : (
                        <Button variant="ghost" onClick={() => void saveEngineer({ ...e, status: "active" })}>Activate</Button>
                      )}
                      <Button variant="ghost" className="text-sev-high" onClick={() => {
                        if (openCount(e.id)) { toast.error("Reassign their open jobs before deleting"); setReassign({ from: e, to: "" }); return; }
                        if (window.confirm(`Delete ${e.name} from the Execution Team?\nTheir historical job records will remain available.`)) {
                          void deleteEngineer(e.id).then(() => toast.success("Engineer deleted")).catch(() => toast.error("Could not delete engineer"));
                        }
                      }}><Trash2 size={14} /></Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No execution engineers yet. Add your first one.</Empty>
      )}

      {edit ? (
        <Sheet open onOpenChange={(o) => !o && setEdit(null)}>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader><SheetTitle>{ex.engineers.some((x) => x.id === edit.id) ? "Edit engineer" : "Add engineer"}</SheetTitle></SheetHeader>
            <div className="mt-4 grid gap-3">
              <Field label="Name *"><TextInput value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Employee ID (optional)"><TextInput value={edit.employeeId} onChange={(e) => setEdit({ ...edit, employeeId: e.target.value })} /></Field>
              <Field label="Email"><TextInput type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field>
              <Field label="Mobile"><TextInput type="tel" value={edit.mobile} onChange={(e) => setEdit({ ...edit, mobile: e.target.value })} /></Field>
              <Field label="Branch / location (optional)"><TextInput value={edit.branch} onChange={(e) => setEdit({ ...edit, branch: e.target.value })} /></Field>
              <Field label="Role">
                <Select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as ExecEngineer["role"] })}>
                  <option value="engineer">Execution Engineer</option>
                  <option value="manager">Execution Manager</option>
                </Select>
              </Field>
              <Field label="Portal login (optional)" hint="Link to a portal user so they automatically see only their own jobs.">
                <Select value={edit.linkedUserId} onChange={(e) => setEdit({ ...edit, linkedUserId: e.target.value })}>
                  <option value="">— Not linked —</option>
                  {data.engineers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Select>
              </Field>
              <div className="flex gap-2"><Button variant="solid" onClick={() => void save(edit)}>Save</Button><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button></div>
            </div>
          </SheetContent>
        </Sheet>
      ) : null}

      {reassign ? (
        <div className="m-4 grid gap-2 rounded-md p-3 ring-1 ring-signal">
          <div>Move {openCount(reassign.from.id)} open job(s) from <b>{reassign.from.name}</b> to:</div>
          <Select value={reassign.to} onChange={(e) => setReassign({ ...reassign, to: e.target.value })}>
            <option value="">— Select engineer —</option>
            {ex.engineers.filter((e) => e.status === "active" && e.id !== reassign.from.id).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
          <div className="flex gap-2">
            <Button variant="solid" disabled={!reassign.to} onClick={async () => { await reassignJobs(reassign.from.id, reassign.to); toast.success("Jobs reassigned"); setReassign(null); }}>Reassign</Button>
            <Button variant="ghost" onClick={() => setReassign(null)}>Cancel</Button>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
