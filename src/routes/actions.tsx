import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/console/AppShell";
import { Button, Kpi, PageHeader, Panel, SeverityChip, Td, Th, Tr } from "@/components/console/ui";
import { actionItems, customerById, machineById } from "@/lib/data";

export const Route = createFileRoute("/actions")({
  head: () => ({
    meta: [
      { title: "Action Tracking · Vibration Operations" },
      {
        name: "description",
        content: "Follow-up actions arising from vibration alerts, with owner, target date and overdue status for customer and analyst tasks.",
      },
      { property: "og:title", content: "Action Tracking · Vibration Operations" },
      { property: "og:description", content: "What is pending, with whom, and what is already overdue." },
    ],
  }),
  component: ActionsPage,
});

export default function noop() {}

function ActionsPage() {
  const open = actionItems.filter((a) => a.status !== "closed");
  const overdue = actionItems.filter((a) => a.status === "overdue");

  return (
    <AppShell crumbs={[{ label: "Monitoring" }, { label: "Actions" }]}>
      <PageHeader title="Action Tracking" subtitle="Follow-ups raised from abnormalities and customer communication" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Open actions" value={open.length} />
        <Kpi label="Overdue" value={overdue.length} tone="high" />
        <Kpi label="With customer" value={actionItems.filter((a) => a.owner.startsWith("Customer")).length} />
        <Kpi label="Closed" value={actionItems.filter((a) => a.status === "closed").length} tone="low" />
      </div>

      <Panel title="Actions" meta={`${actionItems.length} records`} className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <Th>Action</Th>
                <Th>Machine</Th>
                <Th>Customer</Th>
                <Th>Description</Th>
                <Th>Owner</Th>
                <Th>Target</Th>
                <Th>Status</Th>
                <Th align="right">Alert</Th>
              </tr>
            </thead>
            <tbody className="num">
              {actionItems.map((a) => {
                const m = machineById(a.machineId)!;
                return (
                  <Tr key={a.id}>
                    <Td className="text-xs">{a.id}</Td>
                    <Td className="font-sans text-xs font-medium">
                      <Link to="/machines/$machineId" params={{ machineId: m.id }} className="hover:text-signal">
                        {m.tag}
                      </Link>
                    </Td>
                    <Td className="font-sans text-xs">{customerById(m.customerId).name}</Td>
                    <Td className="font-sans text-xs">{a.description}</Td>
                    <Td className="font-sans text-xs text-mute">{a.owner}</Td>
                    <Td className="text-xs">{a.targetDate}</Td>
                    <Td>
                      <SeverityChip
                        severity={a.status === "overdue" ? "high" : a.status === "closed" ? "low" : a.status === "in-progress" ? "medium" : "advisory"}
                        label={a.status === "in-progress" ? "In progress" : a.status[0].toUpperCase() + a.status.slice(1)}
                      />
                    </Td>
                    <Td align="right" className="text-xs">
                      {a.alertId}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-4 flex justify-end">
        <Link to="/alerts">
          <Button>Back to alerts</Button>
        </Link>
      </div>
    </AppShell>
  );
}
