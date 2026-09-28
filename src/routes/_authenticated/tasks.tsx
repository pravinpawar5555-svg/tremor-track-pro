import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/console/AppShell";
import { Button, Empty, Field, Panel, Select, TextArea, TextInput } from "@/components/console/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  TODAY,
  addTask,
  addTaskNote,
  analystsOf,
  carryTasks,
  currentUser,
  dayDiff,
  engineerName,
  fmtDate,
  plantName,
  removeTask,
  setTaskStatus,
  shiftDate,
  taskPriorityLabel,
  taskStatusLabel,
  taskTypeLabel,
  updateTask,
  useData,
  waitingReasons,
  type AppData,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
} from "@/lib/store";
import {
  blankReminder,
  deleteReminder,
  notifyLabel,
  saveClosure,
  saveReminder,
  useDailyWork,
  type NotifyRule,
  type Reminder,
} from "@/lib/dailywork";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Daily Work — Forbes Marshall CM Portal" },
      { name: "description", content: "Manage and complete daily work: active tasks, carry-forward, reminders, close day and task history." },
      { property: "og:title", content: "Daily Work — Forbes Marshall CM Portal" },
      { property: "og:description", content: "Daily work workspace for condition monitoring engineers and their manager." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DailyWorkPage,
});

// ------------------------------------------------------------------ helpers

type Tab = "all" | "pending" | "in_progress" | "waiting";
type GroupBy = "none" | "engineer" | "plant" | "priority" | "status" | "type" | "due" | "age";
type Attention = "" | "overdue" | "carried" | "wait_customer" | "wait_manager" | "stale";

const prioRank: Record<TaskPriority, number> = { high: 0, medium: 1, normal: 2 };
const prioCls: Record<TaskPriority, string> = {
  high: "bg-sev-critical/10 text-sev-critical",
  medium: "bg-sev-medium/15 text-sev-medium",
  normal: "bg-sev-low/10 text-sev-low",
};
const statusCls: Record<TaskStatus, string> = {
  pending: "bg-line/50 text-ink",
  in_progress: "bg-signal/10 text-signal",
  waiting: "bg-sev-medium/15 text-sev-medium",
  completed: "bg-sev-low/10 text-sev-low",
};
const types = Object.keys(taskTypeLabel) as TaskType[];
const prios = Object.keys(taskPriorityLabel) as TaskPriority[];

const timeOf = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const longDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", weekday: "long" }).replace(/^(\w+), (.*)$/, "$2, $1");
const nextWorkingDay = (iso: string) => {
  let d = shiftDate(iso, 1);
  if (new Date(d + "T00:00:00").getDay() === 0) d = shiftDate(d, 1);
  return d;
};
const ageDays = (t: Task) => Math.max(0, dayDiff(t.originalDate, t.taskDate));
const isOverdue = (t: Task) => t.status !== "completed" && !!t.dueDate && t.dueDate < TODAY;
const waitDays = (t: Task) => {
  const last = [...t.activity].reverse().find((a) => a.text.startsWith("Waiting"));
  return last ? Math.max(0, dayDiff(last.at.slice(0, 10), TODAY)) : 0;
};
function sortActive(a: Task, b: Task) {
  const o = Number(isOverdue(b)) - Number(isOverdue(a));
  if (o) return o;
  const p = prioRank[a.priority] - prioRank[b.priority];
  if (p) return p;
  const dt = (a.dueTime || "99") < (b.dueTime || "99") ? -1 : (a.dueTime || "99") > (b.dueTime || "99") ? 1 : 0;
  if (dt) return dt;
  return ageDays(b) - ageDays(a);
}

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium", className)}>{children}</span>;
}

function CarryBadge({ t }: { t: Task }) {
  const n = ageDays(t);
  if (!n) return <span className="text-mute">—</span>;
  const cls = n >= 3 ? "bg-sev-critical/10 text-sev-critical" : n === 2 ? "bg-sev-high/15 text-sev-high" : "bg-sev-medium/15 text-sev-medium";
  return <Badge className={cls}>From {fmtDate(t.originalDate)} · {n} {n === 1 ? "day" : "days"}</Badge>;
}

// ------------------------------------------------------------------ page

