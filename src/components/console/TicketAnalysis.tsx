import { useEffect, useMemo, useState } from "react";
import { useTechnical } from "@/lib/technical";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Cpu, History, Search } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  conditionTrend,
  machineHistory,
  previouslyObserved,
  sensorChangesSince,
  showCondition,
  showFault,
  showText,
  type HistoryEntry,
  type HistoryTicket,
} from "@/lib/machine-history";
import { Button, Field, Select, TextArea, TextInput } from "@/components/console/ui";
import { cn } from "@/lib/utils";
import {
  FAULT_TYPES,

  allConditions,
  analysisProgress,
  analysisStatusLabel,
  canComplete,
  conditionLabel,
  markNormal,
  nextPendingIndex,
  reviewStage,
  reviewStageLabel,
  severityLabel,
  allAnalysisSeverities,
  type MachineAnalysis,
} from "@/lib/ticket-analysis";

// ------------------------------------------------------------------ badges

type Tone = "normal" | "monitor" | "amber" | "red" | "darkred" | "grey" | "purple";
const toneCls: Record<Tone, string> = {
  normal: "bg-sev-low/10 text-sev-low ring-sev-low/30",
  monitor: "bg-sev-monitor/10 text-sev-monitor ring-sev-monitor/30",
  amber: "bg-sev-medium/10 text-sev-medium ring-sev-medium/30",
  red: "bg-sev-critical/10 text-sev-critical ring-sev-critical/30",
  darkred: "bg-sev-severe/15 text-sev-severe ring-sev-severe/40",
  grey: "bg-sev-advisory/10 text-sev-advisory ring-sev-advisory/30",
  purple: "bg-sev-info/10 text-sev-info ring-sev-info/30",
};
export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1", toneCls[tone])}>
      {children}
    </span>
  );
}
const conditionTone: Record<string, Tone> = {
  normal: "normal",
  monitor: "monitor",
  attention: "amber",
  abnormal: "red",
  critical: "darkred",
  insufficient: "grey",
};
const severityTone: Record<string, Tone> = { normal: "normal", low: "monitor", medium: "amber", high: "red", critical: "darkred" };

function RowBadge({ a }: { a: MachineAnalysis }) {
  if (a.status === "more-info") return <Badge tone="purple">More info required</Badge>;
  if (a.status === "pending" || !a.condition) return <Badge tone="grey">Pending review</Badge>;
  if (a.severity && a.severity !== "normal") return <Badge tone={severityTone[a.severity] ?? "grey"}>{severityLabel[a.severity]}</Badge>;
  return <Badge tone={conditionTone[a.condition] ?? "grey"}>{conditionLabel[a.condition]}</Badge>;
}

// ------------------------------------------------------------------ creation picker

export interface PickedMachine {
  machineId?: string;
  machine: string;
  area: string;
  note: string;
}

