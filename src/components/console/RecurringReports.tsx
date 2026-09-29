import { useState } from "react";
import { Button, Empty, Field, Panel, Select, Td, TextInput, Th, Tr } from "@/components/console/ui";
import {
  TODAY,
  analystsOf,
  engineerName,
  fmtDate,
  frequencyLabel,
  plantName,
  removeRecurring,
  saveRecurring,
  useData,
  type CustomerCategory,
  type RecurringReport,
} from "@/lib/store";

type CatFilter = "total" | CustomerCategory;

export function RecurringReports({
  catFilter,
  onCatFilter,
}: {
  catFilter: CatFilter;
  onCatFilter: (c: CatFilter) => void;
}) {
  const data = useData();
  const team = analystsOf(data);
  const categoryCounts = {
    order: data.plants.filter((p) => (p.category ?? "order") === "order").length,
    demo: data.plants.filter((p) => (p.category ?? "order") === "demo").length,
  };
  const catIds = new Set(
    (catFilter === "total" ? data.plants : data.plants.filter((p) => (p.category ?? "order") === catFilter)).map(
      (p) => p.id,
    ),
  );
  const inCat = data.recurring.filter((r) => catIds.has(r.plantId));
  const [engFilter, setEngFilter] = useState<string>("all");
  const recurring = engFilter === "all" ? inCat : inCat.filter((r) => r.engineerId === engFilter);
  const blank = { plantId: "", type: "weekly" as RecurringReport["type"], nextDue: TODAY, engineerId: "" };
  const [form, setForm] = useState(blank);

  const add = () => {
    if (!form.plantId) return;
    saveRecurring({ ...form, engineerId: form.engineerId || team[0]?.id || "", active: true });
    setForm(blank);
  };

  return (
    <Panel
      className="mt-4"
      title="Recurring reports"
      meta={
        <span className="flex flex-wrap items-center gap-3">
          <span className="inline-flex rounded-md ring-1 ring-line/80 p-0.5">
            {(["total", "order", "demo"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onCatFilter(c)}
                className={`rounded px-2.5 py-1 text-xs capitalize transition-[background-color] ${
                  catFilter === c ? "bg-signal/10 text-signal" : "text-mute hover:bg-black/5"
                }`}
              >
                {c === "total" ? `Total (${data.plants.length})` : `${c} (${categoryCounts[c]})`}
              </button>
            ))}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full ring-1 ring-line/80 p-1">
            {[{ id: "all", label: "Total" }, ...team.map((a) => ({ id: a.id, label: a.name.split(" ")[0] ?? a.name }))].map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setEngFilter(o.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-[background-color] ${
                  engFilter === o.id ? "bg-signal text-signal-foreground" : "text-mute hover:bg-black/5"
                }`}
              >
                {o.label} ({o.id === "all" ? inCat.length : inCat.filter((r) => r.engineerId === o.id).length})
              </button>
            ))}
          </span>
          <span>Reports are created automatically a week before they fall due</span>
        </span>
      }
    >
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
        <Field label="Plant">
          <Select value={form.plantId} onChange={(e) => setForm({ ...form, plantId: e.target.value })}>
            <option value="">Select plant…</option>
            {data.plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Repeats">
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as RecurringReport["type"] })}>
            <option value="weekly">Every week</option>
            <option value="monthly">Every month</option>
          </Select>
        </Field>
        <Field label="First due date">
          <TextInput type="date" value={form.nextDue} onChange={(e) => setForm({ ...form, nextDue: e.target.value })} />
        </Field>
        <Field label="Engineer">
          <Select value={form.engineerId || team[0]?.id || ""} onChange={(e) => setForm({ ...form, engineerId: e.target.value })}>
            {team.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
        <div className="flex items-end">
          <Button variant="solid" onClick={add} disabled={!form.plantId}>Add schedule</Button>
        </div>
      </div>
      {recurring.length ? (
        <div className="overflow-x-auto border-t border-line/60">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <Th>Plant</Th>
                <Th>Repeats</Th>
                <Th>Next due</Th>
                <Th>Engineer</Th>
                <Th>Status</Th>
                <Th align="right"> </Th>
              </tr>
            </thead>
            <tbody>
              {recurring.map((r) => (
                <Tr key={r.id}>
                  <Td className="max-w-[14rem] truncate">{plantName(data, r.plantId)}</Td>
                  <Td>{frequencyLabel[r.type]}</Td>
                  <Td mono>{fmtDate(r.nextDue)}</Td>
                  <Td>{engineerName(data, r.engineerId)}</Td>
                  <Td className={r.active ? "text-sev-low" : "text-mute"}>{r.active ? "Active" : "Paused"}</Td>
                  <Td align="right">
                    <span className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => saveRecurring({ ...r, active: !r.active })}>{r.active ? "Pause" : "Resume"}</Button>
                      <Button variant="ghost" onClick={() => removeRecurring(r.id)}>Delete</Button>
                    </span>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No recurring schedules yet.</Empty>
      )}
    </Panel>
  );
}