function DailyWorkPage() {
  const data = useData();
  const dw = useDailyWork();
  const manager = data.role === "manager";
  const me = data.currentUserId;
  const team = analystsOf(data);
  const user = currentUser(data);

  const [date, setDate] = useState(TODAY);
  const [engFilter, setEngFilter] = useState("all");
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [fPlant, setFPlant] = useState("");
  const [fType, setFType] = useState("");
  const [fPrio, setFPrio] = useState("");
  const [attention, setAttention] = useState<Attention>("");
  const [groupBy, setGroupBy] = useState<GroupBy>(manager ? "engineer" : "none");
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [waitFor, setWaitFor] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(`dw.groupBy.${data.role}`) as GroupBy | null;
    if (saved) setGroupBy(saved);
  }, [data.role]);
  const pickGroup = (g: GroupBy) => {
    setGroupBy(g);
    window.localStorage.setItem(`dw.groupBy.${data.role}`, g);
  };

  const scopeIds = manager ? (engFilter === "all" ? team.map((t) => t.id) : [engFilter]) : [me];
  const scoped = data.tasks.filter((t) => scopeIds.includes(t.engineerId));
  const dayTasks = scoped.filter((t) => t.taskDate === date || (t.status === "completed" && t.completedAt?.slice(0, 10) === date && t.taskDate !== date && false));
  const active = dayTasks.filter((t) => t.status !== "completed");
  const doneToday = dayTasks.filter((t) => t.status === "completed").sort((a, b) => ((a.completedAt ?? "") < (b.completedAt ?? "") ? 1 : -1));

  const kpi = {
    assigned: dayTasks.length,
    completed: doneToday.length,
    remaining: active.length,
    carried: active.filter((t) => ageDays(t) > 0).length,
    overdue: active.filter(isOverdue).length,
    waiting: active.filter((t) => t.status === "waiting").length,
  };
  const pct = kpi.assigned ? Math.round((kpi.completed / kpi.assigned) * 100) : 0;

  const matchAttention = (t: Task) => {
    switch (attention) {
      case "overdue": return isOverdue(t);
      case "carried": return ageDays(t) > (manager ? 1 : 0);
      case "wait_customer": return t.status === "waiting" && t.waitingReason === "Waiting for Customer";
      case "wait_manager": return t.status === "waiting" && t.waitingReason === "Waiting for Manager";
      case "stale": return t.activity.length <= 1 && ageDays(t) > 0;
      default: return true;
    }
  };
  const needle = q.trim().toLowerCase();
  const filtered = active
    .filter((t) => (fPlant ? t.plantId === fPlant : true) && (fType ? t.taskType === fType : true) && (fPrio ? t.priority === fPrio : true))
    .filter(matchAttention)
    .filter((t) => !needle || `${t.title} ${t.description} ${plantName(data, t.plantId)} ${engineerName(data, t.engineerId)}`.toLowerCase().includes(needle));
  const tabCount = (s: Tab) => (s === "all" ? filtered.length : filtered.filter((t) => t.status === s).length);
  const shown = filtered.filter((t) => tab === "all" || t.status === tab).sort(sortActive);

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "", label: "", tasks: shown }];
    const keyOf = (t: Task): [string, string] => {
      switch (groupBy) {
        case "engineer": return [t.engineerId, engineerName(data, t.engineerId)];
        case "plant": return [t.plantId || "~", t.plantId ? plantName(data, t.plantId) : "No plant"];
        case "priority": return [String(prioRank[t.priority]), taskPriorityLabel[t.priority]];
        case "status": return [t.status, taskStatusLabel[t.status]];
        case "type": return [t.taskType, taskTypeLabel[t.taskType]];
        case "due": return [t.dueDate, fmtDate(t.dueDate)];
        case "age": { const a = ageDays(t); return [String(a).padStart(3, "0"), a ? `Carried ${a} ${a === 1 ? "day" : "days"}` : "New today"]; }
        default: return ["", ""];
      }
    };
    const map = new Map<string, { key: string; label: string; tasks: Task[] }>();
    for (const t of shown) {
      const [k, l] = keyOf(t);
      if (!map.has(k)) map.set(k, { key: k, label: l, tasks: [] });
      map.get(k)!.tasks.push(t);
    }
    return [...map.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
  }, [shown, groupBy, data]);

  const groupOptions: GroupBy[] = manager ? ["none", "engineer", "plant", "priority", "status", "type", "due", "age"] : ["none", "plant", "priority", "status", "type"];
  const groupLabel: Record<GroupBy, string> = { none: "None", engineer: "Engineer", plant: "Plant", priority: "Priority", status: "Status", type: "Task Type", due: "Due Date", age: "Carry Forward Age" };

  const complete = (t: Task) => { setTaskStatus(t.id, "completed"); toast.success("Moved to Completed Today"); };

  const attentionItems: { id: Attention; label: string; hint: string; n: number; tone: string }[] = [
    { id: "overdue", n: active.filter(isOverdue).length, label: "Overdue", hint: (() => { const o = active.filter(isOverdue).map((t) => dayDiff(t.dueDate, TODAY)); return o.length ? `Oldest: ${Math.max(...o)} days` : "Nothing overdue"; })(), tone: "text-sev-critical" },
    { id: "carried", n: active.filter((t) => ageDays(t) > (manager ? 1 : 0)).length, label: manager ? "Carried Forward >1 Day" : "Carried Forward", hint: "From previous working days", tone: "text-sev-high" },
    { id: "wait_customer", n: active.filter((t) => t.waitingReason === "Waiting for Customer" && t.status === "waiting").length, label: "Waiting for Customer", hint: (() => { const w = active.filter((t) => t.waitingReason === "Waiting for Customer" && t.status === "waiting").map(waitDays); return w.length ? `Oldest waiting: ${Math.max(...w)} days` : "None waiting"; })(), tone: "text-sev-medium" },
    { id: "wait_manager", n: active.filter((t) => t.waitingReason === "Waiting for Manager" && t.status === "waiting").length, label: "Waiting for Manager", hint: "Approval / input required", tone: "text-signal" },
    ...(manager ? [{ id: "stale" as Attention, n: active.filter((t) => t.activity.length <= 1 && ageDays(t) > 0).length, label: "Tasks Without Update", hint: "Carried with no activity", tone: "text-mute" }] : []),
  ];

  const task = data.tasks.find((t) => t.id === openTask) ?? null;

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Daily Work</h1>
          <p className="text-xs text-mute">Manage and complete your daily work</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-panel p-1 ring-1 ring-line/80">
          <button type="button" aria-label="Previous day" className="rounded px-2 py-1 hover:bg-base" onClick={() => setDate(shiftDate(date, -1))}>‹</button>
          <label className="relative cursor-pointer px-2 text-sm font-medium">
            {longDate(date)}
            <input type="date" className="absolute inset-0 opacity-0" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </label>
          <button type="button" aria-label="Next day" className="rounded px-2 py-1 hover:bg-base" onClick={() => setDate(shiftDate(date, 1))}>›</button>
          {date !== TODAY ? <Button variant="ghost" onClick={() => setDate(TODAY)}>Today</Button> : null}
        </div>
        <div className="flex items-center gap-3">
          {manager ? (
            <Select className="w-40" value={engFilter} onChange={(e) => setEngFilter(e.target.value)} aria-label="Engineer filter">
              <option value="all">All Engineers</option>
              {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          ) : null}
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-signal text-xs font-semibold text-signal-foreground">{user?.initials ?? "?"}</span>
            <div className="leading-tight">
              <div className="text-sm font-medium">{user?.name ?? ""}</div>
              <div className="text-[11px] text-mute">{manager ? "Manager" : "Engineer"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi n={kpi.assigned} label="Assigned Today" tone="text-signal" />
        <div className="panel-glass px-3 py-2.5">
          <div className="num text-2xl font-semibold text-sev-low">{kpi.completed}</div>
          <div className="text-xs">Completed · <span className="num">{pct}%</span></div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line/70"><div className="h-full bg-sev-low" style={{ width: `${pct}%` }} /></div>
        </div>
        <Kpi n={kpi.remaining} label="Remaining" tone="text-sev-medium" />
        <Kpi n={kpi.carried} label="Carried Forward" sub="from previous days" tone="text-sev-high" />
        <Kpi n={kpi.overdue} label="Overdue" sub="past due date" tone="text-sev-critical" />
        <Kpi n={kpi.waiting} label="Waiting / Blocked" tone="text-ink" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {/* Active work */}
          <Panel>
            <div className="flex flex-wrap items-center gap-2 border-b border-line/70 px-4 py-3">
              {(["all", "pending", "in_progress", "waiting"] as Tab[]).map((s) => (
                <button key={s} type="button" onClick={() => setTab(s)} className={cn("rounded-md px-3 py-1.5 text-xs font-medium", tab === s ? "bg-signal text-signal-foreground" : "bg-base text-ink hover:bg-line/50")}>
                  {s === "all" ? "All" : taskStatusLabel[s]} ({tabCount(s)})
                </button>
              ))}
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <TextInput className="w-56" placeholder="Search task, plant, or keyword…" value={q} onChange={(e) => setQ(e.target.value)} />
                <Button variant={showFilters ? "solid" : "outline"} onClick={() => setShowFilters((v) => !v)}>Filters</Button>
                <span className="text-xs text-mute">Group by</span>
                <Select className="w-36" value={groupBy} onChange={(e) => pickGroup(e.target.value as GroupBy)} aria-label="Group by">
                  {groupOptions.map((g) => <option key={g} value={g}>{groupLabel[g]}</option>)}
                </Select>
              </div>
            </div>
            {showFilters ? (
              <div className="grid gap-3 border-b border-line/70 bg-base/50 px-4 py-3 sm:grid-cols-4">
                <Field label="Plant"><Select value={fPlant} onChange={(e) => setFPlant(e.target.value)}><option value="">All</option>{data.plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
                <Field label="Task type"><Select value={fType} onChange={(e) => setFType(e.target.value)}><option value="">All</option>{types.map((t) => <option key={t} value={t}>{taskTypeLabel[t]}</option>)}</Select></Field>
                <Field label="Priority"><Select value={fPrio} onChange={(e) => setFPrio(e.target.value)}><option value="">All</option>{prios.map((p) => <option key={p} value={p}>{taskPriorityLabel[p]}</option>)}</Select></Field>
                <div className="flex items-end"><Button variant="ghost" onClick={() => { setFPlant(""); setFType(""); setFPrio(""); setAttention(""); setQ(""); }}>Clear all</Button></div>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-2 px-4 py-3">
              <h2 className="font-semibold">
                {date === TODAY ? "Today's Active Work" : `Active Work · ${fmtDate(date)}`} ({shown.length})
                {attention ? (
                  <button type="button" className="ml-2 rounded-md bg-signal/10 px-2 py-0.5 text-[11px] text-signal" onClick={() => setAttention("")}>
                    {attentionItems.find((a) => a.id === attention)?.label} ✕
                  </button>
                ) : null}
              </h2>
              <Button variant="solid" onClick={() => setAdding(true)}>+ {manager ? "Assign Task" : "Add Task"}</Button>
            </div>
            {shown.length === 0 ? (
              <Empty>{active.length ? "No tasks match these filters." : "No active work for this day. Add a task to get started."}</Empty>
            ) : (
              groups.map((g) => (
                <TaskGroup key={g.key || "all"} label={g.label} data={data} tasks={g.tasks} doneCount={groupBy === "engineer" ? dayTasks.filter((t) => t.engineerId === g.key && t.status === "completed").length : undefined} totalCount={groupBy === "engineer" ? dayTasks.filter((t) => t.engineerId === g.key).length : undefined}>
                  {g.tasks.map((t) => (
                    <TaskRow key={t.id} t={t} data={data} manager={manager} onOpen={() => setOpenTask(t.id)} onComplete={() => complete(t)} onStart={() => setTaskStatus(t.id, "in_progress")} onWait={() => setWaitFor(t.id)} />
                  ))}
                </TaskGroup>
              ))
            )}
          </Panel>

          {/* Completed today */}
          <Panel>
            <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setShowDone((v) => !v)}>
              <span className="flex items-center gap-2 font-semibold">
                <span className="grid size-5 place-items-center rounded bg-sev-low text-[11px] text-signal-foreground">✓</span>
                Completed {date === TODAY ? "Today" : fmtDate(date)} ({doneToday.length})
                {doneToday[0] ? <span className="text-xs font-normal text-mute">Last completed: {timeOf(doneToday[0].completedAt)}</span> : null}
              </span>
              <span className="text-xs text-signal">{showDone ? "Hide" : "Show"}</span>
            </button>
            {showDone ? (
              doneToday.length ? (
                <ul className="divide-y divide-line/60 border-t border-line/60">
                  {doneToday.map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
                      <button type="button" className="min-w-0 flex-1 text-left hover:text-signal" onClick={() => setOpenTask(t.id)}>{t.title}</button>
                      <span className="text-xs text-mute">{t.plantId ? plantName(data, t.plantId) : ""}{manager ? ` · ${engineerName(data, t.engineerId)}` : ""}</span>
                      <Badge className={statusCls.completed}>Completed {timeOf(t.completedAt)}</Badge>
                      <Button variant="ghost" onClick={() => setTaskStatus(t.id, "pending")}>Reopen</Button>
                    </li>
                  ))}
                </ul>
              ) : <Empty>Nothing completed yet.</Empty>
            ) : null}
          </Panel>
        </div>

        {/* Right rail */}
        <aside className="min-w-0 space-y-4">
          <CloseDayCard data={data} manager={manager} me={me} date={date} dayTasks={dayTasks} closures={dw.closures} onClose={() => setClosing(true)} />
          <ReminderCenter data={data} me={me} manager={manager} scopeIds={scopeIds} reminders={dw.reminders} onEdit={setReminder} />
          <Panel title="Needs Attention">
            <ul className="divide-y divide-line/60">
              {attentionItems.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => { setAttention(a.id); setTab("all"); setDate(TODAY); }} className={cn("flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-base", attention === a.id && "bg-signal/5")}>
                    <span>
                      <span className={cn("text-sm font-medium", a.n ? a.tone : "text-mute")}>{a.n} {a.label}</span>
                      <span className="block text-[11px] text-mute">{a.hint}</span>
                    </span>
                    <span className="text-mute">›</span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
          <SevenDay data={data} scopeIds={scopeIds} />
        </aside>
      </div>

      <TaskHistory data={data} manager={manager} scopeIds={scopeIds} onOpen={setOpenTask} />

      {/* Dialogs */}
      <AddTaskDialog open={adding} onClose={() => setAdding(false)} data={data} manager={manager} me={me} date={date} defaultEngineer={engFilter !== "all" ? engFilter : team[0]?.id ?? ""} />
      <WaitingDialog id={waitFor} onClose={() => setWaitFor(null)} />
      <TaskDrawer task={task} data={data} manager={manager} me={me} onClose={() => setOpenTask(null)} onWait={(id) => setWaitFor(id)} onRemind={(t) => setReminder({ ...blankReminder(t.engineerId, TODAY), title: t.title, plantId: t.plantId, taskId: t.id, createdBy: me })} />
      <ReminderDialog r={reminder} data={data} manager={manager} onClose={() => setReminder(null)} tasks={active} />
      <CloseDayDialog open={closing} onClose={() => setClosing(false)} data={data} me={manager && engFilter !== "all" ? engFilter : me} date={date} />
    </AppShell>
  );
}

