import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/console/AppShell";
import { Button, Empty, Field, Kpi, Panel, PageHeader, Select, TextArea, TextInput, Td, Th, Tr } from "@/components/console/ui";
import { cn } from "@/lib/utils";
import { TODAY, analystsOf, engineerName, fmtDate, plantName, shiftDate, useData } from "@/lib/store";
import {
  blankVisit,
  cancelVisit,
  completeVisit,
  deleteVisit,
  frequencyText,
  nextVisitAfter,
  openActions,
  rescheduleVisit,
  saveVisit,
  statusTone,
  useVisits,
  visitReminders,
  visitStatus,
  visitStatusLabel,
  visitTypeLabel,
  type Visit,
  type VisitAction,
  type VisitFrequency,
} from "@/lib/visits";

export const Route = createFileRoute("/_authenticated/visits")({
  validateSearch: (s: Record<string, unknown>): { plant?: string } => (typeof s['plant'] === "string" ? { plant: s['plant'] } : {}),
  head: () => ({
    meta: [
      { title: "Customer Visit Planner — Forbes Marshall CM Portal" },
      { name: "description", content: "Plan, track and record AMC and on-request customer visits by engineers." },
      { property: "og:title", content: "Customer Visit Planner — Forbes Marshall CM Portal" },
      { property: "og:description", content: "AMC recurring visits, on-request visits, visit summaries and follow-up actions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VisitsPage,
});

type Filter = "all" | "upcoming" | "completed" | "overdue" | "request";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function StatusPill({ v }: { v: Visit }) {
  const s = visitStatus(v);
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium ring-1", statusTone[s])}>{visitStatusLabel[s]}</span>;
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <span className="inline-flex flex-wrap rounded-md p-0.5 ring-1 ring-line/80">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn("rounded px-2.5 py-1 text-xs", value === o.v ? "bg-signal/10 text-signal" : "text-mute hover:bg-black/5")}
        >
          {o.label}
        </button>
      ))}
    </span>
  );
}

