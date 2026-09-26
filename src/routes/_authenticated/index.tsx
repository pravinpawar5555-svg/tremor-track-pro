import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/console/AppShell";
import { Bar, Chip, Empty, Kpi, Panel, PageHeader, StatusChip, Td, Th, TimingChip, Tr } from "@/components/console/ui";
import {
  TODAY,
  analystsOf,
  askForLabel,
  priorityLabel,
  ticketKpis,
  ticketSeverity,
  totalUnread,
  engineerName,
  engineerSummary,
  fmtDate,
  frequencyLabel,
  frequencyText,
  fleetTotals,
  plantName,
  plantSummary,
  reportKpis,
  reportTiming,
  shiftDate,
  taskStats,
  useData,
} from "@/lib/store";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Monitoring Control Centre — Forbes Marshall CM Portal" },
      {
        name: "description",
        content:
          "Central view of daily engineer work updates, plants observed, machines checked and customer report delivery status.",
      },
      { property: "og:title", content: "Monitoring Control Centre — Forbes Marshall CM Portal" },
      {
        property: "og:description",
        content: "Daily engineer work updates, plant coverage and on-time customer report tracking in one dashboard.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const data = useData();
  const manager = data.role === "manager";
  const me = data.currentUserId;
  const allTeam = analystsOf(data);
  const team = manager ? allTeam : allTeam.filter((a) => a.id === me);
  const plants = manager ? data.plants : data.plants.filter((p) => p.engineerId === me);
  const reports = manager ? data.reports : data.reports.filter((r) => r.byEngineerId === me);
  const stats = team.map((a) => ({ a, st: taskStats(data, a.id) }));
  const tasksTotal = stats.reduce((n, x) => n + x.st.total, 0);
  const tasksDone = stats.reduce((n, x) => n + x.st.done, 0);
  const carried = stats.reduce((n, x) => n + x.st.carried, 0);
  const ft = fleetTotals({ ...data, plants });
  const rk = reportKpis({ ...data, reports });
  const notUpdated = team.filter((a) => !taskStats(data, a.id).total);
  const overdueReports = reports
    .filter((r) => r.status !== "sent" && reportTiming(r).late)
    .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1));
  const dueSoon = reports
    .filter((r) => r.status !== "sent" && !reportTiming(r).late)
    .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1))
    .slice(0, 6);
  const tk = ticketKpis(data);
  const unread = totalUnread(data);
  const openTickets = (data.tickets ?? [])
    .filter((t) => manager || t.raisedBy === me || t.assignedTo === me)
    .filter((t) => t.status !== "closed" && t.status !== "responded")
    .sort((a, b) => (a.raisedOn < b.raisedOn ? 1 : -1));

  return (
    <AppShell>
      <PageHeader
        title="Monitoring Control Centre"
        subtitle={`${fmtDate(TODAY)} · daily work updates, plant coverage and customer report delivery`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        <Kpi
          label="Engineers with tasks"
          value={`${team.length - notUpdated.length}/${team.length}`}
          tone={notUpdated.length ? "high" : "low"}
          hint={notUpdated.length ? `${notUpdated.map((a) => a.name).join(", ")} — no tasks` : "Everyone planned the day"}
        />
        <Kpi label="Tasks today" value={tasksTotal} hint={manager ? `${team.length} engineers` : "Your tasks"} />
        <Kpi label="Tasks completed" value={tasksDone} tone={tasksDone === tasksTotal ? "low" : "medium"} hint={`${tasksTotal - tasksDone} pending`} />
        <Kpi label="Carried over" value={carried} tone={carried ? "high" : "low"} hint="From previous days" />
        <Kpi label="Reports overdue" value={rk.overdue} tone={rk.overdue ? "high" : "low"} hint={`${rk.pending} pending in total`} />
        <Kpi label="Report on-time rate" value={rk.onTimePct} unit="%" tone={rk.onTimePct >= 90 ? "low" : "medium"} hint={`${rk.sent} sent · ${rk.late} late`} />
        <Kpi
          label="Tickets for me"
          value={tk.waitingOnManager}
          tone={tk.waitingOnManager ? "high" : "low"}
          hint={`${tk.open} open · ${tk.responded} responded`}
        />
        <Kpi label="Unread messages" value={unread} tone={unread ? "medium" : "low"} hint="Internal discussion" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Total machines" value={ft.machines} hint={`${data.plants.length} plants`} />
        <Kpi label="Total assets" value={ft.assets} hint="Under monitoring" />
        <Kpi label="Node 6 sensors" value={ft.node6} hint="Installed qty" />
        <Kpi label="Node X sensors" value={ft.nodeX} hint="Installed qty" />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Panel title="Today's tasks" meta={<Link to="/tasks" className="text-signal">Open daily task</Link>}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Engineer</Th>
                  <Th align="right">Tasks</Th>
                  <Th align="right">Done</Th>
                  <Th align="right">Pending</Th>
                  <Th align="right">Carried</Th>
                </tr>
              </thead>
              <tbody>
                {stats.map(({ a, st }) => (
                  <Tr key={a.id}>
                    <Td>
                      <div className="font-medium">{a.name}</div>
                      <div className="mt-1"><Bar pct={st.total ? (st.done / st.total) * 100 : 0} severity={st.pending ? "medium" : "low"} /></div>
                    </Td>
                    <Td align="right" mono>{st.total}</Td>
                    <Td align="right" mono className="text-sev-low">{st.done}</Td>
                    <Td align="right" mono>{st.pending}</Td>
                    <Td align="right" mono className={st.carried ? "text-sev-high" : undefined}>{st.carried}</Td>
                  </Tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Needs my attention" meta={<Link to="/discussions" className="text-signal">Open discussion</Link>}>
          <div className="divide-y divide-line/60">
            {openTickets.map((t) => (
              <Link
                key={t.id}
                to="/discussions"
                className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm hover:bg-black/[0.03]"
              >
                <div>
                  <div className="font-medium">
                    {t.ticketNo} · {t.subject}
                  </div>
                  <div className="text-xs text-mute">
                    {plantName(data, t.plantId)} · {t.area || "—"} · {t.machine} · {askForLabel[t.askFor]} ·{" "}
                    {engineerName(data, t.raisedBy)}
                  </div>
                </div>
                <Chip severity={ticketSeverity(t.priority)} label={priorityLabel[t.priority]} />
              </Link>
            ))}
            {notUpdated.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
                <div>
                  <div className="font-medium">{a.name} has no tasks for today</div>
                  <div className="text-xs text-mute">Daily task list not started</div>
                </div>
                <Chip severity="high" label="Action" />
              </div>
            ))}
            {overdueReports.map((r) => {
              const t = reportTiming(r);
              return (
                <div key={r.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
                  <div>
                    <div className="font-medium">
                      {frequencyLabel[r.type]} report not sent — {plantName(data, r.plantId)}
                    </div>
                    <div className="text-xs text-mute">
                      {r.period} · due {fmtDate(r.dueDate)} · {engineerName(data, r.byEngineerId)}
                    </div>
                  </div>
                  <TimingChip late={t.late} label={t.label} />
                </div>
              );
            })}
            {!notUpdated.length && !overdueReports.length ? <Empty>Nothing pending. Everyone has tasks and reports are on time.</Empty> : null}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        <Panel title={manager ? "Engineer activity — last 7 days" : "My activity — last 7 days"} meta={manager ? <Link to="/engineers" className="text-signal">Details</Link> : undefined}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Engineer</Th>
                  <Th align="right">Active days</Th>
                  <Th align="right">Tasks</Th>
                  <Th align="right">Completed</Th>
                  <Th align="right">Reports sent</Th>
                  <Th align="right">Late</Th>
                </tr>
              </thead>
              <tbody>
                {team.map((a) => {
                  const s = engineerSummary(data, a.id);
                  return (
                    <Tr key={a.id}>
                      <Td>
                        <div className="font-medium">{a.name}</div>
                        <div className="mt-1"><Bar pct={s.tasks ? (s.done / s.tasks) * 100 : 0} severity={s.pending ? "medium" : "low"} /></div>
                      </Td>
                      <Td align="right" mono>{s.activeDays}/{s.days}</Td>
                      <Td align="right" mono>{s.tasks}</Td>
                      <Td align="right" mono>{s.done}</Td>
                      <Td align="right" mono>{s.reportsSent}</Td>
                      <Td align="right" mono className={s.reportsLate ? "text-sev-high" : undefined}>{s.reportsLate}</Td>
                    </Tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line/60 px-4 py-2 text-[11px] text-mute">
            Counts come from the engineers' own daily task lists — use them for follow-up, not as a judgement of analysis quality.
          </div>
        </Panel>

        <Panel title="Reports due next" meta={`${rk.dueThisWeek} due within 7 days`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Plant</Th>
                  <Th>Type</Th>
                  <Th>Due</Th>
                  <Th>Status</Th>
                  <Th align="right">Owner</Th>
                </tr>
              </thead>
              <tbody>
                {dueSoon.map((r) => (
                  <Tr key={r.id}>
                    <Td className="max-w-[14rem] truncate">{plantName(data, r.plantId)}</Td>
                    <Td>{frequencyLabel[r.type]}</Td>
                    <Td mono>{fmtDate(r.dueDate)}</Td>
                    <Td><StatusChip status={r.status} /></Td>
                    <Td align="right">{engineerName(data, r.byEngineerId)}</Td>
                  </Tr>
                ))}
              </tbody>
            </table>
          </div>
          {!dueSoon.length ? <Empty>No upcoming reports scheduled.</Empty> : null}
        </Panel>
      </div>

      <Panel className="mt-4" title="Plant coverage" meta={`${plants.length} plants`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <Th>Plant</Th>
                <Th>Customer</Th>
                <Th>Report cycle</Th>
                <Th align="right">Machines</Th>
                <Th>Last report sent</Th>
                <Th>Next report due</Th>
                <Th align="right">Engineer</Th>
              </tr>
            </thead>
            <tbody>
              {plants.map((p) => {
                const s = plantSummary(data, p.id);
                return (
                  <Tr key={p.id}>
                    <Td>
                      <Link to="/plants" className="font-medium hover:text-signal">{p.name}</Link>
                    </Td>
                    <Td className="text-mute">{p.customer}</Td>
                    <Td>{frequencyText(p)}</Td>
                    <Td align="right" mono>{p.machines}</Td>
                    <Td mono>{fmtDate(s.lastReportSent)}</Td>
                    <Td mono>{s.nextReport ? fmtDate(s.nextReport.dueDate) : "—"}</Td>
                    <Td align="right">{engineerName(data, p.engineerId)}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
