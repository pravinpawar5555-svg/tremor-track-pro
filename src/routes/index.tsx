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
  sumUpdates,
  todaysUpdates,
  useData,
} from "@/lib/store";

export const Route = createFileRoute("/")({
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
  const team = analystsOf(data);
  const today = todaysUpdates(data);
  const totals = sumUpdates(today);
  const ft = fleetTotals(data);
  const rk = reportKpis(data);
  const notUpdated = team.filter((a) => !today.some((u) => u.engineerId === a.id));
  const overdueReports = data.reports
    .filter((r) => r.status !== "sent" && reportTiming(r).late)
    .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1));
  const dueSoon = data.reports
    .filter((r) => r.status !== "sent" && !reportTiming(r).late)
    .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1))
    .slice(0, 6);
  const week = shiftDate(TODAY, -6);
  const weekUpdates = data.updates.filter((u) => u.date >= week);
  const tk = ticketKpis(data);
  const unread = totalUnread(data);
  const openTickets = (data.tickets ?? [])
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
          label="Today's updates"
          value={`${today.length ? new Set(today.map((u) => u.engineerId)).size : 0}/${team.length}`}
          tone={notUpdated.length ? "high" : "low"}
          hint={notUpdated.length ? `${notUpdated.map((a) => a.name).join(", ")} pending` : "Both engineers updated"}
        />
        <Kpi label="Plants observed today" value={new Set(today.map((u) => u.plantId)).size} hint={`of ${data.plants.length} plants`} />
        <Kpi label="Machines checked today" value={totals.machinesChecked} hint={`${today.length} updates submitted`} />
        <Kpi
          label="High risk found today"
          value={totals.abnormal}
          tone={totals.abnormal ? "medium" : "low"}
          hint={`${totals.repeatHighRisk} repeat · ${totals.newHighRisk} new`}
        />
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
        <Panel title="Today's work update" meta={<Link to="/daily" className="text-signal">Open daily update</Link>}>
          {today.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <Th>Engineer</Th>
                    <Th>Plant</Th>
                    <Th align="right">Machines</Th>
                    <Th align="right">Abnormal</Th>
                    <Th align="right">At</Th>
                  </tr>
                </thead>
                <tbody>
                  {today.map((u) => (
                    <Tr key={u.id}>
                      <Td>{engineerName(data, u.engineerId)}</Td>
                      <Td className="max-w-[16rem] truncate">{plantName(data, u.plantId)}</Td>
                      <Td align="right" mono>{u.machinesChecked}</Td>
                      <Td align="right" mono className={u.abnormal ? "text-sev-medium" : undefined}>{u.abnormal}</Td>
                      <Td align="right" mono>{u.submittedAt}</Td>
                    </Tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No engineer has submitted today's work update yet.</Empty>
          )}
          {today.length ? (
            <div className="border-t border-line/60 px-4 py-2 text-xs text-mute">
              Remarks: {today.map((u) => `${plantName(data, u.plantId).split(" — ")[0]} — ${u.remark}`).join(" | ")}
            </div>
          ) : null}
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
                  <div className="font-medium">{a.name} has not submitted today's update</div>
                  <div className="text-xs text-mute">Morning work update pending</div>
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
            {!notUpdated.length && !overdueReports.length ? <Empty>Nothing pending. All updates in and reports sent on time.</Empty> : null}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        <Panel title="Engineer activity — last 7 days" meta={<Link to="/engineers" className="text-signal">Details</Link>}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Engineer</Th>
                  <Th align="right">Days updated</Th>
                  <Th align="right">Plants</Th>
                  <Th align="right">Machines</Th>
                  <Th align="right">Abnormal</Th>
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
                        <div className="mt-1"><Bar pct={(s.daysUpdated / s.days) * 100} severity={s.daysUpdated >= 6 ? "low" : "medium"} /></div>
                      </Td>
                      <Td align="right" mono>{s.daysUpdated}/{s.days}</Td>
                      <Td align="right" mono>{s.plantsCovered}</Td>
                      <Td align="right" mono>{s.machinesChecked}</Td>
                      <Td align="right" mono>{s.abnormal}</Td>
                      <Td align="right" mono>{s.reportsSent}</Td>
                      <Td align="right" mono className={s.reportsLate ? "text-sev-high" : undefined}>{s.reportsLate}</Td>
                    </Tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line/60 px-4 py-2 text-[11px] text-mute">
            Counts come from the engineers' own daily updates — use them for coverage, not as a judgement of analysis quality.
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

      <Panel className="mt-4" title="Plant coverage" meta={`${weekUpdates.length} updates in last 7 days`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <Th>Plant</Th>
                <Th>Customer</Th>
                <Th>Report cycle</Th>
                <Th>Last observed</Th>
                <Th align="right">Machines</Th>
                <Th>Last report sent</Th>
                <Th>Next report due</Th>
                <Th align="right">Engineer</Th>
              </tr>
            </thead>
            <tbody>
              {data.plants.map((p) => {
                const s = plantSummary(data, p.id);
                const stale = !s.lastObserved || s.lastObserved < shiftDate(TODAY, -7);
                return (
                  <Tr key={p.id}>
                    <Td>
                      <Link to="/plants" className="font-medium hover:text-signal">{p.name}</Link>
                    </Td>
                    <Td className="text-mute">{p.customer}</Td>
                    <Td>{frequencyText(p)}</Td>
                    <Td mono className={stale ? "text-sev-high" : undefined}>{fmtDate(s.lastObserved)}</Td>
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
