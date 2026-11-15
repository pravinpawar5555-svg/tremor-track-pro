import { useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, FileText, ListFilter, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dateOffset, deliveryLane, deliveryWindow, pendingSchedules, type DeliveryLane } from "@/lib/report-horizon";
import { TODAY, engineerName, fmtDate, frequencyLabel, plantName, setReportStatus, type AppData, type RecurringReport, type ReportRow } from "@/lib/store";

type Item = { id: string; plantId: string; type: ReportRow["type"]; due: string; owner: string; status: string; period: string; generated: boolean };
const laneStyle = {
  overdue: "border-sev-critical/40 bg-sev-critical/10 text-sev-critical",
  week: "border-sev-medium/40 bg-sev-medium/10 text-ink",
  next: "border-signal/30 bg-signal/10 text-signal",
  later: "border-line bg-muted text-mute",
};

function DeliveryCard({ item, data }: { item: Item; data: AppData }) {
  const overdue = item.due < TODAY;
  const lateDays = Math.round((Date.parse(`${TODAY}T12:00:00Z`) - Date.parse(`${item.due}T12:00:00Z`)) / 86400000);
  return <article className={cn("min-w-0 rounded-lg border bg-panel p-4", overdue ? "border-sev-critical/30" : "border-line")}>
    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
      <span className="font-medium uppercase text-mute">{frequencyLabel[item.type]}</span>
      <span className={cn("inline-flex items-center gap-1 rounded px-2 py-1 font-medium", item.status === "prepared" ? "bg-sev-low/10 text-sev-low" : "bg-muted text-mute")}>
        {item.status === "prepared" ? <CheckCircle2 className="size-3" /> : <Clock3 className="size-3" />}
        {item.status === "scheduled" ? "Scheduled · not generated" : item.status === "prepared" ? "Prepared" : "Pending"}
      </span>
    </div>
    <h4 className="mt-3 break-words text-sm font-semibold">{plantName(data, item.plantId)}</h4>
    {item.period ? <p className="mt-1 break-words text-xs text-mute">{item.period}</p> : null}
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
      <span className={cn("num", overdue ? "text-sev-critical" : "text-signal")}>Due {fmtDate(item.due)}</span>
      <span className="break-words text-mute">{engineerName(data, item.owner) || "Unassigned"}</span>
    </div>
    {overdue ? <div className="mt-2 flex items-center gap-1 text-xs font-medium text-sev-critical"><ShieldAlert className="size-3.5" />{lateDays} {lateDays === 1 ? "day" : "days"} overdue</div> : null}
    {item.generated ? <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
      {item.status === "pending" ? <Button variant="outline" size="sm" onClick={() => setReportStatus(item.id, "prepared")}>Mark prepared</Button> : null}
      <Button variant={item.status === "prepared" ? "default" : "ghost"} size="sm" onClick={() => setReportStatus(item.id, "sent")}><CheckCircle2 />Mark sent</Button>
    </div> : null}
  </article>;
}

