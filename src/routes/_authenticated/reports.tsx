import { createFileRoute, redirect } from "@tanstack/react-router";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { peekDomain } from "@/lib/domain";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/console/AppShell";
import { RecurringReports } from "@/components/console/RecurringReports";
import {
  Button,
  Empty,
  Field,
  FrequencyChip,
  Kpi,
  PageHeader,
  Panel,
  Select,
  StatusChip,
  Td,
  TextInput,
  Th,
  TimingChip,
  Tr,
} from "@/components/console/ui";
import {
  TODAY,
  analystsOf,
  engineerName,
  fmtDate,
  frequencyText,
  plantName,
  plantFrequencies,
  removeReport,
  reportKpis,
  reportTiming,
  saveReport,
  setReportStatus,
  useData,
  type CustomerCategory,
  type Frequency,
  type ReportStatus,
} from "@/lib/store";

export const Route = createFileRoute("/_authenticated/reports")({
  beforeLoad: () => {
    if (peekDomain() === "execution") throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Report Delivery Tracker — Forbes Marshall CM Portal" },
      {
        name: "description",
        content:
          "Track on-demand, weekly and monthly customer reports: due date, prepared, sent date and whether delivery was on time or late.",
      },
      { property: "og:title", content: "Report Delivery Tracker — Forbes Marshall CM Portal" },
      {
        property: "og:description",
        content: "Every customer report with due date, status and on-time or late delivery against the due date.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { timing?: "due" | "overdue" | undefined; eng?: string | undefined } => ({
    timing: s["timing"] === "due" || s["timing"] === "overdue" ? s["timing"] : undefined,
    eng: typeof s["eng"] === "string" ? s["eng"] : undefined,
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const data = useData();
  const team = data.role === "manager" ? analystsOf(data) : analystsOf(data).filter((a) => a.id === data.currentUserId);
  const manager = data.role === "manager"; // engineers see only their own reports
  const me = data.currentUserId;
  const search = Route.useSearch();
  const [view, setView] = useState<"register" | "recurring">("register");
  const [cat, setCat] = useState<"total" | CustomerCategory>("total");
  const categoryCounts = {
    order: data.plants.filter((p) => (p.category ?? "order") === "order").length,
    demo: data.plants.filter((p) => (p.category ?? "order") === "demo").length,
  };
  const catIds = new Set(
    (cat === "total" ? data.plants : data.plants.filter((p) => (p.category ?? "order") === cat)).map((p) => p.id),
  );
  const plantById = new Map(data.plants.map((p) => [p.id, p]));
  const allReports = (manager ? data.reports : data.reports.filter((r) => r.byEngineerId === me))
    .filter((r) => catIds.has(r.plantId))
    .filter((r) => {
      // hide unsent reports whose type is no longer in the plant's report cycle
      if (r.status === "sent") return true;
      const p = plantById.get(r.plantId);
      return !p || plantFrequencies(p).includes(r.type);
    });
  const [type, setType] = useState<"all" | Frequency>("all");
  const [status, setStatus] = useState<"all" | ReportStatus>("all");
  const [eng, setEng] = useState(search.eng ?? "all");
  const [timing, setTiming] = useState<"all" | "due" | "overdue">(search.timing ?? "all");
  useEffect(() => {
    if (search.timing) { setTiming(search.timing); setView("register"); }
    if (search.eng) setEng(search.eng);
  }, [search.timing, search.eng]);
  const [plantQ, setPlantQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    plantId: "",
    type: "weekly" as Frequency,
    period: "",
    dueDate: TODAY,
    byEngineerId: "",
  });

  const q = plantQ.trim().toLowerCase();
  // counts reflect every active filter except the timing pills themselves
  const scoped = allReports
    .filter((r) => (type === "all" ? true : r.type === type))
    .filter((r) => (status === "all" ? true : r.status === status))
    .filter((r) => (eng === "all" ? true : r.byEngineerId === eng))
    .filter((r) => (q ? plantName(data, r.plantId).toLowerCase().includes(q) : true));
  const allCount = scoped.length;
  const dueCount = scoped.filter((r) => r.status !== "sent" && r.dueDate >= TODAY).length;
  const overdueCount = scoped.filter((r) => r.status !== "sent" && r.dueDate < TODAY).length;
  // Keep the summary cards aligned with the engineer selection on every login.
  // With no selection, managers see the team and engineers see their own totals.
  const kpiReports = eng !== "all"
    ? allReports.filter((r) => r.byEngineerId === eng)
    : data.role === "manager"
      ? allReports
      : allReports.filter((r) => r.byEngineerId === me);
  const rk = reportKpis({ ...data, reports: kpiReports });
  const rows = scoped
    .filter((r) => {
      if (timing === "all") return true;
      const isOverdue = r.status !== "sent" && r.dueDate < TODAY;
      return timing === "overdue" ? isOverdue : r.status !== "sent" && !isOverdue;
    })
    .sort((a, b) => (a.dueDate > b.dueDate ? -1 : 1));

  const add = () => {
    if (!form.plantId || !form.period.trim()) return;
    saveReport({ ...form, byEngineerId: form.byEngineerId || team[0]?.id || "", status: "pending" });
    setForm({ ...form, period: "" });
    setAdding(false);
  };

  return (
    <AppShell>
      <PageHeader
        title="Report Delivery Tracker"
        subtitle="On-demand, weekly and monthly reports — was it sent to the customer on time?"
        actions={
          view === "register" ? (
            <Button variant={adding ? "ghost" : "solid"} onClick={() => setAdding((a) => !a)}>{adding ? "Cancel" : "Create report"}</Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Sent" value={rk.sent} hint={`${rk.late} were late`} />
        <Kpi label="On-time rate" value={rk.onTimePct} unit="%" tone={rk.onTimePct >= 90 ? "low" : "medium"} />
        <Kpi label="Pending" value={rk.pending} />
        <Kpi label="Overdue" value={rk.overdue} tone={rk.overdue ? "high" : "low"} />
        <Kpi label="Due in 7 days" value={rk.dueThisWeek} />
      </div>

      <div className="mt-4 flex items-center border-b border-line">
        <button
          type="button"
          onClick={() => setView("register")}
          className={`relative px-4 py-3 text-sm font-semibold transition-colors ${
            view === "register" ? "text-signal" : "text-mute hover:text-ink"
          }`}
        >
          Report Register
          <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${view === "register" ? "bg-signal/10" : "bg-canvas"}`}>
            {allReports.length}
          </span>
          {view === "register" ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-signal" /> : null}
        </button>
        <button
          type="button"
          onClick={() => {
            setAdding(false);
            setView("recurring");
          }}
          className={`relative px-4 py-3 text-sm font-semibold transition-colors ${
            view === "recurring" ? "text-signal" : "text-mute hover:text-ink"
          }`}
        >
          Recurring Settings
          <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${view === "recurring" ? "bg-signal/10" : "bg-canvas"}`}>
            {manager ? data.recurring.length : data.recurring.filter((r) => r.engineerId === me).length}
          </span>
          {view === "recurring" ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-signal" /> : null}
        </button>
      </div>

      {view === "recurring" ? <RecurringReports catFilter={cat} onCatFilter={setCat} /> : null}

      {view === "register" && adding ? (
        <Panel className="mt-4" title="Schedule a report">
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
            <Field label="Plant">
              <Select value={form.plantId} onChange={(e) => setForm({ ...form, plantId: e.target.value })}>
                <option value="">Select plant…</option>
                {data.plants.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Type">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Frequency })}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="on-demand">On demand</option>
              </Select>
            </Field>
            <Field label="Period / subject">
              <TextInput value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="21–27 Sep 2026" />
            </Field>
            <Field label="Due date">
              <TextInput type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </Field>
            <Field label="Owner">
              <Select value={form.byEngineerId || team[0]?.id || ""} onChange={(e) => setForm({ ...form, byEngineerId: e.target.value })}>
                {team.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2 xl:col-span-5">
              <Button variant="solid" onClick={add} disabled={!form.plantId || !form.period.trim()}>Add to tracker</Button>
            </div>
          </div>
        </Panel>
      ) : null}

      {view === "register" ? <Panel
        className="mt-4"
        title="Report register"
        meta={
          <span className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-md ring-1 ring-line/80 p-0.5">
              {(["total", "order", "demo"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className={`rounded px-2.5 py-1 text-xs capitalize transition-[background-color] ${
                    cat === c ? "bg-signal/10 text-signal" : "text-mute hover:bg-black/5"
                  }`}
                >
                  {c === "total" ? `Total (${data.plants.length})` : `${c} (${categoryCounts[c]})`}
                </button>
              ))}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full ring-1 ring-line/80 p-1">
              {([
                ["all", `All (${allCount})`],
                ["due", `Due (${dueCount})`],
                ["overdue", `Overdue (${overdueCount})`],
              ] as const).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTiming(v)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-[background-color] ${
                    timing === v ? "bg-signal text-signal-foreground" : "text-mute hover:bg-black/5"
                  }`}
                >
                  {label}
                </button>
              ))}
            </span>
            <TextInput
              className="w-44"
              value={plantQ}
              onChange={(e) => setPlantQ(e.target.value)}
              placeholder="Search plant name…"
            />
            <Select className="w-40" value={eng} onChange={(e) => setEng(e.target.value)}>
              <option value="all">All engineers</option>
              {data.engineers.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </Select>
            <Select className="w-32" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="all">All types</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="on-demand">On demand</option>
            </Select>
            <Select className="w-32" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="all">All status</option>
              <option value="pending">Pending</option>
              <option value="prepared">Prepared</option>
              <option value="sent">Sent</option>
            </Select>
          </span>
        }
      >
        {rows.length ? (
          <>
          <ul className="divide-y divide-line/60 md:hidden">
            {rows.map((r) => {
              const t = reportTiming(r);
              return (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold">{plantName(data, r.plantId)}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm">
                        <FrequencyChip frequency={r.type} />
                        <span className="text-mute">{r.period}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger aria-label="More actions" className="grid size-11 shrink-0 place-items-center rounded-md text-mute ring-1 ring-line">
                        <MoreHorizontal size={18} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {r.status !== "prepared" && r.status !== "sent" ? (
                          <DropdownMenuItem onSelect={() => setReportStatus(r.id, "prepared")}>Mark prepared</DropdownMenuItem>
                        ) : null}
                        {r.status === "sent" ? (
                          <DropdownMenuItem onSelect={() => setReportStatus(r.id, "prepared")}>Undo sent</DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem
                          className="text-red-600"
                          onSelect={() => {
                            if (window.confirm(`Delete this report (${plantName(data, r.plantId)} · ${r.period || r.docNo})? This cannot be undone.`)) removeReport(r.id);
                          }}
                        >
                          <Trash2 size={14} /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <StatusChip status={r.status} />
                    <TimingChip late={t.late} label={t.label} />
                    <span className="num text-mute">Due {fmtDate(r.dueDate)}</span>
                  </div>
                  {data.role === "manager" ? (
                    <div className="mt-1 text-sm text-mute">Owner: {engineerName(data, r.byEngineerId)}</div>
                  ) : null}
                  {r.status !== "sent" ? (
                    <button
                      onClick={() => setReportStatus(r.id, "sent")}
                      className="mt-3 h-11 w-full rounded-md bg-signal text-sm font-medium text-signal-foreground"
                    >
                      Mark sent
                    </button>
                  ) : (
                    <div className="num mt-2 text-sm text-mute">Sent {fmtDate(r.sentDate)}</div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Document</Th>
                  <Th>Plant</Th>
                  <Th>Type</Th>
                  <Th>Period</Th>
                  <Th>Due</Th>
                  <Th>Sent</Th>
                  <Th>Delivery</Th>
                  <Th>Status</Th>
                  <Th>Owner</Th>
                  <Th align="right">Update</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const t = reportTiming(r);
                  return (
                    <Tr key={r.id}>
                      <Td mono className="text-xs text-mute">{r.docNo}</Td>
                      <Td className="max-w-[14rem] truncate">{plantName(data, r.plantId)}</Td>
                      <Td><FrequencyChip frequency={r.type} /></Td>
                      <Td className="text-xs">{r.period}</Td>
                      <Td mono>{fmtDate(r.dueDate)}</Td>
                      <Td mono>{fmtDate(r.sentDate)}</Td>
                      <Td><TimingChip late={t.late} label={t.label} /></Td>
                      <Td><StatusChip status={r.status} /></Td>
                      <Td>{engineerName(data, r.byEngineerId)}</Td>
                      <Td align="right">
                        <span className="flex justify-end gap-1">
                          {r.status !== "prepared" && r.status !== "sent" ? (
                            <Button variant="ghost" onClick={() => setReportStatus(r.id, "prepared")}>Prepared</Button>
                          ) : null}
                          {r.status !== "sent" ? (
                            <Button onClick={() => setReportStatus(r.id, "sent")}>Mark sent</Button>
                          ) : (
                            <Button variant="ghost" onClick={() => setReportStatus(r.id, "prepared")}>Undo</Button>
                          )}
                          <Button
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (window.confirm(`Delete this report (${plantName(data, r.plantId)} · ${r.period || r.docNo})? This cannot be undone.`)) {
                                removeReport(r.id);
                              }
                            }}
                          >
                            <Trash2 size={16} aria-hidden />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </span>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <Empty>No reports match these filters.</Empty>
        )}
        <div className="border-t border-line/60 px-4 py-2 text-[11px] text-mute">
          "Mark sent" records today's date as the delivery date; on time or late is calculated against the due date. Report cycle per plant: {" "}
          {data.plants.map((p) => `${p.name.split(" — ")[0]} ${frequencyText(p)}`).join(" · ")}
        </div>
      </Panel> : null}
    </AppShell>
  );
}
