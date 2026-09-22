import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/console/AppShell";
import { Bar, Button, ConditionChip, Dot, Kpi, PageHeader, Panel, Td, Th, Tr } from "@/components/console/ui";
import { analystStats, attentionItems, engineerById, machineById, reviews, TODAY } from "@/lib/data";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team Activity & Accountability · Vibration Operations" },
      {
        name: "description",
        content: "Daily accountability for the vibration analysis team: reviews completed, pending workload, abnormalities identified, alerts raised and observation quality.",
      },
      { property: "og:title", content: "Team Activity & Accountability" },
      { property: "og:description", content: "See what each engineer reviewed today and the quality of their observations." },
    ],
  }),
  component: TeamPage,
});

const QUALITY_CHECKS = [
  "What was observed",
  "Where it was observed",
  "When it changed",
  "Which parameter changed",
  "Frequency / component involved",
  "Historical trend",
  "Suspected cause",
  "Supporting evidence",
  "Recommended action",
  "Priority",
];

function TeamPage() {
  const stats = analystStats();
  const attention = attentionItems();

  return (
    <AppShell crumbs={[{ label: "Team monitoring" }, { label: TODAY }]}>
      <PageHeader title="Team Activity & Accountability" subtitle={`Daily manager summary · ${TODAY}`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Reviews completed" value={stats.reduce((s, a) => s + a.reviewed, 0)} />
        <Kpi label="Pending workload" value={stats.reduce((s, a) => s + a.pending, 0)} tone="medium" />
        <Kpi label="Abnormalities found" value={stats.reduce((s, a) => s + a.abnormalities, 0)} tone="high" />
        <Kpi label="Alerts raised" value={stats.reduce((s, a) => s + a.alertsRaised, 0)} tone="critical" />
      </div>

      <Panel title="Engineer-wise Activity" meta="Today" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <Th>Engineer</Th>
                <Th align="right">Assigned</Th>
                <Th align="right">Reviewed</Th>
                <Th align="right">Pending</Th>
                <Th align="right">Abnormalities</Th>
                <Th align="right">Alerts</Th>
                <Th align="right">Follow-ups</Th>
                <Th align="right">Reports</Th>
                <Th align="right">Avg review</Th>
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
                  <Td align="right">{s.abnormalities}</Td>
                  <Td align="right">{s.alertsRaised}</Td>
                  <Td align="right">{s.followUps}</Td>
                  <Td align="right">{s.reports}</Td>
                  <Td align="right">{s.avgReviewMin.toFixed(1)} min</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Bar pct={(s.reviewed / s.assigned) * 100} />
                      <span className="text-[11px] text-mute">{Math.round((s.reviewed / s.assigned) * 100)}%</span>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line/60 px-4 py-2 text-[11px] text-mute">
          These figures measure workload and throughput only. Judge diagnostic quality by reading the observations below.
        </div>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Panel title="Observation Quality Review" meta={`${reviews.length} reviews today`} className="lg:col-span-3">
          <ul className="divide-y divide-line/60">
            {reviews.map((r) => {
              const m = machineById(r.machineId)!;
              return (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <ConditionChip condition={r.condition} />
                    <Link to="/machines/$machineId" params={{ machineId: m.id }} className="font-medium hover:text-signal">
                      {m.name}
                    </Link>
                    <span className="num text-mute">{r.at}</span>
                    <span className="ml-auto text-mute">{engineerById(r.analystId).name}</span>
                  </div>
                  <p className="mt-1.5 text-xs">{r.observation}</p>
                  <p className="mt-1 text-xs text-mute">Recommended: {r.recommendedAction}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {QUALITY_CHECKS.slice(0, r.condition === "normal" ? 5 : 10).map((q) => (
                      <span key={q} className="rounded-full bg-sev-low/10 px-2 py-0.5 text-[10px] text-sev-low">
                        {q}
                      </span>
                    ))}
                    {r.condition === "normal"
                      ? QUALITY_CHECKS.slice(5).map((q) => (
                          <span key={q} className="rounded-full px-2 py-0.5 text-[10px] text-mute ring-1 ring-line">
                            {q}
                          </span>
                        ))
                      : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="Management Attention Required" meta="By urgency" className="lg:col-span-2">
          <ul className="divide-y divide-line/60">
            {attention.map((a, i) => (
              <li key={`${a.machineId}-${i}`} className="flex items-center gap-2.5 px-4 py-2.5">
                <Dot severity={a.severity} />
                <div className="min-w-0 text-xs">
                  <div className="truncate font-medium">{a.title}</div>
                  <div className="truncate text-mute">{a.detail}</div>
                </div>
                <span className="ml-auto text-[10px] uppercase tracking-wide text-mute">{a.tag}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-line/60 p-4">
            <Link to="/work-queue">
              <Button>Open work queue</Button>
            </Link>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
