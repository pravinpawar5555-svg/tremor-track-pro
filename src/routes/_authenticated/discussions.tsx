import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/console/AppShell";
import {
  Button,
  Chip,
  Empty,
  Field,
  Kpi,
  Panel,
  PageHeader,
  Select,
  TextArea,
  TextInput,
} from "@/components/console/ui";
import { cn } from "@/lib/utils";
import {
  customerCategoryLabel,
  TODAY,
  allAskFor,
  allPriorities,
  allTicketStatuses,
  analystsOf,
  askForLabel,
  createTicket,
  currentUser,
  engineerName,
  fmtDate,
  initialsOf,
  isManager,
  managersOf,
  markThreadRead,
  plantName,
  plantThread,
  priorityLabel,
  removeTicket,
  respondToTicket,
  sendMessage,
  setTicketStatus,
  threadMessages,
  ticketKpis,
  ticketSeverity,
  ticketStatusLabel,
  ticketStatusSeverity,
  ticketThread,
  totalUnread,
  unreadCount,
  useData,
  type AskFor,
  type CustomerCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/store";

export const Route = createFileRoute("/_authenticated/discussions")({
  head: () => ({
    meta: [
      { title: "Discussion & Tickets — Forbes Marshall CM Portal" },
      {
        name: "description",
        content:
          "Internal engineer–manager chat with plant-wise channels and machine observation tickets that request an observation or recommendation.",
      },
      { property: "og:title", content: "Discussion & Tickets — Forbes Marshall CM Portal" },
      {
        property: "og:description",
        content: "Raise a ticket for a plant, area and machine, discuss internally and record the recommendation given.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiscussionsPage,
});

const emptyTicket = {
  plantId: "",
  area: "",
  machine: "",
  subject: "",
  observation: "",
  askFor: "both" as AskFor,
  priority: "medium" as TicketPriority,
};

function DiscussionsPage() {
  const data = useData();
  const me = currentUser(data);
  const meId = me?.id ?? "";
  const manager = isManager(data, meId);
  const team = analystsOf(data);
  const tk = ticketKpis(data, meId);

  const [tab, setTab] = useState<"tickets" | "plants">("tickets");
  const [statusFilter, setStatusFilter] = useState<"open" | TicketStatus | "all">("open");
  const [plantFilter, setPlantFilter] = useState("all");
  const [catFilter, setCatFilter] = useState<"total" | CustomerCategory>("total");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(emptyTicket);
  const [notice, setNotice] = useState("");
  const [reply, setReply] = useState("");
  const [response, setResponse] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);

  const tickets = useMemo(
    () =>
      data.tickets
        .filter((t) => manager || t.raisedBy === meId || t.assignedTo === meId)
        .filter((t) =>
          statusFilter === "all" ? true : statusFilter === "open" ? t.status !== "closed" : t.status === statusFilter,
        )
        .filter((t) => (plantFilter === "all" ? true : t.plantId === plantFilter))
        .sort((a, b) => (a.raisedOn === b.raisedOn ? (a.raisedAt < b.raisedAt ? 1 : -1) : a.raisedOn < b.raisedOn ? 1 : -1)),
    [data.tickets, statusFilter, plantFilter, manager, meId],
  );

  const ticket = data.tickets.find((t) => t.id === selectedTicket) ?? tickets[0];
  const plantId = selectedPlant ?? data.plants[0]?.id ?? "";
  const chatPlants = useMemo(
    () => (catFilter === "total" ? data.plants : data.plants.filter((p) => (p.category ?? "order") === catFilter)),
    [data.plants, catFilter],
  );
  const chatCategoryCounts = {
    order: data.plants.filter((p) => (p.category ?? "order") === "order").length,
    demo: data.plants.filter((p) => (p.category ?? "order") === "demo").length,
  };
  const thread = tab === "tickets" ? (ticket ? ticketThread(ticket.id) : "") : plantId ? plantThread(plantId) : "";
  const msgs = thread ? threadMessages(data, thread) : [];

  useEffect(() => {
    if (thread && meId) markThreadRead(thread, meId);
  }, [thread, meId, msgs.length]);

  const set = (k: keyof typeof emptyTicket, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 3500);
  };

  const raise = () => {
    const raisedBy = manager ? team[0]?.id ?? meId : meId;
    const res = createTicket({ ...form, raisedBy, assignedTo: managersOf(data)[0]?.id ?? "" });
    flash(res.message);
    if (res.ok) {
      setForm(emptyTicket);
      setShowNew(false);
      if (res.id) setSelectedTicket(res.id);
      setTab("tickets");
    }
  };

  const send = () => {
    if (!thread) return;
    const res = sendMessage(thread, meId, reply);
    if (res.ok) setReply("");
    else flash(res.message);
  };

  const respond = () => {
    if (!ticket) return;
    const res = respondToTicket(ticket.id, meId, response);
    flash(res.message);
    if (res.ok) setResponse("");
  };

  return (
    <AppShell>
      <PageHeader
        title="Discussion & Tickets"
        subtitle="Internal engineer–manager chat, plant-wise channels and machine observation tickets"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {notice ? <span className="text-xs text-signal">{notice}</span> : null}
            <Button variant="solid" onClick={() => setShowNew((s) => !s)}>
              {showNew ? "Close form" : "Raise ticket"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Open tickets" value={tk.open} tone={tk.open ? "medium" : "low"} hint={`${tk.closed} closed`} />
        <Kpi
          label="Awaiting manager reply"
          value={tk.waitingOnManager}
          tone={tk.waitingOnManager ? "high" : "low"}
          hint="Observation / recommendation pending"
        />
        <Kpi label="High or critical" value={tk.critical} tone={tk.critical ? "high" : "low"} />
        <Kpi label="Unread messages" value={totalUnread(data, meId)} hint={me ? `for ${me.name}` : ""} />
      </div>

      {showNew ? (
        <Panel className="mt-4" title="Raise a ticket" meta={`Raised ${fmtDate(TODAY)}`}>
          <div className="grid gap-3 p-4 md:grid-cols-3">
            <Field label="Plant name">
              <Select value={form.plantId} onChange={(e) => set("plantId", e.target.value)}>
                <option value="">Select plant…</option>
                {data.plants.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Area name">
              <TextInput value={form.area} onChange={(e) => set("area", e.target.value)} placeholder="e.g. Boiler feed area" />
            </Field>
            <Field label="Machine name">
              <TextInput value={form.machine} onChange={(e) => set("machine", e.target.value)} placeholder="e.g. Boiler feed pump 2A" />
            </Field>
            <Field label="Subject">
              <TextInput value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Short title of the issue" />
            </Field>
            <Field label="Required from manager">
              <Select value={form.askFor} onChange={(e) => set("askFor", e.target.value)}>
                {allAskFor.map((a) => (
                  <option key={a} value={a}>{askForLabel[a]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                {allPriorities.map((p) => (
                  <option key={p} value={p}>{priorityLabel[p]}</option>
                ))}
              </Select>
            </Field>
            <div className="md:col-span-3">
              <Field
                label="Observation by engineer"
                hint="Write it as possible / suspected / indication of — confirmation comes only after verification."
              >
                <TextArea
                  value={form.observation}
                  onChange={(e) => set("observation", e.target.value)}
                  placeholder="What was seen, what the site says, what you need from the manager"
                />
              </Field>
            </div>
            <div className="flex items-center gap-2 md:col-span-3">
              <Button variant="solid" onClick={raise} disabled={!form.plantId || !form.machine.trim() || !form.subject.trim()}>
                Send to manager
              </Button>
              <Button variant="ghost" onClick={() => setForm(emptyTicket)}>Clear</Button>
            </div>
          </div>
        </Panel>
      ) : null}

      <div className="mt-4 flex gap-2">
        <Button variant={tab === "tickets" ? "solid" : "outline"} onClick={() => setTab("tickets")}>
          Tickets
        </Button>
        <Button variant={tab === "plants" ? "solid" : "outline"} onClick={() => setTab("plants")}>
          Plant-wise chat
        </Button>
      </div>

      <div className="mt-3 grid items-start gap-4 xl:grid-cols-[20rem_1fr]">
        {tab === "tickets" ? (
          <Panel
            title="Tickets"
            meta={
              <div className="flex gap-2">
                <Select className="w-28" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TicketStatus | "open" | "all")}>
                  <option value="open">Open</option>
                  {allTicketStatuses.map((s) => (
                    <option key={s} value={s}>{ticketStatusLabel[s]}</option>
                  ))}
                  <option value="all">All</option>
                </Select>
                <Select className="w-28" value={plantFilter} onChange={(e) => setPlantFilter(e.target.value)}>
                  <option value="all">All plants</option>
                  {data.plants.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>
            }
          >
            {tickets.length ? (
              <div className="max-h-[32rem] overflow-y-auto">
                {tickets.map((t) => {
                  const unread = unreadCount(data, ticketThread(t.id), meId);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTicket(t.id)}
                      className={cn(
                        "block w-full border-t border-line/60 px-4 py-2.5 text-left first:border-0",
                        ticket?.id === t.id ? "bg-signal/10" : "hover:bg-black/[0.03]",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="num text-[11px] text-mute">{t.ticketNo}</span>
                        <Chip severity={ticketStatusSeverity(t.status)} label={ticketStatusLabel[t.status]} />
                      </div>
                      <div className="mt-0.5 truncate text-sm font-medium">{t.subject}</div>
                      <div className="truncate text-[11px] text-mute">
                        {plantName(data, t.plantId)} · {t.area || "—"} · {t.machine}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Chip severity={ticketSeverity(t.priority)} label={priorityLabel[t.priority]} />
                        {unread ? <span className="num text-[10px] text-sev-high">{unread} new</span> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <Empty>No tickets for this filter.</Empty>
            )}
          </Panel>
        ) : (
          <Panel
            title="Plant channels"
            meta={
              <span className="inline-flex rounded-md ring-1 ring-line/80 p-0.5">
                {(["total", "order", "demo"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCatFilter(c)}
                    className={`rounded px-2.5 py-1 text-xs capitalize transition-[background-color] ${
                      catFilter === c ? "bg-signal/10 text-signal" : "text-mute hover:bg-black/5"
                    }`}
                  >
                    {c === "total" ? `Total (${data.plants.length})` : `${c} (${chatCategoryCounts[c]})`}
                  </button>
                ))}
              </span>
            }
          >
            {chatPlants.length ? (
              <div className="max-h-[32rem] overflow-y-auto">
                {chatPlants.map((p) => {
                  const unread = unreadCount(data, plantThread(p.id), meId);
                  const last = threadMessages(data, plantThread(p.id)).slice(-1)[0];
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlant(p.id)}
                      className={cn(
                        "block w-full border-t border-line/60 px-4 py-2.5 text-left first:border-0",
                        plantId === p.id ? "bg-signal/10" : "hover:bg-black/[0.03]",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{p.name}</span>
                        <span className="ml-2 flex shrink-0 items-center gap-2">
                          <span className="text-[10px] text-mute">{customerCategoryLabel[(p.category ?? "order") as CustomerCategory]}</span>
                          {unread ? <span className="num text-[10px] text-sev-high">{unread} new</span> : null}
                        </span>
                      </div>
                      <div className="truncate text-[11px] text-mute">
                        {last ? `${engineerName(data, last.authorId)}: ${last.text}` : "No messages yet"}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <Empty>No {catFilter} plants.</Empty>
            )}
          </Panel>
        )}

        <div className="grid gap-4">
          {tab === "tickets" && ticket ? (
            <Panel
              title={`${ticket.ticketNo} · ${ticket.subject}`}
              meta={
                <span className="flex items-center gap-2">
                  <Chip severity={ticketSeverity(ticket.priority)} label={priorityLabel[ticket.priority]} />
                  <Chip severity={ticketStatusSeverity(ticket.status)} label={ticketStatusLabel[ticket.status]} />
                </span>
              }
            >
              <div className="grid gap-3 p-4">
                <div className="panel-inset grid gap-2 p-3 text-sm sm:grid-cols-3">
                  <div>
                    <div className="label-caps">Plant</div>
                    <div>{plantName(data, ticket.plantId)}</div>
                  </div>
                  <div>
                    <div className="label-caps">Area</div>
                    <div>{ticket.area || "—"}</div>
                  </div>
                  <div>
                    <div className="label-caps">Machine</div>
                    <div>{ticket.machine}</div>
                  </div>
                  <div>
                    <div className="label-caps">Raised by</div>
                    <div>
                      {engineerName(data, ticket.raisedBy)} · <span className="num">{fmtDate(ticket.raisedOn)} {ticket.raisedAt}</span>
                    </div>
                  </div>
                  <div>
                    <div className="label-caps">Assigned to</div>
                    <div>{engineerName(data, ticket.assignedTo)}</div>
                  </div>
                  <div>
                    <div className="label-caps">Required</div>
                    <div>{askForLabel[ticket.askFor]}</div>
                  </div>
                </div>

                <div>
                  <div className="label-caps">Engineer's observation</div>
                  <p className="mt-1 text-sm text-mute">{ticket.observation || "—"}</p>
                </div>

                {ticket.response ? (
                  <div className="panel-inset p-3">
                    <div className="label-caps">Manager's observation / recommendation</div>
                    <p className="mt-1 text-sm">{ticket.response}</p>
                    <div className="num mt-1 text-[11px] text-mute">Given {fmtDate(ticket.respondedOn)}</div>
                  </div>
                ) : null}

                {manager ? (
                  <Field
                    label="Your observation / recommendation"
                    hint="Keep the wording as possible / suspected / requires verification unless the fault is confirmed."
                  >
                    <TextArea value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Advice to the engineer" />
                  </Field>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  {manager ? (
                    <Button variant="solid" onClick={respond} disabled={!response.trim()}>
                      {ticket.response ? "Update recommendation" : "Give recommendation"}
                    </Button>
                  ) : null}
                  {ticket.status !== "closed" ? (
                    <Button onClick={() => setTicketStatus(ticket.id, "closed")}>Close ticket</Button>
                  ) : (
                    <Button onClick={() => setTicketStatus(ticket.id, "in-discussion")}>Reopen</Button>
                  )}
                  <Button variant="ghost" onClick={() => { removeTicket(ticket.id); setSelectedTicket(null); }}>
                    Delete
                  </Button>
                </div>
              </div>
            </Panel>
          ) : null}

          <Panel
            title={tab === "tickets" ? "Ticket discussion" : `Plant chat · ${plantId ? plantName(data, plantId) : "—"}`}
            meta={me ? `You are ${me.name}` : null}
          >
            {thread ? (
              <>
                <div className="flex max-h-[26rem] flex-col gap-2 overflow-y-auto p-4">
                  {msgs.length ? (
                    msgs.map((x) => {
                      const mine = x.authorId === meId;
                      return (
                        <div key={x.id} className={cn("flex gap-2", mine && "flex-row-reverse")}>
                          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-base text-[10px] font-semibold text-mute ring-1 ring-line">
                            {initialsOf(engineerName(data, x.authorId))}
                          </span>
                          <div
                            className={cn(
                              "max-w-[85%] rounded-lg px-3 py-2 text-sm ring-1",
                              mine ? "bg-signal/10 ring-signal/30" : "bg-panel ring-line/70",
                            )}
                          >
                            <div className="text-[11px] text-mute">
                              {engineerName(data, x.authorId)} · <span className="num">{fmtDate(x.date)} {x.at}</span>
                            </div>
                            <div className="mt-0.5 whitespace-pre-wrap">{x.text}</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <Empty>No messages yet — start the discussion below.</Empty>
                  )}
                </div>
                <div className="flex items-end gap-2 border-t border-line/70 p-3">
                  <TextArea
                    className="min-h-11"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Write a message…"
                  />
                  <Button variant="solid" onClick={send} disabled={!reply.trim()}>Send</Button>
                </div>
              </>
            ) : (
              <Empty>Select a ticket or plant to open the chat.</Empty>
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
