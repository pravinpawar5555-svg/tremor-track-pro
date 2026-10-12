import { Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Empty, Panel, Select } from "@/components/console/ui";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  TODAY, activeReports, analystsOf, engineerName, fmtDate, frequencyLabel, plantName, shiftDate, taskTypeLabel, updateTask,
  type AppData, type Task,
} from "@/lib/store";
import { useVisits } from "@/lib/visits";
import { useComms, openFollowUp } from "@/lib/comms";
import { useExecution, saveJob, installTypeLabel, execStatusLabel, type ExecJob } from "@/lib/execution";
import { levelFor, useWorkloadSettings, type Level } from "@/lib/workload";

type Period = "day" | "week" | "month";
type Team = "all" | "cs" | "exec";

const dow = (iso: string) => new Date(iso + "T00:00:00Z").getUTCDay();
const weekStart = (iso: string) => shiftDate(iso, -((dow(iso) + 6) % 7));
function periodDays(p: Period, anchor: string): string[] {
  if (p === "day") return [anchor];
  if (p === "week") { const s = weekStart(anchor); return Array.from({ length: 7 }, (_, i) => shiftDate(s, i)); }
  const first = anchor.slice(0, 8) + "01";
  const out: string[] = [];
  for (let d = first; d.slice(0, 7) === first.slice(0, 7); d = shiftDate(d, 1)) out.push(d);
  return out;
}
const shiftPeriod = (p: Period, a: string, dir: number) => {
  if (p === "day") return shiftDate(a, dir);
  if (p === "week") return shiftDate(a, 7 * dir);
  const [y, m] = a.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1 + dir, 1));
  return dt.toISOString().slice(0, 10);
};

const levelCls: Record<Level, string> = {
  none: "bg-black/[0.03] text-mute",
  normal: "bg-sev-low/10 text-ink",
  high: "bg-sev-medium/15 text-ink",
  over: "bg-sev-critical/15 text-ink",
};
const doneOn = (t: Task) => (t.completedAt ?? "").slice(0, 10);

/* ------------------------------------------------------------ CS day model */
function csDay(data: AppData, extras: { visits: ReturnType<typeof useVisits>; comms: ReturnType<typeof useComms> }, id: string, d: string) {
  const tasks = data.tasks.filter((t) => {
    if (t.engineerId !== id) return false;
    const done = t.status === "completed" ? doneOn(t) || t.taskDate : "";
    const end = done || (t.taskDate < TODAY ? TODAY : t.taskDate);
    return t.originalDate <= d && end >= d;
  });
  const carried = tasks.filter((t) => t.originalDate < d && !(t.status === "completed" && doneOn(t) <= d && doneOn(t) !== d));
  const waiting = d === TODAY ? tasks.filter((t) => t.status === "waiting") : [];
  const reports = activeReports(data).filter((r) => r.byEngineerId === id && r.dueDate === d);
  const visits = extras.visits.filter((v) => v.engineerIds.includes(id) && v.status !== "cancelled" && (v.completedDate ?? v.plannedDate) === d);
  const follow = extras.comms.filter((c) => c.followUpOwner === id && c.nextFollowUp === d && openFollowUp(c.followUp));
  const review = (data.tickets ?? []).filter((t) => t.raisedBy === id && t.raisedOn === d && (t.status === "open" || t.status === "in-discussion"));
  const total = tasks.length + reports.length + visits.length + follow.length;
  return { tasks, carried, waiting, reports, visits, follow, review, total };
}

/* ------------------------------------------------------------ Exec model */
const jStart = (j: ExecJob) => j.actualStart || j.plannedStart || j.expectedDate || "";
const jEnd = (j: ExecJob) => j.actualEnd || j.plannedEnd || jStart(j);
const jOpen = (j: ExecJob) => j.status !== "completed" && j.status !== "cancelled";
const overlaps = (a: ExecJob, b: ExecJob) => jStart(a) <= jEnd(b) && jStart(b) <= jEnd(a);

type Drill =
  | { kind: "cs"; id: string; d: string }
  | { kind: "job"; job: ExecJob }
  | null;

