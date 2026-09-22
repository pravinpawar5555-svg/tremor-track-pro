import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/console/AppShell";
import { Dot, Kpi, Panel, PageHeader, Bar, SeverityChip, Td, Th, Tr, Button } from "@/components/console/ui";
import { DistributionBars } from "@/components/console/charts";
import {
  analystStats,
  attentionItems,
  customerHealth,
  fleetKpis,
  isReviewed,
  machineById,
  machines,
  reviewStatusLabel,
  TODAY,
  workQueue,
  customerById,
  siteById,
} from "@/lib/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Manager Dashboard · Forbes Marshall Vibration Operations" },
      {
        name: "description",
        content:
          "Monitoring coverage, engineer accountability and the prioritised attention queue for the Forbes Marshall vibration monitoring team.",
      },
      { property: "og:title", content: "Manager Dashboard · Vibration Operations" },
      { property: "og:description", content: "Who reviewed what today, which machines are abnormal, and what needs attention now." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const k = fleetKpis();
  const stats = analystStats();
  const attention = attentionItems();
  const queue = workQueue().slice(0, 6);
  const health = customerHealth();

  const team = stats.reduce(
    (t, s) => ({
      assigned: t.assigned + s.assigned,
      reviewed: t.reviewed + s.reviewed,
      pending: t.pending + s.pending,
      abnormalities: t.abnormalities + s.abnormalities,
      alertsRaised: t.alertsRaised + s.alertsRaised,
      followUps: t.followUps + s.followUps,
      reports: t.reports + s.reports,
    }),
    { assigned: 0, reviewed: 0, pending: 0, abnormalities: 0, alertsRaised: 0, followUps: 0, reports: 0 },
  );

  return (
    <AppShell crumbs={[{ label: "Forbes Marshall" }, { label: "All customers" }, { label: "Operations overview" }]}>
      <PageHeader
        title="Operations Overview"
        subtitle={`Monitoring coverage and team activity for ${TODAY}`}
        actions={
          <div className="flex gap-2">
            <Link to="/work-queue">
              <Button>Open work queue</Button>
            </Link>
            <Link to="/reports">
              <Button variant="solid">Generate report</Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Customers" value={k.customers} />
        <Kpi label="Machines due" value={k.due} hint={`${k.reviewed} reviewed · ${k.pending} pending`} />
        <Kpi label="Reviewed today" value={k.reviewed} />
        <Kpi label="Critical alerts" value={k.criticalAlerts} tone="critical" />
        <Kpi label="Sites" value={k.sites} />
        <Kpi label="Machines monitored" value={k.machines} />
        <Kpi label="Completion" value={k.completion} unit="%" />
        <Kpi label="Overdue actions" value={k.overdueActions} tone="high" hint={`${k.pendingActions} actions open`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Panel title="Engineer Accountability" meta="Today" className="lg:col-span-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <Th>Engineer</Th>
                  <Th align="right">Assigned</Th>
                  <Th align="right">Reviewed</Th>
                  <Th align="right">Pending</Th>
                  <Th align="right">Abnorm.</Th>
                  <Th align="right">Alerts</Th>
                  <Th align="right">Reports</Th>
                  <Th>Completion</Th>
                </tr>
              </thead>
              <tbody className="num">
                {stats.map((s) => (
                  <Tr key={s.engineer.id}>
                    <Td className="font-sans font-medium">{s.engineer.name}</Td>
                    <Td align="right">{s.assigned}</Td>
                    <Td align="right">{s.reviewed}</Td>
                    <Td align="right" className="text-sev-medium">
                      {s.pending}
                    </Td>
                    <Td align="right" className="text-sev-medium">
                      {s.abnormalities}
                    </Td>
                    <Td align="right" className="text-sev-high">
                      {s.alertsRaised}
                    </Td>
                    <Td align="right">{s.reports}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <Bar pct={(s.reviewed / s.assigned) * 100} />
                        <span className="text-[11px] text-mute">{Math.round((s.reviewed / s.assigned) * 100)}%</span>
                      </div>
                    </Td>
                  </Tr>
                ))}
                <tr className="border-t border-line/60 bg-black/[0.02] font-semibold">
                  <Td className="font-sans">Team</Td>
                  <Td align="right">{team.assigned}</Td>
                  <Td align="right">{team.reviewed}</Td>
                  <Td align="right">{team.pending}</Td>
                  <Td align="right">{team.abnormalities}</Td>
                  <Td align="right">{team.alertsRaised}</Td>
                  <Td align="right">{team.reports}</Td>
                  <Td>
                    <span className="text-[11px] text-mute">{Math.round((team.reviewed / team.assigned) * 100)}%</span>
                  </Td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="border-t border-line/60 px-4 py-2 text-[11px] text-mute">
            Counts describe workload, not diagnostic quality — open each review to judge the observation itself.
          </div>
        </Panel>

        <Panel title="Attention Required" meta="Priority" className="lg:col-span-2">
          <ul className="divide-y divide-line/60">
            {attention.map((item, i) => (
              <li key={`${item.machineId}-${i}`} className={item.tag === "Data" ? "bg-sev-advisory/[0.06]" : undefined}>
                <Link
                  to="/machines/$machineId"
                  params={{ machineId: item.machineId }}
                  className="flex items-center gap-2.5 px-4 py-2.5 transition-[background-color] hover:bg-black/[0.03]"
                >
                  <Dot severity={item.severity} />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{item.title}</div>
                    <div className="truncate text-xs text-mute">{item.detail}</div>
                  </div>
                  <span className="ml-auto text-[10px] uppercase tracking-wide text-mute">{item.tag}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Panel title="Today’s Work Queue" meta={`${k.reviewed} reviewed · ${k.pending} pending`} className="lg:col-span-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <Th>Customer</Th>
                  <Th>Site</Th>
                  <Th>Machine</Th>
                  <Th>Priority</Th>
                  <Th>Last data</Th>
                  <Th>Status</Th>
                  <Th align="right">Action</Th>
                </tr>
              </thead>
              <tbody className="num">
                {queue.map((m) => (
                  <Tr key={m.id}>
                    <Td className="font-sans">{customerById(m.customerId).name}</Td>
                    <Td className="font-sans">{siteById(m.siteId).name}</Td>
                    <Td className="font-sans font-medium">{m.tag}</Td>
                    <Td>
                      <SeverityChip
                        severity={m.criticality === "low" ? "advisory" : m.criticality === "medium" ? "medium" : m.criticality === "high" ? "high" : "critical"}
                      />
                    </Td>
                    <Td>{m.lastDataAt}</Td>
                    <Td className="font-sans text-xs">{reviewStatusLabel[m.reviewStatus]}</Td>
                    <Td align="right">
                      <Link to="/machines/$machineId" params={{ machineId: m.id }}>
                        <Button>{isReviewed(m.reviewStatus) ? "Open" : "Review"}</Button>
                      </Link>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid gap-4 lg:col-span-2">
          <Panel title="Machine Health Distribution" meta="Sampled fleet">
            <div className="p-4">
              <DistributionBars
                rows={[
                  { label: "Normal", value: machines.filter((m) => m.condition === "normal").length, color: "bg-sev-low" },
                  { label: "Watch / observation", value: machines.filter((m) => m.condition === "watch" || m.condition === "observation").length, color: "bg-sev-medium" },
                  { label: "Abnormal", value: machines.filter((m) => m.condition === "abnormal").length, color: "bg-sev-high" },
                  { label: "Critical", value: machines.filter((m) => m.condition === "critical").length, color: "bg-sev-critical" },
                ]}
              />
            </div>
          </Panel>

          <Panel title="Customer Health" meta="Open alerts">
            <ul className="divide-y divide-line/60">
              {health.map((h) => (
                <li key={h.customer.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Dot severity={h.critical ? "critical" : h.abnormal ? "high" : h.watch ? "medium" : "low"} />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{h.customer.name}</div>
                    <div className="num truncate text-xs text-mute">
                      {h.total} machines · {h.healthy} normal · {h.abnormal + h.critical} needing attention
                    </div>
                  </div>
                  <span className="num ml-auto text-xs text-mute">{h.openAlerts} alerts</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <div className="mt-4">
        <Panel title="Machines Not Yet Reviewed" meta="Management attention">
          <ul className="divide-y divide-line/60">
            {machines
              .filter((m) => !isReviewed(m.reviewStatus))
              .map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                  <Dot severity={m.criticality === "critical" ? "critical" : m.criticality === "high" ? "high" : "medium"} />
                  <span className="font-sans font-medium">{machineById(m.id)!.name}</span>
                  <span className="text-mute">
                    {customerById(m.customerId).name} · {siteById(m.siteId).name}
                  </span>
                  <span className="num ml-auto text-mute">last data {m.lastDataAt}</span>
                </li>
              ))}
          </ul>
        </Panel>
      </div>
    </AppShell>
  );
}
