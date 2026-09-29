import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { markRemindersSeen, useDailyWork, type Reminder } from "@/lib/dailywork";
import { TODAY, engineerName, fmtDate, plantName, useData } from "@/lib/store";
import { cn } from "@/lib/utils";

type Note = { id: string; kind: "assigned" | "due"; r: Reminder };

const hhmm = () => {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
};

export function NotificationBell() {
  const data = useData();
  const dw = useDailyWork();
  const me = data.currentUserId;
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const notes = useMemo<Note[]>(() => {
    const now = hhmm();
    const out: Note[] = [];
    for (const r of dw.reminders) {
      if (r.userId !== me || r.status !== "active") continue;
      if (r.notify !== "none" && (r.date < TODAY || (r.date === TODAY && (!r.time || r.time <= now))))
        out.push({ id: `due:${r.id}`, kind: "due", r });
      else if (r.createdBy && r.createdBy !== me && !r.seenAt) out.push({ id: `as:${r.id}`, kind: "assigned", r });
    }
    return out.sort((a, b) => (a.r.date + a.r.time < b.r.date + b.r.time ? 1 : -1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dw.reminders, me, tick]);

  const chats = useMemo(() => {
    const m = new Map<string, { thread: string; count: number; last: { authorId: string; text: string; date: string; at: string } }>();
    for (const x of data.messages ?? []) {
      if (!me || x.authorId === me || x.readBy.includes(me)) continue;
      const c = m.get(x.thread);
      if (!c) m.set(x.thread, { thread: x.thread, count: 1, last: x });
      else { c.count++; if (`${x.date} ${x.at}` > `${c.last.date} ${c.last.at}`) c.last = x; }
    }
    return [...m.values()].sort((a, b) => (`${a.last.date} ${a.last.at}` < `${b.last.date} ${b.last.at}` ? 1 : -1));
  }, [data.messages, me]);
  const chatLabel = (thread: string) => {
    if (thread.startsWith("plant:")) return `Plant chat · ${plantName(data, thread.slice(6))}`;
    const t = data.tickets.find((x) => `ticket:${x.id}` === thread);
    return t ? `Ticket ${t.ticketNo} · ${t.subject}` : "Ticket discussion";
  };
  const seenChat = useRef<Map<string, number> | null>(null);
  useEffect(() => {
    if (!me) return;
    if (seenChat.current === null) { seenChat.current = new Map(chats.map((c) => [c.thread, c.count])); return; }
    for (const c of chats) {
      if ((seenChat.current.get(c.thread) ?? 0) < c.count)
        toast.info(`New message from ${engineerName(data, c.last.authorId)}`, { description: `${chatLabel(c.thread)}: ${c.last.text.slice(0, 80)}` });
      seenChat.current.set(c.thread, c.count);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, me]);
  const total = notes.length + chats.length;

  const shown = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!me) return;
    if (shown.current === null) {
      if (!dw.reminders.length) return;
      shown.current = new Set(notes.map((n) => n.id));
      if (notes.length) toast(`You have ${notes.length} reminder notification${notes.length > 1 ? "s" : ""}`);
      return;
    }
    for (const n of notes) {
      if (shown.current.has(n.id)) continue;
      shown.current.add(n.id);
      if (n.kind === "assigned") toast.info(`New reminder from ${engineerName(data, n.r.createdBy)}`, { description: n.r.title });
      else toast.warning(`Reminder due: ${n.r.title}`, { description: n.r.time ? `${fmtDate(n.r.date)} ${n.r.time}` : fmtDate(n.r.date) });
    }
  }, [notes, me, dw.reminders.length, data]);

  const onOpen = (open: boolean) => {
    if (!open) return;
    const ids = dw.reminders.filter((r) => r.userId === me && r.createdBy && r.createdBy !== me && !r.seenAt).map((r) => r.id);
    void markRemindersSeen(ids);
  };

  return (
    <Popover onOpenChange={onOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Notifications" className="relative grid size-7 place-items-center rounded-md text-mute ring-1 ring-line hover:bg-black/5">
          <Bell className="size-4" />
          {total ? (
            <span className="num absolute -right-1.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-sev-high px-1 text-[10px] font-semibold text-signal-foreground">{total}</span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-line px-3 py-2 text-sm font-semibold">Notifications</div>
        {chats.length ? (
          <>
            <div className="label-caps px-3 pt-2">Unread messages</div>
            <ul className="max-h-60 divide-y divide-line/60 overflow-auto">
              {chats.map((c) => (
                <li key={c.thread}>
                  <Link to="/discussions" search={{ thread: c.thread }} className="block px-3 py-2 hover:bg-black/5">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-sev-medium" />
                      <span className="truncate text-[11px] font-medium text-mute">{chatLabel(c.thread)}</span>
                      <span className="num ml-auto rounded-full bg-sev-high px-1.5 text-[10px] font-semibold text-signal-foreground">{c.count}</span>
                    </div>
                    <div className="mt-0.5 truncate text-sm"><b>{engineerName(data, c.last.authorId)}:</b> {c.last.text}</div>
                    <div className="num text-[11px] text-mute">{fmtDate(c.last.date)} · {c.last.at}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {notes.length ? <div className="label-caps border-t border-line px-3 pt-2">Reminders</div> : null}
        {notes.length ? (
          <ul className="max-h-80 divide-y divide-line/60 overflow-auto">
            {notes.map((n) => (
              <li key={n.id}>
                <Link to="/tasks" className="block px-3 py-2 hover:bg-black/5">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", n.kind === "due" ? "bg-sev-high" : "bg-signal")} />
                    <span className="text-[11px] font-medium text-mute">{n.kind === "due" ? (n.r.date < TODAY ? "Overdue" : "Due now") : `Assigned by ${engineerName(data, n.r.createdBy)}`}</span>
                  </div>
                  <div className="mt-0.5 text-sm font-medium">{n.r.title}</div>
                  <div className="num text-[11px] text-mute">{fmtDate(n.r.date)}{n.r.time ? ` · ${n.r.time}` : ""}</div>
                </Link>
              </li>
            ))}
          </ul>
        ) : chats.length ? null : (
          <div className="px-3 py-6 text-center text-xs text-mute">No new notifications.</div>
        )}
      </PopoverContent>
    </Popover>
  );
}
