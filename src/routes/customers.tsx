import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/console/AppShell";
import { Dot, PageHeader, Panel, SpecRow, Td, Th, Tr } from "@/components/console/ui";
import { customerHealth, machines, sites, siteById, customerById } from "@/lib/data";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customer Health · Vibration Operations" },
      {
        name: "description",
        content: "Customer-wise machine health: healthy, watch, abnormal and critical machine counts, open alerts, overdue actions and report schedule.",
      },
      { property: "og:title", content: "Customer Health · Vibration Operations" },
      { property: "og:description", content: "Health status and reporting position for every monitored customer." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const health = customerHealth();

  return (
    <AppShell crumbs={[{ label: "Customers" }]}>
      <PageHeader title="Customer Health" subtitle="Company → Customer → Plant / Site → Area → Machine group" />

      <div className="grid gap-4 lg:grid-cols-2">
        {health.map((h) => (
          <Panel
            key={h.customer.id}
            title={h.customer.name}
            meta={
              <span className="flex items-center gap-2">
                <Dot severity={h.critical ? "critical" : h.abnormal ? "high" : h.watch ? "medium" : "low"} />
                {h.customer.industry}
              </span>
            }
          >
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <div>
                <SpecRow label="Machines monitored" value={h.total} />
                <SpecRow label="Healthy" value={h.healthy} />
                <SpecRow label="Under observation" value={h.watch} />
                <SpecRow label="Abnormal" value={h.abnormal} />
                <SpecRow label="Critical" value={h.critical} />
              </div>
              <div>
                <SpecRow label="Open alerts" value={h.openAlerts} />
                <SpecRow label="Overdue actions" value={h.overdue} />
                <SpecRow label="Last report" value={h.customer.lastReport} />
                <SpecRow label="Next report due" value={h.customer.nextReportDue} />
                <SpecRow
                  label="Sites"
                  value={sites
                    .filter((s) => s.customerId === h.customer.id)
                    .map((s) => s.name)
                    .join(", ")}
                />
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <Panel title="Site & Machine Hierarchy" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <Th>Customer</Th>
                <Th>Site</Th>
                <Th>Area</Th>
                <Th>Machine group</Th>
                <Th>Machine</Th>
                <Th align="right">Measurement point</Th>
              </tr>
            </thead>
            <tbody>
              {machines.map((m) => (
                <Tr key={m.id}>
                  <Td className="text-xs">{customerById(m.customerId).name}</Td>
                  <Td className="text-xs">{siteById(m.siteId).name}</Td>
                  <Td className="text-xs text-mute">{m.area}</Td>
                  <Td className="text-xs text-mute">{m.group}</Td>
                  <Td className="text-xs font-medium">
                    <Link to="/machines/$machineId" params={{ machineId: m.id }} className="hover:text-signal">
                      {m.name}
                    </Link>
                  </Td>
                  <Td align="right" className="num text-xs text-mute">
                    DE / NDE bearing · accelerometer
                  </Td>
                </Tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
