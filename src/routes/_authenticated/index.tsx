import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { AppShell } from "@/components/console/AppShell";
import { Chip, Empty, Kpi, Panel, PageHeader, Select } from "@/components/console/ui";
import { cn } from "@/lib/utils";
import { useDomain } from "@/lib/domain";
import { ExecutionHome } from "@/components/console/ExecutionHome";
import { ManagerDashboard, type ManagerView } from "@/components/console/ManagerDashboard";
import { useDailyWork } from "@/lib/dailywork";
import {
  TODAY,
  analystsOf,
  daysBetween,
  engineerName,
  fmtDate,
  frequencyLabel,
  plantName,
  plantFrequencies,
  activeReports,
  scopedReports,
  reportTiming,
  shiftDate,
  taskPriorityLabel,
  taskStatusLabel,
  taskTypeLabel,
  ticketKpis,
  useData,
  type AppData,
  type Severity,
  type Task,
  type TaskStatus,
} from "@/lib/store";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Forbes Marshall CM Work Portal" },
      { name: "description", content: "Today's team work, progress, carried-forward items, reviews and report delivery at a glance." },
      { property: "og:title", content: "Dashboard — Forbes Marshall CM Work Portal" },
      { property: "og:description", content: "Role-based overview of daily work, follow-ups and customer report delivery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { view?: ManagerView | undefined } => ({
    view: s["view"] === "cs" || s["view"] === "execution" || s["view"] === "overview" ? s["view"] : undefined,
  }),
  component: Dashboard,
});

/* ------------------------------------------------------------ helpers */

const isCarried = (t: Task) => t.originalDate < t.taskDate && t.status !== "completed";
const carryAge = (t: Task) => Math.max(0, daysBetween(t.originalDate, TODAY));
const doneOn = (t: Task) => (t.completedAt ?? "").slice(0, 10);
const waitFor = (t: Task, word: string) => t.status === "waiting" && t.waitingReason.toLowerCase().includes(word);
const statusTone: Record<TaskStatus, Severity> = { pending: "advisory", in_progress: "low", waiting: "medium", completed: "low" };
const prioTone = { high: "high", medium: "medium", normal: "advisory" } as const;

function score(t: Task) {
  let s = t.priority === "high" ? 40 : t.priority === "medium" ? 20 : 0;
  s += Math.min(carryAge(t), 5) * 8;
  if (t.dueDate && t.dueDate < TODAY) s += 30;
  if (t.dueDate === TODAY) s += 15;
  if (t.taskType === "report" || t.taskType === "followup") s += 10;
  if (t.status === "in_progress") s += 5;
  return s;
}

function dueWord(iso: string) {
  if (!iso) return "—";
  const d = daysBetween(TODAY, iso);
  if (d < 0) return "Overdue";
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d <= 6) return "This week";
  return fmtDate(iso);
}

/*
 * 7-day work flow — reconstructed from each task's own history so past days stay stable.
 * A task keeps one record across days: originalDate = first work date, taskDate = latest work date,
 * completedAt = the day it was finished. Its workload span is originalDate → (completion day, or taskDate).
 *  ASSIGNED  (date d): tasks whose span covers d — counted once per task per day.
 *  COMPLETED (date d): tasks whose completion day is d.
 *  CARRIED   (date d): tasks in the span on d that started on an earlier date (unfinished, brought in).
 * Changing or completing a task later only affects dates from today onward, never earlier days.
 */
function flow(tasks: Task[]) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = shiftDate(TODAY, i - 6);
    let assigned = 0, completed = 0, carried = 0;
    for (const t of tasks) {
      const done = t.status === "completed" ? doneOn(t) || t.taskDate : "";
      const end = done || (t.taskDate > TODAY ? t.taskDate : t.taskDate < TODAY ? TODAY : t.taskDate);
      if (t.originalDate > d || end < d) continue;
      assigned++;
      if (done === d) completed++;
      if (t.originalDate < d) carried++;
    }
    return { d, assigned, completed, carried };
  });
}

