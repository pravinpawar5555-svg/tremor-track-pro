import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/console/AppShell";
import { SpectrumChart, TREND_RANGES, TrendChart, WaveformChart } from "@/components/console/charts";
import { Button, ConditionChip, CriticalityChip, DataQualityChip, Dot, PageHeader, Panel, SeverityChip, SpecRow, Td, Th, Tr } from "@/components/console/ui";
import {
  alertsForMachine,
  conditionLabel,
  conditionSeverity,
  customerById,
  engineerById,
  faultCategories,
  machineById,
  reviewsForMachine,
  siteById,
  waveformStats,
  type Condition,
} from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/machines/$machineId")({
  loader: ({ params }) => {
    const machine = machineById(params.machineId);
    if (!machine) throw notFound();
    return { machineId: machine.id, name: machine.name };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Machine"} · Machine Health` },
      {
        name: "description",
        content: `Machine health dashboard for ${loaderData?.name ?? "the selected machine"}: vibration trend against alarm limits, FFT spectrum, time waveform and the analyst review record.`,
      },
      { property: "og:title", content: `${loaderData?.name ?? "Machine"} · Machine Health` },
      { property: "og:description", content: "Current condition, trend, spectrum and analyst observations for one monitored machine." },
    ],
  }),
  component: MachineDetail,
});

const CONDITIONS: Condition[] = ["normal", "watch", "observation", "abnormal", "critical"];

