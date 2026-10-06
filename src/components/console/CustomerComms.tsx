import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarDays, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBranches } from "@/lib/branches";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button, Empty, Field, Panel, Select, TextArea, TextInput } from "@/components/console/ui";
import { cn } from "@/lib/utils";
import {
  TODAY, addTask, analystsOf, engineerName, fmtDate, frequencyLabel, plantName, savePlant, useData,
} from "@/lib/store";
import { useVisits } from "@/lib/visits";
import { blankReminder, saveReminder } from "@/lib/dailywork";
import {
  blankComm, commModes, commTypes, followUpLabel, openFollowUp, saveComm, useComms,
  type Comm, type CommMode, type FollowUp,
} from "@/lib/comms";

const tone: Record<FollowUp, string> = {
  none: "text-mute ring-line",
  required: "text-sev-high ring-sev-high/40",
  waiting_customer: "text-sev-medium ring-sev-medium/40",
  waiting_fm: "text-sev-medium ring-sev-medium/40",
  completed: "text-sev-low ring-sev-low/40",
};
export function FollowBadge({ f }: { f: FollowUp }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ring-1", tone[f])}>{followUpLabel[f]}</span>;
}

type Quick = "all" | "follow" | "actions" | "waiting" | "recent";

const iso = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
const short = (s: string) => new Date(s + "T00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function DateRange({ from, to, onChange }: { from: string; to: string; onChange: (f: string, t: string) => void }) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const ago = (n: number) => iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n));
  const presets: [string, string, string][] = [
    ["Today", ago(0), ago(0)],
    ["Last 7 Days", ago(6), ago(0)],
    ["Last 30 Days", ago(29), ago(0)],
    ["This Month", iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(new Date(now.getFullYear(), now.getMonth() + 1, 0))],
  ];
  const label = from || to ? `${from ? short(from) : "…"} – ${to ? short(to) : "…"}` : "Select date range";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn("inline-flex w-full min-w-0 items-center gap-1.5 rounded-md bg-panel px-2.5 py-1.5 text-left text-sm ring-1 ring-line/80 md:w-auto md:max-w-[14rem] md:flex-[0_1_13rem]", from || to ? "text-ink" : "text-mute")}>
          <CalendarDays className="size-4 shrink-0 text-mute" /><span className="truncate">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 bg-panel p-3">
        <div className="grid grid-cols-2 gap-1">
          {presets.map(([l, f, t]) => (
            <button key={l} onClick={() => { onChange(f, t); setOpen(false); }} className={cn("rounded-md px-2 py-1.5 text-xs ring-1", from === f && to === t ? "bg-signal/10 text-signal ring-signal/40" : "ring-line/80 hover:bg-black/5")}>{l}</button>
          ))}
        </div>
        <div className="label-caps mt-3">Custom Range</div>
        <div className="mt-1 grid gap-2">
          <Field label="From Date"><TextInput type="date" value={from} max={to || undefined} onChange={(e) => onChange(e.target.value, to)} /></Field>
          <Field label="To Date"><TextInput type="date" value={to} min={from || undefined} onChange={(e) => onChange(from, e.target.value)} /></Field>
        </div>
        <div className="mt-3 flex justify-between">
          <Button variant="ghost" onClick={() => { onChange("", ""); setOpen(false); }}>Clear</Button>
          <Button variant="solid" onClick={() => setOpen(false)}>Done</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CustomerComms() {
  const data = useData();
  const comms = useComms();
  const visits = useVisits();
  const meId = data.currentUserId;
  const people = data.engineers.filter((e) => e.role !== "execution");
  const team = analystsOf(data);

  const [q, setQ] = useState("");
  const [quick, setQuick] = useState<Quick>("all");
  const [plantF, setPlantF] = useState("");
  const [typeF, setTypeF] = useState("");
  const [modeF, setModeF] = useState("");
  const [engF, setEngF] = useState("");
  const [followF, setFollowF] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [newest, setNewest] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<Comm | null>(null);
  const [mkTask, setMkTask] = useState(false);
  const [mkRem, setMkRem] = useState(false);
  const [saveContact, setSaveContact] = useState(false);
  const [busy, setBusy] = useState(false);

  const br = useBranches();
  const isMobile = useIsMobile();
  const [branchF, setBranchF] = useState("");
  const [rmF, setRmF] = useState("");
  const [salesF, setSalesF] = useState("");
  const [ownerF, setOwnerF] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const cur = { plant: plantF, type: typeF, mode: modeF, eng: engF, follow: followF, from, to, branch: branchF, rm: rmF, sales: salesF, owner: ownerF };
  type Draft = typeof cur;
  const emptyDraft: Draft = { plant: "", type: "", mode: "", eng: "", follow: "", from: "", to: "", branch: "", rm: "", sales: "", owner: "" };
  const [d, setD] = useState<Draft>(cur);
  useEffect(() => { if (moreOpen) setD(cur); }, [moreOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  const applyDraft = (x: Draft) => {
    setPlantF(x.plant); setTypeF(x.type); setModeF(x.mode); setEngF(x.eng); setFollowF(x.follow);
    setFrom(x.from); setTo(x.to); setBranchF(x.branch); setRmF(x.rm); setSalesF(x.sales); setOwnerF(x.owner);
  };
  const activeCount = [plantF, typeF, modeF, engF, followF, from || to, branchF, rmF, salesF, ownerF].filter(Boolean).length;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    return comms
      .filter((c) => {
        if (plantF && c.plantId !== plantF) return false;
        if (typeF && c.type !== typeF) return false;
        if (modeF && c.mode !== modeF) return false;
        if (engF && c.fmRep !== engF && c.createdBy !== engF) return false;
        if (followF && c.followUp !== followF) return false;
        if (ownerF && c.followUpOwner !== ownerF) return false;
        if (from && c.date < from) return false;
        if (to && c.date > to) return false;
        if (quick === "follow" && !openFollowUp(c.followUp)) return false;
        if (quick === "actions" && !c.actions.some((a) => a.status === "open")) return false;
        if (quick === "waiting" && c.followUp !== "waiting_customer") return false;
        if (quick === "recent" && c.updatedAt < weekAgo) return false;
        const p = data.plants.find((x) => x.id === c.plantId);
        if (branchF && p?.branchId !== branchF) return false;
        if (salesF && p?.salesEngineerId !== salesF) return false;
        if (rmF && br.branches.find((b) => b.id === p?.branchId)?.rmName !== rmF) return false;
        if (!s) return true;
        return [p?.name, p?.customer, c.contactPerson, c.subject, c.summary, c.commitment, engineerName(data, c.fmRep), ...c.actions.map((a) => a.text)]
          .join(" ").toLowerCase().includes(s);
      })
      .sort((a, b) => ((a.date + a.time < b.date + b.time ? 1 : -1) * (newest ? 1 : -1)));
  }, [comms, q, quick, plantF, typeF, modeF, engF, followF, from, to, newest, data, branchF, rmF, salesF, ownerF, br.branches]);

  const plantRows = useMemo(() => {
    return data.plants
      .map((p) => {
        const list = comms.filter((c) => c.plantId === p.id).sort((a, b) => (a.date < b.date ? 1 : -1));
        return { p, list, last: list[0], open: list.filter((c) => openFollowUp(c.followUp)).length };
      })
      .filter((r) => !q.trim() || filtered.some((c) => c.plantId === r.p.id) || r.p.name.toLowerCase().includes(q.trim().toLowerCase()))
      .sort((a, b) => ((a.last?.date ?? "") < (b.last?.date ?? "") ? 1 : -1));
  }, [data.plants, comms, filtered, q]);

  const startNew = (plantId = plantF) => {
    const c = blankComm(meId, TODAY);
    const p = data.plants.find((x) => x.id === plantId);
    setForm({ ...c, plantId, contactPerson: p?.contact ?? "", contactNumber: p?.contactPhone ?? "" });
    setMkTask(false); setMkRem(false); setSaveContact(false);
  };

  const pickPlant = (id: string) => {
    if (!form) return;
    const p = data.plants.find((x) => x.id === id);
    setForm({ ...form, plantId: id, contactPerson: p?.contact ?? "", contactNumber: p?.contactPhone ?? "", ticketId: "", visitId: "", reportId: "" });
  };

  const valid = form && form.plantId && form.date && form.contactPerson.trim() && form.fmRep && form.subject.trim() && form.summary.trim();

  const submit = async () => {
    if (!form || !valid) return;
    setBusy(true);
    try {
      let c = { ...form, actions: form.actionRequired ? form.actions.filter((a) => a.text.trim()) : [] };
      const plant = data.plants.find((p) => p.id === c.plantId);
      const title = `Follow up with ${plant?.name ?? "customer"}: ${c.subject}`;
      const date = c.nextFollowUp || TODAY;
      const owner = c.followUpOwner || meId;
      if (mkTask && !c.taskId) {
        const id = addTask({ title, engineerId: owner, taskDate: date, plantId: c.plantId, taskType: "followup", description: c.summary });
        if (id) c = { ...c, taskId: id };
      }
      if (mkRem && !c.reminderId) {
        const r = { ...blankReminder(owner, date), title, plantId: c.plantId, taskId: c.taskId, description: c.summary, createdBy: meId };
        await saveReminder(r);
        c = { ...c, reminderId: r.id };
      }
      if (saveContact && plant && (plant.contact !== c.contactPerson || plant.contactPhone !== c.contactNumber)) {
        savePlant({ ...plant, contact: c.contactPerson, contactPhone: c.contactNumber });
      }
      await saveComm(c, meId);
      toast.success("Communication saved");
      setForm(null);
      setOpenId(c.id);
    } catch (e: any) {
      toast.error(e.message ?? "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const plantTickets = form ? data.tickets.filter((t) => t.plantId === form.plantId) : [];
  const plantVisits = form ? visits.filter((v) => v.plantId === form.plantId) : [];
  const plantReports = form ? data.reports.filter((r) => r.plantId === form.plantId) : [];

  return (
    <div className="mt-3">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-semibold tracking-tight">Customer Communication</h2>
          <p className="text-xs text-mute">Track customer discussions, commitments, follow-ups and communication history.</p>
        </div>
        <Button variant="solid" onClick={() => startNew()}>+ Add Communication</Button>
      </div>

      <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
        <TextInput className="min-w-0 flex-[1_1_260px]" placeholder="Search plant, customer, contact or keyword…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="hidden min-w-0 flex-wrap items-center gap-2 md:contents">
          <Select className="w-auto min-w-0 max-w-[11rem] flex-[0_1_10rem]" value={plantF} onChange={(e) => setPlantF(e.target.value)} aria-label="Plant">
            <option value="">All Plants</option>{data.plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select className="w-auto min-w-0 max-w-[9rem] flex-[0_1_9rem]" value={typeF} onChange={(e) => setTypeF(e.target.value)} aria-label="Type">
            <option value="">All Types</option>{commTypes.map((t) => <option key={t}>{t}</option>)}
          </Select>
          <Select className="hidden w-auto min-w-0 max-w-[10.5rem] flex-[0_1_10rem] lg:block" value={engF} onChange={(e) => setEngF(e.target.value)} aria-label="Engineer">
            <option value="">All Engineers</option>{team.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <Select className="hidden w-auto min-w-0 max-w-[9.5rem] flex-[0_1_9.5rem] lg:block" value={followF} onChange={(e) => setFollowF(e.target.value)} aria-label="Follow-up status">
            <option value="">Follow-up Status</option>{Object.entries(followUpLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
          <DateRange from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
        </div>
        <button onClick={() => setMoreOpen(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-signal ring-1 ring-signal/40 hover:bg-signal/10">
          <SlidersHorizontal className="size-4" /> Filters{activeCount ? ` (${activeCount})` : ""}
        </button>
      </div>
      <div className="mb-3 flex min-w-0 flex-wrap items-center gap-1">
        {([["all", "All"], ["follow", "Follow-up Required"], ["actions", "Open Actions"], ["waiting", "Waiting for Customer"], ["recent", "Recently Updated"]] as [Quick, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setQuick(k)} className={cn("rounded-full px-3 py-1 text-xs ring-1", quick === k ? "bg-signal/10 font-medium text-signal ring-signal/40" : "text-mute ring-line/80 hover:bg-black/5")}>{l}</button>
        ))}
        <button onClick={() => setNewest((n) => !n)} className="ml-auto rounded-full px-3 py-1 text-xs text-mute ring-1 ring-line/80">{newest ? "Newest First ▾" : "Oldest First ▾"}</button>
      </div>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side={isMobile ? "bottom" : "right"} className="max-h-[90vh] overflow-y-auto bg-panel">
          <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
          <div className="mt-3 grid gap-3 px-4 pb-4">
            <div className="grid gap-3 md:hidden">
              <Field label="Plant"><Select value={d.plant} onChange={(e) => setD({ ...d, plant: e.target.value })}><option value="">All Plants</option>{data.plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
              <Field label="Communication Type"><Select value={d.type} onChange={(e) => setD({ ...d, type: e.target.value })}><option value="">All Types</option>{commTypes.map((t) => <option key={t}>{t}</option>)}</Select></Field>
              <Field label="Date Range"><DateRange from={d.from} to={d.to} onChange={(f, t) => setD({ ...d, from: f, to: t })} /></Field>
            </div>
            <div className="grid gap-3 lg:hidden">
              <Field label="Customer Success Engineer"><Select value={d.eng} onChange={(e) => setD({ ...d, eng: e.target.value })}><option value="">All Engineers</option>{team.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
              <Field label="Follow-up Status"><Select value={d.follow} onChange={(e) => setD({ ...d, follow: e.target.value })}><option value="">Any</option>{Object.entries(followUpLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            </div>
            <Field label="Communication Mode"><Select value={d.mode} onChange={(e) => setD({ ...d, mode: e.target.value })}><option value="">All Modes</option>{Object.entries(commModes).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            <Field label="Branch"><Select value={d.branch} onChange={(e) => setD({ ...d, branch: e.target.value })}><option value="">All Branches</option>{br.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
            <Field label="Branch RM"><Select value={d.rm} onChange={(e) => setD({ ...d, rm: e.target.value })}><option value="">All RMs</option>{[...new Set(br.branches.map((b) => b.rmName).filter(Boolean))].map((n) => <option key={n}>{n}</option>)}</Select></Field>
            <Field label="Sales Engineer"><Select value={d.sales} onChange={(e) => setD({ ...d, sales: e.target.value })}><option value="">All Sales Engineers</option>{br.sales.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
            <Field label="Follow-up Owner"><Select value={d.owner} onChange={(e) => setD({ ...d, owner: e.target.value })}><option value="">Anyone</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            <div className="flex gap-2 pt-1">
              <Button variant="solid" className="flex-1 justify-center py-2" onClick={() => { applyDraft(d); setMoreOpen(false); }}>Apply Filters</Button>
              <Button className="flex-1 justify-center py-2" onClick={() => { applyDraft(emptyDraft); setMoreOpen(false); }}>Clear All</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="grid items-start gap-4 xl:grid-cols-[20rem_1fr]">
        <Panel title="Plants">
          <ul className="max-h-[36rem] divide-y divide-line/60 overflow-y-auto">
            <li>
              <button onClick={() => setPlantF("")} className={cn("w-full px-4 py-2 text-left text-sm", !plantF && "bg-signal/10 font-medium text-signal")}>All plants ({comms.length} records)</button>
            </li>
            {plantRows.map(({ p, list, last, open }) => (
              <li key={p.id}>
                <button onClick={() => setPlantF(p.id)} className={cn("w-full px-4 py-2 text-left", plantF === p.id && "bg-signal/10")}>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-mute">{p.customer}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-mute">
                    {last ? <><span className="num">{fmtDate(last.date)}</span><span>{last.type}</span></> : <span>No communication yet</span>}
                    {open ? <span className="text-sev-high">{open} open follow-up{open > 1 ? "s" : ""}</span> : null}
                    <span className="ml-auto num">{list.length} records</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={plantF ? `${plantName(data, plantF)} — Customer Communication History` : "Customer Communication History"} meta={`${filtered.length} records`}>
          {plantF ? (
            <div className="border-b border-line/60 px-4 py-2">
              <Button variant="outline" onClick={() => startNew(plantF)}>+ Add communication for this plant</Button>
            </div>
          ) : null}
          {filtered.length ? (
            <ol className="divide-y divide-line/60">
              {filtered.map((c) => {
                const open = openId === c.id;
                const ticket = data.tickets.find((t) => t.id === c.ticketId);
                const visit = visits.find((v) => v.id === c.visitId);
                const report = data.reports.find((r) => r.id === c.reportId);
                const task = data.tasks.find((t) => t.id === c.taskId);
                return (
                  <li key={c.id} className="px-4 py-3">
                    <button className="w-full text-left" onClick={() => setOpenId(open ? null : c.id)}>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="num font-medium">{fmtDate(c.date)}{c.time ? ` · ${c.time}` : ""}</span>
                        <span className="label-caps">{c.type}</span>
                        <span className="text-mute">{commModes[c.mode] ?? c.mode}</span>
                        <span className="ml-auto"><FollowBadge f={c.followUp} /></span>
                      </div>
                      {!plantF ? <div className="mt-1 text-xs text-mute">{plantName(data, c.plantId)}</div> : null}
                      <div className="mt-1 text-sm font-semibold">{c.subject}</div>
                      <div className="mt-0.5 text-sm text-mute line-clamp-2">{c.summary}</div>
                      <div className="mt-1 text-xs text-mute">
                        Customer: <span className="text-ink">{c.contactPerson}</span> · Forbes Marshall: <span className="text-ink">{engineerName(data, c.fmRep)}</span>
                        {c.nextFollowUp ? <> · Next follow-up <span className="num text-ink">{fmtDate(c.nextFollowUp)}</span></> : null}
                      </div>
                    </button>
                    {open ? (
                      <div className="mt-3 grid gap-3 rounded-md p-3 text-sm ring-1 ring-line/70 md:grid-cols-2">
                        <Block label="Discussion summary" v={c.summary} />
                        <Block label="Customer comments / concern" v={c.customerComments} />
                        <Block label="Forbes Marshall observation / response" v={c.fmResponse} />
                        <Block label="Customer commitment / decision" v={c.commitment} />
                        <Block label="Customer contact" v={[c.contactPerson, c.contactNumber, c.contactEmail].filter(Boolean).join(" · ")} />
                        <Block label="Participants" v={c.participants} />
                        <Block label="Follow-up owner" v={c.followUpOwner ? engineerName(data, c.followUpOwner) : ""} />
                        <Block label="Internal note" v={c.internalNote} />
                        {c.actions.length ? (
                          <div className="md:col-span-2">
                            <div className="label-caps">Action items</div>
                            <ul className="mt-1 space-y-1">
                              {c.actions.map((a, i) => (
                                <li key={i} className="flex flex-wrap gap-2 text-xs">
                                  <span className={cn("rounded px-1.5 ring-1", a.status === "open" ? "text-sev-medium ring-sev-medium/40" : a.status === "completed" ? "text-sev-low ring-sev-low/40" : "text-mute ring-line")}>{a.status}</span>
                                  <span className="text-ink">{a.text}</span>
                                  <span className="text-mute">— {a.owner}{a.due ? ` · ${fmtDate(a.due)}` : ""}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {c.attachments ? (
                          <div className="md:col-span-2">
                            <div className="label-caps">Attachments</div>
                            {c.attachments.split(/\s+/).filter(Boolean).map((u) => <a key={u} href={u} target="_blank" rel="noreferrer" className="block truncate text-xs text-signal">{u}</a>)}
                          </div>
                        ) : null}
                        {ticket || visit || report || task || c.reminderId ? (
                          <div className="flex flex-wrap gap-2 text-xs md:col-span-2">
                            {ticket ? <Link to="/discussions" search={{ tickets: true }} className="rounded-md px-2 py-1 text-signal ring-1 ring-signal/40">Ticket {ticket.ticketNo}</Link> : null}
                            {visit ? <Link to="/visits" search={{ plant: visit.plantId }} className="rounded-md px-2 py-1 text-signal ring-1 ring-signal/40">Visit {fmtDate(visit.completedDate ?? visit.plannedDate)}</Link> : null}
                            {report ? <Link to="/reports" className="rounded-md px-2 py-1 text-signal ring-1 ring-signal/40">{frequencyLabel[report.type]} report · {report.period}</Link> : null}
                            {task ? <Link to="/tasks" className="rounded-md px-2 py-1 text-signal ring-1 ring-signal/40">Task: {task.title}</Link> : null}
                            {c.reminderId ? <Link to="/tasks" className="rounded-md px-2 py-1 text-signal ring-1 ring-signal/40">Reminder set</Link> : null}
                          </div>
                        ) : null}
                        <div className="md:col-span-2">
                          <div className="label-caps">History</div>
                          <ul className="mt-1 text-[11px] text-mute">
                            {c.history.map((h, i) => <li key={i}><span className="num">{new Date(h.at).toLocaleString("en-IN")}</span> · {engineerName(data, h.by)} · {h.text}</li>)}
                          </ul>
                        </div>
                        <div className="md:col-span-2">
                          <Button variant="outline" onClick={() => { setForm({ ...c }); setMkTask(false); setMkRem(false); setSaveContact(false); }}>Edit</Button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          ) : (
            <Empty>No customer communication recorded yet.</Empty>
          )}
        </Panel>
      </div>

      <Sheet open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader><SheetTitle>{form && comms.some((c) => c.id === form.id) ? "Edit communication" : "Add Communication"}</SheetTitle></SheetHeader>
          {form ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Plant / Customer *">
                <Select value={form.plantId} onChange={(e) => pickPlant(e.target.value)}>
                  <option value="">Select plant</option>{data.plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Date *"><TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
                <Field label="Time"><TextInput type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></Field>
              </div>
              <Field label="Customer contact person *"><TextInput value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></Field>
              <Field label="Customer contact number"><TextInput type="tel" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} /></Field>
              <Field label="Customer email"><TextInput type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></Field>
              {(() => {
                const p = data.plants.find((x) => x.id === form.plantId);
                return p && (p.contact !== form.contactPerson || (p.contactPhone ?? "") !== form.contactNumber) && form.contactPerson.trim() ? (
                  <label className="flex items-center gap-2 self-end text-xs">
                    <input type="checkbox" className="accent-signal" checked={saveContact} onChange={(e) => setSaveContact(e.target.checked)} /> Save this contact to Plant
                  </label>
                ) : <span />;
              })()}
              <Field label="Forbes Marshall representative *">
                <Select value={form.fmRep} onChange={(e) => setForm({ ...form, fmRep: e.target.value })}>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
              <Field label="Additional participants"><TextInput value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} /></Field>
              <Field label="Communication mode *">
                <Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as CommMode })}>
                  {Object.entries(commModes).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </Select>
              </Field>
              <Field label="Communication type *">
                <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {commTypes.map((t) => <option key={t}>{t}</option>)}
                </Select>
              </Field>
              <div className="sm:col-span-2"><Field label="Subject / topic *"><TextInput value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field></div>
              <div className="sm:col-span-2"><Field label="Discussion summary *"><TextArea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field></div>
              <Field label="Customer comments / concern"><TextArea value={form.customerComments} onChange={(e) => setForm({ ...form, customerComments: e.target.value })} /></Field>
              <Field label="FM observation / response"><TextArea value={form.fmResponse} onChange={(e) => setForm({ ...form, fmResponse: e.target.value })} /></Field>
              <div className="sm:col-span-2"><Field label="Customer commitment / decision"><TextArea value={form.commitment} onChange={(e) => setForm({ ...form, commitment: e.target.value })} /></Field></div>

              <div className="sm:col-span-2 rounded-md p-3 ring-1 ring-line/70">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" className="accent-signal" checked={form.actionRequired}
                    onChange={(e) => setForm({ ...form, actionRequired: e.target.checked, actions: e.target.checked && !form.actions.length ? [{ text: "", owner: "", due: "", status: "open" }] : form.actions })} />
                  Action required
                </label>
                {form.actionRequired ? (
                  <div className="mt-2 space-y-2">
                    {form.actions.map((a, i) => {
                      const set = (patch: Partial<typeof a>) => setForm({ ...form, actions: form.actions.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                      return (
                        <div key={i} className="grid gap-2 rounded-md p-2 ring-1 ring-line/60 sm:grid-cols-[1fr_9rem_9rem_7rem_auto]">
                          <TextInput placeholder="Action description" value={a.text} onChange={(e) => set({ text: e.target.value })} />
                          <TextInput placeholder="Owner" value={a.owner} onChange={(e) => set({ owner: e.target.value })} />
                          <TextInput type="date" value={a.due} onChange={(e) => set({ due: e.target.value })} />
                          <Select value={a.status} onChange={(e) => set({ status: e.target.value as any })}>
                            <option value="open">Open</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                          </Select>
                          <Button variant="ghost" onClick={() => setForm({ ...form, actions: form.actions.filter((_, j) => j !== i) })}>Remove</Button>
                        </div>
                      );
                    })}
                    <Button variant="outline" onClick={() => setForm({ ...form, actions: [...form.actions, { text: "", owner: "", due: "", status: "open" }] })}>+ Add action</Button>
                  </div>
                ) : null}
              </div>

              <Field label="Follow-up status">
                <Select value={form.followUp} onChange={(e) => setForm({ ...form, followUp: e.target.value as FollowUp })}>
                  {Object.entries(followUpLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </Select>
              </Field>
              <Field label="Next follow-up date"><TextInput type="date" value={form.nextFollowUp} onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })} /></Field>
              <Field label="Follow-up owner">
                <Select value={form.followUpOwner} onChange={(e) => setForm({ ...form, followUpOwner: e.target.value })}>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
              <div className="flex flex-col justify-end gap-1 text-xs">
                <label className="flex items-center gap-2"><input type="checkbox" className="accent-signal" disabled={!!form.taskId} checked={mkTask || !!form.taskId} onChange={(e) => setMkTask(e.target.checked)} /> Create follow-up task in Daily Work</label>
                <label className="flex items-center gap-2"><input type="checkbox" className="accent-signal" disabled={!!form.reminderId} checked={mkRem || !!form.reminderId} onChange={(e) => setMkRem(e.target.checked)} /> Add reminder</label>
              </div>

              <Field label="Related ticket">
                <Select value={form.ticketId} onChange={(e) => setForm({ ...form, ticketId: e.target.value })}>
                  <option value="">None</option>{plantTickets.map((t) => <option key={t.id} value={t.id}>{t.ticketNo} · {t.subject}</option>)}
                </Select>
              </Field>
              <Field label="Related visit">
                <Select value={form.visitId} onChange={(e) => setForm({ ...form, visitId: e.target.value })}>
                  <option value="">None</option>{plantVisits.map((v) => <option key={v.id} value={v.id}>{fmtDate(v.completedDate ?? v.plannedDate)} · {v.purpose || "Visit"}</option>)}
                </Select>
              </Field>
              <Field label="Related report">
                <Select value={form.reportId} onChange={(e) => setForm({ ...form, reportId: e.target.value })}>
                  <option value="">None</option>{plantReports.map((r) => <option key={r.id} value={r.id}>{frequencyLabel[r.type]} · {r.period}</option>)}
                </Select>
              </Field>
              <Field label="Attachments" hint="Paste Drive / SharePoint links, separated by spaces."><TextInput value={form.attachments} onChange={(e) => setForm({ ...form, attachments: e.target.value })} /></Field>
              <div className="sm:col-span-2"><Field label="Internal note"><TextArea value={form.internalNote} onChange={(e) => setForm({ ...form, internalNote: e.target.value })} /></Field></div>
              <div className="flex gap-2 sm:col-span-2">
                <Button variant="solid" disabled={!valid || busy} onClick={() => void submit()}>{busy ? "Saving…" : "Save communication"}</Button>
                <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Block({ label, v }: { label: string; v: string }) {
  if (!v) return null;
  return (
    <div>
      <div className="label-caps">{label}</div>
      <div className="mt-0.5 whitespace-pre-wrap">{v}</div>
    </div>
  );
}