function reportBuckets(d: AppData, reports: AppData["reports"]) {
  const open = reports.filter((r) => r.status !== "sent");
  const overdue = open.filter((r) => reportTiming(r).late);
  const dueToday = open.filter((r) => r.dueDate === TODAY);
  const next3 = open.filter((r) => r.dueDate > TODAY && r.dueDate <= shiftDate(TODAY, 3));
  const next7 = open.filter((r) => r.dueDate > shiftDate(TODAY, 3) && r.dueDate <= shiftDate(TODAY, 7));
  const oldest = overdue.reduce((m, r) => Math.max(m, reportTiming(r).days), 0);
  const plantsOver = new Set(overdue.map((r) => r.plantId)).size;
  const urgent = [...open].sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1)).slice(0, 4);
  void d;
  return { open, overdue, dueToday, next3, next7, oldest, plantsOver, urgent };
}

/* ------------------------------------------------------------ small ui */

function Section({ title, link, to, children, className }: { title: string; link?: string; to?: string; children: ReactNode; className?: string }) {
  return (
    <Panel className={className ?? ""} title={title} meta={to ? <Link to={to} className="text-signal">{link ?? "View all"} →</Link> : null}>
      {children}
    </Panel>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-md bg-base px-2 py-1.5 text-center ring-1 ring-line/60">
      <div className={cn("text-[10px] text-mute", tone)}>{label}</div>
      <div className={cn("num text-sm font-semibold", tone)}>{value}</div>
    </div>
  );
}

const FLOW_SERIES = [
  { k: "assigned" as const, color: "var(--flow-assigned)", l: "Assigned" },
  { k: "completed" as const, color: "var(--flow-completed)", l: "Completed" },
  { k: "carried" as const, color: "var(--flow-carried)", l: "Carried Forward" },
];