function Kpi({ n, label, sub, tone }: { n: number; label: string; sub?: string; tone: string }) {
  return (
    <div className="panel-glass px-3 py-2.5">
      <div className={cn("num text-2xl font-semibold", tone)}>{n}</div>
      <div className="text-xs">{label}</div>
      {sub ? <div className="text-[11px] text-mute">{sub}</div> : null}
    </div>
  );
}

// ------------------------------------------------------------------ rows

function TaskGroup({ label, children, tasks, doneCount, totalCount, data: _d }: { label: string; children: ReactNode; tasks: Task[]; doneCount?: number; totalCount?: number; data: AppData }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-t border-line/60">
      {label ? (
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between bg-base/60 px-4 py-2 text-left">
          <span className="text-xs font-semibold uppercase tracking-wide">{open ? "▾" : "▸"} {label}</span>
          <span className="num text-xs text-mute">{totalCount !== undefined ? `${doneCount} / ${totalCount} completed` : `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`}</span>
        </button>
      ) : (
        <div className="hidden grid-cols-[28px_80px_minmax(0,1fr)_120px_120px_90px_150px_100px_90px] gap-2 border-b border-line/60 px-4 py-2 md:grid">
          {["", "Priority", "Task", "Plant", "Type", "Due", "Carry Forward", "Status", ""].map((h, i) => <span key={i} className="label-caps">{h}</span>)}
        </div>
      )}
      {open ? <ul className="divide-y divide-line/60">{children}</ul> : null}
    </div>
  );
}

