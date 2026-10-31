import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { ExternalLink, MapPin, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { peekDomain } from "@/lib/domain";
import { AppShell } from "@/components/console/AppShell";
import { ExecSiteVisits, VisitForm } from "@/components/console/ExecSiteVisits";
import { Button, Empty, Field, Kpi, Panel, PageHeader, Select, TextArea, TextInput, Td, Th, Tr } from "@/components/console/ui";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { currentUser, fmtDate, todayIso, useData } from "@/lib/store";
import {
  activityFor,
  addComment,
  addDailyUpdate,
  blankJob,
  blankSiteVisit,
  type ExecSiteVisit,
  type SiteVisitType,
  dateRange,
  deleteDailyUpdate,
  deleteEngineer,
  deleteJob,
  execEngineerName,
  execStatusLabel,
  execStatusTone,
  installTypeLabel,
  jobEngineerIds,
  onJob,
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
import { execScope } from "@/lib/access";
import { attentionItems, filterToday, focusJobs, isOverdue, isReadyToClose, jobBucket, jobTone, mapsUrl, needsRemark, type JobBucket, type TodayFilter } from "@/lib/exec-today";
/** Name of anyone who can be on a job: execution engineer, customer success engineer or manager. */
function personName(id: string) {
  if (!id) return "";
  return execEngineerName(id) || portalPeople().find((p) => p.id === id)?.name || "";
}
let portalCache: { id: string; name: string; role: string }[] = [];
const portalPeople = () => portalCache;
const teamLabel = (j: ExecJob) => jobEngineerIds(j).map(personName).filter(Boolean).join(" + ");
const lastUpdateOf = (id: string) => updatesFor(id).map((u) => u.workDate).sort().pop();

export const Route = createFileRoute("/_authenticated/execution")({
  validateSearch: (s: Record<string, unknown>): { add?: "visit" | "lead" } => (s["add"] === "visit" || s["add"] === "lead" ? { add: s["add"] as "visit" | "lead" } : {}),
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

function StatusBadge({ s, j }: { s: ExecStatus; j?: ExecJob }) {
  if (j && isReadyToClose(j)) return <span className="whitespace-nowrap rounded-full bg-signal/10 px-2 py-0.5 text-[11px] font-medium text-signal ring-1 ring-signal/40">Ready to Close</span>;
  if (j && isOverdue(j, todayIso()) && s !== "pending") return <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium text-sev-high ring-1 ring-sev-high/40">Overdue</span>;
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
  portalCache = data.engineers.map((e) => ({ id: e.id, name: e.name, role: e.role }));
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
  const [todayF, setTodayF] = useState<TodayFilter | null>(null);
  const [preset, setPreset] = useState<{ title: string; jobs: ExecJob[] } | null>(null);
  const showList = (title: string, jobs: ExecJob[]) => { setTodayF(null); setPreset({ title, jobs }); };

  const { visible, myVisits, leadCount, visitsMonth } = useMemo(
    () => execScope(ex.jobs, ex.siteVisits, mineOnly ? meExec!.id : null, today),
    [ex.jobs, ex.siteVisits, mineOnly, meExec, today],
  );
  const open = openId ? ex.jobs.find((j) => j.id === openId) : undefined;
  const newLead = () => setEditing({ job: { ...blankJob(myName), assignedEngineerId: meExec?.id ?? "" }, isNew: true });
  const newVisit = (t?: SiteVisitType) => setQuickVisit({ ...blankSiteVisit(today, meExec?.id ?? "", myName), ...(t ? { visitType: t } : {}) });

  const tabs: { v: Tab; label: string }[] = mineOnly
    ? [{ v: "overview", label: "My Work" }, { v: "schedule", label: "Schedule" }, { v: "visits", label: `Site Visits (${visitsMonth})` }, { v: "jobs", label: `Jobs (${visible.length})` }]
    : [
        { v: "overview", label: "Overview" },
        { v: "jobs", label: `Jobs (${visible.length})` },
        { v: "schedule", label: "Schedule" },
        { v: "visits", label: `Site Visits (${visitsMonth})` },
        { v: "leads", label: `Leads (${leadCount})` },
        ...(manager ? [{ v: "team" as Tab, label: "Team" }] : []),
      ];

  return (
    <AppShell>
      <PageHeader
        title="Execution"
        subtitle="Demo installation, order execution and troubleshooting site work"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="solid" onClick={() => newVisit()}>+ Record Site Visit</Button>
            {!mineOnly ? <Button onClick={newLead}>+ New Execution Lead</Button> : null}
          </div>
        }
      />
      {tab !== "overview" ? <TodayStrip jobs={visible} visitsToday={myVisits.filter((v) => v.visitDate === today).length} value={todayF}
        onChange={(f) => { if (f === "visits") { setTab("visits"); setTodayF(null); } else { setPreset(null); setTodayF(f); } }} /> : null}
      <div className="-mx-1 mb-4 overflow-x-auto px-1"><div className="w-max"><Seg value={tab} options={tabs} onChange={(t) => { setTab(t); setTodayF(null); setPreset(null); }} /></div></div>

      {preset ? (
        <div className="grid gap-2">
          <div><Button variant="ghost" onClick={() => setPreset(null)}>‹ Back</Button></div>
          <JobsList jobs={preset.jobs} onOpen={setOpenId} title={preset.title} />
        </div>
      ) : todayF ? (
        <JobsList jobs={filterToday(visible, todayF, today)} onOpen={setOpenId}
          title={todayF === "active" ? "Active jobs" : todayF === "due" ? "Due today" : "Overdue"} />
      ) : (
      <>
      {tab === "overview" ? (mineOnly ? <EngineerOverview jobs={visible} onOpen={setOpenId} onList={showList} /> : <ManagerOverview jobs={visible} onOpen={setOpenId} onList={showList} onNew={newLead} />) : null}
      {tab === "leads" && !mineOnly ? <JobsList jobs={visible.filter((j) => j.status === "lead" || j.status === "planning")} onOpen={setOpenId} title="Leads" /> : null}
      {tab === "schedule" ? <ScheduleView jobs={visible} onOpen={setOpenId} /> : null}
      {tab === "jobs" ? <JobsPage jobs={visible} onOpen={setOpenId} manager={!mineOnly} /> : null}
      {tab === "visits" ? (
        <ExecSiteVisits data={data} manager={!mineOnly} meId={meExec?.id ?? ""} myName={myName} engineers={ex.engineers} jobs={visible}
          visits={myVisits} />
      ) : null}
      {tab === "team" && manager ? <TeamPanel /> : null}
      </>
      )}
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
              canEdit={manager || !mineOnly || onJob(open, meExec?.id ?? "")}
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
      <StatusBadge s={j.status} j={j} />
      <Button onClick={() => onOpen(j.id)}>{cta}</Button>
    </div>
  );
}

const frac = (a: number, b: number) => (b > 0 ? `${a} / ${b}` : `${a}`);
const progress = (j: ExecJob) => <span className="num">{frac(j.sensorsInstalled, j.plannedSensors)} sensors · {frac(j.machinesCovered, j.plannedMachines)} machines</span>;

function KpiBtn({ label, n, tone, onClick }: { label: string; n: number; tone?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg bg-card px-3 py-2.5 text-left ring-1 ring-line transition hover:ring-signal">
      <div className={cn("num text-2xl font-semibold leading-none", n ? tone : "text-mute")}>{n}</div>
      <div className="mt-1 text-xs text-mute">{label}</div>
    </button>
  );
}

function AttentionPanel({ jobs, onList, title }: { jobs: ExecJob[]; onList: (t: string, j: ExecJob[]) => void; title: string }) {
  const items = attentionItems(jobs, lastUpdateOf, todayIso());
  return (
    <Panel title={title}>
      <div className="grid gap-1.5 p-3 text-sm">
        {items.length ? items.map((i) => (
          <button key={i.key} type="button" onClick={() => onList(i.label, i.jobs)} className="flex items-center justify-between rounded-md px-3 py-2 text-left ring-1 ring-line hover:ring-signal">
            <span>{i.label}</span>
            <span className={cn("num font-semibold", i.tone === "high" ? "text-sev-high" : "text-sev-medium")}>{i.jobs.length}</span>
          </button>
        )) : <div className="px-1 py-2 text-mute">Nothing needs attention. ✓</div>}
      </div>
    </Panel>
  );
}

function bucketList(jobs: ExecJob[], b: JobBucket) { return jobs.filter((j) => jobBucket(j) === b); }

function ManagerOverview({ jobs, onOpen, onList, onNew }: { jobs: ExecJob[]; onOpen: (id: string) => void; onList: (t: string, j: ExecJob[]) => void; onNew: () => void }) {
  const ex = useExecution();
  const today = todayIso();
  const focus = focusJobs(jobs);
  const overdue = jobs.filter((j) => isOverdue(j, today));
  const recentDone = jobs.filter((j) => j.status === "completed").sort((a, b) => ((a.completedAt ?? "") > (b.completedAt ?? "") ? -1 : 1)).slice(0, 4);
  const team = ex.engineers.filter((e) => e.status === "active").map((e) => {
    const cur = jobs.find((j) => j.status === "in_progress" && onJob(j, e.id));
    return { e, cur };
  });
  const k = (label: string, b: JobBucket, tone: string) => { const l = bucketList(jobs, b); return <KpiBtn key={b} label={label} n={l.length} tone={tone} onClick={() => onList(label, l)} />; };
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {k("Scheduled", "scheduled", "text-signal")}
        {k("In Progress", "in_progress", "text-signal")}
        {k("Pending / Blocked", "pending", "text-sev-medium")}
        {k("Ready to Close", "ready", "text-signal")}
        <KpiBtn label="Overdue" n={overdue.length} tone="text-sev-high" onClick={() => onList("Overdue", overdue)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Panel title="Current / upcoming execution">
          {focus.length ? focus.map((j) => <JobLine key={j.id} j={j} onOpen={onOpen} extra={j.status === "in_progress" ? progress(j) : undefined} />) : (
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm text-mute">
              No upcoming execution scheduled.
              <Button onClick={onNew}>+ New Execution Lead</Button>
            </div>
          )}
        </Panel>
        <AttentionPanel jobs={jobs} onList={onList} title="Needs attention" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Execution team today">
          {team.length ? team.map(({ e, cur }) => (
            <div key={e.id} className="flex items-center justify-between gap-2 border-t border-line/60 px-4 py-2 text-sm first:border-t-0">
              <span className="font-medium">{e.name}</span>
              {cur ? <button type="button" className="truncate text-signal" onClick={() => onOpen(cur.id)}>{cur.plantName || cur.customerName}</button> : <span className="text-mute">No active job</span>}
            </div>
          )) : <Empty>No active engineers.</Empty>}
        </Panel>
        <Panel title="Recently completed">
          {recentDone.length ? recentDone.map((j) => <JobLine key={j.id} j={j} onOpen={onOpen} cta="View" />) : <Empty>No completed jobs yet.</Empty>}
        </Panel>
      </div>
    </div>
  );
}

function EngineerOverview({ jobs, onOpen, onList }: { jobs: ExecJob[]; onOpen: (id: string) => void; onList: (t: string, j: ExecJob[]) => void }) {
  const today = todayIso();
  const todays = jobs.filter((j) => !closed(j.status) && j.plannedStart && j.plannedStart <= today && (j.plannedEnd ?? j.plannedStart) >= today);
  const upcoming = jobs.filter((j) => (j.status === "scheduled" || j.status === "planning") && (j.plannedStart ?? "9") > today).sort((a, b) => ((a.plannedStart ?? "9") < (b.plannedStart ?? "9") ? -1 : 1));
  const active = jobs.filter((j) => j.status === "in_progress");
  const pending = jobs.filter((j) => j.status === "pending" || j.status === "on_hold");
  const current = active[0];
  const next = current ? undefined : focusJobs(jobs, 1)[0];
  const lead = current ?? next;
  const recent = jobs.flatMap((j) => updatesFor(j.id).map((u) => ({ u, j }))).sort((a, b) => (a.u.workDate > b.u.workDate ? -1 : 1)).slice(0, 5);
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-4 gap-2">
        <KpiBtn label="Today" n={todays.length} tone="text-signal" onClick={() => onList("Today", todays)} />
        <KpiBtn label="Upcoming" n={upcoming.length} tone="text-signal" onClick={() => onList("Upcoming", upcoming)} />
        <KpiBtn label="In Progress" n={active.length} tone="text-signal" onClick={() => onList("In Progress", active)} />
        <KpiBtn label="Pending" n={pending.length} tone="text-sev-medium" onClick={() => onList("Pending", pending)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={current ? "Current job" : "Next job"}>
          {lead ? (
            <div className="grid gap-1 p-4 text-sm">
              <div className="text-base font-semibold">{lead.plantName || lead.customerName}</div>
              <div className="text-mute">{installTypeLabel[lead.installationType]} · <span className="num">{dateRange(lead)}</span></div>
              {current ? <div>{progress(current)}</div> : null}
              <div className="mt-2"><Button variant="solid" onClick={() => onOpen(lead.id)}>{current ? (isReadyToClose(current) ? "Complete Job" : "Continue Job") : "Open Job"}</Button></div>
            </div>
          ) : <Empty>No job assigned yet.</Empty>}
        </Panel>
        <AttentionPanel jobs={jobs} onList={onList} title="Needs my attention" />
        <Panel title="Upcoming jobs">{upcoming.length ? upcoming.slice(0, 5).map((j) => <JobLine key={j.id} j={j} onOpen={onOpen} cta="Open Job" />) : <Empty>No upcoming jobs.</Empty>}</Panel>
        <Panel title="Recent updates">
          {recent.length ? recent.map(({ u, j }) => (
            <button key={u.id} type="button" onClick={() => onOpen(j.id)} className="block w-full border-t border-line/60 px-4 py-2 text-left text-sm first:border-t-0">
              <div className="font-medium">{j.plantName || j.customerName} <span className="num text-xs text-mute">· {fmtDate(u.workDate)}</span></div>
              <div className="truncate text-xs text-mute">{u.remark || u.workCompleted || "—"}</div>
            </button>
          )) : <Empty>No updates yet.</Empty>}
        </Panel>
      </div>
    </div>
  );
}

// ---------- lists

const toneRing = { overdue: "border-l-sev-high", today: "border-l-sev-medium", done: "border-l-sev-low", normal: "border-l-line" } as const;

function JobCards({ jobs, onOpen }: { jobs: ExecJob[]; onOpen: (id: string) => void }) {
  const today = todayIso();
  return (
    <div className="grid gap-2 p-3 md:hidden">
      {jobs.map((j) => {
        const tone = jobTone(j, today);
        const last = updatesFor(j.id).map((u) => u.workDate).sort().pop();
        const stale = needsRemark(j, last, today);
        const map = mapsUrl(j.plantName, j.location, j.customerName);
        const engs = teamLabel(j);
        return (
          <div key={j.id} className={cn("rounded-lg border-l-4 bg-card p-3 ring-1 ring-line", toneRing[tone])}>
            <button type="button" onClick={() => onOpen(j.id)} className="block w-full text-left">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5 font-semibold">
                  {stale ? <span title="No remark for 2+ days" className="size-2 shrink-0 rounded-full bg-sev-high" /> : null}
                  <span className="truncate">{j.plantName || j.customerName || "—"}</span>
                </div>
                <StatusBadge s={j.status} j={j} />
              </div>
              <div className="truncate text-xs text-mute">{j.customerName} · {installTypeLabel[j.installationType]}</div>
              <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                <span className={cn("num", tone === "overdue" && "font-semibold text-sev-high", tone === "today" && "font-semibold text-sev-medium")}>
                  {dateRange(j)}{tone === "overdue" ? " · Overdue" : tone === "today" ? " · Today" : ""}
                </span>
                <span className="truncate text-mute">{engs || "Unassigned"}</span>
              </div>
              {stale ? <div className="mt-1 text-[11px] font-medium text-sev-high">No remark for 2+ days</div> : null}
            </button>
            <div className="mt-2 flex flex-wrap gap-3 border-t border-line/60 pt-2 text-xs font-medium">
              <button type="button" className="text-signal" onClick={() => onOpen(j.id)}>{j.status === "in_progress" ? "Add remark →" : "Open job →"}</button>
              {map ? <a className="inline-flex items-center gap-1 text-signal" href={map} target="_blank" rel="noopener noreferrer"><MapPin className="size-3.5" /> Map</a> : null}
              {j.contactNumber ? <a className="inline-flex items-center gap-1 text-signal" href={`tel:${j.contactNumber}`}><Phone className="size-3.5" /> Call</a> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TodayStrip({ jobs, visitsToday, value, onChange }: { jobs: ExecJob[]; visitsToday: number; value: TodayFilter | null; onChange: (f: TodayFilter | null) => void }) {
  const today = todayIso();
  const items: { f: TodayFilter; label: string; n: number; cls: string }[] = [
    { f: "active", label: "Active jobs", n: filterToday(jobs, "active", today).length, cls: "text-signal" },
    { f: "due", label: "Due today", n: filterToday(jobs, "due", today).length, cls: "text-sev-medium" },
    { f: "visits", label: "Site visits today", n: visitsToday, cls: "text-sev-low" },
    { f: "overdue", label: "Overdue", n: filterToday(jobs, "overdue", today).length, cls: "text-sev-high" },
  ];
  return (
    <div className="mb-4 grid grid-cols-4 gap-2">
      {items.map((i) => (
        <button key={i.f} type="button" onClick={() => onChange(value === i.f ? null : i.f)}
          className={cn("rounded-lg bg-card px-2 py-2 text-left ring-1 ring-line transition", value === i.f && "ring-2 ring-signal")}>
          <div className={cn("num text-xl font-semibold leading-none sm:text-2xl", i.n ? i.cls : "text-mute")}>{i.n}</div>
          <div className="mt-1 text-[10px] leading-tight text-mute sm:text-xs">{i.label}</div>
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
          <tr><Th>Customer / Plant</Th><Th>Type</Th><Th>Location</Th><Th>Engineer</Th><Th>Planned</Th><Th>Progress</Th><Th>Status</Th><Th>Action</Th></tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <Tr key={j.id}>
              <Td><div className="font-medium">{j.customerName}</div><div className="text-xs text-mute">{j.plantName}</div></Td>
              <Td>{installTypeLabel[j.installationType]}{j.priority === "high" ? <span className="ml-1 text-[10px] font-semibold text-sev-high">HIGH</span> : null}</Td>
              <Td>{j.location || "—"}</Td>
              <Td>{personName(j.assignedEngineerId) || "—"}{jobEngineerIds(j).length > 1 ? <div className="text-xs text-mute">+ {jobEngineerIds(j).slice(1).map(personName).join(", ")}</div> : null}</Td>
              <Td mono>{dateRange(j)}</Td>
              <Td><div className="num text-xs">{frac(j.sensorsInstalled, j.plannedSensors)} sensors</div><div className="num text-xs text-mute">{frac(j.machinesCovered, j.plannedMachines)} machines</div>{j.plannedSensors > 0 && <div className="mt-1 h-1 w-20 rounded bg-muted"><div className="h-1 rounded bg-signal" style={{ width: `${Math.min(100, (j.sensorsInstalled / j.plannedSensors) * 100)}%` }} /></div>}</Td>
              <Td><StatusBadge s={j.status} j={j} /></Td>
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

type QF = "all" | JobBucket;
const QF_LABEL: Record<Exclude<QF, "other">, string> = { all: "All", scheduled: "Scheduled", in_progress: "In Progress", pending: "Pending", ready: "Ready to Close", completed: "Completed" };
function JobsPage({ jobs, onOpen, manager }: { jobs: ExecJob[]; onOpen: (id: string) => void; manager: boolean }) {
  const ex = useExecution();
  const [qf, setQf] = useState<QF>("all");
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [eng, setEng] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [more, setMore] = useState(false);
  const list = jobs.filter((j) => {
    if (qf !== "all" && jobBucket(j) !== qf) return false;
    if (type !== "all" && j.installationType !== type) return false;
    if (eng !== "all" && !onJob(j, eng)) return false;
    const d = j.plannedStart ?? j.expectedDate ?? "";
    if (from && d && d < from) return false;
    if (to && d && d > to) return false;
    const s = q.trim().toLowerCase();
    if (s && ![j.customerName, j.plantName, j.location, teamLabel(j)].join(" ").toLowerCase().includes(s)) return false;
    return true;
  });
  const n = (f: QF) => (f === "all" ? jobs.length : jobs.filter((j) => jobBucket(j) === f).length);
  return (
    <div className="grid gap-3">
      <div className="-mx-1 overflow-x-auto px-1"><div className="w-max">
        <Seg value={qf} onChange={setQf} options={(Object.keys(QF_LABEL) as QF[]).map((v) => ({ v, label: `${QF_LABEL[v as keyof typeof QF_LABEL]} (${n(v)})` }))} />
      </div></div>
      <div className="flex flex-wrap gap-2">
        <div className="min-w-0 flex-1"><TextInput placeholder="Search customer / plant / location" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Button onClick={() => setMore((m) => !m)}>Filters{type !== "all" || eng !== "all" || from || to ? " •" : ""}</Button>
      </div>
      {more ? (
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All job types</option>
            {Object.entries(installTypeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          {manager ? (
            <Select value={eng} onChange={(e) => setEng(e.target.value)}>
              <option value="all">All engineers</option>
              {ex.engineers.map((e) => <option key={e.id} value={e.id}>{e.name}{e.status === "inactive" ? " (inactive)" : ""}</option>)}
            </Select>
          ) : null}
          <TextInput type="date" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} />
          <TextInput type="date" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      ) : null}
      <JobsList jobs={list} onOpen={onOpen} title="Jobs" />
    </div>
  );
}

function ScheduleView({ jobs, onOpen }: { jobs: ExecJob[]; onOpen: (id: string) => void }) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [sf, setSf] = useState<"upcoming" | "in_progress" | "completed" | "all">("upcoming");
  const [month, setMonth] = useState(todayIso().slice(0, 7));
  const today = todayIso();
  const scheduled = jobs.filter((j) => j.plannedStart && !["cancelled"].includes(j.status)).sort((a, b) => (a.plannedStart! < b.plannedStart! ? -1 : 1));
  const shown = scheduled.filter((j) =>
    sf === "all" ? true : sf === "completed" ? j.status === "completed" : sf === "in_progress" ? j.status === "in_progress" : !closed(j.status) && j.status !== "lead" && (j.plannedEnd ?? j.plannedStart)! >= today,
  );
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
      meta={<div className="flex flex-wrap gap-2"><Seg value={sf} onChange={setSf} options={[{ v: "upcoming", label: "Upcoming" }, { v: "in_progress", label: "In Progress" }, { v: "completed", label: "Completed" }, { v: "all", label: "All" }]} /><Seg value={view} onChange={setView} options={[{ v: "list", label: "List View" }, { v: "calendar", label: "Calendar View" }]} /></div>}
    >
      {view === "list" ? (
        shown.length ? shown.map((j) => <JobLine key={j.id} j={j} onOpen={onOpen} />) : <Empty>No jobs in this view.</Empty>
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
              const on = shown.filter((j) => j.plannedStart! <= d && (j.plannedEnd ?? j.plannedStart)! >= d);
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
  const active = ex.engineers.filter((e) => e.status === "active" || onJob(j, e.id));
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
          <div className="sm:col-span-2">
            <TeamPicker
              lead={j.assignedEngineerId}
              ids={jobEngineerIds(j)}
              exec={active.map((e) => ({ id: e.id, name: e.name }))}
              others={data.engineers.filter((e) => e.role === "analyst" || e.role === "manager").map((e) => ({ id: e.id, name: e.name, role: e.role }))}
              onChange={(lead, ids) => {
                const execIds = ids.filter((x) => ex.engineers.some((e) => e.id === x));
                set({ assignedEngineerId: lead, secondaryEngineerId: execIds.find((x) => x !== lead) ?? "", engineerIds: ids });
              }}
            />
          </div>
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

function TeamPicker({ lead, ids, exec, others, onChange }: {
  lead: string; ids: string[];
  exec: { id: string; name: string }[];
  others: { id: string; name: string; role: string }[];
  onChange: (lead: string, ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    const execNext = next.filter((x) => exec.some((e) => e.id === x));
    const nextLead = next.includes(lead) && exec.some((e) => e.id === lead) ? lead : execNext[0] ?? "";
    onChange(nextLead, nextLead ? [nextLead, ...next.filter((x) => x !== nextLead)] : next);
  };
  const chip = (p: { id: string; name: string }, tag?: string) => {
    const on = ids.includes(p.id);
    return (
      <button key={p.id} type="button" onClick={() => toggle(p.id)} aria-pressed={on}
        className={cn("min-h-9 rounded-full px-3 py-1.5 text-xs ring-1 transition-colors", on ? "bg-signal text-primary-foreground ring-signal" : "bg-background text-ink ring-line hover:ring-signal/60")}>
        {on ? "✓ " : ""}{p.name}{tag ? <span className="ml-1 opacity-70">· {tag}</span> : null}
      </button>
    );
  };
  const execOn = ids.filter((x) => exec.some((e) => e.id === x));
  return (
    <div className="grid gap-3 rounded-md p-3 ring-1 ring-line">
      <div>
        <div className="label-caps">Team on this job</div>
        <p className="text-xs text-mute">Tick everyone going. Every ticked execution engineer can open the job and add work updates.</p>
      </div>
      <div>
        <div className="mb-1.5 text-[11px] text-mute">Execution engineers</div>
        <div className="flex flex-wrap gap-2">{exec.length ? exec.map((p) => chip(p)) : <span className="text-xs text-mute">None added yet</span>}</div>
      </div>
      {others.length ? (
        <div>
          <div className="mb-1.5 text-[11px] text-mute">Customer success engineers &amp; managers joining</div>
          <div className="flex flex-wrap gap-2">{others.map((p) => chip(p, p.role === "manager" ? "Manager" : "CS"))}</div>
        </div>
      ) : null}
      {execOn.length > 1 ? (
        <Field label="Lead engineer (owner)">
          <Select value={lead} onChange={(e) => onChange(e.target.value, [e.target.value, ...ids.filter((x) => x !== e.target.value)])}>
            {execOn.map((x) => <option key={x} value={x}>{exec.find((e) => e.id === x)?.name}</option>)}
          </Select>
        </Field>
      ) : null}
      <div className="text-xs text-mute">{ids.length ? `${ids.length} selected` : "Nobody selected — job stays unassigned"}</div>
    </div>
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
  const draftKey = `exec-remark-draft:${job.id}`;
  const [upd, setUpdRaw] = useState(() => {
    const blank = { workDate: todayIso(), remark: "", workCompleted: "", pendingNextAction: "", attachmentLink: "" };
    try { const s = window.localStorage.getItem(draftKey); return s ? { ...blank, ...JSON.parse(s) } : blank; } catch { return blank; }
  });
  const setUpd = (v: typeof upd) => {
    setUpdRaw(v);
    try { if (v.remark || v.workCompleted || v.pendingNextAction) window.localStorage.setItem(draftKey, JSON.stringify(v)); else window.localStorage.removeItem(draftKey); } catch { /* storage unavailable */ }
  };
  const [savingUpdate, setSavingUpdate] = useState(false);
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
        <Info label="Team" value={teamLabel(job)} />
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

      <Section title="Team on this job">
        <div className="flex flex-wrap gap-2">
          {jobEngineerIds(job).length ? jobEngineerIds(job).map((id, i) => {
            const pr = portalPeople().find((p) => p.id === id);
            const tag = i === 0 && id === job.assignedEngineerId ? "Lead" : pr ? (pr.role === "manager" ? "Manager" : pr.role === "analyst" ? "CS" : "Execution") : "Execution";
            return <span key={id} className="rounded-full bg-muted px-3 py-1 text-xs">{personName(id) || "Unknown"} <span className="text-mute">· {tag}</span></span>;
          }) : <span className="text-xs text-mute">Nobody assigned yet</span>}
        </div>
      </Section>
      <Section title="Progress at a glance">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Info label="Sensors" value={<span className="num">{job.sensorsInstalled}{job.plannedSensors ? ` / ${job.plannedSensors}` : ""}</span>} />
          <Info label="Machines" value={<span className="num">{job.machinesCovered}{job.plannedMachines ? ` / ${job.plannedMachines}` : ""}</span>} />
          <Info label="Days with updates" value={<span className="num">{new Set(updates.map((u) => u.workDate)).size}</span>} />
          <Info label="Last update" value={updates.length ? fmtDate(updates.map((u) => u.workDate).sort().pop()) : "None yet"} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
          {([["Kickoff", job.kickoff], ["Configuration", job.configuration], ...(job.installationType !== "troubleshooting" ? [["AIP sheet", job.aip]] : [])] as [string, YesNoNa][]).map(([k, v]) => (
            <span key={k} className={cn("rounded-full px-2 py-0.5 ring-1", v === "yes" ? "text-sev-low ring-sev-low/40" : v === "na" ? "text-mute ring-line" : "text-sev-medium ring-sev-medium/40")}>{v === "yes" ? "✓" : v === "na" ? "–" : "•"} {k}</span>
          ))}
          <span className={cn("rounded-full px-2 py-0.5 ring-1", job.reportLink ? "text-sev-low ring-sev-low/40" : "text-sev-medium ring-sev-medium/40")}>{job.reportLink ? "✓" : "•"} Report link</span>
        </div>
      </Section>
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
                disabled={savingUpdate}
                onClick={async () => {
                  if (savingUpdate) return;
                  if (!upd.remark.trim()) { toast.error("Add a short work remark"); return; }
                  if (!upd.workDate) { toast.error("Choose the work date"); return; }
                  setSavingUpdate(true);
                  try {
                    await addDailyUpdate({ ...upd, jobId: job.id, createdBy: byUser }, byUser);
                    setUpd({ workDate: todayIso(), remark: "", workCompleted: "", pendingNextAction: "", attachmentLink: "" });
                    toast.success("Daily update added");
                  } catch {
                    toast.error("Could not save the update. Your remark is still here; please try again.");
                  } finally {
                    setSavingUpdate(false);
                  }
                }}
              >
                {savingUpdate ? "Saving…" : "+ Add Daily Update"}
              </Button>
            </div>
          </div>
        ) : null}
      </Section>

      <Section title="Installation summary">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Planned sensors"><TextInput disabled={!canEdit} type="number" min={0} value={j.plannedSensors} onChange={(e) => set({ plannedSensors: Math.max(0, Number(e.target.value) || 0) })} /></Field>
          <Field label="Planned machines"><TextInput disabled={!canEdit} type="number" min={0} value={j.plannedMachines} onChange={(e) => set({ plannedMachines: Math.max(0, Number(e.target.value) || 0) })} /></Field>
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
            <Info label="Sensors / machines" value={`${frac(j.sensorsInstalled, j.plannedSensors)} sensors · ${frac(j.machinesCovered, j.plannedMachines)} machines`} />
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
  const [reassign, setReassign] = useState<{ from: ExecEngineer; to: string; picked: string[] } | null>(null);
  const blank = (): ExecEngineer => ({ id: crypto.randomUUID(), name: "", employeeId: "", email: "", mobile: "", branch: "", role: "engineer", status: "active", linkedUserId: "" });
  const openOf = (id: string) => ex.jobs.filter((j) => !closed(j.status) && onJob(j, id));
  const openCount = (id: string) => openOf(id).length;
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
                      {openCount(e.id) ? <Button onClick={() => setReassign({ from: e, to: "", picked: openOf(e.id).map((j) => j.id) })}>Reassign</Button> : null}
                      {e.status === "active" ? (
                        <Button variant="ghost" onClick={() => { if (window.confirm("Deactivate this engineer?\nHistorical execution records will remain available.")) void saveEngineer({ ...e, status: "inactive" }); }}>Deactivate</Button>
                      ) : (
                        <Button variant="ghost" onClick={() => void saveEngineer({ ...e, status: "active" })}>Activate</Button>
                      )}
                      <Button variant="ghost" className="text-sev-high" onClick={() => {
                        if (openCount(e.id)) { toast.error("Reassign their open jobs before deleting"); setReassign({ from: e, to: "", picked: openOf(e.id).map((j) => j.id) }); return; }
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
          <div>Choose which of <b>{reassign.from.name}</b>'s {openCount(reassign.from.id)} open job(s) to hand over:</div>
          <div className="flex gap-2 text-xs">
            <button type="button" className="text-signal underline" onClick={() => setReassign({ ...reassign, picked: openOf(reassign.from.id).map((j) => j.id) })}>Select all</button>
            <button type="button" className="text-signal underline" onClick={() => setReassign({ ...reassign, picked: [] })}>Clear</button>
          </div>
          <div className="grid max-h-72 gap-1 overflow-y-auto">
            {openOf(reassign.from.id).map((j) => {
              const on = reassign.picked.includes(j.id);
              return (
                <label key={j.id} className={cn("flex min-h-11 cursor-pointer items-start gap-2 rounded-md p-2 ring-1", on ? "ring-signal" : "ring-line")}>
                  <input type="checkbox" className="mt-1 h-4 w-4" checked={on}
                    onChange={() => setReassign({ ...reassign, picked: on ? reassign.picked.filter((x) => x !== j.id) : [...reassign.picked, j.id] })} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{j.customerName}{j.plantName ? ` · ${j.plantName}` : ""}</span>
                    <span className="block text-xs text-mute">{installTypeLabel[j.installationType]} · {execStatusLabel[j.status]} · <span className="num">{dateRange(j)}</span></span>
                  </span>
                </label>
              );
            })}
          </div>
          <div className="text-xs text-mute">Hand the selected jobs to:</div>
          <Select value={reassign.to} onChange={(e) => setReassign({ ...reassign, to: e.target.value })}>
            <option value="">— Select engineer —</option>
            {ex.engineers.filter((e) => e.status === "active" && e.id !== reassign.from.id).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
          <div className="flex gap-2">
            <Button variant="solid" disabled={!reassign.to || !reassign.picked.length} onClick={async () => { await reassignJobs(reassign.from.id, reassign.to, reassign.picked); toast.success(`${reassign.picked.length} job(s) handed over`); setReassign(null); }}>Hand over {reassign.picked.length || ""}</Button>
            <Button variant="ghost" onClick={() => setReassign(null)}>Cancel</Button>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
