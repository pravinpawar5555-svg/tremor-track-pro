import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/console/AppShell";
import { Button, Dot, PageHeader, Panel, SeverityChip, SpecRow } from "@/components/console/ui";
import { alerts, customerById, engineerById, machineById, severityLabel, siteById, type Severity } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Abnormality & Alert Management · Vibration Operations" },
      {
        name: "description",
        content: "Every abnormality raised by the vibration analysts with severity, observed values, suspected category, customer notification status and closure record.",
      },
      { property: "og:title", content: "Abnormality & Alert Management" },
      { property: "og:description", content: "Track open, awaiting-customer and closed vibration alerts in one place." },
    ],
  }),
  component: AlertsPage,
});

const FILTERS: (Severity | "all")[] = ["all", "critical", "high", "medium", "low", "advisory"];

function AlertsPage() {
  const [filter, setFilter] = useState<Severity | "all">("all");
  const [openId, setOpenId] = useState<string>(alerts[0]?.id ?? "");

  const rows = alerts.filter((a) => filter === "all" || a.severity === filter);
  const open = alerts.find((a) => a.id === openId) ?? rows[0];
  const machine = open ? machineById(open.machineId)! : null;

  return (
    <AppShell crumbs={[{ label: "Monitoring" }, { label: "Alerts" }]}>
      <PageHeader
        title="Abnormality & Alert Management"
        subtitle="Findings are recorded as possible or suspected indications until the analyst confirms them"
        actions={
          <div className="panel-glass flex items-center gap-1 p-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs transition-[background-color]",
                  filter === f ? "bg-signal/10 font-medium text-signal" : "text-mute hover:bg-black/5",
                )}
              >
                {f === "all" ? "All" : severityLabel[f]}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel title="Alerts" meta={`${rows.length} records`} className="lg:col-span-2">
          <ul className="divide-y divide-line/60">
            {rows.map((a) => {
              const m = machineById(a.machineId)!;
              return (
                <li key={a.id}>
                  <button
                    onClick={() => setOpenId(a.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-[background-color] hover:bg-black/[0.03]",
                      openId === a.id && "bg-signal/[0.06]",
                    )}
                  >
                    <Dot severity={a.severity} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{m.name}</div>
                      <div className="num truncate text-xs text-mute">
                        {a.id} · {a.raisedAt}
                      </div>
                    </div>
                    <span className="ml-auto text-[10px] uppercase tracking-wide text-mute">
                      {a.status === "awaiting-customer" ? "Customer" : a.status}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>

        {open && machine ? (
          <Panel title={`${open.id} · ${machine.name}`} meta={<SeverityChip severity={open.severity} />} className="lg:col-span-3">
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <div>
                <SpecRow label="Customer / site" value={`${customerById(machine.customerId).name} · ${siteById(machine.siteId).name}`} />
                <SpecRow label="Component" value={open.component} />
                <SpecRow label="Measurement point" value={open.point} />
                <SpecRow label="Raised" value={open.raisedAt} />
                <SpecRow label="Analyst" value={engineerById(open.analystId).name} />
                <SpecRow label="Abnormal parameter" value={open.parameter} />
              </div>
              <div>
                <SpecRow label="Observed value" value={open.observedValue} />
                <SpecRow label="Reference value" value={open.referenceValue} />
                <SpecRow label="Frequency / component" value={open.frequencyComponent} />
                <SpecRow label="Suspected category" value={open.suspectedCategory} />
                <SpecRow label="Customer notified" value={open.customerNotified ? "Yes" : "No"} />
                <SpecRow label="Action owner / target" value={`${open.actionOwner} · ${open.targetDate}`} />
              </div>
            </div>

            <div className="border-t border-line/60 p-4">
              <div className="label-caps">Analyst observation</div>
              <p className="mt-1 text-xs">{open.observation}</p>
              <div className="label-caps mt-3">Recommended action</div>
              <p className="mt-1 text-xs">{open.recommendedAction}</p>
              {open.closureComments ? (
                <>
                  <div className="label-caps mt-3">Closure ({open.closureDate})</div>
                  <p className="mt-1 text-xs">{open.closureComments}</p>
                </>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/machines/$machineId" params={{ machineId: machine.id }}>
                  <Button>Open machine health</Button>
                </Link>
                <Link to="/actions">
                  <Button variant="ghost">Track actions</Button>
                </Link>
              </div>
            </div>
          </Panel>
        ) : null}
      </div>
    </AppShell>
  );
}