function FlowChart({ rows, who }: { rows: ReturnType<typeof flow>; who?: string | undefined }) {
  const peak = Math.max(1, ...rows.flatMap((r) => [r.assigned, r.completed, r.carried]));
  const step = Math.max(1, Math.ceil(peak / 4));
  const max = step * 4 + Math.ceil(step / 2); // headroom for labels
  const ticks = [4, 3, 2, 1, 0].map((i) => i * step);
  const H = 180;
  return (
    <div className="px-4 py-3">
      <div className="mb-3 flex flex-wrap gap-4 text-[11px] text-mute">
        {FLOW_SERIES.map((s) => (
          <span key={s.k} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: s.color }} />{s.l}</span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <div className="flex min-w-[520px] gap-2">
          <div className="relative w-6 shrink-0" style={{ height: H }}>
            {ticks.map((t) => (
              <span key={t} className="num absolute right-0 -translate-y-1/2 text-[10px] leading-none text-mute" style={{ bottom: `${(t / max) * 100}%`, transform: "translateY(50%)" }}>{t}</span>
            ))}
          </div>
          <div className="flex-1">
            <div className="relative" style={{ height: H }}>
              {ticks.map((t) => (
                <div key={t} className={cn("absolute inset-x-0 border-t", t === 0 ? "border-line" : "border-line/50")} style={{ bottom: `${(t / max) * 100}%` }} />
              ))}
              <div className="relative grid h-full grid-cols-7 gap-4">
                {rows.map((r) => (
                  <div key={r.d} className="flex h-full items-end justify-center gap-1" title={`${fmtDate(r.d)}${who ? ` · ${who}` : ""}\nAssigned: ${r.assigned}\nCompleted: ${r.completed}\nCarried Forward: ${r.carried}`}>
                    {FLOW_SERIES.map((s) => {
                      const v = r[s.k];
                      return (
                        <div key={s.k} className="flex h-full w-full max-w-5 flex-col items-center justify-end">
                          <span className="num mb-0.5 text-[10px] font-semibold leading-none text-ink">{v}</span>
                          <div className="w-full rounded-t-[2px]" style={{ height: `${(v / max) * 100}%`, background: s.color }} />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-1.5 grid grid-cols-7 gap-4">
              {rows.map((r) => (
                <div key={r.d} className={cn("num text-center text-[10px]", r.d === TODAY ? "font-semibold text-ink" : "text-mute")}>
                  {fmtDate(r.d).split(" ").slice(0, 2).join(" ")}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamFlow({ data }: { data: AppData }) {
  const team = analystsOf(data);
  const [sel, setSel] = useState("all");
  const person = team.find((a) => a.id === sel);
  const rows = flow(data.tasks.filter((t) => (person ? t.engineerId === person.id : team.some((a) => a.id === t.engineerId))));
  const toggle = (
    <div className="inline-flex overflow-hidden rounded-md ring-1 ring-line">
      {[{ id: "all", n: "Total" }, ...team.map((a) => ({ id: a.id, n: a.name.split(" ")[0] }))].map((o) => (
        <button key={o.id} type="button" onClick={() => setSel(o.id)} className={cn("px-2.5 py-1 text-[11px] font-medium", sel === o.id ? "bg-signal text-signal-foreground" : "bg-panel text-mute hover:bg-base")}>{o.n}</button>
      ))}
    </div>
  );
  return (
    <Panel title={person ? `7-Day Work Flow — ${person.name}` : "7-Day Work Flow (Team)"} meta={toggle}>
      <FlowChart rows={rows} who={person?.name} />
    </Panel>
  );
}

function TaskLine({ data, t, right }: { data: AppData; t: Task; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
      <div className="min-w-0">
        <div className="font-medium">{t.title}</div>
        <div className="text-xs text-mute">
          {[t.plantId ? plantName(data, t.plantId) : "Internal", taskTypeLabel[t.taskType], isCarried(t) ? `Carried from ${fmtDate(t.originalDate)}` : "", t.waitingReason && t.status === "waiting" ? t.waitingReason : ""].filter(Boolean).join(" · ")}
        </div>
      </div>
      {right}
    </div>
  );
}

/* ------------------------------------------------------------ page */

function Dashboard() {
  const data = useData();
  const domain = useDomain();
  if (domain === "execution") return <AppShell><ExecutionHome /></AppShell>;
  return <AppShell>{data.role === "manager" ? <ManagerHome data={data} /> : <EngineerDashboard data={data} />}</AppShell>;
}

function ManagerHome({ data }: { data: AppData }) {
  const { view } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ManagerDashboard
      data={data}
      view={view ?? "overview"}
      onView={(v) => void navigate({ search: { view: v === "overview" ? undefined : v }, replace: true })}
      csExtra={<TeamFlow data={data} />}
    />
  );
}

function EngineerDashboard({ data }: { data: AppData }) {
  const me = data.currentUserId;
  const { reminders } = useDailyWork();
  const [tab, setTab] = useState<"all" | TaskStatus>("all");
  const [remTab, setRemTab] = useState<"today" | "upcoming" | "overdue">("today");
  const [showDone, setShowDone] = useState(false);
  const mineAll = data.tasks.filter((t) => t.engineerId === me);
  const today = mineAll.filter((t) => t.taskDate === TODAY);
  const active = today.filter((t) => t.status !== "completed").sort((a, b) => score(b) - score(a));
  const completed = today.filter((t) => t.status === "completed");
  const waiting = active.filter((t) => t.status === "waiting");
  const carried = today.filter(isCarried);
  const reports = scopedReports(data).filter((r) => r.byEngineerId === me && r.status !== "sent");
  const weekReports = reports.filter((r) => r.dueDate <= shiftDate(TODAY, 7));
  const pct = today.length ? Math.round((completed.length / today.length) * 100) : 0;
  const next = active.find((t) => t.status !== "waiting");
  const shown = tab === "all" ? active : active.filter((t) => t.status === tab);
  const myRem = reminders.filter((r) => r.status === "active" && r.userId === me);
  const remShown = myRem.filter((r) => (remTab === "today" ? r.date === TODAY : remTab === "upcoming" ? r.date > TODAY : r.date < TODAY));
  const upcomingFollow = mineAll.filter((t) => t.status !== "completed" && t.taskType === "followup" && t.dueDate && t.dueDate > TODAY && t.dueDate <= shiftDate(TODAY, 7));

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Your daily work, progress and updates · ${fmtDate(TODAY)}`} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Assigned today" value={today.length} hint="Your tasks" />
        <Kpi label="Completed" value={completed.length} tone="low" hint={`${pct}% completed`} />
        <Kpi label="Remaining" value={active.length} tone={active.length ? "medium" : "low"} hint="Needs action" />
        <Kpi label="Carried forward" value={carried.length} tone={carried.length ? "medium" : "low"} hint="From previous days" />
        <Kpi label="Waiting" value={waiting.length} tone={waiting.length ? "high" : "low"} hint="On hold" />
        <Kpi label="Reports due" value={weekReports.length} tone={weekReports.some((r) => reportTiming(r).late) ? "critical" : "advisory"} hint="Your reports · this week" />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="grid gap-4">
          <Section title="Recommended next" to="/tasks" link="Open daily work">
            {next ? (
              <div className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <div className="mb-1"><Chip severity={prioTone[next.priority]} label={`${taskPriorityLabel[next.priority]} priority`} /></div>
                  <div className="font-medium">{next.title}</div>
                  <div className="text-xs text-mute">
                    {[next.plantId ? `Plant: ${plantName(data, next.plantId)}` : "Internal", `Type: ${taskTypeLabel[next.taskType]}`, isCarried(next) ? "Carried forward from previous day" : "", next.dueDate ? `Due: ${dueWord(next.dueDate)}` : ""].filter(Boolean).join(" · ")}
                  </div>
                  {next.description ? <div className="mt-1 text-xs text-mute">{next.description}</div> : null}
                </div>
                <Link to="/tasks" className="shrink-0 rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-signal-foreground">Open task</Link>
              </div>
            ) : (
              <Empty>No open tasks — add today's work in Daily Work.</Empty>
            )}
          </Section>

          <Section title={`My active work (${active.length})`} to="/tasks">
            <div className="flex flex-wrap gap-1.5 px-4 pt-3">
              {(["all", "pending", "in_progress", "waiting"] as const).map((k) => (
                <button key={k} type="button" onClick={() => setTab(k)} className={cn("rounded-md px-2.5 py-1 text-xs ring-1", tab === k ? "bg-signal text-signal-foreground ring-signal" : "text-mute ring-line")}>
                  {k === "all" ? "All" : taskStatusLabel[k]} ({k === "all" ? active.length : active.filter((t) => t.status === k).length})
                </button>
              ))}
            </div>
            <div className="mt-2 divide-y divide-line/60">
              {shown.map((t) => (
                <TaskLine
                  key={t.id}
                  data={data}
                  t={t}
                  right={
                    <span className="flex shrink-0 items-center gap-1.5">
                      <Chip severity={prioTone[t.priority]} label={taskPriorityLabel[t.priority]} />
                      <Chip severity={statusTone[t.status]} label={taskStatusLabel[t.status]} />
                      <Link to="/tasks" className="text-xs text-signal">{t.status === "in_progress" ? "Continue" : "Open"}</Link>
                    </span>
                  }
                />
              ))}
              {!shown.length ? <Empty>Nothing here.</Empty> : null}
            </div>
          </Section>

          <div className="panel-inset">
            <button type="button" onClick={() => setShowDone((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-sm">
              <span className="font-medium">Completed today ({completed.length})</span>
              <span className="text-xs text-signal">{showDone ? "Hide" : "Show"}</span>
            </button>
            {showDone ? (
              <div className="divide-y divide-line/60 border-t border-line/60">
                {completed.map((t) => (
                  <TaskLine key={t.id} data={data} t={t} right={<span className="text-xs text-sev-low">Done{t.completionNote ? ` · ${t.completionNote}` : ""}</span>} />
                ))}
                {!completed.length ? <Empty>Nothing completed yet today.</Empty> : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4">
          <Section title="My reminders" to="/tasks" link="Add reminder">
            <div className="flex gap-1.5 px-4 pt-3">
              {(["today", "upcoming", "overdue"] as const).map((k) => (
                <button key={k} type="button" onClick={() => setRemTab(k)} className={cn("rounded-md px-2.5 py-1 text-xs capitalize ring-1", remTab === k ? "bg-signal/10 text-signal ring-signal/40" : "text-mute ring-line")}>
                  {k} ({myRem.filter((r) => (k === "today" ? r.date === TODAY : k === "upcoming" ? r.date > TODAY : r.date < TODAY)).length})
                </button>
              ))}
            </div>
            <div className="mt-2 divide-y divide-line/60">
              {remShown.map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-3 px-4 py-2 text-sm">
                  <div>
                    <div className="font-medium">{r.title}</div>
                    <div className="text-xs text-mute">{[r.description, r.plantId ? plantName(data, r.plantId) : ""].filter(Boolean).join(" · ")}</div>
                  </div>
                  <span className={cn("shrink-0 text-xs", r.date < TODAY ? "text-sev-critical" : "text-mute")}>{r.date < TODAY ? "Overdue" : dueWord(r.date)}</span>
                </div>
              ))}
              {!remShown.length ? <Empty>No reminders.</Empty> : null}
            </div>
          </Section>

          <Section title="Waiting" to="/tasks">
            <div className="divide-y divide-line/60">
              {waiting.map((t) => (
                <TaskLine key={t.id} data={data} t={t} right={<Chip severity="medium" label={t.waitingReason || "Waiting"} />} />
              ))}
              {!waiting.length ? <Empty>Nothing on hold.</Empty> : null}
            </div>
          </Section>

          <Section title={`Upcoming — ${engineerName(data, me)} (${weekReports.length + upcomingFollow.length} this week)`} to="/reports">
            <div className="divide-y divide-line/60 text-sm">
              <div className="flex items-center justify-between bg-surface/60 px-4 py-1.5 text-xs font-medium text-mute">
                <span>Reports due</span><span className="num">{weekReports.length}</span>
              </div>
              {weekReports
                .slice()
                .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                .slice(0, 5)
                .map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-3 px-4 py-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{plantName(data, r.plantId)}</div>
                      <div className="text-xs text-mute">{r.type} · {r.period || "—"}</div>
                    </div>
                    <span className={cn("shrink-0 text-xs", reportTiming(r).late ? "text-sev-critical" : "text-mute")}>{reportTiming(r).late ? "Overdue" : dueWord(r.dueDate)}</span>
                  </div>
                ))}
              {!weekReports.length ? <Empty>No reports due this week.</Empty> : null}

              <div className="flex items-center justify-between bg-surface/60 px-4 py-1.5 text-xs font-medium text-mute">
                <span>Customer follow-ups</span><span className="num">{upcomingFollow.length}</span>
              </div>
              {upcomingFollow
                .slice()
                .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
                .slice(0, 5)
                .map((t) => (
                  <div key={t.id} className="flex items-start justify-between gap-3 px-4 py-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{t.title}</div>
                      <div className="text-xs text-mute">{t.plantId ? plantName(data, t.plantId) : "Internal"}</div>
                    </div>
                    <span className="shrink-0 text-xs text-mute">{t.dueDate ? dueWord(t.dueDate) : "—"}</span>
                  </div>
                ))}
              {!upcomingFollow.length ? <Empty>No follow-ups this week.</Empty> : null}
            </div>
          </Section>

          <Section title={`7-Day Work Summary — ${engineerName(data, me)}`}>
            <FlowChart rows={flow(mineAll)} who={engineerName(data, me)} />
          </Section>
        </div>
      </div>
    </>
  );
}