function TaskRow({ t, data, manager, onOpen, onComplete, onStart, onWait }: { t: Task; data: AppData; manager: boolean; onOpen: () => void; onComplete: () => void; onStart: () => void; onWait: () => void }) {
  const overdue = isOverdue(t);
  const primary =
    t.status === "pending" ? <Button onClick={onStart}>Start</Button> : t.status === "in_progress" ? <Button variant="solid" onClick={onComplete}>Complete</Button> : <Button onClick={onStart}>Resume</Button>;
  return (
    <li className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-2 px-4 py-2.5 text-sm md:grid-cols-[28px_80px_minmax(0,1fr)_120px_120px_90px_150px_100px_90px]">
      <input type="checkbox" aria-label={`Complete "${t.title}"`} className="size-4 accent-signal" checked={false} onChange={onComplete} />
      <div className="hidden md:block"><Badge className={prioCls[t.priority]}>{taskPriorityLabel[t.priority]}</Badge></div>
      <button type="button" onClick={onOpen} className="min-w-0 text-left">
        <div className="font-medium hover:text-signal">{t.title}</div>
        <div className="text-[11px] text-mute">
          {manager ? engineerName(data, t.engineerId) : ""}
          {t.status === "waiting" && t.waitingReason ? `${manager ? " · " : ""}${t.waitingReason}` : ""}
        </div>
        {/* mobile meta */}
        <div className="mt-1 flex flex-wrap gap-1.5 md:hidden">
          <Badge className={prioCls[t.priority]}>{taskPriorityLabel[t.priority]}</Badge>
          <Badge className={statusCls[t.status]}>{taskStatusLabel[t.status]}</Badge>
          {t.plantId ? <span className="text-[11px] text-mute">{plantName(data, t.plantId)}</span> : null}
          <CarryBadge t={t} />
        </div>
      </button>
      <span className="hidden truncate text-xs md:block">{t.plantId ? plantName(data, t.plantId) : "—"}</span>
      <span className="hidden text-xs text-mute md:block">{taskTypeLabel[t.taskType]}</span>
      <span className={cn("hidden text-xs md:block", overdue && "font-medium text-sev-critical")}>
        {t.dueDate === TODAY ? "Today" : fmtDate(t.dueDate)}{t.dueTime ? ` ${t.dueTime}` : ""}
      </span>
      <span className="hidden md:block"><CarryBadge t={t} /></span>
      <span className="hidden md:block"><Badge className={statusCls[t.status]}>{taskStatusLabel[t.status]}</Badge></span>
      <div className="col-span-2 flex justify-end gap-1 md:col-span-1">
        {primary}
        {t.status !== "waiting" ? <Button variant="ghost" onClick={onWait} className="px-2">Wait</Button> : null}
      </div>
    </li>
  );
}

// ------------------------------------------------------------------ dialogs