export function ReportDeliveryOverview({ data, reports, schedules, onRegister }: { data: AppData; reports: ReportRow[]; schedules: RecurringReport[]; onRegister: () => void }) {
  const [expanded, setExpanded] = useState<DeliveryLane | null>(null);
  const [focus, setFocus] = useState<DeliveryLane | "all">("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const window = deliveryWindow(TODAY);
  const items: Item[] = [
    ...reports.filter((report) => report.status !== "sent").map((report) => ({ id: report.id, plantId: report.plantId, type: report.type, due: report.dueDate, owner: report.byEngineerId, status: report.status, period: report.period, generated: true })),
    ...pendingSchedules(reports, schedules).filter((schedule) => schedule.nextDue >= TODAY).map((schedule) => ({ id: `schedule-${schedule.id}`, plantId: schedule.plantId, type: schedule.type, due: schedule.nextDue, owner: schedule.engineerId, status: "scheduled", period: "", generated: false })),
  ].sort((a, b) => a.due.localeCompare(b.due) || a.plantId.localeCompare(b.plantId));
  const lanes = [
    { id: "overdue" as const, title: "Overdue", date: `Before ${fmtDate(TODAY)}`, icon: ShieldAlert },
    { id: "week" as const, title: "This week", date: `${fmtDate(TODAY)} – ${fmtDate(window.end)}`, icon: Clock3 },
    { id: "next" as const, title: "Next week", date: `${fmtDate(window.nextStart)} – ${fmtDate(window.nextEnd)}`, icon: CalendarDays },
    { id: "later" as const, title: "Later", date: `After ${fmtDate(window.nextEnd)}`, icon: ArrowRight },
  ];
  const dates = Array.from({ length: 14 }, (_, index) => dateOffset(window.start, index));
  const visibleLanes = focus === "all" ? lanes.filter((lane) => lane.id !== "later") : lanes.filter((lane) => lane.id === focus);
  const dateRows = items.filter((item) => item.due === selectedDate);
  return <div className="mt-5 min-w-0">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><ListFilter className="size-4 text-signal" />Delivery Horizon</h2>
      <Button variant="outline" size="sm" onClick={onRegister}><FileText />Full register<ArrowRight /></Button>
    </div>
    <div aria-label="Delivery horizon filters" className="grid grid-cols-2 gap-2 lg:grid-cols-5">
      <Button variant="outline" aria-pressed={focus === "all" && selectedDate === null} onClick={() => { setFocus("all"); setSelectedDate(null); }} className={cn("h-auto min-h-24 flex-col items-start whitespace-normal border bg-panel p-3 text-left", focus === "all" && selectedDate === null ? "border-signal ring-1 ring-signal" : "border-line")}>
        <span className="flex items-center gap-2 text-xs text-mute"><FileText />All outstanding</span><span className="num text-2xl font-semibold text-signal">{items.length}</span>
      </Button>
      {lanes.map((lane) => <Button key={lane.id} variant="outline" aria-pressed={focus === lane.id && selectedDate === null} onClick={() => { setFocus(lane.id); setSelectedDate(null); setExpanded(lane.id); }} className={cn("h-auto min-h-24 flex-col items-start whitespace-normal border p-3 text-left", laneStyle[lane.id], focus === lane.id && selectedDate === null ? "ring-1 ring-current" : "") }>
        <span className="flex items-center gap-2 text-xs"><lane.icon />{lane.title}</span><span className="num text-2xl font-semibold">{items.filter((item) => deliveryLane(item.due, TODAY) === lane.id).length}</span>
      </Button>)}
    </div>
    <div className="mb-6 mt-6 border-y border-line py-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="size-4 text-signal" />Weekly delivery calendar</h2><span className="text-[11px] text-mute">Outstanding · generated + scheduled</span></div>
      <div className="grid gap-5 md:grid-cols-2">
        {[{ label: "This week", start: 0 }, { label: "Next week", start: 7 }].map((week) => <section key={week.label} aria-label={`${week.label} delivery calendar`}>
          <div className="mb-3 flex flex-wrap justify-between gap-1 text-xs font-medium"><span>{week.label}</span><span className="text-mute">{fmtDate(dates[week.start] ?? TODAY)} – {fmtDate(dates[week.start + 6] ?? TODAY)}</span></div>
          <div className="grid grid-cols-7 gap-1">{dates.slice(week.start, week.start + 7).map((date) => {
            const count = items.filter((item) => item.due === date).length;
            return <Button key={date} variant="ghost" aria-label={`${fmtDate(date)}: ${count} outstanding deliveries`} aria-pressed={selectedDate === date} onClick={() => { setSelectedDate(selectedDate === date ? null : date); setFocus("all"); }} className={cn("h-auto min-h-24 min-w-0 flex-col gap-1 rounded-md border px-0 py-2 text-xs", selectedDate === date ? "border-signal bg-signal text-signal-foreground hover:bg-signal/90 hover:text-signal-foreground" : date === TODAY ? "border-signal bg-signal/10 text-signal" : date < TODAY && count ? "border-sev-critical/30 bg-sev-critical/10 text-sev-critical" : count ? "border-line bg-panel text-ink" : "border-line text-mute")}>
              <span className="text-[10px]">{new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}</span><span className="num">{date.slice(8)}</span><span className="num text-sm font-semibold">{count || "–"}</span><span className="text-[9px]">{date === TODAY ? "Today" : "\u00a0"}</span>
            </Button>;
          })}</div>
        </section>)}
      </div>
    </div>
    {selectedDate ? <section aria-label="Selected date reports">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Due {fmtDate(selectedDate)} <span className="num text-mute">· {dateRows.length}</span></h3><Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}><X />Clear date</Button></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{dateRows.map((item) => <DeliveryCard key={item.id} item={item} data={data} />)}</div>
      {!dateRows.length ? <div className="flex min-h-28 items-center justify-center gap-2 border-y border-line text-xs text-mute"><CheckCircle2 className="size-4" />No outstanding deliveries on this date</div> : null}
    </section> : <div className={cn("grid items-start gap-5", focus === "all" ? "xl:grid-cols-3" : "grid-cols-1")}>
      {visibleLanes.map((lane) => {
        const rows = items.filter((item) => deliveryLane(item.due, TODAY) === lane.id);
        const ready = rows.filter((item) => item.status === "prepared").length;
        const planned = rows.filter((item) => !item.generated).length;
        return <section key={lane.id} aria-label={`${lane.title} reports`} className="min-w-0">
          <div className={cn("mb-3 flex items-center justify-between gap-3 border-b-2 px-1 py-3", laneStyle[lane.id])}>
            <div><h3 className="flex items-center gap-2 font-semibold"><lane.icon className="size-4" />{lane.title}</h3><div className="mt-1 text-[11px]">{lane.date}</div></div><span className="num text-2xl font-semibold">{rows.length}</span>
          </div>
          <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-mute"><span>{ready} prepared</span><span>{rows.length - planned - ready} pending</span><span>{planned} scheduled</span></div>
          <div className={cn("grid gap-3", focus !== "all" ? "md:grid-cols-2 xl:grid-cols-3" : "")}>{(expanded === lane.id ? rows : rows.slice(0, 6)).map((item) => <DeliveryCard key={item.id} item={item} data={data} />)}</div>
          {!rows.length ? <div className="flex min-h-28 items-center justify-center gap-2 border-y border-line text-xs text-mute"><CheckCircle2 className="size-4" />{lane.id === "overdue" ? "No overdue reports" : "No outstanding deliveries"}</div> : null}
          {rows.length > 6 ? <Button variant="outline" size="sm" className="mt-3" onClick={() => setExpanded(expanded === lane.id ? null : lane.id)}>{expanded === lane.id ? "Show fewer" : `Show all ${rows.length}`}</Button> : null}
        </section>;
      })}
    </div>}
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line py-4 text-xs text-mute"><span>{items.filter((item) => deliveryLane(item.due, TODAY) === "later").length} outstanding deliveries beyond {fmtDate(window.nextEnd)}</span><Button variant="link" size="sm" onClick={onRegister}>View register<ArrowRight /></Button></div>
  </div>;
}