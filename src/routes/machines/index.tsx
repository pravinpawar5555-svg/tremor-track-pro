import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/console/AppShell";
import { Button, ConditionChip, CriticalityChip, DataQualityChip, PageHeader, Panel, Td, Th, Tr } from "@/components/console/ui";
import { customerById, customers, machines, siteById, engineerById } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/machines/")({
  head: () => ({
    meta: [
      { title: "Machine Master · Vibration Operations" },
      {
        name: "description",
        content: "Machine master list with criticality, monitoring frequency, assigned analyst, current condition and data quality status.",
      },
      { property: "og:title", content: "Machine Master · Vibration Operations" },
      { property: "og:description", content: "Every monitored rotating machine with its current health and assigned analyst." },
    ],
  }),
  component: MachinesPage,
});

function MachinesPage() {
  const [customer, setCustomer] = useState("all");
  const [query, setQuery] = useState("");

  const rows = machines.filter(
    (m) =>
      (customer === "all" || m.customerId === customer) &&
      (query === "" || `${m.name} ${m.tag} ${m.type}`.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <AppShell crumbs={[{ label: "Machines" }]}>
      <PageHeader
        title="Machine Master"
        subtitle="Company → Customer → Site → Area → Machine group → Machine"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search machine, tag or type"
              className="panel-glass w-56 px-3 py-1.5 text-xs outline-none placeholder:text-mute focus:ring-1 focus:ring-signal/50"
            />
            <div className="panel-glass flex items-center gap-1 p-1">
              {[{ id: "all", name: "All customers" }, ...customers].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCustomer(c.id)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs transition-[background-color]",
                    customer === c.id ? "bg-signal/10 font-medium text-signal" : "text-mute hover:bg-black/5",
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <Panel title="Machines" meta={`${rows.length} of ${machines.length} shown`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <Th>Machine</Th>
                <Th>Type</Th>
                <Th>Customer / site</Th>
                <Th>Criticality</Th>
                <Th align="right">RPM</Th>
                <Th align="right">mm/s RMS</Th>
                <Th>Condition</Th>
                <Th>Data quality</Th>
                <Th>Analyst</Th>
                <Th align="right">Frequency</Th>
              </tr>
            </thead>
            <tbody className="num">
              {rows.map((m) => (
                <Tr key={m.id}>
                  <Td className="font-sans font-medium">
                    <Link to="/machines/$machineId" params={{ machineId: m.id }} className="hover:text-signal">
                      {m.name}
                    </Link>
                  </Td>
                  <Td className="font-sans text-xs text-mute">{m.type}</Td>
                  <Td className="font-sans text-xs">
                    {customerById(m.customerId).name}
                    <span className="text-mute"> · {siteById(m.siteId).name}</span>
                  </Td>
                  <Td>
                    <CriticalityChip criticality={m.criticality} />
                  </Td>
                  <Td align="right">{m.operatingRpm || "—"}</Td>
                  <Td align="right" className={m.velocityRms > m.alertLimit ? "text-sev-high" : ""}>
                    {m.velocityRms ? m.velocityRms.toFixed(1) : "—"}
                  </Td>
                  <Td>
                    <ConditionChip condition={m.condition} />
                  </Td>
                  <Td>
                    <DataQualityChip quality={m.dataQuality} />
                  </Td>
                  <Td className="font-sans text-xs">{engineerById(m.analystId).name}</Td>
                  <Td align="right" className="font-sans text-xs text-mute">
                    {m.monitoringFrequency}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-4 flex justify-end">
        <Link to="/administration">
          <Button>Configure hierarchy and limits</Button>
        </Link>
      </div>
    </AppShell>
  );
}