export function Workload({ data, myName }: { data: AppData; myName: string }) {
  const visits = useVisits();
  const comms = useComms();
  const ex = useExecution();
  const rules = useWorkloadSettings();
  const [period, setPeriod] = useState<Period>("week");
  const [anchor, setAnchor] = useState(TODAY);
  const [team, setTeam] = useState<Team>("all");
  const [eng, setEng] = useState("all");
  const [mode, setMode] = useState<"grid" | "summary">("grid");
  const [drill, setDrill] = useState<Drill>(null);
  const days = useMemo(() => periodDays(period, anchor), [period, anchor]);
  const nonWork = (d: string) => rules.nonWorkingDays.includes(dow(d)) || rules.holidays.includes(d);

  const csTeam = analystsOf(data).filter((a) => eng === "all" || a.id === eng);
  const exTeam = ex.engineers.filter((e) => e.status === "active" && (eng === "all" || e.id === eng));
  const showCs = team !== "exec";
  const showEx = team !== "cs";
  const x = { visits, comms };

  const jobsOf = (id: string) => ex.jobs.filter((j) => (j.assignedEngineerId === id || j.secondaryEngineerId === id) && j.status !== "cancelled");
  const inRange = (j: ExecJob) => !!jStart(j) && jStart(j) <= days[days.length - 1]! && jEnd(j) >= days[0]!;

  /* attention + conflicts */
  const attention: { who: string; text: string; tone: string }[] = [];
  const conflicts: { who: string; text: string }[] = [];
  for (const a of analystsOf(data)) {
    const carried = data.tasks.filter((t) => t.engineerId === a.id && t.status !== "completed" && t.originalDate < TODAY).length;
    const repWeek = activeReports(data).filter((r) => r.byEngineerId === a.id && r.status !== "sent" && r.dueDate >= TODAY && r.dueDate <= shiftDate(TODAY, 7)).length;
    if (carried >= 3 || repWeek >= 3) attention.push({ who: a.name, text: `${carried} carried items + ${repWeek} reports due in the next 7 days`, tone: "text-sev-high" });
    const byDay = new Map<string, number>();
    visits.filter((v) => v.engineerIds.includes(a.id) && v.status !== "cancelled" && v.status !== "completed" && v.plannedDate >= TODAY).forEach((v) => byDay.set(v.plannedDate, (byDay.get(v.plannedDate) ?? 0) + 1));
    for (const [d, n] of byDay) if (n > 1) conflicts.push({ who: a.name, text: `${n} customer visits on ${fmtDate(d)}` });
  }
  for (const e of ex.engineers.filter((z) => z.status === "active")) {
    const open = jobsOf(e.id).filter(jOpen);
    const dated = open.filter((j) => jStart(j));
    for (let i = 0; i < dated.length; i++) for (let k = i + 1; k < dated.length; k++) if (overlaps(dated[i]!, dated[k]!)) conflicts.push({ who: e.name, text: `${dated[i]!.plantName || "Job"} and ${dated[k]!.plantName || "Job"} overlap (${fmtDate(jStart(dated[k]!))})` });
    const pend = open.filter((j) => j.status === "pending" || j.status === "on_hold").length;
    if (pend) attention.push({ who: e.name, text: `${pend} pending / on-hold job${pend > 1 ? "s" : ""}`, tone: "text-sev-high" });
  }

  const label = period === "day" ? fmtDate(days[0]) : period === "week" ? `${fmtDate(days[0])} – ${fmtDate(days[days.length - 1])}` : new Date(days[0] + "T00:00:00Z").toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const colW = period === "month" ? 64 : period === "day" ? 220 : 110;
  const gridCols = `200px repeat(${days.length}, ${colW}px)`;

  const Seg = <T extends string,>({ v, set, opts }: { v: T; set: (x: T) => void; opts: [T, string][] }) => (
    <div className="inline-flex overflow-hidden rounded-md ring-1 ring-line">
      {opts.map(([id, l]) => <button key={id} type="button" onClick={() => set(id)} className={cn("px-2.5 py-1.5 text-xs font-medium", v === id ? "bg-signal text-signal-foreground" : "bg-panel text-mute hover:bg-base")}>{l}</button>)}
    </div>
  );

  const Head = () => (
    <div className="sticky top-0 z-20 grid border-b border-line/70 bg-panel" style={{ gridTemplateColumns: gridCols }}>
      <div className="sticky left-0 z-30 bg-panel px-3 py-2 text-[11px] text-mute">Engineer</div>
      {days.map((d) => (
        <div key={d} className={cn("px-1 py-2 text-center text-[11px]", d === TODAY ? "border-t-2 border-signal bg-signal/5 font-semibold text-ink" : "text-mute", nonWork(d) && "bg-black/[0.04]")}>
          {period === "month" ? d.slice(8) : fmtDate(d).split(" ").slice(0, 2).join(" ")}
          {period !== "month" ? <div className="text-[10px]">{new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}</div> : null}
        </div>
      ))}
    </div>
  );
  const Name = ({ initials, name, role, sub }: { initials: string; name: string; role: string; sub: string }) => (
    <div className="sticky left-0 z-10 flex items-start gap-2 border-r border-line/60 bg-panel px-3 py-2">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-signal/10 text-[11px] font-semibold text-signal">{initials}</span>
      <div className="min-w-0"><div className="truncate text-sm font-medium">{name}</div><div className="text-[10px] text-mute">{role}</div><div className="text-[10px] text-mute">{sub}</div></div>
    </div>
  );
  const hatch = (d: string) => nonWork(d) ? { backgroundImage: "repeating-linear-gradient(45deg, transparent 0 6px, rgba(0,0,0,0.035) 6px 7px)" } : undefined;

  const csRow = (a: { id: string; name: string; initials: string }) => {
    const cells = days.map((d) => csDay(data, x, a.id, d));
    const sum = cells.reduce((s, c) => s + c.total, 0);
    return (
      <div key={a.id} className="grid border-b border-line/50" style={{ gridTemplateColumns: gridCols }}>
        <Name initials={a.initials} name={a.name} role="Customer Success" sub={`${period === "day" ? "Today" : "Period"}: ${sum} active items`} />
        {cells.map((c, i) => {
          const d = days[i]!;
          const lvl = levelFor(c.total, rules.csHigh, rules.csOver);
          const future = d > TODAY;
          return (
            <button key={d} type="button" onClick={() => setDrill({ kind: "cs", id: a.id, d })} style={hatch(d)}
              className={cn("m-0.5 rounded-md px-1 py-1 text-left text-[10px] leading-tight ring-1 ring-transparent hover:ring-signal/40", c.total ? (lvl ? levelCls[lvl] : future ? "bg-signal/5" : "bg-black/[0.03]") : "text-mute", d === TODAY && "ring-signal/30")}>
              {c.total ? (
                <>
                  <div className="num text-sm font-semibold">{c.total}</div>
                  {period !== "month" ? (
                    <>
                      {c.tasks.length ? <div>{c.tasks.length} tasks</div> : null}
                      {c.reports.length ? <div>{c.reports.length} report{c.reports.length > 1 ? "s" : ""}</div> : null}
                      {c.visits.length ? <div className={c.visits.length > 1 ? "text-sev-critical" : ""}>{c.visits.length} visit{c.visits.length > 1 ? "s" : ""}</div> : null}
                      {c.follow.length ? <div>{c.follow.length} follow-up</div> : null}
                      {c.carried.length ? <div className="text-sev-high">{c.carried.length} carried</div> : null}
                      {c.review.length ? <div className="text-[oklch(0.5_0.18_300)]">{c.review.length} review</div> : null}
                    </>
                  ) : c.carried.length ? <div className="text-sev-high">↻{c.carried.length}</div> : null}
                </>
              ) : <span className="opacity-50">—</span>}
            </button>
          );
        })}
      </div>
    );
  };

  const exRow = (e: { id: string; name: string }) => {
    const jobs = jobsOf(e.id).filter(inRange).sort((a, b) => (jStart(a) < jStart(b) ? -1 : 1));
    const lanes: ExecJob[][] = [];
    for (const j of jobs) { const lane = lanes.find((l) => !l.some((o) => overlaps(o, j))); if (lane) lane.push(j); else lanes.push([j]); }
    const field = new Set<string>();
    jobs.forEach((j) => days.forEach((d) => { if (d >= jStart(j) && d <= jEnd(j)) field.add(d); }));
    const sensors = jobs.reduce((s, j) => s + (j.sensorsInstalled || 0), 0);
    const initials = e.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const daily = days.map((d) => jobs.filter((j) => d >= jStart(j) && d <= jEnd(j)).length);
    return (
      <div key={e.id} className="grid border-b border-line/50" style={{ gridTemplateColumns: gridCols }}>
        <div style={{ gridRow: `1 / span ${Math.max(1, lanes.length)}` }} className="sticky left-0 z-10 bg-panel"><Name initials={initials} name={e.name} role="Execution" sub={`${jobs.length} job${jobs.length === 1 ? "" : "s"} · ${field.size} field days${sensors ? ` · ${sensors} sensors` : ""}`} /></div>
        {!lanes.length ? days.map((d, i) => <div key={d} style={{ ...hatch(d), gridColumn: i + 2, gridRow: 1 }} className={cn("m-0.5 rounded-md py-3 text-center text-[10px] text-mute", d === TODAY && "bg-signal/5")}>—</div>) : null}
        {lanes.flatMap((lane, li) => lane.map((j) => {
          const s = Math.max(0, days.indexOf(jStart(j) < days[0]! ? days[0]! : jStart(j)));
          const endD = jEnd(j) > days[days.length - 1]! ? days[days.length - 1]! : jEnd(j);
          const en = days.indexOf(endD);
          const blocked = j.status === "pending" || j.status === "on_hold";
          const conflict = daily.slice(s, en + 1).some((n) => n > 1);
          const lvl = levelFor(Math.max(...daily.slice(s, en + 1)), rules.execHigh, rules.execOver);
          return (
            <button key={j.id} type="button" onClick={() => setDrill({ kind: "job", job: j })}
              style={{ gridColumn: `${s + 2} / ${en + 3}`, gridRow: li + 1 }}
              className={cn("m-0.5 truncate rounded-md px-2 py-1 text-left text-[10px] leading-tight ring-1",
                j.status === "completed" ? "bg-sev-low/10 ring-sev-low/30" : blocked ? "bg-sev-high/10 ring-sev-high/40" : conflict || lvl === "over" ? "bg-sev-critical/10 ring-sev-critical/40" : lvl === "high" ? "bg-sev-medium/15 ring-sev-medium/40" : "bg-signal/10 ring-signal/30")}>
              <div className="truncate text-[11px] font-semibold">{j.plantName || j.customerName || "Job"}</div>
              <div className="truncate text-mute">{installTypeLabel[j.installationType]} · {execStatusLabel[j.status]}{j.sensorsInstalled ? ` · ${j.sensorsInstalled} sensors` : ""}{conflict ? " · Conflict" : ""}</div>
            </button>
          );
        }))}
      </div>
    );
  };

  const Group = ({ title, children }: { title: string; children: ReactNode }) => (
    <>
      <div className="sticky left-0 z-10 w-fit bg-base px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-mute">{title}</div>
      {children}
    </>
  );

  /* unscheduled */
  const unsched: { who: string; text: string }[] = [
    ...analystsOf(data).map((a) => ({ who: a.name, n: data.tasks.filter((t) => t.engineerId === a.id && t.status !== "completed" && t.originalDate < TODAY).length })).filter((r) => r.n).map((r) => ({ who: r.who, text: `${r.n} carried item${r.n > 1 ? "s" : ""}` })),
    ...ex.engineers.filter((e) => e.status === "active").map((e) => ({ who: e.name, n: jobsOf(e.id).filter((j) => jOpen(j) && !jStart(j)).length })).filter((r) => r.n).map((r) => ({ who: r.who, text: `${r.n} job${r.n > 1 ? "s" : ""} awaiting schedule` })),
  ];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button onClick={() => setAnchor(TODAY)}>Today</Button>
        <Seg v={period} set={setPeriod} opts={[["day", "Day"], ["week", "Week"], ["month", "Month"]]} />
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous period" onClick={() => setAnchor(shiftPeriod(period, anchor, -1))} className="grid size-8 place-items-center rounded-md ring-1 ring-line hover:bg-base"><ChevronLeft className="size-4" /></button>
          <span className="num min-w-40 text-center text-sm font-medium">{label}</span>
          <button type="button" aria-label="Next period" onClick={() => setAnchor(shiftPeriod(period, anchor, 1))} className="grid size-8 place-items-center rounded-md ring-1 ring-line hover:bg-base"><ChevronRight className="size-4" /></button>
        </div>
        <Seg v={team} set={(t) => { setTeam(t); setEng("all"); }} opts={[["all", "All Teams"], ["cs", "Customer Success"], ["exec", "Execution"]]} />
        <Select className="w-48" value={eng} onChange={(e) => setEng(e.target.value)} aria-label="Engineer">
          <option value="all">All Engineers</option>
          {showCs ? analystsOf(data).map((a) => <option key={a.id} value={a.id}>{a.name}</option>) : null}
          {showEx ? ex.engineers.filter((e) => e.status === "active").map((e) => <option key={e.id} value={e.id}>{e.name}</option>) : null}
        </Select>
        <div className="ml-auto"><Seg v={mode} set={setMode} opts={[["grid", "Workload Grid"], ["summary", "Summary"]]} /></div>
      </div>

      <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-mute">
        {[["bg-sev-low/30", "Normal"], ["bg-sev-medium/40", "High"], ["bg-sev-critical/40", "Over capacity / conflict"], ["bg-signal/30", "Scheduled"], ["bg-sev-high/40", "Carried / blocked"], ["bg-black/10", "No work / non-working"]].map(([c, l]) => <span key={l} className="flex items-center gap-1.5"><span className={cn("size-2.5 rounded-sm", c)} />{l}</span>)}
        {rules.csHigh === null && rules.execHigh === null ? <span>· Workload levels not configured — showing counts only (Settings → Workload)</span> : null}
      </div>

      {mode === "grid" ? (
        <>
          <div className="panel-glass hidden max-h-[70vh] overflow-auto md:block">
            <div className="w-max min-w-full">
              <Head />
              {showCs && csTeam.length ? <Group title="Customer Success">{csTeam.map(csRow)}</Group> : null}
              {showEx && exTeam.length ? <Group title="Execution">{exTeam.map(exRow)}</Group> : null}
            </div>
          </div>
          {/* phone: per-engineer cards */}
          <div className="grid gap-3 md:hidden">
            {showCs ? csTeam.map((a) => (
              <Panel key={a.id} title={a.name} meta={<span>Customer Success</span>}>
                <div className="flex snap-x gap-2 overflow-x-auto p-3">
                  {days.map((d) => { const c = csDay(data, x, a.id, d); const lvl = levelFor(c.total, rules.csHigh, rules.csOver); return (
                    <button key={d} type="button" onClick={() => setDrill({ kind: "cs", id: a.id, d })} className={cn("min-w-24 snap-start rounded-md p-2 text-left text-[11px] ring-1 ring-line/60", lvl ? levelCls[lvl] : "", d === TODAY && "ring-signal/50")}>
                      <div className="font-semibold">{fmtDate(d).split(" ").slice(0, 2).join(" ")}</div>
                      <div className="num text-base font-semibold">{c.total} <span className="text-[10px] font-normal">active</span></div>
                      {c.reports.length ? <div>{c.reports.length} reports</div> : null}{c.visits.length ? <div>{c.visits.length} visit</div> : null}{c.follow.length ? <div>{c.follow.length} follow-up</div> : null}
                      {lvl === "high" ? <div className="text-sev-medium">High workload</div> : lvl === "over" ? <div className="text-sev-critical">Over capacity</div> : null}
                    </button>); })}
                </div>
              </Panel>
            )) : null}
            {showEx ? exTeam.map((e) => (
              <Panel key={e.id} title={e.name} meta={<span>Execution</span>}>
                <div className="divide-y divide-line/60">
                  {jobsOf(e.id).filter(inRange).map((j) => <button key={j.id} type="button" onClick={() => setDrill({ kind: "job", job: j })} className="block w-full px-4 py-2 text-left text-sm"><div className="font-medium">{j.plantName || j.customerName}</div><div className="text-xs text-mute">{installTypeLabel[j.installationType]} · {fmtDate(jStart(j))}{jEnd(j) !== jStart(j) ? ` – ${fmtDate(jEnd(j))}` : ""} · {execStatusLabel[j.status]}</div></button>)}
                  {!jobsOf(e.id).filter(inRange).length ? <Empty>No jobs in this period.</Empty> : null}
                </div>
              </Panel>
            )) : null}
          </div>
        </>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {showCs ? csTeam.map((a) => {
            const cells = days.map((d) => csDay(data, x, a.id, d));
            const uniq = <T extends { id: string }>(xs: T[]) => new Set(xs.map((z) => z.id)).size;
            const rows: [string, number][] = [["Tasks", uniq(cells.flatMap((c) => c.tasks))], ["Reports", uniq(cells.flatMap((c) => c.reports))], ["Visits", uniq(cells.flatMap((c) => c.visits))], ["Follow-ups", uniq(cells.flatMap((c) => c.follow))], ["Carried", uniq(cells.flatMap((c) => c.carried))]];
            return <SummaryCard key={a.id} name={a.name} role="Customer Success Engineer" rows={rows} />;
          }) : null}
          {showEx ? exTeam.map((e) => {
            const jobs = jobsOf(e.id).filter(inRange);
            const field = new Set<string>(); jobs.forEach((j) => days.forEach((d) => { if (d >= jStart(j) && d <= jEnd(j)) field.add(d); }));
            const rows: [string, number][] = [["Jobs", jobs.length], ["Field days", field.size], ["Sensors", jobs.reduce((s, j) => s + (j.sensorsInstalled || 0), 0)], ["Machines", jobs.reduce((s, j) => s + (j.machinesCovered || 0), 0)], ["Pending", jobsOf(e.id).filter((j) => j.status === "pending" || j.status === "on_hold").length]];
            return <SummaryCard key={e.id} name={e.name} role="Execution Engineer" rows={rows} />;
          }) : null}
        </div>
      )}

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-3">
        <Panel title="Workload Attention">
          <div className="divide-y divide-line/60">{attention.map((a, i) => <div key={i} className="px-4 py-2 text-sm"><div className="font-medium">{a.who}</div><div className={cn("text-xs", a.tone)}>{a.text}</div></div>)}{!attention.length ? <Empty>Nothing accumulating.</Empty> : null}</div>
        </Panel>
        <Panel title="Scheduling Conflicts">
          <div className="divide-y divide-line/60">{conflicts.map((c, i) => <div key={i} className="px-4 py-2 text-sm"><div className="font-medium">{c.who}</div><div className="text-xs text-sev-critical">{c.text}</div></div>)}{!conflicts.length ? <Empty>No conflicts.</Empty> : null}</div>
        </Panel>
        <Panel title="Unscheduled / Carried Work">
          <div className="divide-y divide-line/60">{unsched.map((u, i) => <div key={i} className="flex justify-between px-4 py-2 text-sm"><span>{u.who}</span><span className="text-xs text-sev-high">{u.text}</span></div>)}{!unsched.length ? <Empty>All work is scheduled.</Empty> : null}</div>
        </Panel>
      </div>

      <Sheet open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {drill?.kind === "cs" ? <CsDrill data={data} x={x} id={drill.id} d={drill.d} myName={myName} /> : null}
          {drill?.kind === "job" ? <JobDrill job={drill.job} myName={myName} onDone={() => setDrill(null)} /> : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function SummaryCard({ name, role, rows }: { name: string; role: string; rows: [string, number][] }) {
  return (
    <Panel title={name} meta={<span>{role}</span>}>
      <div className="grid grid-cols-5 gap-1.5 p-3">{rows.map(([l, v]) => <div key={l} className="rounded-md bg-base px-1 py-2 text-center ring-1 ring-line/60"><div className="num text-base font-semibold">{v}</div><div className="text-[10px] text-mute">{l}</div></div>)}</div>
    </Panel>
  );
}

function CsDrill({ data, x, id, d, myName }: { data: AppData; x: { visits: ReturnType<typeof useVisits>; comms: ReturnType<typeof useComms> }; id: string; d: string; myName: string }) {
  const c = csDay(data, x, id, d);
  const [move, setMove] = useState<{ t: Task; to: string } | null>(null);
  const others = analystsOf(data).filter((a) => a.id !== id);
  const Sec = ({ t, n, children }: { t: string; n: number; children: ReactNode }) => n ? <div><div className="label-caps mb-1">{t} · {n}</div><div className="grid gap-1">{children}</div></div> : null;
  const Line = ({ a, b, right }: { a: string; b: string; right?: ReactNode }) => <div className="flex items-start justify-between gap-2 rounded-md bg-base px-2.5 py-1.5 text-sm ring-1 ring-line/60"><div className="min-w-0"><div className="truncate">{a}</div><div className="text-[11px] text-mute">{b}</div></div>{right}</div>;
  const confirm = () => {
    if (!move?.to) return;
    if (!window.confirm(`Reassign "${move.t.title}"\nCurrent owner: ${engineerName(data, id)}\nNew owner: ${engineerName(data, move.to)}\nDate: ${fmtDate(move.t.taskDate)}`)) return;
    updateTask(move.t.id, { engineerId: move.to }, `Reassigned from ${engineerName(data, id)} to ${engineerName(data, move.to)} by ${myName}`);
    toast.success("Task reassigned");
    setMove(null);
  };
  return (
    <>
      <SheetHeader><SheetTitle>{engineerName(data, id)}</SheetTitle><div className="text-xs text-mute">{fmtDate(d)} · {c.total} active items</div></SheetHeader>
      <div className="grid gap-4 p-4">
        <Sec t="Daily work" n={c.tasks.length}>
          {c.tasks.map((t) => (
            <Line key={t.id} a={t.title} b={[t.plantId ? plantName(data, t.plantId) : "Internal", taskTypeLabel[t.taskType], t.status === "completed" ? "Completed" : t.originalDate < d ? `Carried from ${fmtDate(t.originalDate)}` : "", t.status === "waiting" ? t.waitingReason : ""].filter(Boolean).join(" · ")}
              right={t.status !== "completed" && d >= TODAY ? <button type="button" className="shrink-0 text-[11px] text-signal" onClick={() => setMove({ t, to: "" })}>Reassign</button> : null} />
          ))}
        </Sec>
        {move ? (
          <div className="grid gap-2 rounded-md p-3 ring-1 ring-signal/40">
            <div className="text-xs">Reassign <b>{move.t.title}</b> — current owner {engineerName(data, id)}</div>
            <Select value={move.to} onChange={(e) => setMove({ ...move, to: e.target.value })}><option value="">New owner…</option>{others.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setMove(null)}>Cancel</Button><Button variant="solid" onClick={confirm} disabled={!move.to}>Confirm reassign</Button></div>
          </div>
        ) : null}
        <Sec t="Reports" n={c.reports.length}>{c.reports.map((r) => <Line key={r.id} a={`${plantName(data, r.plantId)} — ${frequencyLabel[r.type]} report`} b={r.status === "sent" ? "Sent" : r.status === "prepared" ? "Prepared" : "Pending"} />)}</Sec>
        <Sec t="Customer visits" n={c.visits.length}>{c.visits.map((v) => <Line key={v.id} a={plantName(data, v.plantId)} b={v.purpose || v.visitType} />)}</Sec>
        <Sec t="Customer follow-ups" n={c.follow.length}>{c.follow.map((f) => <Line key={f.id} a={`${plantName(data, f.plantId)} — ${f.subject || f.type}`} b="Follow-up due" />)}</Sec>
        <Sec t="Waiting for manager review" n={c.review.length}>{c.review.map((t) => <Line key={t.id} a={`${t.ticketNo} · ${t.subject}`} b={plantName(data, t.plantId)} />)}</Sec>
        {!c.total && !c.review.length ? <Empty>No work recorded for this day.</Empty> : null}
        <div className="flex flex-wrap gap-2">
          <Link to="/tasks" className="rounded-md px-3 py-1.5 text-xs text-signal ring-1 ring-signal/40">View Daily Work</Link>
          <Link to="/reports" className="rounded-md px-3 py-1.5 text-xs text-signal ring-1 ring-signal/40">View Reports</Link>
          <Link to="/visits" className="rounded-md px-3 py-1.5 text-xs text-signal ring-1 ring-signal/40">View Visits</Link>
        </div>
      </div>
    </>
  );
}

function JobDrill({ job, myName, onDone }: { job: ExecJob; myName: string; onDone: () => void }) {
  const ex = useExecution();
  const [to, setTo] = useState("");
  const owner = ex.engineers.find((e) => e.id === job.assignedEngineerId);
  const pending = [job.kickoff !== "yes" ? "Kickoff" : "", job.configuration !== "yes" ? "Configuration" : "", job.aip !== "yes" ? "AIP Sheet" : "", !job.reportLink ? "Report link" : ""].filter(Boolean);
  const reassign = async () => {
    const n = ex.engineers.find((e) => e.id === to);
    if (!n || !window.confirm(`Reassign ${job.plantName || job.customerName}\nCurrent owner: ${owner?.name ?? "Unassigned"}\nNew owner: ${n.name}\nDates: ${fmtDate(jStart(job))} – ${fmtDate(jEnd(job))}`)) return;
    try { await saveJob({ ...job, assignedEngineerId: to }, job, myName); toast.success(`Job reassigned to ${n.name}`); onDone(); }
    catch { toast.error("Could not reassign"); }
  };
  return (
    <>
      <SheetHeader><SheetTitle>{job.plantName || job.customerName}</SheetTitle><div className="text-xs text-mute">{installTypeLabel[job.installationType]} · {execStatusLabel[job.status]}</div></SheetHeader>
      <div className="grid gap-2 p-4 text-sm">
        {[["Engineer", owner?.name ?? "Unassigned"], ["Planned", jStart(job) ? `${fmtDate(jStart(job))}${jEnd(job) !== jStart(job) ? ` – ${fmtDate(jEnd(job))}` : ""}` : "Not scheduled"], ["Sensors", String(job.sensorsInstalled || 0)], ["Machines", String(job.machinesCovered || 0)], ["Pending reason", job.pendingReason || "—"], ["Pending items", pending.join(", ") || "None"]].map(([k, v]) => <div key={k} className="flex justify-between gap-3"><span className="text-xs text-mute">{k}</span><span className="text-right text-xs">{v}</span></div>)}
        {jOpen(job) ? (
          <div className="mt-2 grid gap-2 rounded-md p-3 ring-1 ring-line">
            <div className="label-caps">Reassign</div>
            <Select value={to} onChange={(e) => setTo(e.target.value)}><option value="">New owner…</option>{ex.engineers.filter((e) => e.status === "active" && e.id !== job.assignedEngineerId).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select>
            <div className="flex justify-end"><Button variant="solid" onClick={() => void reassign()} disabled={!to}>Confirm reassign</Button></div>
          </div>
        ) : null}
        <div className="mt-2 flex gap-2"><Link to="/execution" className="rounded-md px-3 py-1.5 text-xs text-signal ring-1 ring-signal/40">Open Execution Job</Link><Link to="/execution" className="rounded-md px-3 py-1.5 text-xs text-signal ring-1 ring-signal/40">View Schedule</Link></div>
      </div>
    </>
  );
}
