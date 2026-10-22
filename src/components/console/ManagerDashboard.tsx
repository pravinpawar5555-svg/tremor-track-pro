import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Empty, Panel, PageHeader, Select } from "@/components/console/ui";
import { cn } from "@/lib/utils";
import {
  TODAY,
  activeReports,
  analystsOf,
  daysBetween,
  engineerName,
  fmtDate,
  frequencyLabel,
  plantName,
  reportTiming,
  shiftDate,
  type AppData,
} from "@/lib/store";
import { useVisits, visitStatus, visitTypeLabel } from "@/lib/visits";
import { useExecution, installTypeLabel, execStatusLabel, type ExecJob } from "@/lib/execution";
import { useComms, openFollowUp } from "@/lib/comms";
import { useOpps } from "@/lib/opportunities";
import { amcStatus } from "@/lib/amc";
import { ownershipOf, useBranches } from "@/lib/branches";

export type ManagerView = "overview" | "cs" | "execution";
type Period = "today" | "7d" | "month";
const periodDays: Record<Period, number> = { today: 0, "7d": 7, month: 30 };

/* ------------------------------------------------------------ tones */
const tone = {
  red: "bg-sev-critical/10 text-sev-critical ring-sev-critical/30",
  orange: "bg-sev-high/10 text-sev-high ring-sev-high/30",
  amber: "bg-sev-medium/10 text-sev-medium ring-sev-medium/30",
  green: "bg-sev-low/10 text-sev-low ring-sev-low/30",
  blue: "bg-signal/10 text-signal ring-signal/30",
  purple: "bg-[oklch(0.55_0.18_300)]/10 text-[oklch(0.5_0.18_300)] ring-[oklch(0.55_0.18_300)]/30",
  grey: "bg-black/5 text-mute ring-line",
} as const;
type Tone = keyof typeof tone;

function Badge({ t, children }: { t: Tone; children: ReactNode }) {
  return <span className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1", tone[t])}>{children}</span>;
}

