import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
  reportKpis,
  reportTiming,
  saveReport,
  setReportStatus,
  useData,
  type Frequency,
  type ReportStatus,
} from "@/lib/store";

export const Route = createFileRoute("/_authenticated/reports")({
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
  component: ReportsPage,
});

function ReportsPage() {
  const data = useData();
  const team = analystsOf(data);
  const rk = reportKpis(data);
  const [type, setType] = useState<"all" | Frequency>("all");
  const [status, setStatus] = useState<"all" | ReportStatus>("all");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    plantId: "",
    type: "weekly" as Frequency,
    period: "",
    dueDate: TODAY,
    byEngineerId: "",
  });

  const rows = data.reports
    .filter((r) => (type === "all" ? true : r.type === type))
    .filter((r) => (status === "all" ? true : r.status === status))
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
          data.role === "manager" ? (
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

      {data.role === "manager" ? <RecurringReports /> : null}

      {adding ? (
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

      <Panel
        className="mt-4"
        title="Report register"
        meta={
          <span className="flex gap-2">
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
          <div className="overflow-x-auto">
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
                        </span>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No reports match these filters.</Empty>
        )}
        <div className="border-t border-line/60 px-4 py-2 text-[11px] text-mute">
          "Mark sent" records today's date as the delivery date; on time or late is calculated against the due date. Report cycle per plant: {" "}
          {data.plants.map((p) => `${p.name.split(" — ")[0]} ${frequencyText(p)}`).join(" · ")}
        </div>
      </Panel>
    </AppShell>
  );
}
