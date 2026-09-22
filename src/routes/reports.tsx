import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/console/AppShell";
import { Button, ConditionChip, Kpi, PageHeader, Panel, SeverityChip, SpecRow, Td, Th, Tr } from "@/components/console/ui";
import { alerts, customerById, customers, machineById, machines, reportDocs, reviewsForMachine } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Customer Reporting · Vibration Operations" },
      {
        name: "description",
        content: "Weekly and monthly vibration monitoring reports with draft, review, approved and sent workflow, revision history and machine-wise summaries.",
      },
      { property: "og:title", content: "Customer Reporting · Vibration Operations" },
      { property: "og:description", content: "Generate, review and approve customer vibration monitoring reports." },
    ],
  }),
  component: ReportsPage,
});

const STAGES = ["draft", "review", "approved", "sent"] as const;

function ReportsPage() {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");

  const customer = customerById(customerId);
  const fleet = machines.filter((m) => m.customerId === customerId);
  const abnormal = fleet.filter((m) => m.condition === "abnormal" || m.condition === "critical" || m.condition === "observation");
  const customerAlerts = alerts.filter((a) => machineById(a.machineId)!.customerId === customerId);

  return (
    <AppShell crumbs={[{ label: "Reports" }, { label: customer.name }]}>
      <PageHeader
        title="Customer Reporting"
        subtitle="Draft → Review → Approved → Sent to customer, with revision history"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="panel-glass flex items-center gap-1 p-1">
              {(["weekly", "monthly"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs capitalize transition-[background-color]",
                    period === p ? "bg-signal/10 font-medium text-signal" : "text-mute hover:bg-black/5",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <Button variant="solid">Generate {period} report</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Reports generated" value={reportDocs.length} />
        <Kpi label="Pending approval" value={reportDocs.filter((r) => r.status === "draft" || r.status === "review").length} tone="medium" />
        <Kpi label="Approved" value={reportDocs.filter((r) => r.status === "approved").length} tone="low" />
        <Kpi label="Sent to customer" value={reportDocs.filter((r) => r.status === "sent").length} tone="low" />
      </div>

      <Panel title="Report Register" meta="Revision history" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <Th>Document number</Th>
                <Th>Customer</Th>
                <Th>Type</Th>
                <Th>Period</Th>
                <Th>Revision</Th>
                <Th>Prepared by</Th>
                <Th>Approved by</Th>
                <Th>Workflow</Th>
                <Th align="right">Generated</Th>
              </tr>
            </thead>
            <tbody className="num">
              {reportDocs.map((r) => (
                <Tr key={r.id}>
                  <Td className="text-xs font-medium">{r.id}</Td>
                  <Td className="font-sans text-xs">{customerById(r.customerId).name}</Td>
                  <Td className="font-sans text-xs capitalize">{r.type}</Td>
                  <Td className="text-xs">{r.period}</Td>
                  <Td className="text-xs">{r.revision}</Td>
                  <Td className="font-sans text-xs">{r.preparedBy}</Td>
                  <Td className="font-sans text-xs text-mute">{r.approvedBy ?? "—"}</Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      {STAGES.map((s) => {
                        const reached = STAGES.indexOf(s) <= STAGES.indexOf(r.status);
                        return (
                          <span
                            key={s}
                            title={s}
                            className={cn("h-1.5 w-6 rounded-full", reached ? "bg-signal" : "bg-line")}
                          />
                        );
                      })}
                      <span className="ml-1 font-sans text-[11px] capitalize text-mute">{r.status}</span>
                    </div>
                  </Td>
                  <Td align="right" className="text-xs">
                    {r.generatedAt}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="label-caps">Preview for</span>
        {customers.map((c) => (
          <button
            key={c.id}
            onClick={() => setCustomerId(c.id)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs transition-[background-color]",
              customerId === c.id ? "bg-signal/10 font-medium text-signal" : "text-mute hover:bg-black/5",
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-5">
        <Panel title={`${period === "weekly" ? "Weekly" : "Monthly"} Report Preview`} meta={customer.name} className="lg:col-span-3">
          <div className="p-4">
            <div className="label-caps">Executive summary</div>
            <div className="mt-2 grid gap-x-6 md:grid-cols-2">
              <SpecRow label="Machines monitored" value={fleet.length} />
              <SpecRow label="Machines reviewed" value={fleet.filter((m) => m.lastReviewAt).length} />
              <SpecRow label="Normal machines" value={fleet.filter((m) => m.condition === "normal").length} />
              <SpecRow label="Requiring attention" value={abnormal.length} />
              <SpecRow label="New abnormalities" value={customerAlerts.filter((a) => a.raisedAt.includes("22 Sep")).length} />
              <SpecRow label="Closed abnormalities" value={customerAlerts.filter((a) => a.status === "closed").length} />
            </div>

            <div className="label-caps mt-4">Machine-wise summary</div>
            <div className="mt-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <Th>Machine</Th>
                    <Th>Status</Th>
                    <Th align="right">Trend</Th>
                    <Th>Observation</Th>
                  </tr>
                </thead>
                <tbody>
                  {fleet.map((m) => {
                    const last = reviewsForMachine(m.id)[0];
                    return (
                      <Tr key={m.id}>
                        <Td className="text-xs font-medium">{m.tag}</Td>
                        <Td>
                          <ConditionChip condition={m.condition} />
                        </Td>
                        <Td align="right" className="num text-xs">
                          {m.trendPct > 0 ? `+${m.trendPct}%` : "stable"}
                        </Td>
                        <Td className="max-w-md text-xs text-mute">
                          {last ? last.observation : "No abnormality observed in the reporting period."}
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Panel>

        <div className="grid gap-4 lg:col-span-2">
          <Panel title="Detailed Abnormalities" meta={`${customerAlerts.length} entries`}>
            <ul className="divide-y divide-line/60">
              {customerAlerts.map((a) => (
                <li key={a.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 text-xs">
                    <SeverityChip severity={a.severity} />
                    <span className="font-medium">{machineById(a.machineId)!.tag}</span>
                    <span className="num ml-auto text-mute">{a.id}</span>
                  </div>
                  <p className="mt-1.5 text-xs">{a.observation}</p>
                  <p className="mt-1 text-xs text-mute">Recommendation: {a.recommendedAction}</p>
                </li>
              ))}
              {customerAlerts.length === 0 ? <li className="px-4 py-6 text-xs text-mute">No abnormalities in the reporting period.</li> : null}
            </ul>
          </Panel>

          <Panel title="Report Template">
            <div className="px-4 py-2">
              <SpecRow label="Prepared by" value="R. Ahuja — Vibration Analyst" />
              <SpecRow label="Reviewed by" value="P. Pawar — Team Lead" />
              <SpecRow label="Reporting period" value={period === "weekly" ? "15–21 Sep 2026" : "Aug 2026"} />
              <SpecRow label="Revision" value="R0" />
              <SpecRow label="Logos" value="Forbes Marshall + customer" />
            </div>
            <div className="flex gap-2 border-t border-line/60 p-4">
              <Button>Export PDF</Button>
              <Button>Export Excel</Button>
              <Button variant="solid">Send for approval</Button>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
