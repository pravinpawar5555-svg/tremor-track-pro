import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { AppShell } from "@/components/console/AppShell";
import { Chip, Empty, Kpi, Panel, PageHeader, Select } from "@/components/console/ui";
import { cn } from "@/lib/utils";
import { useDailyWork } from "@/lib/dailywork";
import {
  TODAY,
  analystsOf,
  daysBetween,
  engineerName,
  fmtDate,
  frequencyLabel,
  plantName,
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

function AttentionRow({ to, label, hint, value, tone }: { to: string; label: string; hint: string; value: number; tone: string }) {
  return (
    <Link to={to} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-black/[0.03]">
      <span className="flex items-start gap-2.5">
        <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", tone.replace("text-", "bg-"))} />
        <span>
          <span className="block font-medium">{label}</span>
          <span className="block text-xs text-mute">{hint}</span>
        </span>
      </span>
      <span className={cn("num text-lg font-semibold", value ? tone : "text-mute")}>{value}</span>
    </Link>
  );
}

const FLOW_SERIES = [
  { k: "assigned" as const, color: "var(--flow-assigned)", l: "Assigned" },
  { k: "completed" as const, color: "var(--flow-completed)", l: "Completed" },
  { k: "carried" as const, color: "var(--flow-carried)", l: "Carried Forward" },
];

function FlowChart({ rows, who }: { rows: ReturnType<typeof flow>; who?: string }) {
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
  return <AppShell>{data.role === "manager" ? <ManagerDashboard data={data} /> : <EngineerDashboard data={data} />}</AppShell>;
}

function ManagerDashboard({ data }: { data: AppData }) {
  const allTeam = analystsOf(data);
  const [eng, setEng] = useState("all");
  const team = eng === "all" ? allTeam : allTeam.filter((a) => a.id === eng);
  const ids = new Set(team.map((a) => a.id));
  const tasks = data.tasks.filter((t) => ids.has(t.engineerId));
  const today = tasks.filter((t) => t.taskDate === TODAY);
  const done = today.filter((t) => t.status === "completed").length;
  const carried = today.filter(isCarried);
  const waiting = today.filter((t) => t.status === "waiting");
  const tk = ticketKpis(data);
  const reviewTasks = today.filter((t) => waitFor(t, "manager"));
  const review = reviewTasks.length + tk.waitingOnManager;
  const custWait = today.filter((t) => waitFor(t, "customer"));
  const reports = data.reports.filter((r) => eng === "all" || r.byEngineerId === eng);
  const rb = reportBuckets(data, reports);
  const noUpdate = team.filter((a) => !today.some((t) => t.engineerId === a.id)).length;
  const oldCarry = carried.filter((t) => carryAge(t) > 2);
  const pct = today.length ? Math.round((done / today.length) * 100) : 0;

  const recommended = [
    ...reviewTasks.map((t) => ({ key: t.id, title: `Review — ${t.title}`, sub: `${engineerName(data, t.engineerId)} · ${t.plantId ? plantName(data, t.plantId) : "Internal"}`, tag: "Manager review", tone: "text-[oklch(0.55_0.18_300)]", to: "/tasks", s: 100 + score(t) })),
    ...(data.tickets ?? []).filter((t) => t.status === "open" || t.status === "in-discussion").slice(0, 3).map((t) => ({ key: t.id, title: `${t.ticketNo} · ${t.subject}`, sub: `${engineerName(data, t.raisedBy)} · ${plantName(data, t.plantId)}`, tag: "Ticket", tone: "text-[oklch(0.55_0.18_300)]", to: "/discussions", s: 90 })),
    ...custWait.map((t) => ({ key: t.id, title: `Follow up with customer — ${t.plantId ? plantName(data, t.plantId) : t.title}`, sub: `${engineerName(data, t.engineerId)} · Customer response pending`, tag: "Customer follow-up", tone: "text-sev-high", to: "/tasks", s: 60 + score(t) })),
    ...rb.overdue.slice(0, 2).map((r) => ({ key: r.id, title: `${frequencyLabel[r.type]} report overdue — ${plantName(data, r.plantId)}`, sub: `${engineerName(data, r.byEngineerId)} · due ${fmtDate(r.dueDate)}`, tag: "Report", tone: "text-sev-critical", to: "/reports", s: 70 })),
  ]
    .sort((a, b) => b.s - a.s)
    .slice(0, 3);

  const plants = data.plants;
  const orderN = plants.filter((p) => (p.category ?? "order") === "order").length;
  const recentPlants = new Set(data.reports.filter((r) => r.status === "sent" && r.sentDate && r.sentDate >= shiftDate(TODAY, -30)).map((r) => r.plantId));

  const activity = tasks
    .flatMap((t) => t.activity.map((a) => ({ ...a, t })))
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 6);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Team overview, key updates and actions · ${fmtDate(TODAY)}`}
        actions={
          <Select className="w-48" value={eng} onChange={(e) => setEng(e.target.value)} aria-label="Engineer">
            <option value="all">All engineers</option>
            {allTeam.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Today's work" value={today.length} hint="Assigned to team" />
        <Kpi label="Completed" value={done} tone="low" hint={`${pct}% completed`} />
        <Kpi label="Remaining" value={today.length - done} tone={today.length - done ? "medium" : "low"} hint="Needs action" />
        <Kpi label="Carried forward" value={carried.length} tone={carried.length ? "medium" : "low"} hint="From previous days" />
        <Kpi label="Needs my review" value={review} tone={review ? "high" : "low"} hint="Engineer items waiting" />
        <Kpi label="Reports attention" value={rb.overdue.length} tone={rb.overdue.length ? "critical" : "low"} hint="Overdue / requires action" />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[1.25fr_1fr]">
        <div className="grid gap-4">
          <Section title="Team today" link="View daily work" to="/tasks">
            <div className="divide-y divide-line/60">
              {team.map((a) => {
                const mine = today.filter((t) => t.engineerId === a.id);
                const d = mine.filter((t) => t.status === "completed").length;
                const p = mine.length ? Math.round((d / mine.length) * 100) : 0;
                const focus = mine.filter((t) => t.status !== "completed").sort((x, y) => score(y) - score(x))[0];
                const repDue = data.reports.filter((r) => r.byEngineerId === a.id && r.status !== "sent" && r.dueDate <= shiftDate(TODAY, 7)).length;
                return (
                  <div key={a.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="grid size-7 place-items-center rounded-full bg-signal/10 text-[11px] font-semibold text-signal">{a.initials}</span>
                        <div>
                          <div className="font-medium">{a.name}</div>
                          <div className="text-[11px] text-mute">{focus ? `Current focus: ${focus.plantId ? plantName(data, focus.plantId) : focus.title}` : mine.length ? "All done for today" : "No tasks planned yet"}</div>
                        </div>
                      </div>
                      <div className="text-right text-sm"><span className="num font-semibold">{d} / {mine.length}</span> <span className="text-xs text-mute">completed</span></div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/60"><div className="h-full rounded-full bg-sev-low" style={{ width: `${p}%` }} /></div>
                      <span className="num text-xs text-mute">{p}%</span>
                    </div>
                    <div className="mt-2 grid grid-cols-5 gap-1.5">
                      <Stat label="To Do" value={mine.filter((t) => t.status === "pending").length} />
                      <Stat label="In Progress" value={mine.filter((t) => t.status === "in_progress").length} tone="text-signal" />
                      <Stat label="Waiting" value={mine.filter((t) => t.status === "waiting").length} tone="text-sev-high" />
                      <Stat label="Carried" value={mine.filter(isCarried).length} tone="text-sev-medium" />
                      <Stat label="Reports due" value={repDue} tone="text-sev-critical" />
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Recommended next (for you)" to="/tasks">
            <div className="divide-y divide-line/60">
              {recommended.map((r) => (
                <Link key={r.key} to={r.to} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm hover:bg-black/[0.03]">
                  <div>
                    <div className="font-medium">{r.title}</div>
                    <div className="text-xs text-mute">{r.sub}</div>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] ring-1 ring-current/30", r.tone)}>{r.tag}</span>
                </Link>
              ))}
              {!recommended.length ? <Empty>Nothing waiting on you right now.</Empty> : null}
            </div>
          </Section>

          <TeamFlow data={data} />
        </div>

        <div className="grid gap-4">
          <Section title="Needs my attention">
            <div className="divide-y divide-line/60">
              <AttentionRow to="/reports" label="Reports overdue" hint={`Across ${rb.plantsOver} plants${rb.oldest ? ` · oldest ${rb.oldest} days` : ""}`} value={rb.overdue.length} tone="text-sev-critical" />
              <AttentionRow to="/tasks" label="Carried forward > 2 days" hint="Requires re-planning" value={oldCarry.length} tone="text-sev-medium" />
              <AttentionRow to="/discussions" label="Waiting for my review" hint="Submitted by engineers / tickets" value={review} tone="text-[oklch(0.55_0.18_300)]" />
              <AttentionRow to="/tasks" label="Waiting for customer" hint="Customer response pending" value={custWait.length} tone="text-sev-high" />
              <AttentionRow to="/tasks" label="Engineers without tasks today" hint="Daily list not started" value={noUpdate} tone="text-sev-high" />
            </div>
          </Section>

          <Section title="Report delivery" to="/reports">
            <div className="grid grid-cols-4 gap-2 px-4 py-3">
              <Stat label="Overdue" value={rb.overdue.length} tone="text-sev-critical" />
              <Stat label="Due today" value={rb.dueToday.length} tone="text-signal" />
              <Stat label="Next 3 days" value={rb.next3.length} tone="text-sev-medium" />
              <Stat label="Next 7 days" value={rb.next7.length} />
            </div>
            <div className="divide-y divide-line/60 border-t border-line/60">
              {rb.urgent.map((r) => {
                const tm = reportTiming(r);
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{plantName(data, r.plantId)}</div>
                      <div className="text-xs text-mute">{frequencyLabel[r.type]} · {engineerName(data, r.byEngineerId)}</div>
                    </div>
                    <Chip severity={tm.late ? "critical" : tm.days === 0 ? "medium" : "advisory"} label={tm.late ? "Overdue" : dueWord(r.dueDate)} />
                  </div>
                );
              })}
              {!rb.urgent.length ? <Empty>No open reports.</Empty> : null}
            </div>
          </Section>

          <Section title="Plant coverage" to="/plants">
            <div className="grid grid-cols-3 gap-2 px-4 py-3">
              <Stat label="Plants" value={plants.length} />
              <Stat label="Order" value={orderN} tone="text-signal" />
              <Stat label="Demo" value={plants.length - orderN} tone="text-sev-medium" />
            </div>
            <div className="divide-y divide-line/60 border-t border-line/60 text-sm">
              {[
                ["Reports due this week", rb.dueToday.length + rb.next3.length + rb.next7.length],
                ["No report sent in 30 days", plants.filter((p) => !recentPlants.has(p.id)).length],
                ["Customer follow-up open", custWait.length],
              ].map(([l, v]) => (
                <div key={l as string} className="flex justify-between px-4 py-2"><span className="text-mute">{l}</span><span className="num font-medium">{v}</span></div>
              ))}
            </div>
          </Section>

          <Section title="Recent activity" to="/tasks">
            <div className="divide-y divide-line/60">
              {activity.map((a, i) => (
                <div key={i} className="flex items-start justify-between gap-3 px-4 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate">{a.text} — <span className="text-mute">{a.t.title}</span></div>
                    <div className="text-xs text-mute">{engineerName(data, a.t.engineerId)}{a.t.plantId ? ` · ${plantName(data, a.t.plantId)}` : ""}</div>
                  </div>
                  <span className="num shrink-0 text-xs text-mute">{fmtDate(a.at.slice(0, 10))}</span>
                </div>
              ))}
              {!activity.length ? <Empty>No recent activity.</Empty> : null}
            </div>
          </Section>
        </div>
      </div>
    </>
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
  const reports = data.reports.filter((r) => r.byEngineerId === me && r.status !== "sent");
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
        <Kpi label="Reports due" value={weekReports.length} tone={weekReports.some((r) => reportTiming(r).late) ? "critical" : "advisory"} hint="This week" />
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

          <Section title="Upcoming" to="/reports">
            <div className="divide-y divide-line/60 text-sm">
              <div className="flex items-start justify-between gap-3 px-4 py-2.5">
                <div>
                  <div className="font-medium">{weekReports.length} reports due</div>
                  <div className="text-xs text-mute">{[...new Set(weekReports.map((r) => plantName(data, r.plantId)))].slice(0, 3).join(", ") || "—"}</div>
                </div>
                <span className="text-xs text-signal">Within this week</span>
              </div>
              <div className="flex items-start justify-between gap-3 px-4 py-2.5">
                <div>
                  <div className="font-medium">{upcomingFollow.length} customer follow-ups</div>
                  <div className="text-xs text-mute">{upcomingFollow.slice(0, 3).map((t) => (t.plantId ? plantName(data, t.plantId) : t.title)).join(", ") || "—"}</div>
                </div>
                <span className="text-xs text-signal">Within this week</span>
              </div>
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