/** Multi-area → multi-machine picker. Known machines come from earlier tickets of the same plant. */
export function MachinePicker({
  areas,
  onAreas,
  items,
  onItems,
  knownAreas,
  knownMachines,
}: {
  areas: string[];
  onAreas: (a: string[]) => void;
  items: PickedMachine[];
  onItems: (m: PickedMachine[]) => void;
  knownAreas: string[];
  knownMachines: Record<string, string[]>;
}) {
  const [areaDraft, setAreaDraft] = useState("");
  const [q, setQ] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const addArea = (raw: string) => {
    const a = raw.trim();
    if (a && !areas.includes(a)) onAreas([...areas, a]);
    setAreaDraft("");
  };
  const removeArea = (a: string) => {
    onAreas(areas.filter((x) => x !== a));
    onItems(items.filter((i) => i.area !== a));
  };
  const has = (area: string, m: string) => items.some((i) => i.area === area && i.machine === m);
  const toggle = (area: string, m: string) =>
    onItems(has(area, m) ? items.filter((i) => !(i.area === area && i.machine === m)) : [...items, { machine: m, area, note: "" }]);
  const addMachine = (area: string) => {
    const m = (drafts[area] ?? "").trim();
    if (m && !has(area, m)) onItems([...items, { machine: m, area, note: "" }]);
    setDrafts((d) => ({ ...d, [area]: "" }));
  };
  const ql = q.trim().toLowerCase();

  return (
    <div className="grid gap-3">
      <Field label="Areas" hint="Pick one or more areas of this plant. Type a new area and press Enter if it is not listed.">
        <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-panel p-1.5 ring-1 ring-line/80">
          {areas.map((a) => (
            <span key={a} className="inline-flex items-center gap-1 rounded-full bg-signal/10 px-2.5 py-1 text-xs text-signal ring-1 ring-signal/30">
              {a}
              <button type="button" aria-label={`Remove ${a}`} onClick={() => removeArea(a)}>×</button>
            </span>
          ))}
          <input
            list="ticket-area-list"
            value={areaDraft}
            onChange={(e) => {
              const v = e.target.value;
              if (knownAreas.includes(v)) addArea(v);
              else setAreaDraft(v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addArea(areaDraft);
              }
            }}
            onBlur={() => areaDraft.trim() && addArea(areaDraft)}
            placeholder={areas.length ? "+ add area" : "e.g. Boiler House"}
            className="min-w-32 flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
          />
          <datalist id="ticket-area-list">
            {knownAreas.filter((a) => !areas.includes(a)).map((a) => <option key={a} value={a} />)}
          </datalist>
        </div>
        {knownAreas.some((a) => !areas.includes(a)) ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {knownAreas.filter((a) => !areas.includes(a)).map((a) => (
              <button key={a} type="button" onClick={() => addArea(a)} className="rounded-full px-2.5 py-1 text-xs text-mute ring-1 ring-line hover:bg-signal/10 hover:text-signal">+ {a}</button>
            ))}
          </div>
        ) : null}
      </Field>

      {areas.length ? (
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="label-caps">Machines · {items.length} selected</span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-mute" />
                <TextInput className="h-8 w-44 pl-7 text-xs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search machine" />
              </div>
              {items.length ? <Button variant="ghost" onClick={() => onItems([])}>Clear selection</Button> : null}
            </div>
          </div>
          {areas.map((area) => {
            const names = Array.from(new Set([...(knownMachines[area] ?? []), ...items.filter((i) => i.area === area).map((i) => i.machine)]));
            const shown = names.filter((m) => !ql || m.toLowerCase().includes(ql));
            return (
              <div key={area} className="rounded-md ring-1 ring-line/70">
                <div className="flex items-center justify-between gap-2 border-b border-line/60 px-3 py-1.5">
                  <span className="text-xs font-semibold">{area}</span>
                  {names.length ? (
                    <button
                      type="button"
                      className="text-[11px] text-signal hover:underline"
                      onClick={() => onItems([...items, ...names.filter((m) => !has(area, m)).map((m) => ({ machine: m, area, note: "" }))])}
                    >
                      Select all in area
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-1 p-2 sm:grid-cols-2">
                  {shown.map((m) => {
                    const it = items.find((i) => i.area === area && i.machine === m);
                    return (
                      <div key={m} className="grid gap-1">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={!!it} onChange={() => toggle(area, m)} className="accent-[var(--signal)]" />
                          <span className="truncate">{m}</span>
                        </label>
                        {it ? (
                          <input
                            value={it.note}
                            onChange={(e) => onItems(items.map((x) => (x === it ? { ...x, note: e.target.value } : x)))}
                            placeholder="Optional note for this machine"
                            className="ml-6 rounded bg-panel px-2 py-0.5 text-[11px] ring-1 ring-line/70 outline-none"
                          />
                        ) : null}
                      </div>
                    );
                  })}
                  <div className="flex gap-1.5 sm:col-span-2">
                    <TextInput
                      className="h-8 text-xs"
                      value={drafts[area] ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [area]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addMachine(area);
                        }
                      }}
                      placeholder={`Add machine in ${area}`}
                    />
                    <Button onClick={() => addMachine(area)} disabled={!(drafts[area] ?? "").trim()}>+ Add</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ machine-wise analysis

export function MachineAnalysisSection({
  rows: initial,
  editable,
  published,
  onSave,
  onRequestInfo,
  onPublish,
  plantId,
  ticketId,
  tickets,
  nameOf,
  analystId,
  today,
}: {
  plantId: string;
  ticketId: string;
  tickets: HistoryTicket[];
  nameOf: (id: string) => string;
  analystId: string;
  today: string;
  rows: MachineAnalysis[];
  editable: boolean;
  published: boolean;
  onSave: (rows: MachineAnalysis[]) => void;
  onRequestInfo: (rows: MachineAnalysis[], machine: string, text: string) => void;
  onPublish: (rows: MachineAnalysis[]) => void;
}) {
  const [rows, setRows] = useState(initial);
  const key = JSON.stringify(initial);
  useEffect(() => setRows(initial), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const [open, setOpen] = useState<number>(() => (editable ? initial.findIndex((r) => r.status !== "complete") : -1));
  const [infoText, setInfoText] = useState("");
  const [askInfo, setAskInfo] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const { data: reg } = useTechnical(plantId);
  const [drawer, setDrawer] = useState<number | null>(null);
  /** Permanent register link for a row: stored id, else matched by area + machine name. */
  const link = (a: MachineAnalysis) => {
    if (a.machineId) return { machineId: a.machineId, areaId: a.areaId };
    const n = a.machine.trim().toLowerCase();
    const areaIds = reg.areas.filter((x) => a.area.toLowerCase().split(", ").includes(x.name.trim().toLowerCase())).map((x) => x.id);
    const cands = reg.machines.filter((m) => m.name.trim().toLowerCase() === n);
    const m = cands.find((x) => areaIds.includes(x.area_id)) ?? (cands.length === 1 ? cands[0] : undefined);
    return { machineId: m?.id, areaId: m?.area_id };
  };
  const histories = useMemo(
    () => rows.map((a) => machineHistory(tickets, { plantId, machine: a.machine, area: a.area, machineId: link(a).machineId }, ticketId)),
    [rows, tickets, plantId, ticketId, reg], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const p = analysisProgress(rows);
  const stage = reviewStage(rows, published);
  const readOnly = !editable;
  // Engineers see the analysis only after publishing.
  const hidden = readOnly && !published;

  const patch = (i: number, v: Partial<MachineAnalysis>) => setRows((r) => r.map((x, k) => (k === i ? { ...x, ...v } : x)));
  const commitRows = (next: MachineAnalysis[]) => {
    setRows(next);
    onSave(next);
  };
  const saveDraft = (i: number) => commitRows(rows.map((x, k) => (k === i ? { ...x, status: "draft" as const } : x)));
  const complete = (i: number, goNext: boolean) => {
    const next = rows.map((x, k) => {
      if (k !== i) return x;
      const l = link(x);
      const pts = l.machineId ? reg.points.filter((pt) => pt.machine_id === l.machineId).map((pt) => pt.id) : [];
      const sensors = reg.sensors.filter((sn) => sn.point_id && pts.includes(sn.point_id) && !["replaced", "removed", "returned", "inactive"].includes(sn.status)).map((sn) => sn.serial_no);
      return {
        ...x,
        ...(l.machineId ? { machineId: l.machineId } : {}),
        ...(l.areaId ? { areaId: l.areaId } : {}),
        ...(sensors.length ? { sensors } : {}),
        status: "complete" as const,
        infoRequest: "",
        analyzedOn: today,
        analyzedBy: analystId,
      };
    });
    commitRows(next);
    setOpen(goNext ? nextPendingIndex(next, i) : -1);
  };
  const requestInfo = (i: number) => {
    const row = rows[i];
    if (!row || !infoText.trim()) return;
    const next = rows.map((x, k) => (k === i ? { ...x, status: "more-info" as const, infoRequest: infoText.trim() } : x));
    setRows(next);
    onRequestInfo(next, row.machine, infoText);
    setInfoText("");
    setAskInfo(false);
    setOpen(nextPendingIndex(next, i));
  };

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="label-caps">Machine-wise analysis</div>
        <Badge tone={stage === "published" ? "normal" : stage === "ready" ? "monitor" : stage === "partial" ? "amber" : "grey"}>
          {reviewStageLabel[stage]}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded bg-base px-2 py-0.5 ring-1 ring-line/70">Total <b className="num">{p.total}</b></span>
        <span className="rounded bg-base px-2 py-0.5 ring-1 ring-line/70">Reviewed <b className="num">{p.reviewed}</b></span>
        <span className="rounded bg-base px-2 py-0.5 ring-1 ring-line/70">Pending <b className="num">{p.pending}</b></span>
        <Badge tone="normal">Normal {p.normal}</Badge>
        <Badge tone="monitor">Monitor {p.monitor}</Badge>
        <Badge tone="amber">Attention {p.attention}</Badge>
        {p.moreInfo ? <Badge tone="purple">More info {p.moreInfo}</Badge> : null}
      </div>

      {hidden ? (
        <p className="rounded-md bg-base px-3 py-2 text-xs text-mute ring-1 ring-line/70">
          The manager is reviewing these machines. The analysis appears here once it is published.
        </p>
      ) : null}

      <div className="divide-y divide-line/60 rounded-md ring-1 ring-line/70">
        {rows.map((a, i) => {
          const isOpen = open === i;
          return (
            <div key={`${a.area}-${a.machine}-${i}`}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? -1 : i)}
                className={cn("grid w-full grid-cols-[1.5rem_1fr_auto] items-center gap-2 px-3 py-2 text-left", isOpen ? "bg-signal/5" : "hover:bg-black/[0.03]")}
              >
                <span className="num text-xs text-mute">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{a.machine}</span>
                  <span className="block truncate text-[11px] text-mute">
                    {a.area || "—"}
                    {!hidden && a.fault && a.fault !== "None" ? ` · ${a.fault}` : ""}
                    {!hidden && a.status === "complete" ? " · Analysis complete" : ""}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  {editable ? (histories[i]?.length ? <span className="hidden text-[10px] text-mute sm:inline">History: {histories[i]!.length}</span> : <Badge tone="grey">First analysis</Badge>) : null}
                  {hidden ? <Badge tone="grey">Pending review</Badge> : <RowBadge a={a} />}
                  {isOpen ? <ChevronDown className="size-4 text-mute" /> : <ChevronRight className="size-4 text-mute" />}
                </span>
              </button>

              {isOpen ? (
                <div className="grid gap-3 border-t border-line/60 bg-panel p-3">
                  {a.note ? <p className="text-xs text-mute"><b>Engineer note:</b> {a.note}</p> : null}
                  {a.status === "more-info" && a.infoRequest ? (
                    <p className="rounded bg-sev-info/10 px-2 py-1 text-xs text-sev-info">Information requested: {a.infoRequest}</p>
                  ) : null}

                  {editable ? (
                    <PreviousAnalysis
                      history={histories[i] ?? []}
                      nameOf={nameOf}
                      onFull={() => setDrawer(i)}
                      sensorChanges={(() => {
                        const last = histories[i]?.[0];
                        const mid = link(a).machineId;
                        return last && mid ? sensorChangesSince(reg.points, reg.sensors, mid, last.date) : [];
                      })()}
                    />
                  ) : null}
                  {editable ? <div className="label-caps -mb-1 pt-1">Current analysis</div> : null}

                  {readOnly ? (
                    hidden ? null : (
                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <div><div className="label-caps">Condition</div>{a.condition ? conditionLabel[a.condition] : "—"}</div>
                        <div><div className="label-caps">Fault type</div>{a.fault || "—"}</div>
                        <div><div className="label-caps">Severity</div>{a.severity ? severityLabel[a.severity] : "—"}</div>
                        <div className="sm:col-span-2"><div className="label-caps">Manager observation</div><p className="whitespace-pre-wrap">{a.observation || "—"}</p></div>
                        <div className="sm:col-span-2"><div className="label-caps">Recommendation / next action</div><p className="whitespace-pre-wrap">{a.recommendation || "—"}</p></div>
                      </div>
                    )
                  ) : (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Condition">
                          <Select value={a.condition} onChange={(e) => patch(i, { condition: e.target.value as MachineAnalysis["condition"] })}>
                            <option value="">Select…</option>
                            {allConditions.map((c) => <option key={c} value={c}>{conditionLabel[c]}</option>)}
                          </Select>
                        </Field>
                        <Field label="Fault type">
                          <TextInput list="fault-type-list" value={a.fault} onChange={(e) => patch(i, { fault: e.target.value })} placeholder="Search fault type" />
                        </Field>
                        <Field label="Severity" hint="High Risk and Highest Risk raise the urgent 24h alert.">
                          <Select value={a.severity} onChange={(e) => patch(i, { severity: e.target.value as MachineAnalysis["severity"] })}>
                            <option value="">Select…</option>
                            {a.severity === "normal" && <option value="normal">{severityLabel.normal}</option>}
                            {allAnalysisSeverities.map((s) => <option key={s} value={s}>{severityLabel[s]}</option>)}
                          </Select>
                        </Field>
                      </div>
                      <datalist id="fault-type-list">
                        {["None", ...FAULT_TYPES].map((f) => <option key={f} value={f} />)}
                      </datalist>
                      <CurrentContext a={a} history={histories[i] ?? []} onView={() => setDrawer(i)} />
                      <Field label="Manager observation">
                        <TextArea value={a.observation} onChange={(e) => patch(i, { observation: e.target.value })} />
                      </Field>
                      <Field label="Recommendation / next action">
                        <TextArea value={a.recommendation} onChange={(e) => patch(i, { recommendation: e.target.value })} />
                      </Field>
                      {askInfo ? (
                        <div className="grid gap-2 rounded-md bg-sev-info/5 p-2 ring-1 ring-sev-info/30">
                          <TextInput value={infoText} onChange={(e) => setInfoText(e.target.value)} placeholder="e.g. Please confirm operating RPM and upload the latest spectrum." />
                          <div className="flex gap-2">
                            <Button variant="solid" onClick={() => requestInfo(i)} disabled={!infoText.trim()}>Send request</Button>
                            <Button variant="ghost" onClick={() => setAskInfo(false)}>Cancel</Button>
                          </div>
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => setRows((r) => r.map((x, k) => (k === i ? markNormal(x) : x)))}>Mark as Normal</Button>
                        <Button variant="ghost" onClick={() => saveDraft(i)}>Save draft</Button>
                        <Button onClick={() => complete(i, false)} disabled={!canComplete(a)}>Complete analysis</Button>
                        <Button variant="solid" onClick={() => complete(i, true)} disabled={!canComplete(a)}>Save &amp; next machine</Button>
                        <Button variant="ghost" onClick={() => setAskInfo(true)}>Need more information</Button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {drawer !== null && rows[drawer] ? (
        <HistoryDrawer machine={rows[drawer]!.machine} area={rows[drawer]!.area} history={histories[drawer] ?? []} nameOf={nameOf} onClose={() => setDrawer(null)} />
      ) : null}

      {editable && !published && stage === "ready" ? (
        confirm ? (
          <div className="grid gap-2 rounded-md bg-signal/5 p-3 text-sm ring-1 ring-signal/30">
            <div className="font-medium">{p.total} machines reviewed</div>
            <div className="text-xs text-mute">Normal: {p.normal} · Monitor: {p.monitor} · Attention / Abnormal: {p.attention}</div>
            <div className="flex gap-2">
              <Button variant="solid" onClick={() => { onPublish(rows); setConfirm(false); }}>Publish &amp; notify engineer</Button>
              <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div><Button variant="solid" onClick={() => setConfirm(true)}>Publish analysis &amp; recommendations</Button></div>
        )
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ previous analysis (read-only reference)

const fmt = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
const Small = ({ l, v }: { l: string; v: React.ReactNode }) => (
  <div className="min-w-0"><div className="text-[10px] uppercase tracking-wide text-mute">{l}</div><div className="text-xs">{v}</div></div>
);

function PreviousAnalysis({ history, nameOf, onFull, sensorChanges }: {
  history: HistoryEntry[];
  nameOf: (id: string) => string;
  onFull: () => void;
  sensorChanges: { pointName: string; previous: string; current: string; changed: string }[];
}) {
  const last = history[0];
  return (
    <section aria-label="Previous analysis" className="grid gap-2 rounded-md bg-muted/60 p-3 ring-1 ring-line/70">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-mute"><History className="size-3.5" />Previous analysis{history.length ? ` (${history.length})` : ""} · read only</span>
        {history.length ? <button type="button" onClick={onFull} className="text-[11px] text-signal hover:underline">View full history</button> : <Badge tone="grey">First analysis</Badge>}
      </div>
      {!last ? (
        <div className="text-xs">
          <p className="font-medium">No previous analysis recorded for this machine.</p>
          <p className="text-mute">This is the first recorded analysis. The completed analysis will become the baseline history.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Small l="Last analysed" v={<span className="num">{fmt(last.date)}</span>} />
            <Small l="Previous analyses" v={<span className="num">{history.length}</span>} />
            <Small l="Latest condition" v={last.a.condition ? <Badge tone={conditionTone[last.a.condition] ?? "grey"}>{conditionLabel[last.a.condition]}</Badge> : "—"} />
            <Small l="Latest fault" v={showFault(last.a.fault)} />
          </div>
          <div className="grid gap-1.5 text-xs">
            <div><span className="text-mute">Observation: </span>{showText(last.a.observation)}</div>
            <div><span className="text-mute">Recommendation: </span>{showText(last.a.recommendation)}</div>
            <div className="text-[11px] text-mute">Ticket <span className="num">{last.ticketNo}</span> · Analysed by {nameOf(last.analyzedBy) || "—"}</div>
          </div>
          {sensorChanges.length ? (
            <div className="rounded bg-sev-medium/10 px-2 py-1.5 text-[11px] text-sev-medium ring-1 ring-sev-medium/30">
              <div className="flex items-center gap-1 font-semibold"><Cpu className="size-3" />Sensor changed since previous analysis</div>
              {sensorChanges.map((c) => (
                <div key={c.pointName} className="num">{c.pointName}: {c.previous} → {c.current} · changed {fmt(c.changed)}</div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function CurrentContext({ a, history, onView }: { a: MachineAnalysis; history: HistoryEntry[]; onView: () => void }) {
  const last = history[0];
  const trend = last ? conditionTrend(last.a.condition, a.condition) : null;
  const seen = previouslyObserved(history, a.fault);
  if (!trend && !seen) return null;
  return (
    <div className="flex flex-wrap gap-2 text-[11px]">
      {trend && last ? (
        <span className="inline-flex items-center gap-1 rounded bg-base px-2 py-1 ring-1 ring-line/70">
          Previous {showCondition(last.a.condition)} → Current {showCondition(a.condition)}
          {trend === "escalated" ? <b className="inline-flex items-center text-sev-critical"><ArrowUp className="size-3" />Condition escalated</b>
            : trend === "improved" ? <b className="inline-flex items-center text-sev-low"><ArrowDown className="size-3" />Condition improved</b>
            : <span className="text-mute">· unchanged</span>}
        </span>
      ) : null}
      {seen ? (
        <span className="inline-flex items-center gap-1 rounded bg-base px-2 py-1 ring-1 ring-line/70">
          Previously observed · last recorded <span className="num">{fmt(seen.date)}</span>
          <button type="button" onClick={onView} className="text-signal hover:underline">View previous analysis</button>
        </span>
      ) : null}
    </div>
  );
}

function HistoryDrawer({ machine, area, history, nameOf, onClose }: { machine: string; area: string; history: HistoryEntry[]; nameOf: (id: string) => string; onClose: () => void }) {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>{machine} — Analysis history</SheetTitle></SheetHeader>
        <p className="text-xs text-mute">{area || "—"} · {history.length} completed analys{history.length === 1 ? "is" : "es"} · reference only</p>
        <ol className="mt-3 grid gap-2">
          {history.map((h, k) => (
            <li key={h.ticketId + k} className="rounded-md bg-muted/50 ring-1 ring-line/70">
              <button type="button" onClick={() => setOpenIdx(openIdx === k ? -1 : k)} className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left text-xs">
                <span className="num font-medium">{fmt(h.date)}</span>
                {h.a.condition ? <Badge tone={conditionTone[h.a.condition] ?? "grey"}>{conditionLabel[h.a.condition]}</Badge> : null}
                <span className="min-w-0 flex-1 truncate">{showFault(h.a.fault)}</span>
                <span className="num text-mute">{h.ticketNo}</span>
              </button>
              {openIdx === k ? (
                <div className="grid gap-1.5 border-t border-line/60 px-3 py-2 text-xs">
                  <div><div className="label-caps">Observation</div>{showText(h.a.observation)}</div>
                  <div><div className="label-caps">Recommendation</div>{showText(h.a.recommendation)}</div>
                  <div className="text-mute">Ticket <span className="num">{h.ticketNo}</span> · Manager {nameOf(h.analyzedBy) || "—"} · {fmt(h.date)}</div>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </SheetContent>
    </Sheet>
  );
}

/** Known areas and machine names from earlier tickets of a plant — used as quick picks. */
export function useKnownPlantMachines(
  tickets: { plantId: string; areas?: string[] | undefined; area: string; analysis?: MachineAnalysis[] | undefined; machines?: string[] | undefined }[],
  plantId: string,
) {
  const { data: reg } = useTechnical(plantId);
  return useMemo(() => {
    const areas = new Set<string>();
    const machines: Record<string, string[]> = {};
    const add = (a: string, m: string) => { const l = (machines[a] ??= []); if (m && !l.includes(m)) l.push(m); };
    // Plant technical register first (areas and active machines), then names used on past tickets.
    for (const a of reg.areas) {
      if (a.status === "inactive") continue;
      areas.add(a.name);
      reg.machines.filter((m) => m.area_id === a.id && m.status !== "inactive").forEach((m) => add(a.name, m.name));
    }
    for (const t of tickets) {
      if (t.plantId !== plantId) continue;
      (t.areas?.length ? t.areas : t.area ? [t.area] : []).forEach((a) => areas.add(a));
      for (const a of t.analysis ?? []) {
        if (!a.area) continue;
        areas.add(a.area);
        add(a.area, a.machine);
      }
    }
    Object.values(machines).forEach((l) => l.sort());
    const idOf = (area: string, machine: string) => {
      const a = reg.areas.find((x) => x.name === area);
      const m = a ? reg.machines.find((x) => x.area_id === a.id && x.name === machine) : undefined;
      return m ? { machineId: m.id, areaId: a!.id } : {};
    };
    return { areas: [...areas].sort(), machines, idOf };
  }, [tickets, plantId, reg]);
}
