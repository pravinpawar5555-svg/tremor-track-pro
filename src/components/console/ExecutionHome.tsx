import { useNavigate } from "@tanstack/react-router";
import { Empty, Kpi, Panel, PageHeader } from "@/components/console/ui";
import { cn } from "@/lib/utils";
import { useData, todayIso } from "@/lib/store";
import { onJob, dateRange, execEngineerName, execRecordFor, execStatusLabel, installTypeLabel, useExecution, type ExecJob } from "@/lib/execution";

export function ExecutionHome() {
  const ex = useExecution();
  const data = useData();
  const navigate = useNavigate();
  const me = execRecordFor(data.currentUserId);
  const mine = ex.jobs.filter((j) => onJob(j, me?.id ?? ""));
  const month = todayIso().slice(0, 7);
  const today = todayIso();
  const byDate = (a: ExecJob, b: ExecJob) => ((a.plannedStart ?? "9") < (b.plannedStart ?? "9") ? -1 : 1);
  const active = mine.filter((j) => j.status === "in_progress");
  const upcoming = mine.filter((j) => j.status === "scheduled" || j.status === "planning").sort(byDate);
  const pending = mine.filter((j) => j.status === "pending");
  const visitsMonth = mine.filter((j) => (j.actualStart ?? j.plannedStart ?? "").slice(0, 7) === month && j.status !== "cancelled").length;
  const doneMonth = mine.filter((j) => j.status === "completed" && (j.completedAt ?? "").slice(0, 7) === month).length;
  const overdue = mine.filter((j) => j.status !== "completed" && j.status !== "cancelled" && j.plannedEnd && j.plannedEnd < today).length;
  const next = active[0] ?? upcoming[0];
  const kickoffPending = mine.filter((j) => j.kickoff === "no" && j.status !== "completed" && j.status !== "cancelled" && j.status !== "lead").length;
  const aipPending = mine.filter((j) => j.aip === "no" && (j.status === "in_progress" || j.status === "pending")).length;
  const custConfirm = pending.filter((j) => j.pendingReason === "Customer Confirmation Pending").length;
  const recent = [...mine].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1)).slice(0, 5);
  const openJob = () => void navigate({ to: "/execution" });
  const attention: [number, string][] = [
    [pending.length, "Pending jobs"],
    [custConfirm, "Customer confirmation pending"],
    [kickoffPending, "Kick-off pending"],
    [aipPending, "AIP sheet pending"],
  ];
  return (
    <div className="grid gap-4">
      <PageHeader title="My Execution Dashboard" subtitle="Your assigned execution jobs, schedules and pending actions" />
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => void navigate({ to: "/execution", search: { add: "visit" } })} className="rounded-xl bg-signal p-4 text-left text-signal-foreground shadow-sm active:scale-[0.99]">
          <div className="text-base font-semibold">📍 Record Site Visit</div>
          <div className="mt-0.5 text-xs opacity-80">Factory inspection, sensor collection, pickup, meeting</div>
        </button>
        <button type="button" onClick={() => void navigate({ to: "/execution", search: { add: "lead" } })} className="rounded-xl bg-panel p-4 text-left ring-1 ring-line shadow-sm active:scale-[0.99]">
          <div className="text-base font-semibold text-ink">➕ New Execution Lead</div>
          <div className="mt-0.5 text-xs text-mute">New demo, order installation or troubleshooting</div>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Visits this month" value={visitsMonth} />
        <Kpi label="Upcoming jobs" value={upcoming.length} />
        <Kpi label="In progress" value={active.length} />
        <Kpi label="Pending" value={pending.length} tone={pending.length ? "medium" : "low"} />
        <Kpi label="Completed this month" value={doneMonth} tone="low" />
        <Kpi label="Overdue" value={overdue} tone={overdue ? "critical" : "low"} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Panel title="Current / next execution">
          {next ? <JobRow j={next} onOpen={openJob} cta="Open Job" /> : <Empty>Nothing scheduled yet.</Empty>}
        </Panel>
        <Panel title="Needs my attention">
          <div className="grid gap-2 p-4 text-sm">
            {attention.map(([n, l]) => (
              <div key={l} className="flex items-center justify-between rounded-md px-3 py-2 ring-1 ring-line">
                <span>{l}</span>
                <span className={cn("num font-semibold", n ? "text-sev-high" : "text-sev-low")}>{n}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel title="My upcoming execution">
        {upcoming.length ? (
          <div className="grid gap-2 p-4">
            {upcoming.slice(0, 3).map((j) => <JobRow key={j.id} j={j} onOpen={openJob} cta="Open Job" />)}
            {upcoming.length > 3 ? (
              <button type="button" onClick={openJob} className="text-left text-sm font-medium text-signal">View Schedule →</button>
            ) : null}
          </div>
        ) : (
          <Empty>No upcoming jobs.</Empty>
        )}
      </Panel>
      <Panel title="My jobs">
        {recent.length ? (
          <div className="grid gap-2 p-4">
            {recent.map((j) => <JobRow key={j.id} j={j} onOpen={openJob} />)}
          </div>
        ) : (
          <Empty>No jobs assigned to you yet.</Empty>
        )}
      </Panel>
    </div>
  );
}

function JobRow({ j, onOpen, cta = "Open" }: { j: ExecJob; onOpen: () => void; cta?: string }) {
  return (
    <button type="button" onClick={onOpen} className="rounded-lg p-3 text-left ring-1 ring-line hover:bg-base">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{j.customerName || "—"}</div>
          <div className="text-xs text-mute">{j.plantName ? `${j.plantName} · ` : ""}{installTypeLabel[j.installationType]}</div>
        </div>
        <span className="rounded-full px-2 py-0.5 text-[11px] ring-1 ring-line">{execStatusLabel[j.status]}</span>
      </div>
      <div className="num mt-1 text-xs text-mute">{dateRange(j)} · Engineer: {execEngineerName(j.assignedEngineerId) || "Unassigned"}</div>
      <div className="mt-1 text-xs font-medium text-signal">{cta} →</div>
    </button>
  );
}