function MachineDetail() {
  const { machineId } = Route.useLoaderData();
  const machine = machineById(machineId)!;
  const customer = customerById(machine.customerId);
  const site = siteById(machine.siteId);
  const stats = waveformStats(machine);
  const machineAlerts = alertsForMachine(machine.id);
  const history = reviewsForMachine(machine.id);

  const [range, setRange] = useState<string>("7 d");
  const [condition, setCondition] = useState<Condition>(machine.condition);
  const [categories, setCategories] = useState<string[]>(machineAlerts[0] ? [machineAlerts[0].suspectedCategory.split(" (")[0] ?? ""] : []);
  const [observation, setObservation] = useState(
    history[0]?.observation ??
      "Dominant 1X running-speed component observed with increased radial vibration. Possible unbalance condition. Recommend field inspection and confirmation of operating condition.",
  );
  const [action, setAction] = useState(history[0]?.recommendedAction ?? "");
  const [submitted, setSubmitted] = useState(false);

  const toggleCategory = (c: string) => setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  return (
    <AppShell
      crumbs={[
        { label: "Machines", to: "/machines" },
        { label: customer.name },
        { label: site.name },
        { label: machine.area },
        { label: machine.tag },
      ]}
    >
      <PageHeader
        title={machine.name}
        subtitle={`${machine.type} · ${machine.group} · ${customer.name} / ${site.name}`}
        actions={
          <div className="flex gap-2">
            <Link to="/alerts">
              <Button>View alerts</Button>
            </Link>
            <Link to="/work-queue">
              <Button variant="ghost">Back to queue</Button>
            </Link>
          </div>
        }
      />

      <Panel className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Dot severity={conditionSeverity[machine.condition]} />
          <h2 className="font-semibold tracking-tight">Current condition</h2>
          <ConditionChip condition={machine.condition} />
          <CriticalityChip criticality={machine.criticality} />
          <DataQualityChip quality={machine.dataQuality} />
          <div className="num ml-auto flex flex-wrap items-center gap-x-2 text-xs text-mute">
            <span>
              Velocity <span className="text-ink">{machine.velocityRms ? machine.velocityRms.toFixed(1) : "—"}</span> mm/s RMS
            </span>
            <span className="text-line">|</span>
            <span>
              Peak <span className="text-ink">{machine.peak ? machine.peak.toFixed(1) : "—"}</span> mm/s
            </span>
            <span className="text-line">|</span>
            <span>
              Temp <span className="text-ink">{machine.temperatureC || "—"}</span> °C
            </span>
            <span className="text-line">|</span>
            <span>
              RPM <span className="text-ink">{machine.operatingRpm}</span>
            </span>
            <span className="text-line">|</span>
            <span>Last data {machine.lastDataAt}</span>
            <span className="text-line">|</span>
            <span>Last review {machine.lastReviewAt ?? "not reviewed"}</span>
          </div>
        </div>

        {machine.dataQuality !== "valid" ? (
          <div className="panel-inset mt-3 flex items-center gap-2 p-3 text-xs">
            <Dot severity="advisory" />
            <span>
              Data quality issue — no machine-health alarm is raised while the underlying data is invalid. Investigate sensor and communication first.
            </span>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-1">
          <span className="label-caps mr-1">Trend period</span>
          {TREND_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "num rounded-md px-2 py-1 text-[11px] transition-[background-color]",
                range === r ? "bg-signal/10 font-medium text-signal" : "text-mute hover:bg-black/5",
              )}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <TrendChart machine={machine} range={range} />
          <SpectrumChart machine={machine} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <WaveformChart machine={machine} />
          <div className="panel-inset p-3">
            <div className="label-caps mb-2">Waveform statistics</div>
            <div className="grid grid-cols-2 gap-x-6">
              <SpecRow label="RMS" value={`${stats.rms.toFixed(2)} mm/s`} />
              <SpecRow label="Peak" value={`${stats.peak.toFixed(2)} mm/s`} />
              <SpecRow label="Peak-to-peak" value={`${stats.peakToPeak.toFixed(2)} mm/s`} />
              <SpecRow label="Crest factor" value={stats.crest.toFixed(2)} />
              <SpecRow label="Kurtosis" value={stats.kurtosis.toFixed(2)} />
              <SpecRow label="1X running speed" value={`${(machine.operatingRpm / 60).toFixed(1)} Hz`} />
            </div>
          </div>
        </div>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Panel title="Record Observation" meta="Step 9–12 of review workflow" className="lg:col-span-3">
          <div className="p-4">
            <div className="label-caps">Condition classification</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {CONDITIONS.map((c) => {
                const sev = conditionSeverity[c];
                const active = condition === c;
                return (
                  <button
                    key={c}
                    onClick={() => setCondition(c)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] ring-1 transition-[background-color]",
                      sev === "low" && "text-sev-low ring-sev-low/30",
                      sev === "medium" && "text-sev-medium ring-sev-medium/30",
                      sev === "high" && "text-sev-high ring-sev-high/40",
                      sev === "critical" && "text-sev-critical ring-sev-critical/30",
                      active ? "font-medium" : "opacity-70",
                      active && sev === "low" && "bg-sev-low/10",
                      active && sev === "medium" && "bg-sev-medium/10",
                      active && sev === "high" && "bg-sev-high/10",
                      active && sev === "critical" && "bg-sev-critical/10",
                    )}
                  >
                    {conditionLabel[c]}
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <label className="text-xs text-mute" htmlFor="observation">
                Observation — what changed, where, which frequency component, supporting evidence
              </label>
              <textarea
                id="observation"
                rows={4}
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                className="num mt-1 w-full rounded-md bg-panel/70 px-3 py-2 text-xs ring-1 ring-line outline-none focus:ring-signal/50"
              />
            </div>

            <div className="mt-3">
              <label className="text-xs text-mute" htmlFor="action">
                Recommended action
              </label>
              <input
                id="action"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="e.g. Field inspection of impeller and coupling; re-measure after correction."
                className="mt-1 w-full rounded-md bg-panel/70 px-3 py-2 text-xs ring-1 ring-line outline-none placeholder:text-mute focus:ring-signal/50"
              />
            </div>

            <div className="mt-4">
              <div className="label-caps">Suspected fault categories (select one or more)</div>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                {faultCategories.map((g) => (
                  <div key={g.group}>
                    <div className="text-xs font-medium">{g.group}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {g.items.map((item) => (
                        <button
                          key={item}
                          onClick={() => toggleCategory(item)}
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] ring-1 transition-[background-color]",
                            categories.includes(item) ? "bg-signal/10 font-medium text-signal ring-signal/40" : "text-mute ring-line hover:bg-black/5",
                          )}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-mute">
                Findings are recorded as possible / suspected indications. A mechanical fault is only confirmed when the analyst explicitly confirms it with
                sufficient evidence.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="num text-[11px] text-mute">Analyst: {engineerById(machine.analystId).name} · 22 Sep 14:38</div>
              <div className="flex items-center gap-2">
                {submitted ? <span className="text-xs text-sev-low">Review recorded in this session</span> : null}
                <Button variant="solid" onClick={() => setSubmitted(true)}>
                  Submit review
                </Button>
              </div>
            </div>
          </div>
        </Panel>

        <div className="grid gap-4 lg:col-span-2">
          <Panel title="Why this classification?" meta="Transparent health score">
            <ul className="divide-y divide-line/60">
              {machine.healthFactors.map((f) => (
                <li key={f.label} className="flex items-start gap-2.5 px-4 py-2">
                  <Dot severity={f.weight === "raises" ? "high" : f.weight === "lowers" ? "low" : "advisory"} className="mt-1.5" />
                  <div className="min-w-0 text-xs">
                    <div className="font-medium">{f.label}</div>
                    <div className="text-mute">{f.value}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Machine Master">
            <div className="px-4 py-2">
              <SpecRow label="Machine ID" value={machine.tag} />
              <SpecRow label="Manufacturer / model" value={`${machine.manufacturer} ${machine.model}`} />
              <SpecRow label="Rated / operating RPM" value={`${machine.ratedRpm} / ${machine.operatingRpm}`} />
              <SpecRow label="Rated power" value={`${machine.ratedPowerKw} kW`} />
              <SpecRow label="DE bearing" value={machine.bearingDe} />
              <SpecRow label="NDE bearing" value={machine.bearingNde} />
              <SpecRow label="Coupling" value={machine.couplingType} />
              <SpecRow label="Commissioned" value={machine.commissioned} />
              <SpecRow label="Alert / alarm limit" value={`${machine.alertLimit.toFixed(1)} / ${machine.alarmLimit.toFixed(1)} mm/s`} />
              <SpecRow label="Monitoring frequency" value={machine.monitoringFrequency} />
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Previous Analyst Observations" meta={`${history.length} records`}>
          {history.length ? (
            <ul className="divide-y divide-line/60">
              {history.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 text-xs">
                    <ConditionChip condition={r.condition} />
                    <span className="num text-mute">{r.at}</span>
                    <span className="ml-auto text-mute">{engineerById(r.analystId).name}</span>
                  </div>
                  <p className="mt-1.5 text-xs">{r.observation}</p>
                  <p className="mt-1 text-xs text-mute">Recommended: {r.recommendedAction}</p>
                  <p className="num mt-1 text-[11px] text-mute">Data reviewed: {r.dataReviewed}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-xs text-mute">No review recorded for this machine yet.</p>
          )}
        </Panel>

        <Panel title="Alerts on this Machine" meta={`${machineAlerts.length} records`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <Th>Alert</Th>
                  <Th>Severity</Th>
                  <Th>Suspected</Th>
                  <Th>Status</Th>
                  <Th align="right">Target</Th>
                </tr>
              </thead>
              <tbody className="num">
                {machineAlerts.map((a) => (
                  <Tr key={a.id}>
                    <Td className="text-xs">{a.id}</Td>
                    <Td>
                      <SeverityChip severity={a.severity} />
                    </Td>
                    <Td className="font-sans text-xs">{a.suspectedCategory}</Td>
                    <Td className="font-sans text-xs">{a.status === "awaiting-customer" ? "Awaiting customer" : a.status}</Td>
                    <Td align="right" className="text-xs">
                      {a.targetDate}
                    </Td>
                  </Tr>
                ))}
                {machineAlerts.length === 0 ? (
                  <tr>
                    <Td className="py-6 text-xs text-mute">No alerts raised on this machine.</Td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