function Card({ label, value, hint, t, onClick }: { label: string; value: number; hint?: string; t: Tone; onClick?: () => void }) {
  const dot = tone[t].split(" ")[1];
  return (
    <button type="button" onClick={onClick} className="panel-glass group p-3 text-left transition hover:ring-1 hover:ring-signal/40">
      <div className="label-caps">{label}</div>
      <div className={cn("num mt-1 text-2xl font-semibold", value ? dot : "text-mute")}>{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-mute">{hint}</div> : null}
    </button>
  );
}

function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <div className="inline-flex overflow-hidden rounded-md ring-1 ring-line">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} className={cn("px-3 py-1.5 text-xs font-medium", value === o.id ? "bg-signal text-signal-foreground" : "bg-panel text-mute hover:bg-base")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Row({ to, search, children }: { to: string; search?: Record<string, unknown> | undefined; children: ReactNode }) {
  return (
    <Link to={to} search={search as never} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm hover:bg-black/[0.03]">
      {children}
    </Link>
  );
}

const ago = (iso: string) => {
  if (!iso) return "never";
  const d = daysBetween(iso.slice(0, 10), TODAY);
  return d <= 0 ? "today" : d === 1 ? "1 day ago" : `${d} days ago`;
};

/* ------------------------------------------------------------ shared data */
function useModel(data: AppData) {
  const visits = useVisits();
  const ex = useExecution();
  const comms = useComms();
  return { visits, ex, comms, data };
}

const jobDate = (j: ExecJob) => j.plannedStart || j.expectedDate || j.nextPlannedDate || "";
const jobEnd = (j: ExecJob) => j.plannedEnd || j.plannedStart || j.expectedDate || "";
const jobOpen = (j: ExecJob) => j.status !== "completed" && j.status !== "cancelled";
function jobStage(j: ExecJob): "scheduled" | "progress" | "blocked" | "close" | "lead" | "done" {
  if (!jobOpen(j)) return "done";
  if (j.status === "pending" || j.status === "on_hold") return "blocked";
  if (j.actualEnd || (j.status === "in_progress" && j.kickoff === "yes" && j.configuration === "yes")) return "close";
  if (j.status === "in_progress") return "progress";
  if (j.status === "scheduled" || j.status === "planning") return "scheduled";
  return "lead";
}
const closeGap = (j: ExecJob) => (j.aip !== "yes" ? "AIP sheet pending" : !j.reportLink ? "Report link missing" : j.configuration !== "yes" ? "Configuration pending" : "Ready for closure");
const jobOverdue = (j: ExecJob) => jobOpen(j) && !!jobEnd(j) && jobEnd(j) < TODAY;

/* ------------------------------------------------------------ main */
export function ManagerDashboard({ data, view, onView, csExtra }: { data: AppData; view: ManagerView; onView: (v: ManagerView) => void; csExtra?: ReactNode }) {
  const [period, setPeriod] = useState<Period>("7d");
  const m = useModel(data);
  const titles: Record<ManagerView, [string, string]> = {
    overview: ["Management Overview", "Customer Success & Execution operational overview"],
    cs: ["Customer Success", "Customer service health, reports and follow-ups"],
    execution: ["Execution", "Field job execution, installations and closures"],
  };
  return (
    <>
      <PageHeader
        title={titles[view][0]}
        subtitle={`${titles[view][1]} · ${fmtDate(TODAY)}`}
        actions={<Seg value={period} onChange={setPeriod} options={[{ id: "today", label: "Today" }, { id: "7d", label: "7 Days" }, { id: "month", label: "Month" }]} />}
      />
      <div className="mb-4 overflow-x-auto">
        <Seg value={view} onChange={onView} options={[{ id: "overview", label: "Management Overview" }, { id: "cs", label: "Customer Success" }, { id: "execution", label: "Execution" }]} />
      </div>
      {view === "overview" ? <Overview m={m} period={period} /> : view === "cs" ? <CustomerSuccess m={m} period={period} extra={csExtra} /> : <Execution m={m} period={period} />}
    </>
  );
}

type Model = ReturnType<typeof useModel>;

/* ------------------------------------------------------------ OVERVIEW */
function Overview({ m, period }: { m: Model; period: Period }) {
  const { data, visits, ex, comms } = m;
  const nav = useNavigate();
  const [chip, setChip] = useState<"all" | "review" | "report" | "exec" | "commit">("all");
  const [cat, setCat] = useState<"all" | "order" | "demo">("all");
  const horizon = shiftDate(TODAY, Math.max(periodDays[period], period === "today" ? 0 : 7));
  const catOf = (pid: string) => data.plants.find((p) => p.id === pid)?.category ?? "order";
  const inCat = (pid: string) => cat === "all" || catOf(pid) === cat;

  const tickets = (data.tickets ?? []).filter((t) => (t.status === "open" || t.status === "in-discussion") && inCat(t.plantId));
  const reports = activeReports(data).filter((r) => r.status !== "sent" && inCat(r.plantId));
  const repRisk = reports.filter((r) => reportTiming(r).late || r.dueDate <= shiftDate(TODAY, 2));
  const jobs = ex.jobs.filter((j) => !j.plantId || inCat(j.plantId));
  const execRisk = jobs.filter((j) => jobStage(j) === "blocked" || jobOverdue(j));
  const commits = comms.filter((c) => inCat(c.plantId) && openFollowUp(c.followUp) && (c.commitment.trim() || c.actions.some((a) => a.status === "open")));

  const prio = { critical: 0, high: 0, medium: 1, low: 2 } as const;
  type Q = { key: string; kind: "review" | "report" | "exec" | "commit"; level: 0 | 1 | 2; ref?: string; title: string; plant: string; who: string; cta: string; to: string; search?: Record<string, unknown> };
  const queue: Q[] = [
    ...tickets.map((t): Q => ({ key: t.id, kind: "review", level: prio[t.priority], ref: t.ticketNo, title: `${t.subject}${t.machine ? ` — ${t.machine}` : ""}`, plant: plantName(data, t.plantId), who: `Raised by ${engineerName(data, t.raisedBy)}`, cta: "Review", to: "/discussions", search: { tickets: true } })),
    ...repRisk.map((r): Q => ({ key: r.id, kind: "report", level: reportTiming(r).late ? 1 : 2, title: `${frequencyLabel[r.type]} report ${reportTiming(r).late ? "overdue" : `due ${fmtDate(r.dueDate)}`}`, plant: plantName(data, r.plantId), who: `Owner: ${engineerName(data, r.byEngineerId)}`, cta: "Review Report", to: "/reports", search: reportTiming(r).late ? { timing: "overdue" } : { timing: "due" } })),
    ...execRisk.map((j): Q => ({ key: j.id, kind: "exec", level: j.priority === "high" ? 0 : 1, title: jobStage(j) === "blocked" ? `Execution pending — ${j.pendingReason || "reason not given"}` : `${installTypeLabel[j.installationType]} past planned date`, plant: j.plantName || plantName(data, j.plantId), who: `Owner: ${m.ex.engineers.find((e) => e.id === j.assignedEngineerId)?.name || "Unassigned"}`, cta: "Open Job", to: "/execution" })),
    ...commits.map((c): Q => ({ key: c.id, kind: "commit", level: c.nextFollowUp && c.nextFollowUp < TODAY ? 1 : 2, title: `Customer commitment pending${c.subject ? ` — ${c.subject}` : ""}`, plant: plantName(data, c.plantId), who: c.followUpOwner ? `Owner: ${engineerName(data, c.followUpOwner) || c.followUpOwner}` : "", cta: "Open Communication", to: "/discussions" })),
  ].sort((a, b) => a.level - b.level);
  const shown = queue.filter((q) => chip === "all" || q.kind === chip);
  const levelBadge = (l: number) => (l === 0 ? <Badge t="red">High</Badge> : l === 1 ? <Badge t="orange">Medium</Badge> : <Badge t="grey">Low</Badge>);

  type U = { key: string; d: string; dom: "REPORT" | "VISIT" | "EXECUTION"; plant: string; what: string; who: string };
  const upcoming: U[] = [
    ...reports.filter((r) => r.dueDate >= TODAY && r.dueDate <= horizon).map((r): U => ({ key: r.id, d: r.dueDate, dom: "REPORT", plant: plantName(data, r.plantId), what: `${frequencyLabel[r.type]} Report`, who: engineerName(data, r.byEngineerId) })),
    ...visits.filter((v) => inCat(v.plantId) && ["due", "upcoming", "rescheduled"].includes(visitStatus(v)) && v.plannedDate >= TODAY && v.plannedDate <= horizon).map((v): U => ({ key: v.id, d: v.plannedDate, dom: "VISIT", plant: plantName(data, v.plantId), what: v.purpose || visitTypeLabel[v.visitType], who: v.engineerIds.map((id) => engineerName(data, id)).join(", ") })),
    ...jobs.filter((j) => jobOpen(j) && jobDate(j) >= TODAY && jobDate(j) <= horizon).map((j): U => ({ key: j.id, d: jobDate(j), dom: "EXECUTION", plant: j.plantName || plantName(data, j.plantId), what: installTypeLabel[j.installationType], who: ex.engineers.find((e) => e.id === j.assignedEngineerId)?.name ?? "" })),
  ].sort((a, b) => (a.d < b.d ? -1 : 1));
  const domTone: Record<U["dom"], Tone> = { REPORT: "amber", VISIT: "blue", EXECUTION: "purple" };

  const since = shiftDate(TODAY, -Math.max(periodDays[period], 7));
  const updates = [
    ...(data.tickets ?? []).filter((t) => t.respondedOn && t.respondedOn >= since).map((t) => ({ d: t.respondedOn!, text: `Manager recommendation issued — ${t.ticketNo}`, sub: plantName(data, t.plantId), t: "purple" as Tone })),
    ...data.reports.filter((r) => r.status === "sent" && r.sentDate && r.sentDate >= since).map((r) => ({ d: r.sentDate!, text: `${frequencyLabel[r.type]} report sent`, sub: `${plantName(data, r.plantId)} · ${engineerName(data, r.byEngineerId)}`, t: "green" as Tone })),
    ...ex.jobs.filter((j) => j.completedAt && j.completedAt.slice(0, 10) >= since).map((j) => ({ d: j.completedAt!.slice(0, 10), text: `Execution completed — ${installTypeLabel[j.installationType]}`, sub: j.plantName || plantName(data, j.plantId), t: "green" as Tone })),
    ...comms.filter((c) => c.date >= since).map((c) => ({ d: c.date, text: `Customer communication added${c.subject ? ` — ${c.subject}` : ""}`, sub: plantName(data, c.plantId), t: "blue" as Tone })),
    ...visits.filter((v) => v.completedDate && v.completedDate >= since).map((v) => ({ d: v.completedDate!, text: `Visit completed${v.momNo ? ` · ${v.momNo}` : ""}`, sub: plantName(data, v.plantId), t: "blue" as Tone })),
  ].sort((a, b) => (a.d < b.d ? 1 : -1)).slice(0, 6);

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Seg value={cat} onChange={setCat} options={[{ id: "all", label: "All Plants" }, { id: "order", label: "Order" }, { id: "demo", label: "Demo" }]} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Card label="Needs My Decision" value={tickets.length} hint="Tickets waiting on you" t="purple" onClick={() => setChip("review")} />
        <Card label="Customer Commitments" value={commits.length} hint="Open customer actions" t="amber" onClick={() => setChip("commit")} />
        <Card label="Reports at Risk" value={repRisk.length} hint="Overdue or due in 2 days" t="red" onClick={() => void nav({ to: "/reports", search: { timing: "overdue" } as never })} />
        <Card label="Execution at Risk" value={execRisk.length} hint="Blocked or past date" t="orange" onClick={() => setChip("exec")} />
        <Card label={period === "month" ? "Upcoming 30 Days" : "Upcoming 7 Days"} value={upcoming.length} hint="Visits, reports, jobs" t="blue" />
      </div>

      <AmcPanel data={data} inCat={inCat} />

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Management Action Queue" meta={<span>{queue.length} open</span>}>
          <div className="flex flex-wrap gap-1.5 border-b border-line/60 px-4 py-2">
            {([["all", "All"], ["review", "Technical Review"], ["report", "Reports"], ["exec", "Execution"], ["commit", "Customer Commitment"]] as const).map(([id, l]) => (
              <button key={id} type="button" onClick={() => setChip(id)} className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium ring-1", chip === id ? "bg-signal text-signal-foreground ring-signal" : "text-mute ring-line hover:bg-base")}>
                {l} <span className="num opacity-70">({id === "all" ? queue.length : queue.filter((q) => q.kind === id).length})</span>
              </button>
            ))}
          </div>
          <div className="divide-y divide-line/60">
            {shown.slice(0, 7).map((q) => (
              <Row key={q.key} to={q.to} search={q.search}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">{levelBadge(q.level)}{q.ref ? <span className="num text-[11px] text-mute">{q.ref}</span> : null}</div>
                  <div className="mt-0.5 font-medium">{q.title}</div>
                  <div className="text-xs text-mute">{[q.plant, q.who].filter(Boolean).join(" · ")}</div>
                </div>
                <span className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-signal ring-1 ring-signal/40">{q.cta}</span>
              </Row>
            ))}
            {!shown.length ? <Empty>Nothing needs your decision right now.</Empty> : null}
          </div>
          {shown.length > 7 ? <div className="border-t border-line/60 px-4 py-2 text-right text-xs text-mute">+{shown.length - 7} more — open the relevant tab to view all</div> : null}
        </Panel>

        <div className="grid gap-4">
          <Panel title={`Upcoming Commitments — ${period === "month" ? "Next 30 Days" : period === "today" ? "Today" : "Next 7 Days"}`}>
            <div className="max-h-[360px] divide-y divide-line/60 overflow-y-auto">
              {upcoming.map((u) => (
                <div key={u.key} className="flex items-start gap-3 px-4 py-2 text-sm">
                  <div className="num w-12 shrink-0 pt-0.5 text-xs font-semibold">{fmtDate(u.d).split(" ").slice(0, 2).join(" ")}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5"><Badge t={domTone[u.dom]}>{u.dom}</Badge><span className="truncate font-medium">{u.plant}</span></div>
                    <div className="text-xs text-mute">{[u.what, u.who].filter(Boolean).join(" · ")}</div>
                  </div>
                </div>
              ))}
              {!upcoming.length ? <Empty>No commitments in this window.</Empty> : null}
            </div>
          </Panel>
          <BusinessPipeline />
          <Panel title="Recent Important Updates">
            <div className="divide-y divide-line/60">
              {updates.map((u, i) => (
                <div key={i} className="flex items-start justify-between gap-3 px-4 py-2 text-sm">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", tone[u.t].split(" ")[0]!.replace("/10", ""))} />
                    <div className="min-w-0"><div className="truncate">{u.text}</div><div className="text-xs text-mute">{u.sub}</div></div>
                  </div>
                  <span className="num shrink-0 text-xs text-mute">{fmtDate(u.d)}</span>
                </div>
              ))}
              {!updates.length ? <Empty>No important updates recently.</Empty> : null}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------ CUSTOMER SUCCESS */
function CustomerSuccess({ m, period, extra }: { m: Model; period: Period; extra?: ReactNode }) {
  const { data, visits, comms } = m;
  const team = analystsOf(data);
  const [eng, setEng] = useState("all");
  const plants = data.plants.filter((p) => eng === "all" || p.engineerId === eng);
  const pids = new Set(plants.map((p) => p.id));
  const weekEnd = shiftDate(TODAY, Math.max(7, periodDays[period]));

  const reports = activeReports(data).filter((r) => r.status !== "sent" && (eng === "all" ? true : r.byEngineerId === eng));
  const overdue = reports.filter((r) => reportTiming(r).late);
  const dueWeek = reports.filter((r) => !reportTiming(r).late && r.dueDate <= weekEnd);
  const prepared = reports.filter((r) => r.status === "prepared");
  const risk = reports.filter((r) => reportTiming(r).late || r.dueDate <= shiftDate(TODAY, 2));

  const tickets = (data.tickets ?? []).filter((t) => pids.has(t.plantId) || (eng !== "all" && t.raisedBy === eng));
  const waitingReview = tickets.filter((t) => t.status === "open" || t.status === "in-discussion");
  const issued = tickets.filter((t) => t.status === "responded");
  const myComms = comms.filter((c) => pids.has(c.plantId));
  const followReq = myComms.filter((c) => c.followUp === "required" || c.followUp === "waiting_fm");
  const waitCust = myComms.filter((c) => c.followUp === "waiting_customer");
  const commits = myComms.filter((c) => openFollowUp(c.followUp) && (c.commitment.trim() || c.actions.some((a) => a.status === "open")));
  const lastComm = new Map<string, string>();
  for (const c of comms) if ((lastComm.get(c.plantId) ?? "") < c.date) lastComm.set(c.plantId, c.date);
  const silent = plants.filter((p) => { const l = lastComm.get(p.id); return !l || daysBetween(l, TODAY) > 14; });
  const weekVisits = visits.filter((v) => pids.has(v.plantId) && v.status !== "completed" && v.status !== "cancelled" && v.plannedDate >= TODAY && v.plannedDate <= weekEnd);
  const overdueVisits = visits.filter((v) => pids.has(v.plantId) && visitStatus(v) === "overdue");

  type A = { pid: string; issues: { l: string; t: Tone }[]; last: string };
  const map = new Map<string, A>();
  const add = (pid: string, l: string, t: Tone) => {
    if (!pids.has(pid)) return;
    const a = map.get(pid) ?? { pid, issues: [], last: lastComm.get(pid) ?? "" };
    if (!a.issues.some((i) => i.l === l)) a.issues.push({ l, t });
    map.set(pid, a);
  };
  overdue.forEach((r) => add(r.plantId, `${frequencyLabel[r.type]} report overdue`, "red"));
  waitingReview.forEach((t) => add(t.plantId, "Technical review pending", "purple"));
  overdueVisits.forEach((v) => add(v.plantId, "Visit overdue", "orange"));
  commits.forEach((c) => add(c.plantId, "Customer commitment pending", "amber"));
  waitCust.forEach((c) => add(c.plantId, "Waiting for customer", "amber"));
  weekVisits.forEach((v) => { if (map.has(v.plantId)) add(v.plantId, "Visit scheduled", "blue"); });
  const attention = [...map.values()].sort((a, b) => b.issues.length - a.issues.length);

  const latest = [...myComms].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3);
  const urgent = [...reports].sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1)).slice(0, 3);

  const Stage = ({ l, v, t, to, search }: { l: string; v: number; t: Tone; to: string; search?: Record<string, unknown> }) => (
    <Link to={to} search={search as never} className={cn("rounded-md px-2 py-2 text-center ring-1 hover:opacity-90", tone[t])}>
      <div className="num text-lg font-semibold">{v}</div>
      <div className="text-[10px] leading-tight">{l}</div>
    </Link>
  );

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Select className="w-52" value={eng} onChange={(e) => setEng(e.target.value)} aria-label="Customer Success Engineer">
          <option value="all">All Customer Success</option>
          {team.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Card label="Customers Needing Attention" value={attention.length} t="red" />
        <Card label="Open Follow-ups" value={followReq.length + waitCust.length} t="amber" />
        <Card label="Reports at Risk" value={risk.length} t="red" />
        <Card label="Technical Reviews" value={waitingReview.length} t="purple" />
        <Card label="Visits This Week" value={weekVisits.length} t="blue" />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-4">
          <Panel title="Customers Needing Attention" meta={<Link to="/plants" className="text-signal">Plants →</Link>}>
            <div className="hidden grid-cols-[1.3fr_1.6fr_0.8fr_0.8fr] gap-3 border-b border-line/60 px-4 py-2 text-[11px] text-mute md:grid">
              <span>Customer / Plant</span><span>Issue</span><span>Last contact</span><span>Owner</span>
            </div>
            <div className="divide-y divide-line/60">
              {attention.slice(0, 8).map((a) => {
                const p = data.plants.find((x) => x.id === a.pid);
                return (
                  <Link key={a.pid} to="/plants" className="grid gap-1 px-4 py-2.5 text-sm hover:bg-black/[0.03] md:grid-cols-[1.3fr_1.6fr_0.8fr_0.8fr] md:items-center md:gap-3">
                    <span className="font-medium">{p?.name ?? a.pid}</span>
                    <span className="flex flex-wrap gap-1">{a.issues.map((i) => <Badge key={i.l} t={i.t}>{i.l}</Badge>)}</span>
                    <span className="text-xs text-mute">{ago(a.last)}</span>
                    <span className="text-xs text-mute">{p ? engineerName(data, p.engineerId) : ""}</span>
                  </Link>
                );
              })}
              {!attention.length ? <Empty>All customers are on track.</Empty> : null}
            </div>
          </Panel>

          <Panel title="Technical Review & Report Flow">
            <div className="grid grid-cols-3 gap-2 px-4 py-3 md:grid-cols-5">
              <Stage l="Waiting for Manager Review" v={waitingReview.length} t="purple" to="/discussions" search={{ tickets: true }} />
              <Stage l="Recommendation Issued" v={issued.length} t="blue" to="/discussions" search={{ tickets: true }} />
              <Stage l="Prepared — Ready to Send" v={prepared.length} t="green" to="/reports" />
              <Stage l="Due This Week" v={dueWeek.length} t="amber" to="/reports" search={{ timing: "due" }} />
              <Stage l="Overdue" v={overdue.length} t="red" to="/reports" search={{ timing: "overdue" }} />
            </div>
          </Panel>
          {extra}
        </div>

        <div className="grid gap-4">
          <Panel title="Customer Communication" meta={<Link to="/discussions" className="text-signal">Open →</Link>}>
            <div className="grid grid-cols-2 gap-2 px-4 py-3 md:grid-cols-4 xl:grid-cols-2">
              {([["Follow-up Required", followReq.length, "orange"], ["Waiting for Customer", waitCust.length, "amber"], ["Commitments Pending", commits.length, "amber"], ["No Contact > 14 Days", silent.length, "grey"]] as const).map(([l, v, t]) => (
                <div key={l} className={cn("rounded-md px-3 py-2 ring-1", tone[t])}><div className="num text-lg font-semibold">{v}</div><div className="text-[11px]">{l}</div></div>
              ))}
            </div>
            <div className="divide-y divide-line/60 border-t border-line/60">
              {latest.map((c) => (
                <div key={c.id} className="px-4 py-2 text-sm">
                  <div className="truncate font-medium">{c.subject || c.type}</div>
                  <div className="text-xs text-mute">{plantName(data, c.plantId)} · {fmtDate(c.date)}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Report Delivery" meta={<Link to="/reports" className="text-signal">View all →</Link>}>
            <div className="grid grid-cols-3 gap-2 px-4 py-3">
              <div className={cn("rounded-md px-2 py-2 text-center ring-1", tone.red)}><div className="num text-lg font-semibold">{overdue.length}</div><div className="text-[10px]">Overdue</div></div>
              <div className={cn("rounded-md px-2 py-2 text-center ring-1", tone.amber)}><div className="num text-lg font-semibold">{dueWeek.length}</div><div className="text-[10px]">Due This Week</div></div>
              <div className={cn("rounded-md px-2 py-2 text-center ring-1", tone.green)}><div className="num text-lg font-semibold">{prepared.length}</div><div className="text-[10px]">Ready to Send</div></div>
            </div>
            <div className="divide-y divide-line/60 border-t border-line/60">
              {urgent.map((r) => {
                const late = reportTiming(r).late;
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                    <div className="min-w-0"><div className="truncate font-medium">{plantName(data, r.plantId)}</div><div className="text-xs text-mute">{frequencyLabel[r.type]} · {engineerName(data, r.byEngineerId)}</div></div>
                    <Badge t={late ? "red" : r.status === "prepared" ? "green" : "amber"}>{late ? "Overdue" : r.status === "prepared" ? "Ready" : fmtDate(r.dueDate)}</Badge>
                  </div>
                );
              })}
              {!urgent.length ? <Empty>No open reports.</Empty> : null}
            </div>
          </Panel>

          <Panel title="Customer Success Team">
            <div className="divide-y divide-line/60">
              {team.filter((a) => eng === "all" || a.id === eng).map((a) => {
                const mp = data.plants.filter((p) => p.engineerId === a.id).map((p) => p.id);
                const set = new Set(mp);
                const stats: [string, number][] = [
                  ["Active Customers", mp.length],
                  ["Open Follow-ups", comms.filter((c) => set.has(c.plantId) && openFollowUp(c.followUp)).length],
                  ["Reports Attention", activeReports(data).filter((r) => r.byEngineerId === a.id && r.status !== "sent" && (reportTiming(r).late || r.dueDate <= shiftDate(TODAY, 7))).length],
                  ["Visits This Week", visits.filter((v) => v.engineerIds.includes(a.id) && v.status !== "completed" && v.status !== "cancelled" && v.plannedDate >= TODAY && v.plannedDate <= shiftDate(TODAY, 7)).length],
                ];
                return (
                  <div key={a.id} className="px-4 py-3">
                    <div className="mb-2 flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-signal/10 text-[11px] font-semibold text-signal">{a.initials}</span><span className="font-medium">{a.name}</span></div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {stats.map(([l, v]) => <div key={l} className="rounded-md bg-base px-1.5 py-1.5 text-center ring-1 ring-line/60"><div className="num text-sm font-semibold">{v}</div><div className="text-[10px] leading-tight text-mute">{l}</div></div>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------ EXECUTION */
function Execution({ m, period }: { m: Model; period: Period }) {
  const { data, ex } = m;
  const [eng, setEng] = useState("all");
  const engs = ex.engineers.filter((e) => e.status === "active");
  const nameOf = (id: string) => ex.engineers.find((e) => e.id === id)?.name ?? "Unassigned";
  const jobs = ex.jobs.filter((j) => eng === "all" || j.assignedEngineerId === eng || j.secondaryEngineerId === eng);
  const by = (s: ReturnType<typeof jobStage>) => jobs.filter((j) => jobStage(j) === s);
  const cols = [
    { id: "scheduled" as const, l: "Scheduled", t: "blue" as Tone, list: by("scheduled") },
    { id: "progress" as const, l: "In Progress", t: "purple" as Tone, list: by("progress") },
    { id: "blocked" as const, l: "Pending / Blocked", t: "orange" as Tone, list: by("blocked") },
    { id: "close" as const, l: "Ready to Close", t: "green" as Tone, list: by("close") },
  ];
  const overdue = jobs.filter(jobOverdue);
  const blockers: [string, number][] = [
    ["Customer Confirmation", by("blocked").filter((j) => j.pendingReason.startsWith("Customer")).length],
    ["Material Pending", by("blocked").filter((j) => j.pendingReason.startsWith("Material")).length],
    ["Site Not Ready", by("blocked").filter((j) => j.pendingReason.startsWith("Site")).length],
    ["Network / IT Support", by("blocked").filter((j) => j.pendingReason.startsWith("Network")).length],
    ["Access / Permission", by("blocked").filter((j) => j.pendingReason.startsWith("Access")).length],
    ["Configuration Pending", jobs.filter((j) => jobOpen(j) && (j.pendingReason.startsWith("Configuration") || (jobStage(j) === "close" && j.configuration !== "yes"))).length],
    ["AIP Sheet Pending", by("close").filter((j) => j.aip !== "yes").length],
    ["Report Link Missing", by("close").filter((j) => !j.reportLink).length],
  ];
  const maxB = Math.max(1, ...blockers.map((b) => b[1]));
  const horizon = shiftDate(TODAY, Math.max(7, periodDays[period]));
  const upcoming = jobs.filter((j) => jobOpen(j) && jobDate(j) >= TODAY && jobDate(j) <= horizon).sort((a, b) => (jobDate(a) < jobDate(b) ? -1 : 1));
  const monthStart = TODAY.slice(0, 8) + "01";
  const doneMonth = jobs.filter((j) => j.status === "completed" && (j.completedAt ?? j.actualEnd ?? "").slice(0, 10) >= monthStart);
  const output: [string, number][] = [
    ["Jobs Completed", doneMonth.length],
    ["Sensors Installed", doneMonth.reduce((s, j) => s + (j.sensorsInstalled || 0), 0)],
    ["Machines Covered", doneMonth.reduce((s, j) => s + (j.machinesCovered || 0), 0)],
    ["Demo Jobs", doneMonth.filter((j) => j.installationType === "demo").length],
    ["Order Jobs", doneMonth.filter((j) => j.installationType === "order").length],
    ["Troubleshooting", doneMonth.filter((j) => j.installationType === "troubleshooting").length],
  ];
  const svMonth = ex.siteVisits.filter((v) => v.visitDate >= monthStart && v.visitDate <= TODAY && (eng === "all" || v.engineerIds.includes(eng)));
  const svStats: [string, number][] = [
    ["Site Visits", svMonth.length],
    ["Factory Inspections", svMonth.filter((v) => v.visitType === "factory_inspection").length],
    ["Sensor Collections", svMonth.filter((v) => v.visitType === "sensor_collection").length],
    ["Sensors Collected", svMonth.reduce((s, v) => s + v.sensorsCollected, 0)],
    ["Other Visits", svMonth.filter((v) => !["factory_inspection", "sensor_collection"].includes(v.visitType)).length],
    ["Follow-ups Pending", svMonth.filter((v) => v.outcome !== "completed").length],
  ];
  const jp = (j: ExecJob) => j.plantName || plantName(data, j.plantId) || j.customerName;

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Select className="w-52" value={eng} onChange={(e) => setEng(e.target.value)} aria-label="Execution Engineer">
          <option value="all">All Execution Engineers</option>
          {engs.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {cols.map((c) => <Card key={c.id} label={c.l} value={c.list.length} t={c.t} />)}
        <Card label="Overdue" value={overdue.length} hint="Past planned date" t="red" />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Execution Pipeline" meta={<Link to="/execution" className="text-signal">Open Execution →</Link>}>
          <div className="grid gap-3 p-3 md:grid-cols-2 2xl:grid-cols-4">
            {cols.map((c) => (
              <div key={c.id} className="rounded-lg bg-base p-2 ring-1 ring-line/60">
                <div className="mb-2 flex items-center justify-between px-1"><Badge t={c.t}>{c.l}</Badge><span className="num text-xs text-mute">{c.list.length}</span></div>
                <div className="grid gap-1.5">
                  {c.list.slice(0, 5).map((j) => (
                    <Link key={j.id} to="/execution" className="rounded-md bg-panel px-2.5 py-2 text-xs ring-1 ring-line/60 hover:ring-signal/40">
                      <div className="truncate text-sm font-medium">{jp(j)}</div>
                      <div className="text-mute">
                        {installTypeLabel[j.installationType]} · {c.id === "blocked" ? j.pendingReason || "Reason not given" : c.id === "close" ? closeGap(j) : c.id === "progress" ? nameOf(j.assignedEngineerId) : jobDate(j) ? fmtDate(jobDate(j)) : "Date not set"}
                      </div>
                    </Link>
                  ))}
                  {c.list.length > 5 ? <div className="px-1 text-[11px] text-mute">+{c.list.length - 5} more</div> : null}
                  {!c.list.length ? <div className="px-1 py-2 text-[11px] text-mute">None</div> : null}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid gap-4">
          <Panel title="Execution Blockers">
            <div className="grid gap-2 px-4 py-3">
              {blockers.map(([l, v]) => (
                <div key={l} className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-sm">
                  <span className={v ? "" : "text-mute"}>{l}</span><span className="num font-semibold">{v}</span>
                  <div className="col-span-2 mt-0.5 h-1.5 overflow-hidden rounded-full bg-line/60"><div className="h-full rounded-full bg-sev-high" style={{ width: `${(v / maxB) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="This Month — Execution Output">
            <div className="grid grid-cols-3 gap-2 px-4 py-3">
              {output.map(([l, v]) => <div key={l} className="rounded-md bg-base px-2 py-2 text-center ring-1 ring-line/60"><div className="num text-lg font-semibold">{v}</div><div className="text-[10px] leading-tight text-mute">{l}</div></div>)}
            </div>
          </Panel>
          <Panel title="This Month — Non-job Site Visits" meta={<Link to="/execution" className="text-signal">Open →</Link>}>
            <div className="grid grid-cols-3 gap-2 px-4 py-3">
              {svStats.map(([l, v]) => <div key={l} className="rounded-md bg-base px-2 py-2 text-center ring-1 ring-line/60"><div className="num text-lg font-semibold">{v}</div><div className="text-[10px] leading-tight text-mute">{l}</div></div>)}
            </div>
          </Panel>
        </div>
      </div>

      <Panel className="mt-4" title={`Upcoming Execution — Next ${Math.max(7, periodDays[period])} Days`}>
        <div className="hidden grid-cols-[0.6fr_1.4fr_0.8fr_1.4fr_1fr_0.8fr] gap-3 border-b border-line/60 px-4 py-2 text-[11px] text-mute md:grid">
          <span>Date</span><span>Plant</span><span>Job Type</span><span>Details</span><span>Owner</span><span>Status</span>
        </div>
        <div className="divide-y divide-line/60">
          {upcoming.map((j) => (
            <Link key={j.id} to="/execution" className="grid gap-1 px-4 py-2 text-sm hover:bg-black/[0.03] md:grid-cols-[0.6fr_1.4fr_0.8fr_1.4fr_1fr_0.8fr] md:items-center md:gap-3">
              <span className="num text-xs font-semibold">{fmtDate(jobDate(j))}</span>
              <span className="font-medium">{jp(j)}</span>
              <span className="text-xs">{installTypeLabel[j.installationType]}</span>
              <span className="truncate text-xs text-mute">{j.scheduleNotes || j.notes || "—"}</span>
              <span className="text-xs text-mute">{nameOf(j.assignedEngineerId)}</span>
              <span><Badge t="blue">{execStatusLabel[j.status]}</Badge></span>
            </Link>
          ))}
          {!upcoming.length ? <Empty>No execution scheduled in this window.</Empty> : null}
        </div>
      </Panel>
    </>
  );
}

function BusinessPipeline() {
  const { opps } = useOpps();
  const live = opps.filter((o) => !o.archived);
  const c = (f: (s: string) => boolean) => live.filter((o) => f(o.stage)).length;
  const rows: [string, number][] = [
    ["New", c((s) => s === "new" || s === "contacted")],
    ["Qualified", c((s) => s === "qualified")],
    ["Demo", c((s) => s.startsWith("demo"))],
    ["Proposal", c((s) => s === "proposal")],
    ["Order Won", c((s) => s === "order_won")],
    ["Execution", c((s) => s === "handed_exec" || s === "exec_progress")],
    ["CS Handover", c((s) => s === "cs_handover" || s === "exec_completed")],
  ];
  return (
    <Panel title="Business Pipeline" meta={<Link to="/opportunities" className="text-signal">Open Leads & Opportunities →</Link>}>
      <div className="grid grid-cols-4 gap-2 px-4 py-3 md:grid-cols-7">
        {rows.map(([l, v]) => <Link key={l} to="/opportunities" search={{ tab: "pipeline" } as never} className="rounded-md bg-base px-1.5 py-2 text-center ring-1 ring-line/60 hover:ring-signal/40"><div className={cn("num text-lg font-semibold", v ? "text-signal" : "text-mute")}>{v}</div><div className="text-[10px] leading-tight text-mute">{l}</div></Link>)}
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------ AMC RENEWALS */
function AmcPanel({ data, inCat }: { data: AppData; inCat: (pid: string) => boolean }) {
  const bs = useBranches();
  const rows = data.plants
    .filter((p) => inCat(p.id))
    .map((p) => ({ p, a: amcStatus(p.amcEnd, TODAY), o: ownershipOf(bs, p) }))
    .filter((r) => r.a.state === "renewal" || r.a.state === "expired")
    .sort((x, y) => (x.a.days ?? 0) - (y.a.days ?? 0));
  const noDate = data.plants.filter((p) => inCat(p.id) && (p.category ?? "order") === "order" && !p.amcEnd).length;
  const groups = new Map<string, typeof rows>();
  rows.forEach((r) => {
    const k = `${r.o.branch?.name ?? "No branch"} · ${r.o.sales?.name ?? "No sales engineer"}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  });
  return (
    <Panel
      className="mt-4"
      title="AMC Renewals — next 60 days"
      meta={<span>{rows.filter((r) => r.a.state === "expired").length} expired · {rows.filter((r) => r.a.state === "renewal").length} due{noDate ? ` · ${noDate} order plants without AMC date` : ""}</span>}
    >
      {rows.length === 0 ? (
        <Empty>No AMC renewals due. Add AMC end dates on the Plants page to track renewals.</Empty>
      ) : (
        <div className="divide-y divide-line/60">
          {[...groups.entries()].map(([k, list]) => (
            <div key={k} className="px-4 py-3">
              <div className="mb-1.5 text-xs font-semibold">{k}{list[0].o.branch?.rmName ? <span className="font-normal text-mute"> · RM {list[0].o.branch.rmName}</span> : null}</div>
              <div className="grid gap-1">
                {list.map(({ p, a }) => (
                  <Link key={p.id} to="/plants" className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm ring-1 ring-line/60 hover:bg-base">
                    <span className="min-w-0 truncate">{p.name}<span className="text-xs text-mute"> · ends {fmtDate(p.amcEnd!)}</span></span>
                    <span className={cn("num shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium", a.state === "expired" ? "bg-sev-high/10 text-sev-high" : (a.days ?? 0) <= 30 ? "bg-sev-high/10 text-sev-high" : "bg-sev-medium/10 text-sev-medium")}>
                      {a.state === "expired" ? `Expired ${-a.days!}d` : `${a.days}d left`}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
