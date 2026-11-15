import { useState } from "react";
import { CheckCircle2, ClipboardList, FileWarning, Search, Users, Wrench } from "lucide-react";
import { Button, Empty, Select, TextInput } from "./ui";
import { engineerFleetTotals, engineerSummary, engineerUsage, fmtDate, shiftDate, TODAY, useData } from "@/lib/store";
import { execRecordFor, useExecution } from "@/lib/execution";
import { execScope } from "@/lib/access";
import { cn } from "@/lib/utils";

export function EngineerMonitoring({ onWorkload }: { onWorkload: () => void }) {
  const data = useData();
  const ex = useExecution();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const people = data.engineers.filter((e) => e.role !== "manager");
  const cs = people.filter((e) => e.role === "analyst");
  const summaries = cs.map((e) => engineerSummary(data, e.id));
  const visible = people.filter((e) => (role === "all" || e.role === role) && e.name.toLowerCase().includes(search.trim().toLowerCase()));
  const days = Array.from({ length: 7 }, (_, i) => shiftDate(TODAY, -6 + i));
  const stats = [
    { label: "Engineers", value: people.length, detail: `${cs.length} Customer Success · ${people.length - cs.length} Execution`, icon: Users },
    { label: "Completed tasks · 7 days", value: summaries.reduce((n, s) => n + s.done, 0), detail: "Customer Success team", icon: CheckCircle2 },
    { label: "Reports overdue", value: summaries.reduce((n, s) => n + s.reportsOverdue, 0), detail: "Current pending reports", icon: FileWarning },
    { label: "Open execution jobs", value: ex.jobs.filter((j) => !["completed", "cancelled"].includes(j.status)).length, detail: "Across the Execution team", icon: Wrench },
  ];
  return <div className="space-y-5">
    <div className="grid grid-cols-2 gap-x-5 gap-y-4 border-y border-line py-4 lg:grid-cols-4">{stats.map(({ label, value, detail, icon: Icon }) => <div key={label} className="min-w-0"><div className="flex min-w-0 items-center gap-2 text-xs text-mute"><Icon className="size-4 shrink-0" /><span>{label}</span></div><div className="num mt-2 text-2xl font-semibold">{value}</div><p className="mt-1 text-xs text-mute">{detail}</p></div>)}</div>
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap"><div className="relative min-w-0 sm:flex-1"><Search className="pointer-events-none absolute top-2.5 left-2 size-4 text-mute" /><TextInput aria-label="Search engineers" placeholder="Find an engineer…" className="min-h-9 pl-8" value={search} onChange={(e) => setSearch(e.target.value)} /></div><Select aria-label="Engineer role" value={role} className="min-h-9 w-auto max-w-44 shrink-0" onChange={(e) => setRole(e.target.value)}><option value="all">All teams</option><option value="analyst">Customer Success</option><option value="execution">Execution</option></Select><Button onClick={onWorkload}><ClipboardList className="size-4" />View workload</Button></div>
    <div className="grid items-start gap-4 xl:grid-cols-2">{visible.map((e) => {
      const s = engineerSummary(data, e.id);
      const execution = e.role === "execution";
      const rec = execution ? execRecordFor(e.id) : null;
      const scope = rec ? execScope(ex.jobs, ex.siteVisits, rec.id, TODAY) : null;
      const jobs = scope?.visible ?? [];
      const completed = jobs.filter((j) => j.status === "completed").length;
      const fleet = engineerFleetTotals(data, e.id);
      const metrics: [string, number][] = execution ? [
        ["Open jobs", jobs.filter((j) => !["completed", "cancelled"].includes(j.status)).length],
        ["Completed jobs", completed], ["Site visits · month", scope?.visitsMonth ?? 0],
        ["Sensors installed", jobs.reduce((n, j) => n + j.sensorsInstalled, 0)],
      ] : [["Tasks · 7 days", s.tasks], ["Completed", s.done], ["Pending tasks", s.pending], ["Reports overdue", s.reportsOverdue]];
      return <article key={e.id} className="min-w-0 rounded-md border border-line bg-panel">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line p-4"><div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-signal/10 text-xs font-semibold text-signal">{e.initials}</span><div className="min-w-0"><h3 className="truncate font-semibold">{e.name}</h3><p className="text-xs text-mute">{execution ? "Execution Engineer" : "Customer Success Engineer"}</p></div></div>{execution ? <Wrench className="size-4 shrink-0 text-signal" /> : <ClipboardList className="size-4 shrink-0 text-signal" />}</header>
        <dl className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">{metrics.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-mute">{label}</dt><dd className="num mt-1 text-xl font-semibold">{value}</dd></div>)}</dl>
        {!execution && <details className="border-t border-line px-4 py-3"><summary className="cursor-pointer text-xs font-medium text-signal">Fleet & report detail</summary><dl className="mt-3 grid grid-cols-3 gap-3">{([["Machines", fleet.machines], ["Assets", fleet.assets], ["Node 6", fleet.node6], ["Node X", fleet.nodeX], ["VibAssist", fleet.vibassist ?? 0], ["Reports pending", s.reportsPending], ["Reports late", s.reportsLate], ["Planned days · 7 days", s.activeDays]] as [string, number][]).map(([label, value]) => <div key={label}><dt className="text-[10px] text-mute">{label}</dt><dd className="num text-sm">{value}</dd></div>)}</dl></details>}
        {execution ? <div className="border-t border-line px-4 py-3 text-xs text-mute">{jobs.filter((j) => j.status === "pending").length} pending / follow-up · {jobs.filter((j) => j.status === "on_hold").length} on hold · {jobs.reduce((n, j) => n + j.machinesCovered, 0)} machines covered</div> : <div className="border-t border-line p-4"><div className="mb-2 flex flex-wrap justify-between gap-2 text-xs text-mute"><span>Task planning · last 7 days</span><span>{engineerUsage(data, e.id).plants} plants · {s.reportsSent} reports sent</span></div><div className="grid grid-cols-7 gap-1">{days.map((day) => <div key={day} title={`${fmtDate(day)}: ${s.activeOn(day) ? "Tasks planned" : "No task record"}`} className={cn("min-w-0 rounded-sm py-2 text-center text-[10px]", s.activeOn(day) ? "bg-signal/10 text-signal" : "bg-base text-mute")}><span className="block">{new Date(`${day}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short" })}</span><span className="num block">{day.slice(8)}</span></div>)}</div></div>}
      </article>;
    })}</div>{!visible.length && <Empty>No engineers match these filters.</Empty>}
  </div>;
}