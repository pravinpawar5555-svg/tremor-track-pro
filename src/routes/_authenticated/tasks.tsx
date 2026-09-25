import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/console/AppShell";
import { Button, Empty, Field, Kpi, Panel, PageHeader, Select, TextInput } from "@/components/console/ui";
import { cn } from "@/lib/utils";
import {
  TODAY,
  addTask,
  analystsOf,
  engineerName,
  fmtDate,
  removeTask,
  taskStats,
  tasksFor,
  toggleTask,
  useData,
  type Task,
} from "@/lib/store";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Daily Task — Forbes Marshall CM Portal" },
      { name: "description", content: "Each engineer's daily checklist: add tasks, tick them off and carry unfinished work to the next day." },
      { property: "og:title", content: "Daily Task — Forbes Marshall CM Portal" },
      { property: "og:description", content: "Daily task checklist for condition monitoring engineers, with manager-assigned tasks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TasksPage,
});

function timeOf(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function TaskList({ list, canDelete }: { list: Task[]; canDelete: (t: Task) => boolean }) {
  const data = useData();
  if (!list.length) return <Empty>No tasks for this day.</Empty>;
  return (
    <ul className="divide-y divide-line/60">
      {list.map((t) => (
        <li key={t.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
          <input
            type="checkbox"
            aria-label={`Mark "${t.title}" complete`}
            className="mt-0.5 size-4 accent-signal"
            checked={t.status === "completed"}
            onChange={() => toggleTask(t.id)}
          />
          <div className="min-w-0 flex-1">
            <div className={cn(t.status === "completed" && "text-mute line-through")}>{t.title}</div>
            <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-mute">
              {t.status === "completed" ? <span className="text-sev-low">Completed {timeOf(t.completedAt)}</span> : <span>Pending</span>}
              {t.originalDate < t.taskDate ? <span className="text-sev-medium">Carried over from {fmtDate(t.originalDate)}</span> : null}
              {t.assignedBy ? <span>Assigned by {engineerName(data, t.assignedBy)}</span> : null}
            </div>
          </div>
          {canDelete(t) ? <Button variant="ghost" onClick={() => removeTask(t.id)}>Delete</Button> : null}
        </li>
      ))}
    </ul>
  );
}

function TasksPage() {
  const data = useData();
  const team = analystsOf(data);
  const manager = data.role === "manager";
  const [date, setDate] = useState(TODAY);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [historyFor, setHistoryFor] = useState("");

  const me = data.currentUserId;
  const target = manager ? assignee || team[0]?.id || "" : me;
  const people = manager ? team : data.engineers.filter((e) => e.id === me);
  const canDelete = (t: Task) => manager || (t.engineerId === me && !t.assignedBy);

  const add = () => {
    if (!title.trim()) return;
    addTask(title, target, date < TODAY ? TODAY : date);
    setTitle("");
  };

  const historyId = manager ? historyFor || team[0]?.id || "" : me;
  const history = data.tasks
    .filter((t) => t.engineerId === historyId && t.status === "completed")
    .sort((a, b) => ((a.completedAt ?? "") < (b.completedAt ?? "") ? 1 : -1))
    .slice(0, 40);

  const mine = taskStats(data, manager ? target : me, date);

  return (
    <AppShell>
      <PageHeader
        title="Daily Task"
        subtitle={manager ? "Assign tasks and follow every engineer's checklist" : "Your checklist for the day — unfinished tasks move to the next day automatically"}
        actions={<TextInput type="date" className="w-40" value={date} onChange={(e) => setDate(e.target.value)} />}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Tasks" value={mine.total} hint={manager ? engineerName(data, target) : fmtDate(date)} />
        <Kpi label="Completed" value={mine.done} tone="low" />
        <Kpi label="Pending" value={mine.pending} tone={mine.pending ? "medium" : "low"} />
        <Kpi label="Carried over" value={mine.carried} tone={mine.carried ? "high" : "low"} />
      </div>

      <Panel className="mt-4" title={manager ? "Assign a task" : "Add task"}>
        <form className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); add(); }}>
          {manager ? (
            <Field label="Engineer">
              <Select value={target} onChange={(e) => setAssignee(e.target.value)}>
                {team.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </Field>
          ) : null}
          <div className="flex-1">
            <Field label="Task">
              <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Prepare compressor vibration report" />
            </Field>
          </div>
          <Button variant="solid" type="submit" disabled={!title.trim() || !target}>Add task</Button>
        </form>
      </Panel>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        {people.map((p) => {
          const st = taskStats(data, p.id, date);
          return (
            <Panel key={p.id} title={manager ? p.name : `My tasks · ${fmtDate(date)}`} meta={`${st.done}/${st.total} done`}>
              <TaskList list={tasksFor(data, p.id, date)} canDelete={canDelete} />
            </Panel>
          );
        })}
      </div>

      <Panel
        className="mt-4"
        title="Task history"
        meta={
          manager ? (
            <Select className="w-40" value={historyId} onChange={(e) => setHistoryFor(e.target.value)}>
              {team.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          ) : "Last 40 completed"
        }
      >
        {history.length ? (
          <ul className="divide-y divide-line/60">
            {history.map((t) => (
              <li key={t.id} className="flex justify-between gap-3 px-4 py-2 text-sm">
                <span>{t.title}</span>
                <span className="num shrink-0 text-xs text-mute">{fmtDate(t.taskDate)} · {timeOf(t.completedAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No completed tasks yet.</Empty>
        )}
      </Panel>
    </AppShell>
  );
}
