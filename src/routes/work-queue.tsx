import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/console/AppShell";
import { Button, ConditionChip, DataQualityChip, PageHeader, Panel, ReviewStatusChip, SeverityChip, Td, Th, Tr } from "@/components/console/ui";
import { customerById, engineerById, engineers, isReviewed, siteById, TODAY, workQueue } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/work-queue")({
  head: () => ({
    meta: [
      { title: "Daily Work Queue · Vibration Operations" },
      {
        name: "description",
        content: "Auto-generated daily review queue for vibration analysts, with priority, latest data, previous condition and review status.",
      },
      { property: "og:title", content: "Daily Work Queue · Vibration Operations" },
      { property: "og:description", content: "Every machine due for review today, prioritised by criticality." },
    ],
  }),
  component: WorkQueuePage,
});

function WorkQueuePage() {
  const [analyst, setAnalyst] = useState<string>("all");
  const [onlyPending, setOnlyPending] = useState(false);

  const rows = workQueue().filter(
    (m) => (analyst === "all" || m.analystId === analyst) && (!onlyPending || !isReviewed(m.reviewStatus)),
  );

  return (
    <AppShell crumbs={[{ label: "Monitoring" }, { label: "Daily work queue" }]}>
      <PageHeader
        title="Daily Work Queue"
        subtitle={`Generated from monitoring frequency and available data · ${TODAY}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="panel-glass flex items-center gap-1 p-1">
              {[{ id: "all", name: "All analysts" }, ...engineers.filter((e) => e.role === "analyst")].map((e) => (
                <button
                  key={e.id}
                  onClick={() => setAnalyst(e.id)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs transition-[background-color]",
                    analyst === e.id ? "bg-signal/10 font-medium text-signal" : "text-mute hover:bg-black/5",
                  )}
                >
                  {e.name}
                </button>
              ))}
            </div>
            <Button variant={onlyPending ? "solid" : "outline"} onClick={() => setOnlyPending((v) => !v)}>
              Pending only
            </Button>
          </div>
        }
      />

      <Panel title="Queue" meta={`${rows.length} machines`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <Th>Customer</Th>
                <Th>Site</Th>
                <Th>Machine</Th>
                <Th>Priority</Th>
                <Th>Last data</Th>
                <Th>Condition</Th>
                <Th>Data quality</Th>
                <Th>Analyst</Th>
                <Th>Status</Th>
                <Th align="right">Action</Th>
              </tr>
            </thead>
            <tbody className="num">
              {rows.map((m) => (
                <Tr key={m.id}>
                  <Td className="font-sans">{customerById(m.customerId).name}</Td>
                  <Td className="font-sans">{siteById(m.siteId).name}</Td>
                  <Td className="font-sans font-medium">
                    <Link to="/machines/$machineId" params={{ machineId: m.id }} className="hover:text-signal">
                      {m.name}
                    </Link>
                  </Td>
                  <Td>
                    <SeverityChip
                      severity={m.criticality === "low" ? "advisory" : m.criticality === "medium" ? "medium" : m.criticality === "high" ? "high" : "critical"}
                    />
                  </Td>
                  <Td>{m.lastDataAt}</Td>
                  <Td>
                    <ConditionChip condition={m.condition} />
                  </Td>
                  <Td>
                    <DataQualityChip quality={m.dataQuality} />
                  </Td>
                  <Td className="font-sans">{engineerById(m.analystId).name}</Td>
                  <Td>
                    <ReviewStatusChip status={m.reviewStatus} />
                  </Td>
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
    </AppShell>
  );
}