function AddTaskDialog({ open, onClose, data, manager, me, date, defaultEngineer }: { open: boolean; onClose: () => void; data: AppData; manager: boolean; me: string; date: string; defaultEngineer: string }) {
  const team = analystsOf(data);
  const [f, setF] = useState({ title: "", description: "", engineerId: "", plantId: "", taskType: "report" as TaskType, priority: "normal" as TaskPriority, dueDate: "", dueTime: "" });
  useEffect(() => {
    if (open) setF({ title: "", description: "", engineerId: manager ? defaultEngineer : me, plantId: "", taskType: "report", priority: "normal", dueDate: date < TODAY ? TODAY : date, dueTime: "" });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const plants = data.plants.filter((p) => manager || p.engineerId === me || true);
  const submit = () => {
    if (!f.title.trim() || !f.engineerId) return;
    const workDate = date < TODAY ? TODAY : date;
    addTask({ ...f, taskDate: workDate, dueDate: f.dueDate || workDate });
    toast.success("Task added");
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{manager ? "Assign task" : "Add task"}</DialogTitle></DialogHeader>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="sm:col-span-2"><Field label="Task"><TextInput autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Prepare SWAS weekly report" /></Field></div>
          {manager ? (
            <Field label="Engineer"><Select value={f.engineerId} onChange={(e) => setF({ ...f, engineerId: e.target.value })}>{team.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
          ) : null}
          <Field label="Plant"><Select value={f.plantId} onChange={(e) => setF({ ...f, plantId: e.target.value })}><option value="">— None —</option>{plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          <Field label="Type"><Select value={f.taskType} onChange={(e) => setF({ ...f, taskType: e.target.value as TaskType })}>{types.map((t) => <option key={t} value={t}>{taskTypeLabel[t]}</option>)}</Select></Field>
          <Field label="Priority"><Select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as TaskPriority })}>{prios.map((p) => <option key={p} value={p}>{taskPriorityLabel[p]}</option>)}</Select></Field>
          <Field label="Due date"><TextInput type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
          <Field label="Due time (optional)"><TextInput type="time" value={f.dueTime} onChange={(e) => setF({ ...f, dueTime: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Description (optional)"><TextArea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field></div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="solid" type="submit" disabled={!f.title.trim() || !f.engineerId}>Save task</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WaitingDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [reason, setReason] = useState(waitingReasons[0]!);
  const [other, setOther] = useState("");
  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Why is this task waiting?</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {waitingReasons.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input type="radio" name="wait" className="accent-signal" checked={reason === r} onChange={() => setReason(r)} /> {r}
            </label>
          ))}
          {reason === "Other" ? <TextInput placeholder="Describe the reason" value={other} onChange={(e) => setOther(e.target.value)} /> : null}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="solid" disabled={reason === "Other" && !other.trim()} onClick={() => { if (id) setTaskStatus(id, "waiting", reason === "Other" ? `Other: ${other.trim()}` : reason); onClose(); }}>Set waiting</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TaskDrawer({ task: t, data, manager, me, onClose, onWait, onRemind }: { task: Task | null; data: AppData; manager: boolean; me: string; onClose: () => void; onWait: (id: string) => void; onRemind: (t: Task) => void }) {
  const [note, setNote] = useState("");
  const team = analystsOf(data);
  return (
    <Sheet open={!!t} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {t ? (
          <>
            <SheetHeader><SheetTitle className="pr-6 text-left">{t.title}</SheetTitle></SheetHeader>
            <div className="mt-3 flex flex-wrap gap-1.5 px-4">
              <Badge className={prioCls[t.priority]}>{taskPriorityLabel[t.priority]}</Badge>
              <Badge className={statusCls[t.status]}>{taskStatusLabel[t.status]}</Badge>
              <CarryBadge t={t} />
            </div>
            {t.description ? <p className="mt-3 px-4 text-sm">{t.description}</p> : null}
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 px-4 text-xs">
              {[
                ["Plant", t.plantId ? plantName(data, t.plantId) : "—"],
                ["Engineer", engineerName(data, t.engineerId)],
                ["Assigned by", t.assignedBy ? engineerName(data, t.assignedBy) : "Self"],
                ["Type", taskTypeLabel[t.taskType]],
                ["Created", fmtDate(t.originalDate)],
                ["Current work date", fmtDate(t.taskDate)],
                ["Due", `${fmtDate(t.dueDate)}${t.dueTime ? ` ${t.dueTime}` : ""}`],
                ["Carried forward", `${t.carryCount} ${t.carryCount === 1 ? "time" : "times"}`],
                ...(t.waitingReason ? [["Waiting reason", t.waitingReason]] : []),
                ...(t.startedAt ? [["Started", `${fmtDate(t.startedAt.slice(0, 10))} ${timeOf(t.startedAt)}`]] : []),
                ...(t.completedAt ? [["Completed", `${fmtDate(t.completedAt.slice(0, 10))} ${timeOf(t.completedAt)}`]] : []),
              ].map(([k, v]) => (
                <div key={k}><dt className="label-caps">{k}</dt><dd className="mt-0.5">{v}</dd></div>
              ))}
            </dl>

            <div className="mt-4 flex flex-wrap gap-2 px-4">
              {t.status !== "in_progress" && t.status !== "completed" ? <Button onClick={() => setTaskStatus(t.id, "in_progress")}>Start</Button> : null}
              {t.status !== "waiting" && t.status !== "completed" ? <Button onClick={() => onWait(t.id)}>Waiting</Button> : null}
              {t.status !== "completed" ? <Button variant="solid" onClick={() => setTaskStatus(t.id, "completed")}>Complete</Button> : <Button onClick={() => setTaskStatus(t.id, "pending")}>Reopen</Button>}
              <Button variant="ghost" onClick={() => onRemind(t)}>+ Reminder</Button>
            </div>

            {manager ? (
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line/60 px-4 pt-4">
                <Field label="Reassign"><Select value={t.engineerId} onChange={(e) => updateTask(t.id, { engineerId: e.target.value }, `Reassigned to ${engineerName(data, e.target.value)}`)}>{team.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
                <Field label="Priority"><Select value={t.priority} onChange={(e) => updateTask(t.id, { priority: e.target.value as TaskPriority }, `Priority → ${taskPriorityLabel[e.target.value as TaskPriority]}`)}>{prios.map((p) => <option key={p} value={p}>{taskPriorityLabel[p]}</option>)}</Select></Field>
                <Field label="Due date"><TextInput type="date" value={t.dueDate} onChange={(e) => e.target.value && updateTask(t.id, { dueDate: e.target.value }, `Due date → ${fmtDate(e.target.value)}`)} /></Field>
                <div className="flex items-end"><Button variant="ghost" className="text-sev-critical" onClick={() => { if (confirm("Delete this task permanently?")) { removeTask(t.id); onClose(); } }}>Delete task</Button></div>
              </div>
            ) : t.engineerId === me && !t.assignedBy ? (
              <div className="mt-3 px-4"><Button variant="ghost" className="text-sev-critical" onClick={() => { if (confirm("Delete this task?")) { removeTask(t.id); onClose(); } }}>Delete task</Button></div>
            ) : null}

            <div className="mt-4 border-t border-line/60 px-4 pt-4">
              <div className="label-caps mb-1">Add note</div>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); addTaskNote(t.id, note); setNote(""); }}>
                <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Update, finding or handover…" />
                <Button type="submit" disabled={!note.trim()}>Add</Button>
              </form>
            </div>

            <div className="mt-4 px-4 pb-6">
              <div className="label-caps mb-2">Activity timeline</div>
              {t.activity.length ? (
                <ol className="space-y-2 border-l border-line pl-3">
                  {[...t.activity].reverse().map((a, i) => (
                    <li key={i} className="text-xs">
                      <div>{a.text}</div>
                      <div className="text-[11px] text-mute">{fmtDate(a.at.slice(0, 10))} {timeOf(a.at)} · {engineerName(data, a.by)}</div>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-xs text-mute">No activity recorded yet.</p>}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

// ------------------------------------------------------------------ right rail

function CloseDayCard({ data: _d, manager, me, date, dayTasks, closures, onClose }: { data: AppData; manager: boolean; me: string; date: string; dayTasks: Task[]; closures: { engineerId: string; workDate: string; closedAt: string; note: string; completed: number; assigned: number }[]; onClose: () => void }) {
  if (manager) {
    const today = closures.filter((c) => c.workDate === date);
    return (
      <Panel title="Close-day summaries" meta={fmtDate(date)}>
        {today.length ? (
          <ul className="divide-y divide-line/60">
            {today.map((c) => (
              <li key={c.engineerId} className="px-4 py-2 text-xs">
                <div className="flex justify-between"><span className="font-medium">{engineerName(_d, c.engineerId)}</span><span className="num text-mute">{c.completed}/{c.assigned} · {timeOf(c.closedAt)}</span></div>
                {c.note ? <p className="mt-1 text-mute">{c.note}</p> : null}
              </li>
            ))}
          </ul>
        ) : <Empty>No engineer has closed this day yet.</Empty>}
      </Panel>
    );
  }
  const mine = dayTasks.filter((t) => t.engineerId === me);
  const closed = closures.find((c) => c.engineerId === me && c.workDate === date);
  return (
    <div className="rounded-[var(--radius)] bg-signal p-4 text-signal-foreground">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold">Close Day</div>
          <div className="text-xs opacity-80">{closed ? `Closed at ${timeOf(closed.closedAt)}` : "Review and close today's work"}</div>
        </div>
        <button type="button" onClick={onClose} disabled={date > TODAY} className="rounded-md bg-signal-foreground/15 px-3 py-1.5 text-xs font-medium hover:bg-signal-foreground/25 disabled:opacity-40">
          {closed ? "Update" : "Close Day"}
        </button>
      </div>
      <div className="num mt-3 grid grid-cols-4 gap-1 text-center text-[11px]">
        {[["Assigned", mine.length], ["Done", mine.filter((t) => t.status === "completed").length], ["Left", mine.filter((t) => t.status !== "completed" && t.status !== "waiting").length], ["Waiting", mine.filter((t) => t.status === "waiting").length]].map(([k, v]) => (
          <div key={k} className="rounded bg-signal-foreground/10 py-1"><div className="text-base font-semibold">{v}</div>{k}</div>
        ))}
      </div>
    </div>
  );
}

function CloseDayDialog({ open, onClose, data, me, date }: { open: boolean; onClose: () => void; data: AppData; me: string; date: string }) {
  const [note, setNote] = useState("");
  const mine = data.tasks.filter((t) => t.engineerId === me && t.taskDate === date);
  const unfinished = mine.filter((t) => t.status !== "completed");
  const target = nextWorkingDay(date);
  const s = {
    assigned: mine.length,
    completed: mine.length - unfinished.length,
    remaining: unfinished.filter((t) => t.status !== "waiting").length,
    waiting: unfinished.filter((t) => t.status === "waiting").length,
    carried: unfinished.length,
  };
  const confirm = async () => {
    const ok = await saveClosure({ engineerId: me, workDate: date, ...s, note });
    if (!ok) { toast.error("Could not close the day. Try again."); return; }
    if (unfinished.length) carryTasks(me, date, target);
    toast.success(unfinished.length ? `Day closed · ${unfinished.length} carried to ${fmtDate(target)}` : "Day closed");
    setNote("");
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Daily Summary · {fmtDate(date)}</DialogTitle></DialogHeader>
        <div className="num grid grid-cols-5 gap-1 text-center text-[11px]">
          {Object.entries(s).map(([k, v]) => <div key={k} className="rounded bg-base py-1.5"><div className="text-base font-semibold">{v}</div><span className="capitalize">{k === "carried" ? "Carry fwd" : k}</span></div>)}
        </div>
        {unfinished.length ? (
          <div>
            <div className="label-caps mb-1">Will carry forward to {fmtDate(target)}</div>
            <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
              {unfinished.map((t) => <li key={t.id}>• {t.title} <span className="text-mute">({taskStatusLabel[t.status]}{t.waitingReason ? ` · ${t.waitingReason}` : ""})</span></li>)}
            </ul>
          </div>
        ) : <p className="text-xs text-sev-low">All tasks completed — nothing to carry forward.</p>}
        <Field label="End-of-day / handover note (optional)">
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Deepak observation waiting for manager review. Aarti follow-up tomorrow." />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="solid" onClick={() => void confirm()}>Confirm & close day</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReminderCenter({ data, me, manager, scopeIds, reminders, onEdit }: { data: AppData; me: string; manager: boolean; scopeIds: string[]; reminders: Reminder[]; onEdit: (r: Reminder) => void }) {
  const [tab, setTab] = useState<"today" | "upcoming" | "overdue">("today");
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const mine = reminders.filter((r) => r.status === "active" && (manager ? scopeIds.includes(r.userId) || r.userId === me : r.userId === me));
  const late = (r: Reminder) => r.date < TODAY || (r.date === TODAY && !!r.time && r.time < hhmm);
  const lists = {
    today: mine.filter((r) => r.date === TODAY && !late(r)),
    upcoming: mine.filter((r) => r.date > TODAY),
    overdue: mine.filter(late),
  };
  const list = [...lists[tab]].sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
  const snooze = (r: Reminder, mins: number) => {
    const d = new Date(`${r.date}T${r.time || hhmm}:00`);
    const base = d < now ? now : d;
    const n = new Date(base.getTime() + mins * 60000);
    const iso = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
    void saveReminder({ ...r, date: iso, time: `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}` });
  };
  return (
    <Panel title="Reminder" meta={<Button onClick={() => onEdit({ ...blankReminder(me, TODAY), createdBy: me })}>+ Add Reminder</Button>}>
      <div className="flex gap-1 px-4 pt-3">
        {(["today", "upcoming", "overdue"] as const).map((k) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cn("flex-1 rounded-md py-1 text-xs capitalize", tab === k ? "bg-signal/10 font-medium text-signal" : "text-mute hover:bg-base", k === "overdue" && lists.overdue.length && tab !== k && "text-sev-critical")}>
            {k} ({lists[k].length})
          </button>
        ))}
      </div>
      {list.length ? (
        <ul className="mt-2 divide-y divide-line/60">
          {list.map((r) => (
            <li key={r.id} className={cn("border-l-2 px-4 py-2", late(r) ? "border-sev-critical" : "border-signal")}>
              <div className="flex items-start gap-3">
                <span className={cn("num w-14 shrink-0 text-xs font-medium", late(r) ? "text-sev-critical" : "text-signal")}>{r.date !== TODAY ? fmtDate(r.date).slice(0, 6) : ""}{r.time ? ` ${r.time}` : r.date === TODAY ? "Today" : ""}</span>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onEdit(r)}>
                  <div className="text-sm font-medium">{r.title}</div>
                  <div className="text-[11px] text-mute">{[r.description, r.plantId ? plantName(data, r.plantId) : "", manager && r.userId !== me ? engineerName(data, r.userId) : ""].filter(Boolean).join(" · ")}</div>
                </button>
              </div>
              <div className="mt-1 flex justify-end gap-1">
                <Button variant="ghost" className="px-2 py-1" onClick={() => void saveReminder({ ...r, status: "done", completedAt: new Date().toISOString() })}>Done</Button>
                <Button variant="ghost" className="px-2 py-1" onClick={() => snooze(r, 60)}>Snooze 1h</Button>
                <Button variant="ghost" className="px-2 py-1" onClick={() => void deleteReminder(r.id)}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      ) : <Empty>No {tab} reminders.</Empty>}
    </Panel>
  );
}

function ReminderDialog({ r, data, manager, onClose, tasks }: { r: Reminder | null; data: AppData; manager: boolean; onClose: () => void; tasks: Task[] }) {
  const [f, setF] = useState<Reminder | null>(r);
  useEffect(() => setF(r), [r]);
  const team = analystsOf(data);
  if (!f) return null;
  return (
    <Dialog open={!!r} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Reminder</DialogTitle></DialogHeader>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); if (!f.title.trim()) return; void saveReminder({ ...f, title: f.title.trim() }); toast.success("Reminder saved"); onClose(); }}>
          <div className="sm:col-span-2"><Field label="Title"><TextInput autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Customer call – ATUL" /></Field></div>
          <div className="sm:col-span-2"><Field label="Description"><TextInput value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="e.g. Confirm visit date" /></Field></div>
          <Field label="Date"><TextInput type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Time"><TextInput type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
          <Field label="Plant (optional)"><Select value={f.plantId} onChange={(e) => setF({ ...f, plantId: e.target.value })}><option value="">— None —</option>{data.plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          <Field label="Linked task (optional)"><Select value={f.taskId} onChange={(e) => setF({ ...f, taskId: e.target.value })}><option value="">— None —</option>{tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</Select></Field>
          {manager ? (
            <Field label="Assigned person"><Select value={f.userId} onChange={(e) => setF({ ...f, userId: e.target.value })}><option value={data.currentUserId}>Me</option>{team.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
          ) : null}
          <Field label="Notify"><Select value={f.notify} onChange={(e) => setF({ ...f, notify: e.target.value as NotifyRule })}>{(Object.keys(notifyLabel) as NotifyRule[]).map((k) => <option key={k} value={k}>{notifyLabel[k]}</option>)}</Select></Field>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="solid" type="submit" disabled={!f.title.trim() || !f.date}>Save reminder</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SevenDay({ data, scopeIds }: { data: AppData; scopeIds: string[] }) {
  const days = Array.from({ length: 7 }, (_, i) => shiftDate(TODAY, i - 6));
  const rows = days.map((d) => {
    const assigned = data.tasks.filter((t) => scopeIds.includes(t.engineerId) && (t.originalDate === d || (t.originalDate < d && (t.completedAt ? t.completedAt.slice(0, 10) >= d : t.taskDate >= d)))).length;
    const completed = data.tasks.filter((t) => scopeIds.includes(t.engineerId) && t.completedAt?.slice(0, 10) === d).length;
    const carried = data.tasks.filter((t) => scopeIds.includes(t.engineerId) && t.originalDate < d && (t.completedAt ? t.completedAt.slice(0, 10) >= d : t.taskDate >= d)).length;
    return { d, assigned, completed, carried };
  });
  const max = Math.max(1, ...rows.map((r) => r.assigned));
  return (
    <Panel title="7-Day Work Summary">
      <div className="flex gap-3 px-4 pt-3 text-[11px] text-mute">
        <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-signal" />Assigned</span>
        <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-sev-low" />Completed</span>
        <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-sev-medium" />Carried</span>
      </div>
      <div className="grid grid-cols-7 items-end gap-1 px-4 pb-3 pt-2">
        {rows.map((r) => (
          <div key={r.d} className="flex flex-col items-center" title={`${fmtDate(r.d)} · Assigned ${r.assigned} · Completed ${r.completed} · Carried ${r.carried}`}>
            <div className="num text-[10px] text-signal">{r.assigned}</div>
            <div className="flex h-20 items-end gap-0.5">
              <div className="w-2 rounded-t bg-signal" style={{ height: `${(r.assigned / max) * 100}%` }} />
              <div className="w-2 rounded-t bg-sev-low" style={{ height: `${(r.completed / max) * 100}%` }} />
              <div className="w-2 rounded-t bg-sev-medium" style={{ height: `${(r.carried / max) * 100}%` }} />
            </div>
            <div className="mt-1 text-[10px] text-mute">{fmtDate(r.d).slice(0, 6)}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ------------------------------------------------------------------ history

function TaskHistory({ data, manager, scopeIds, onOpen }: { data: AppData; manager: boolean; scopeIds: string[]; onOpen: (id: string) => void }) {
  const team = analystsOf(data);
  const [range, setRange] = useState("7");
  const [eng, setEng] = useState("");
  const [plant, setPlant] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("completed");
  const [prio, setPrio] = useState("");
  const [carry, setCarry] = useState("");
  const [q, setQ] = useState("");
  const from = range === "all" ? "0000" : shiftDate(TODAY, -Number(range));
  const needle = q.trim().toLowerCase();
  const rows = data.tasks
    .filter((t) => scopeIds.includes(t.engineerId) && (!eng || t.engineerId === eng))
    .filter((t) => (t.completedAt?.slice(0, 10) ?? t.taskDate) >= from)
    .filter((t) => (!plant || t.plantId === plant) && (!type || t.taskType === type) && (!status || t.status === status) && (!prio || t.priority === prio))
    .filter((t) => (carry === "yes" ? t.carryCount > 0 : carry === "no" ? t.carryCount === 0 : true))
    .filter((t) => !needle || `${t.title} ${plantName(data, t.plantId)}`.toLowerCase().includes(needle))
    .sort((a, b) => ((a.completedAt ?? a.taskDate) < (b.completedAt ?? b.taskDate) ? 1 : -1))
    .slice(0, 200);
  return (
    <Panel className="mt-4" title="Task History" meta={`${rows.length} records`}>
      <div className="grid grid-cols-2 gap-2 border-b border-line/60 px-4 py-3 sm:grid-cols-4 xl:grid-cols-8">
        <Select value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All time</option></Select>
        {manager ? <Select value={eng} onChange={(e) => setEng(e.target.value)} aria-label="Engineer"><option value="">All engineers</option>{team.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select> : null}
        <Select value={plant} onChange={(e) => setPlant(e.target.value)} aria-label="Plant"><option value="">All plants</option>{data.plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Task type"><option value="">All types</option>{types.map((t) => <option key={t} value={t}>{taskTypeLabel[t]}</option>)}</Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">All statuses</option>{(Object.keys(taskStatusLabel) as TaskStatus[]).map((s) => <option key={s} value={s}>{taskStatusLabel[s]}</option>)}</Select>
        <Select value={prio} onChange={(e) => setPrio(e.target.value)} aria-label="Priority"><option value="">All priorities</option>{prios.map((p) => <option key={p} value={p}>{taskPriorityLabel[p]}</option>)}</Select>
        <Select value={carry} onChange={(e) => setCarry(e.target.value)} aria-label="Carry forward"><option value="">Carry fwd: any</option><option value="yes">Carried</option><option value="no">Not carried</option></Select>
        <TextInput placeholder="Search history…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead><tr className="text-left">{["Date", ...(manager ? ["Engineer"] : []), "Plant", "Task", "Type", "Created", "Original due", "Completed at", "Carry days", "Status"].map((h) => <th key={h} className="label-caps px-2 py-2 font-medium first:pl-4">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="cursor-pointer border-t border-line/60 hover:bg-base" onClick={() => onOpen(t.id)}>
                  <td className="num px-2 py-2 pl-4 text-xs">{fmtDate(t.taskDate)}</td>
                  {manager ? <td className="px-2 py-2 text-xs">{engineerName(data, t.engineerId)}</td> : null}
                  <td className="px-2 py-2 text-xs">{t.plantId ? plantName(data, t.plantId) : "—"}</td>
                  <td className="px-2 py-2">{t.title}</td>
                  <td className="px-2 py-2 text-xs text-mute">{taskTypeLabel[t.taskType]}</td>
                  <td className="num px-2 py-2 text-xs">{fmtDate(t.originalDate)}</td>
                  <td className="num px-2 py-2 text-xs">{fmtDate(t.dueDate)}</td>
                  <td className="num px-2 py-2 text-xs">{t.completedAt ? `${fmtDate(t.completedAt.slice(0, 10))} ${timeOf(t.completedAt)}` : "—"}</td>
                  <td className="num px-2 py-2 text-xs">{ageDays(t) || t.carryCount ? `${Math.max(ageDays(t), t.carryCount)} days` : "—"}</td>
                  <td className="px-2 py-2"><Badge className={statusCls[t.status]}>{taskStatusLabel[t.status]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty>No tasks match these filters.</Empty>}
    </Panel>
  );
}