function VisitsPage() {
  const data = useData();
  const all = useVisits();
  const search = Route.useSearch();
  const manager = data.role === "manager";
  const me = data.currentUserId;
  const team = analystsOf(data);

  const [who, setWho] = useState<string>("total");
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [customer, setCustomer] = useState("");
  const [plant, setPlant] = useState(search.plant ?? "");
  const [q, setQ] = useState("");
  const [month, setMonth] = useState(TODAY.slice(0, 7));
  const [editing, setEditing] = useState<Visit | null>(null);
  const [completing, setCompleting] = useState<Visit | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const mine = useMemo(
    () => all.filter((v) => (manager ? who === "total" || v.engineerIds.includes(who) : v.engineerIds.includes(me))),
    [all, manager, who, me],
  );
  const pCust = (id: string) => data.plants.find((p) => p.id === id)?.customer ?? "";
  const customers = [...new Set(data.plants.map((p) => p.customer).filter(Boolean))].sort();
  const plantOptions = data.plants.filter((p) => !customer || p.customer === customer);

  const shown = mine.filter((v) => {
    const s = visitStatus(v);
    if (filter === "upcoming" && !["upcoming", "due", "rescheduled"].includes(s)) return false;
    if (filter === "completed" && s !== "completed") return false;
    if (filter === "overdue" && s !== "overdue") return false;
    if (filter === "request" && v.visitType !== "request") return false;
    if (customer && pCust(v.plantId) !== customer) return false;
    if (plant && v.plantId !== plant) return false;
    if (q) {
      const t = `${plantName(data, v.plantId)} ${pCust(v.plantId)}`.toLowerCase();
      if (!t.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const active = (v: Visit) => !["completed", "cancelled"].includes(visitStatus(v));
  const weekEnd = shiftDate(TODAY, 7);
  const actionsOpen = openActions(mine).length;
  const reminders = visitReminders(mine);
  const sel = all.find((v) => v.id === selected) ?? null;
  const history = plant ? all.filter((v) => v.plantId === plant).sort((a, b) => (a.plannedDate < b.plannedDate ? 1 : -1)) : [];

  return (
    <AppShell>
      <PageHeader
        title="Customer Visit Planner"
        subtitle="AMC planned and on-request customer visits, summaries and follow-up actions"
        actions={manager ? <Button variant="solid" onClick={() => setEditing(blankVisit(me))}>+ Add Visit</Button> : undefined}
      />

      {manager ? (
        <div className="mb-3">
          <Segmented
            value={who}
            onChange={setWho}
            options={[{ v: "total", label: "Total" }, ...team.map((a) => ({ v: a.id, label: a.name.split(" ")[0]! }))]}
          />
        </div>
      ) : null}

      {manager ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <Kpi label="Total planned" value={mine.filter((v) => v.status !== "cancelled").length} />
          <Kpi label="Completed" value={mine.filter((v) => v.status === "completed").length} tone="low" />
          <Kpi label="Upcoming" value={mine.filter((v) => active(v) && v.plannedDate >= TODAY).length} tone="medium" />
          <Kpi label="Overdue" value={mine.filter((v) => visitStatus(v) === "overdue").length} tone={mine.some((v) => visitStatus(v) === "overdue") ? "high" : "low"} />
          <Kpi label="On-request" value={mine.filter((v) => v.visitType === "request").length} />
          <Kpi label="Open customer actions" value={actionsOpen} tone={actionsOpen ? "medium" : "low"} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi label="Visits today" value={mine.filter((v) => active(v) && v.plannedDate === TODAY).length} />
          <Kpi label="This week" value={mine.filter((v) => active(v) && v.plannedDate >= TODAY && v.plannedDate <= weekEnd).length} />
          <Kpi label="Upcoming" value={mine.filter((v) => active(v) && v.plannedDate >= TODAY).length} tone="medium" />
          <Kpi label="Overdue" value={mine.filter((v) => visitStatus(v) === "overdue").length} tone={mine.some((v) => visitStatus(v) === "overdue") ? "high" : "low"} />
          <Kpi label="Open actions" value={actionsOpen} tone={actionsOpen ? "medium" : "low"} />
        </div>
      )}

      {reminders.length ? (
        <Panel className="mt-4" title="Reminders" meta={`${reminders.length} alerts`}>
          <div className="divide-y divide-line/60">
            {reminders.map(({ visit: v, kind }) => (
              <button key={v.id} type="button" onClick={() => setSelected(v.id)} className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-black/[0.03]">
                <span>
                  <span className="font-medium">{plantName(data, v.plantId)}</span> {visitTypeLabel[v.visitType]} visit{" "}
                  {kind === "overdue" ? `was due on ${fmtDate(v.plannedDate)} — overdue` : kind === "today" ? "is due today" : kind === "tomorrow" ? "is due tomorrow" : `is due on ${fmtDate(v.plannedDate)}`}
                </span>
                <span className={cn("size-2 shrink-0 rounded-full", kind === "overdue" ? "bg-sev-high" : "bg-sev-medium")} />
              </button>
            ))}
          </div>
        </Panel>
      ) : null}

      {editing ? <VisitForm key={editing.id} initial={editing} onClose={() => setEditing(null)} /> : null}
      {completing ? <CompleteForm key={completing.id} visit={completing} manager={manager} onClose={() => setCompleting(null)} /> : null}
      {sel ? (
        <VisitDetail
          v={sel}
          manager={manager}
          canComplete={manager || sel.engineerIds.includes(me)}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(sel); setSelected(null); }}
          onComplete={() => { setCompleting(sel); setSelected(null); }}
        />
      ) : null}

      <Panel
        className="mt-4"
        title="Visits"
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <Segmented value={view} onChange={setView} options={[{ v: "list", label: "List" }, { v: "calendar", label: "Calendar" }]} />
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { v: "all", label: "All" },
                { v: "upcoming", label: "Upcoming" },
                { v: "completed", label: "Completed" },
                { v: "overdue", label: "Overdue" },
                { v: "request", label: "On Request" },
              ]}
            />
          </div>
        }
      >
        <div className="flex flex-wrap gap-2 border-b border-line/60 px-4 py-2.5">
          <TextInput className="w-48" placeholder="Search customer / plant" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select className="w-44" value={customer} onChange={(e) => { setCustomer(e.target.value); setPlant(""); }}>
            <option value="">All customers</option>
            {customers.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select className="w-48" value={plant} onChange={(e) => setPlant(e.target.value)}>
            <option value="">All plants</option>
            {plantOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>

        {view === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Visit date</Th><Th>Customer</Th><Th>Plant</Th><Th>Engineer</Th><Th>Visit type</Th><Th>Frequency</Th><Th>Status</Th><Th>Next visit</Th><Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {shown.map((v) => {
                  const s = visitStatus(v);
                  return (
                    <Tr key={v.id}>
                      <Td mono>{fmtDate(v.plannedDate)}</Td>
                      <Td className="text-mute">{pCust(v.plantId)}</Td>
                      <Td><button type="button" className="font-medium hover:text-signal" onClick={() => setSelected(v.id)}>{plantName(data, v.plantId)}</button></Td>
                      <Td>{v.engineerIds.map((id) => engineerName(data, id)).join(" + ") || "—"}</Td>
                      <Td>{visitTypeLabel[v.visitType]}</Td>
                      <Td>{frequencyText(v)}</Td>
                      <Td><StatusPill v={v} /></Td>
                      <Td mono>{fmtDate(v.nextVisitDate ?? undefined)}</Td>
                      <Td align="right">
                        <span className="flex justify-end gap-2 text-xs">
                          <button type="button" className="text-signal" onClick={() => setSelected(v.id)}>View</button>
                          {s !== "completed" && s !== "cancelled" && (manager || v.engineerIds.includes(me)) ? (
                            <button type="button" className="text-signal" onClick={() => setCompleting(v)}>Complete</button>
                          ) : null}
                        </span>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </table>
            {!shown.length ? <Empty>No visits match these filters.</Empty> : null}
          </div>
        ) : (
          <VisitCalendar month={month} setMonth={setMonth} visits={shown} onPick={setSelected} />
        )}
      </Panel>

      {plant ? (
        <Panel className="mt-4" title={`Visit history — ${plantName(data, plant)}`} meta={`${history.length} visits`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr><Th>Date</Th><Th>Engineer</Th><Th>Visit type</Th><Th>Discussion summary</Th><Th align="right">Actions raised</Th><Th align="right">Pending</Th><Th>Next visit</Th><Th>Status</Th></tr>
              </thead>
              <tbody>
                {history.map((v) => (
                  <Tr key={v.id}>
                    <Td mono><button type="button" className="hover:text-signal" onClick={() => setSelected(v.id)}>{fmtDate(v.completedDate ?? v.plannedDate)}</button></Td>
                    <Td>{v.engineerIds.map((id) => engineerName(data, id)).join(" + ")}</Td>
                    <Td>{visitTypeLabel[v.visitType]}</Td>
                    <Td className="max-w-[18rem] truncate text-mute">{v.discussionPoints.join("; ") || "—"}</Td>
                    <Td align="right" mono>{v.actions.length}</Td>
                    <Td align="right" mono>{v.actions.filter((a) => a.status === "open").length}</Td>
                    <Td mono>{fmtDate(v.nextVisitDate ?? undefined)}</Td>
                    <Td><StatusPill v={v} /></Td>
                  </Tr>
                ))}
              </tbody>
            </table>
            {!history.length ? <Empty>No visits recorded for this plant yet.</Empty> : null}
          </div>
        </Panel>
      ) : null}
    </AppShell>
  );
}

function VisitCalendar({ month, setMonth, visits, onPick }: { month: string; setMonth: (m: string) => void; visits: Visit[]; onPick: (id: string) => void }) {
  const data = useData();
  const [y, m] = month.split("-").map(Number) as [number, number];
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setMonth(d.toISOString().slice(0, 7));
  };
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  return (
    <div className="p-3">
      <div className="mb-2 flex items-center justify-between text-sm">
        <button type="button" className="rounded px-2 py-1 text-signal ring-1 ring-line" onClick={() => shift(-1)}>‹</button>
        <span className="font-medium">{MONTHS[m - 1]} {y}</span>
        <button type="button" className="rounded px-2 py-1 text-signal ring-1 ring-line" onClick={() => shift(1)}>›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[11px]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="label-caps px-1">{d}</div>)}
        {cells.map((d, i) =>
          d ? (
            <div key={d} className={cn("min-h-20 rounded-md p-1 ring-1 ring-line/60", d === TODAY && "ring-signal")}>
              <div className="num text-mute">{Number(d.slice(8))}</div>
              {visits.filter((v) => v.plannedDate === d).map((v) => (
                <button key={v.id} type="button" onClick={() => onPick(v.id)} className={cn("mt-0.5 block w-full truncate rounded px-1 text-left ring-1", statusTone[visitStatus(v)])}>
                  {plantName(data, v.plantId)}
                </button>
              ))}
            </div>
          ) : <div key={`e${i}`} />,
        )}
      </div>
    </div>
  );
}

function VisitForm({ initial, onClose }: { initial: Visit; onClose: () => void }) {
  const data = useData();
  const team = analystsOf(data);
  const [v, setV] = useState<Visit>(initial);
  const [customer, setCustomer] = useState(data.plants.find((p) => p.id === initial.plantId)?.customer ?? "");
  const customers = [...new Set(data.plants.map((p) => p.customer).filter(Boolean))].sort();
  const set = (p: Partial<Visit>) => setV((x) => ({ ...x, ...p }));
  const submit = async () => {
    if (!v.plantId) { toast.error("Choose a plant"); return; }
    if (!v.engineerIds.length) { toast.error("Assign at least one engineer"); return; }
    try {
      await saveVisit(v);
      toast.success("Visit saved");
      onClose();
    } catch {
      toast.error("Could not save the visit");
    }
  };
  return (
    <Panel className="mt-4" title={initial.plantId ? "Edit visit" : "Plan customer visit"} meta={<button type="button" className="text-signal" onClick={onClose}>Close</button>}>
      <div className="grid gap-3 p-4 md:grid-cols-3">
        <Field label="Customer name">
          <Select value={customer} onChange={(e) => { setCustomer(e.target.value); set({ plantId: "" }); }}>
            <option value="">All customers</option>
            {customers.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Plant / site">
          <Select value={v.plantId} onChange={(e) => set({ plantId: e.target.value })}>
            <option value="">Choose plant</option>
            {data.plants.filter((p) => !customer || p.customer === customer).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Assigned engineer(s)">
          <div className="flex flex-wrap gap-3 pt-1.5 text-sm">
            {team.map((a) => (
              <label key={a.id} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={v.engineerIds.includes(a.id)}
                  onChange={(e) => set({ engineerIds: e.target.checked ? [...v.engineerIds, a.id] : v.engineerIds.filter((x) => x !== a.id) })}
                />
                {a.name}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Visit type">
          <Select value={v.visitType} onChange={(e) => set({ visitType: e.target.value as Visit["visitType"] })}>
            <option value="amc">AMC Planned Visit</option>
            <option value="request">On-Request Visit</option>
          </Select>
        </Field>
        {v.visitType === "amc" ? (
          <Field label="Visit frequency">
            <Select value={v.frequency} onChange={(e) => set({ frequency: e.target.value as VisitFrequency })}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half_yearly">Half-Yearly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom frequency</option>
            </Select>
          </Field>
        ) : null}
        {v.visitType === "amc" && v.frequency === "custom" ? (
          <Field label="Every">
            <div className="flex gap-2">
              <TextInput type="number" min={1} className="w-20" value={v.customEvery} onChange={(e) => set({ customEvery: Math.max(1, Number(e.target.value) || 1) })} />
              <Select value={v.customUnit} onChange={(e) => set({ customUnit: e.target.value as Visit["customUnit"] })}>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </Select>
            </div>
          </Field>
        ) : null}
        <Field label="Planned visit date">
          <TextInput type="date" value={v.plannedDate} onChange={(e) => set({ plannedDate: e.target.value })} />
        </Field>
        <div className="md:col-span-3">
          <Field label="Purpose / remarks">
            <TextArea rows={2} value={v.purpose} onChange={(e) => set({ purpose: e.target.value })} />
          </Field>
        </div>
        <div className="md:col-span-3"><Button onClick={() => void submit()}>Save visit</Button></div>
      </div>
    </Panel>
  );
}

function CompleteForm({ visit, manager, onClose }: { visit: Visit; manager: boolean; onClose: () => void }) {
  const data = useData();
  const team = analystsOf(data);
  const [date, setDate] = useState(TODAY);
  const [points, setPoints] = useState<string[]>(visit.discussionPoints.length ? visit.discussionPoints : [""]);
  const [obs, setObs] = useState(visit.observations);
  const [actions, setActions] = useState<VisitAction[]>(visit.actions);
  const auto = nextVisitAfter(visit, date);
  const [nextOverride, setNextOverride] = useState<string | null>(null);
  const next = nextOverride ?? auto;
  const setAction = (i: number, p: Partial<VisitAction>) => setActions((a) => a.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const submit = async () => {
    try {
      await completeVisit(
        visit,
        { completedDate: date, discussionPoints: points.map((p) => p.trim()).filter(Boolean), observations: obs, actions: actions.filter((a) => a.action.trim()) },
        next,
      );
      toast.success(visit.visitType === "amc" && next ? `Visit completed · next visit ${fmtDate(next)}` : "Visit completed");
      onClose();
    } catch {
      toast.error("Could not save the visit summary");
    }
  };
  return (
    <Panel className="mt-4" title="Visit summary" meta={<button type="button" className="text-signal" onClick={onClose}>Close</button>}>
      <div className="grid gap-3 p-4 md:grid-cols-4 text-sm">
        <div><div className="label-caps">Customer</div>{data.plants.find((p) => p.id === visit.plantId)?.customer}</div>
        <div><div className="label-caps">Plant</div>{plantName(data, visit.plantId)}</div>
        <div><div className="label-caps">Engineer(s)</div>{visit.engineerIds.map((id) => engineerName(data, id)).join(" + ")}</div>
        <Field label="Visit date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <div className="md:col-span-4"><div className="label-caps">Visit purpose</div>{visit.purpose || "—"}</div>

        <div className="md:col-span-4">
          <div className="label-caps mb-1">Discussion points</div>
          {points.map((p, i) => (
            <div key={i} className="mb-1.5 flex gap-2">
              <span className="num pt-1.5 text-mute">{i + 1}.</span>
              <TextInput value={p} onChange={(e) => setPoints((x) => x.map((y, j) => (j === i ? e.target.value : y)))} />
              <button type="button" className="text-xs text-mute" onClick={() => setPoints((x) => x.filter((_, j) => j !== i))}>Remove</button>
            </div>
          ))}
          <button type="button" className="text-xs text-signal" onClick={() => setPoints((x) => [...x, ""])}>+ Add point</button>
        </div>

        <div className="md:col-span-4">
          <Field label="Observations / findings"><TextArea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} /></Field>
        </div>

        <div className="md:col-span-4">
          <div className="label-caps mb-1">Next actions</div>
          {actions.map((a, i) => (
            <div key={i} className="mb-2 grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr_2fr_auto]">
              <TextInput placeholder="Action" value={a.action} onChange={(e) => setAction(i, { action: e.target.value })} />
              <Select value={a.responsible} onChange={(e) => setAction(i, { responsible: e.target.value })}>
                <option value="">Responsible</option>
                {data.engineers.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                <option value="customer">Customer</option>
              </Select>
              <TextInput type="date" value={a.dueDate} onChange={(e) => setAction(i, { dueDate: e.target.value })} />
              <Select value={a.status} onChange={(e) => setAction(i, { status: e.target.value as VisitAction["status"] })}>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </Select>
              <TextInput placeholder="Remarks" value={a.remarks} onChange={(e) => setAction(i, { remarks: e.target.value })} />
              <button type="button" className="text-xs text-mute" onClick={() => setActions((x) => x.filter((_, j) => j !== i))}>Remove</button>
            </div>
          ))}
          <button
            type="button"
            className="text-xs text-signal"
            onClick={() => setActions((x) => [...x, { action: "", responsible: team[0]?.id ?? "", dueDate: shiftDate(TODAY, 7), status: "open", remarks: "" }])}
          >
            + Add action
          </button>
        </div>

        {visit.visitType === "amc" ? (
          <div className="panel-inset grid gap-3 p-3 md:col-span-4 md:grid-cols-3">
            <div><div className="label-caps">Last visit</div><span className="num">{fmtDate(date)}</span></div>
            <div><div className="label-caps">Frequency</div>{frequencyText(visit)}</div>
            <Field label="Next visit due">
              {manager ? (
                <TextInput type="date" value={next ?? ""} onChange={(e) => setNextOverride(e.target.value || null)} />
              ) : (
                <span className="num">{fmtDate(next ?? undefined)}</span>
              )}
            </Field>
          </div>
        ) : (
          <div className="text-xs text-mute md:col-span-4">On-request visit — the AMC schedule for this plant is not changed.</div>
        )}
        <div className="md:col-span-4"><Button onClick={() => void submit()}>Complete visit</Button></div>
      </div>
    </Panel>
  );
}

function VisitDetail({ v, manager, canComplete, onClose, onEdit, onComplete }: { v: Visit; manager: boolean; canComplete: boolean; onClose: () => void; onEdit: () => void; onComplete: () => void }) {
  const data = useData();
  const s = visitStatus(v);
  const [date, setDate] = useState(v.plannedDate);
  const openStatus = s !== "completed" && s !== "cancelled";
  return (
    <Panel className="mt-4" title={`${plantName(data, v.plantId)} · ${visitTypeLabel[v.visitType]} visit`} meta={<button type="button" className="text-signal" onClick={onClose}>Close</button>}>
      <div className="grid gap-3 p-4 text-sm md:grid-cols-4">
        <div><div className="label-caps">Customer</div>{data.plants.find((p) => p.id === v.plantId)?.customer}</div>
        <div><div className="label-caps">Planned date</div><span className="num">{fmtDate(v.plannedDate)}</span></div>
        <div><div className="label-caps">Engineer(s)</div>{v.engineerIds.map((id) => engineerName(data, id)).join(" + ")}</div>
        <div><div className="label-caps">Status</div><StatusPill v={v} /></div>
        <div><div className="label-caps">Frequency</div>{frequencyText(v)}</div>
        <div><div className="label-caps">Visited on</div><span className="num">{fmtDate(v.completedDate ?? undefined)}</span></div>
        <div><div className="label-caps">Next visit due</div><span className="num">{fmtDate(v.nextVisitDate ?? undefined)}</span></div>
        <div className="md:col-span-4"><div className="label-caps">Purpose</div>{v.purpose || "—"}</div>
        {v.discussionPoints.length ? (
          <div className="md:col-span-4">
            <div className="label-caps">Discussion points</div>
            <ol className="list-decimal pl-5">{v.discussionPoints.map((p, i) => <li key={i}>{p}</li>)}</ol>
          </div>
        ) : null}
        {v.observations ? <div className="md:col-span-4"><div className="label-caps">Observations</div><p className="whitespace-pre-wrap">{v.observations}</p></div> : null}
        {v.actions.length ? (
          <div className="overflow-x-auto md:col-span-4">
            <div className="label-caps">Next actions</div>
            <table className="w-full text-sm">
              <thead><tr><Th>Action</Th><Th>Responsible</Th><Th>Due</Th><Th>Status</Th><Th>Remarks</Th></tr></thead>
              <tbody>
                {v.actions.map((a, i) => (
                  <Tr key={i}>
                    <Td>{a.action}</Td>
                    <Td>{a.responsible === "customer" ? "Customer" : engineerName(data, a.responsible)}</Td>
                    <Td mono>{fmtDate(a.dueDate)}</Td>
                    <Td>
                      <button
                        type="button"
                        className={cn("rounded-full px-2 py-0.5 text-[11px] ring-1", a.status === "open" ? "text-sev-medium ring-sev-medium/40" : "text-sev-low ring-sev-low/40")}
                        onClick={() => void saveVisit({ ...v, actions: v.actions.map((x, j) => (j === i ? { ...x, status: x.status === "open" ? "closed" : "open" } : x)) })}
                      >
                        {a.status === "open" ? "Open" : "Closed"}
                      </button>
                    </Td>
                    <Td className="text-mute">{a.remarks}</Td>
                  </Tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="flex flex-wrap items-end gap-2 md:col-span-4">
          {openStatus && canComplete ? <Button onClick={onComplete}>Complete visit</Button> : null}
          {manager && openStatus ? (
            <>
              <TextInput type="date" className="w-40" value={date} onChange={(e) => setDate(e.target.value)} />
              <Button variant="ghost" onClick={() => void rescheduleVisit(v, date).then(() => toast.success("Visit rescheduled"))}>Reschedule</Button>
              <Button variant="ghost" onClick={onEdit}>Edit</Button>
              <Button variant="ghost" onClick={() => void cancelVisit(v).then(() => toast.success("Visit cancelled"))}>Cancel visit</Button>
            </>
          ) : null}
          {manager ? (
            <Button variant="ghost" onClick={() => { if (confirm("Delete this visit?")) { void deleteVisit(v.id); onClose(); } }}>Delete</Button>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}
