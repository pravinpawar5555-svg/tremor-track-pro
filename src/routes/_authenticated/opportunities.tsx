import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/console/AppShell";
import { Button, Empty, Field, PageHeader, Panel, Select, TextArea, TextInput } from "@/components/console/ui";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useDomain } from "@/lib/domain";
import { TODAY, analystsOf, daysBetween, engineerName, fmtDate, useData, type AppData } from "@/lib/store";
import { ownershipOf, useBranches } from "@/lib/branches";
import { blankJob, execStatusLabel, saveJob, useExecution, type ExecInstallType } from "@/lib/execution";
import { blankReminder, saveReminder } from "@/lib/dailywork";
import {
  blankOpp, isOpen, leadSources, logOpp, lostReasons, oppTypes, pipelineCols, saveOpp, stageTone, stages, useOpps,
  type Opp, type Stage,
} from "@/lib/opportunities";

type Tab = "overview" | "leads" | "pipeline" | "handover";

export const Route = createFileRoute("/_authenticated/opportunities")({
  head: () => ({
    meta: [
      { title: "Leads & Opportunities — Forbes Marshall CM Work Portal" },
      { name: "description", content: "Track leads from enquiry to order, execution handover and Customer Success." },
      { property: "og:title", content: "Leads & Opportunities — Forbes Marshall CM Work Portal" },
      { property: "og:description", content: "Lightweight opportunity tracker connected to Execution and Customer Success." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { tab?: Tab | undefined; plant?: string | undefined; focus?: string | undefined } => ({
    tab: ["overview", "leads", "pipeline", "handover"].includes(String(s["tab"])) ? (s["tab"] as Tab) : undefined,
    plant: typeof s["plant"] === "string" ? s["plant"] : undefined,
    focus: typeof s["focus"] === "string" ? s["focus"] : undefined,
  }),
  component: OpportunitiesPage,
});

const Pill = ({ s }: { s: Stage }) => <span className={cn("inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", stageTone(s))}>{stages[s]}</span>;

function useAuthId() {
  const [id, setId] = useState("");
  useEffect(() => { void supabase.auth.getUser().then(({ data }) => setId(data.user?.id ?? "")); }, []);
  return id;
}

const followDue = (o: Opp) => isOpen(o) && !!o.nextActionDate && o.nextActionDate <= TODAY;

/* ====================================================================== page */
function OpportunitiesPage() {
  const data = useData();
  const domain = useDomain();
  const manager = domain === "manager";
  const exec = domain === "execution";
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { opps, activity } = useOpps();
  const br = useBranches();
  const authId = useAuthId();
  const myName = engineerName(data, data.currentUserId) || (manager ? "Manager" : "User");
  const tab: Tab = manager ? (search.tab ?? "overview") : "leads";
  const [edit, setEdit] = useState<Opp | null>(null);
  const [openId, setOpenId] = useState<string | null>(search.focus ?? null);

  useEffect(() => {
    if (search.plant && authId) {
      const p = data.plants.find((x) => x.id === search.plant);
      const o = blankOpp(authId);
      if (p) Object.assign(o, { plantId: p.id, customerName: p.customer, plantName: p.name, location: p.location, branchId: p.branchId ?? "", salesEngineerId: p.salesEngineerId ?? "", contactName: p.contact, contactMobile: p.contactPhone });
      if (domain === "customer_success") Object.assign(o, { leadSource: "Customer Success", type: "Expansion" });
      if (exec) Object.assign(o, { leadSource: "Execution Team", type: "Expansion" });
      setEdit(o);
      void navigate({ search: { tab: search.tab }, replace: true });
    }
  }, [search.plant, authId]); // eslint-disable-line react-hooks/exhaustive-deps

  const newLead = () => {
    const o = blankOpp(authId);
    if (domain === "customer_success") Object.assign(o, { leadSource: "Customer Success", type: "Expansion" });
    if (exec) Object.assign(o, { leadSource: "Execution Team", type: "Expansion" });
    setEdit(o);
  };
  const open = opps.find((o) => o.id === openId) ?? null;
  const ctx = { data, br, manager, exec, myName, authId };

  return (
    <AppShell>
      <PageHeader
        title="Leads & Opportunities"
        subtitle={manager ? "Lead → Opportunity → Demo / Order → Execution → Customer Success" : exec ? "Suggest opportunities you spot at site" : "Raise opportunities from your customers"}
        actions={<Button variant="solid" onClick={newLead} disabled={!authId}><Plus className="size-3.5" />{exec ? "Suggest Opportunity" : "New Lead"}</Button>}
      />
      {manager ? (
        <div className="mb-4 inline-flex overflow-hidden rounded-md ring-1 ring-line">
          {(["overview", "leads", "pipeline", "handover"] as Tab[]).map((t) => (
            <button key={t} type="button" onClick={() => void navigate({ search: { tab: t } })} className={cn("px-3 py-1.5 text-xs font-medium capitalize", tab === t ? "bg-signal text-signal-foreground" : "bg-panel text-mute hover:bg-base")}>{t}</button>
          ))}
        </div>
      ) : null}

      {tab === "overview" ? <Overview opps={opps} onOpen={setOpenId} go={(t) => void navigate({ search: { tab: t } })} />
        : tab === "pipeline" ? <Pipeline ctx={ctx} opps={opps} onOpen={setOpenId} />
        : tab === "handover" ? <Handover ctx={ctx} opps={opps} onOpen={setOpenId} />
        : <Leads ctx={ctx} opps={opps} onOpen={setOpenId} />}

      <Sheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader><SheetTitle>{edit && opps.some((o) => o.id === edit.id) ? `Edit ${edit.number}` : exec ? "Suggest Opportunity" : "New Lead"}</SheetTitle></SheetHeader>
          {edit ? <OppForm ctx={ctx} initial={edit} opps={opps} onOpenExisting={(id) => { setEdit(null); setOpenId(id); }} onDone={(o) => { setEdit(null); setOpenId(o.id); }} /> : null}
        </SheetContent>
      </Sheet>
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          {open ? <Detail ctx={ctx} o={open} activity={activity.filter((a) => a.oppId === open.id)} onEdit={() => setEdit(open)} /> : null}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

type Ctx = { data: AppData; br: ReturnType<typeof useBranches>; manager: boolean; exec: boolean; myName: string; authId: string };
const branchName = (ctx: Ctx, id: string) => ctx.br.branches.find((b) => b.id === id)?.name ?? "—";
const salesName = (ctx: Ctx, id: string) => ctx.br.sales.find((s) => s.id === id)?.name ?? "—";
const custLine = (o: Opp) => [o.customerName, o.plantName].filter(Boolean).join(" · ") || "—";

/* ====================================================================== overview */
function Overview({ opps, onOpen, go }: { opps: Opp[]; onOpen: (id: string) => void; go: (t: Tab) => void }) {
  const live = opps.filter((o) => !o.archived);
  const cnt = (f: (o: Opp) => boolean) => live.filter(f).length;
  const cards: [string, number][] = [
    ["New Leads", cnt((o) => o.stage === "new" || o.stage === "contacted")],
    ["Follow-up Due", cnt(followDue)],
    ["Qualified", cnt((o) => o.stage === "qualified")],
    ["Demo Planned", cnt((o) => o.stage.startsWith("demo"))],
    ["Proposal / Commercial", cnt((o) => o.stage === "proposal")],
    ["Order Won", cnt((o) => o.stage === "order_won")],
    ["Handover Pending", cnt((o) => (o.stage === "order_won" && !o.jobId) || o.stage === "cs_handover")],
  ];
  const att: { o: Opp; why: string }[] = [];
  for (const o of live) {
    if (!isOpen(o)) continue;
    if (o.nextActionDate && o.nextActionDate < TODAY) att.push({ o, why: `Follow-up overdue since ${fmtDate(o.nextActionDate)}` });
    else if (o.stage === "demo_completed" && daysBetween(o.updatedAt.slice(0, 10), TODAY) > 3) att.push({ o, why: "Demo completed — commercial status not updated" });
    else if (o.stage === "order_won" && !o.jobId) att.push({ o, why: "Order Won but not handed to Execution" });
    else if (o.stage === "cs_handover") att.push({ o, why: "Execution completed — CS handover pending" });
    else if (o.stage === "on_hold" && daysBetween(o.updatedAt.slice(0, 10), TODAY) > 14) att.push({ o, why: "On Hold for more than 14 days" });
    else if (!o.nextAction) att.push({ o, why: "No next action set" });
  }
  const recent = [...live].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 6);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {cards.map(([l, v]) => (
          <button key={l} type="button" onClick={() => go("leads")} className="panel-glass p-3 text-left hover:ring-1 hover:ring-signal/40">
            <div className="label-caps">{l}</div><div className={cn("num mt-1 text-2xl font-semibold", v ? "text-signal" : "text-mute")}>{v}</div>
          </button>
        ))}
      </div>
      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Panel title="Needs Attention" meta={<span>{att.length}</span>}>
          <div className="divide-y divide-line/60">
            {att.slice(0, 10).map(({ o, why }) => (
              <button key={o.id} type="button" onClick={() => onOpen(o.id)} className="flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-black/[0.03]">
                <div className="min-w-0"><div className="font-medium">{custLine(o)}</div><div className="text-xs text-mute">{o.number} · {why}</div></div>
                <Pill s={o.stage} />
              </button>
            ))}
            {!att.length ? <Empty>Nothing needs attention.</Empty> : null}
          </div>
        </Panel>
        <Panel title="Recently Updated">
          <div className="divide-y divide-line/60">
            {recent.map((o) => (
              <button key={o.id} type="button" onClick={() => onOpen(o.id)} className="flex w-full items-start justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-black/[0.03]">
                <div className="min-w-0"><div className="truncate font-medium">{custLine(o)}</div><div className="text-xs text-mute">{o.number} · {o.type}</div></div>
                <span className="num shrink-0 text-xs text-mute">{fmtDate(o.updatedAt.slice(0, 10))}</span>
              </button>
            ))}
            {!recent.length ? <Empty>No opportunities yet — click New Lead.</Empty> : null}
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ====================================================================== leads */
const quick: { id: string; l: string; f: (o: Opp) => boolean }[] = [
  { id: "all", l: "All", f: (o) => !o.archived },
  { id: "new", l: "New", f: (o) => o.stage === "new" || o.stage === "contacted" },
  { id: "due", l: "Follow-up Due", f: followDue },
  { id: "qualified", l: "Qualified", f: (o) => o.stage === "qualified" },
  { id: "demo", l: "Demo", f: (o) => o.stage.startsWith("demo") },
  { id: "proposal", l: "Proposal", f: (o) => o.stage === "proposal" },
  { id: "won", l: "Order Won", f: (o) => ["order_won", "handed_exec", "exec_progress", "exec_completed", "cs_handover", "cs_active"].includes(o.stage) },
  { id: "hold", l: "On Hold", f: (o) => o.stage === "on_hold" },
  { id: "lost", l: "Lost", f: (o) => o.stage === "lost" || o.stage === "not_qualified" },
  { id: "archived", l: "Archived", f: (o) => o.archived },
];

function useFilters(ctx: Ctx, opps: Opp[]) {
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("");
  const [kam, setKam] = useState("");
  const [sales, setSales] = useState("");
  const [type, setType] = useState("");
  const [source, setSource] = useState("");
  const list = opps.filter((o) => {
    const own = ownershipOf(ctx.br, { branchId: o.branchId, salesEngineerId: o.salesEngineerId });
    if (branch && o.branchId !== branch) return false;
    if (kam && own.kam?.id !== kam) return false;
    if (sales && o.salesEngineerId !== sales) return false;
    if (type && o.type !== type) return false;
    if (source && o.leadSource !== source) return false;
    if (!q) return true;
    const hay = [o.number, o.customerName, o.plantName, o.contactName, o.contactMobile, own.branch?.name, own.branch?.rmName, own.kam?.name, own.sales?.name, o.requirement, o.jobId].join(" ").toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  const bar = (
    <div className="mb-3 flex flex-wrap gap-2">
      <TextInput className="w-64" placeholder="Search number, customer, plant, contact, branch…" value={q} onChange={(e) => setQ(e.target.value)} />
      {ctx.manager ? (
        <>
          <Select className="w-40" value={kam} onChange={(e) => setKam(e.target.value)}><option value="">All KAMs</option>{ctx.br.kams.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</Select>
          <Select className="w-40" value={branch} onChange={(e) => setBranch(e.target.value)}><option value="">All branches</option>{ctx.br.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>
          <Select className="w-44" value={sales} onChange={(e) => setSales(e.target.value)}><option value="">All Sales Engineers</option>{ctx.br.sales.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
          <Select className="w-40" value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option>{oppTypes.map((t) => <option key={t}>{t}</option>)}</Select>
          <Select className="w-40" value={source} onChange={(e) => setSource(e.target.value)}><option value="">All sources</option>{leadSources.map((t) => <option key={t}>{t}</option>)}</Select>
        </>
      ) : null}
    </div>
  );
  return { list, bar };
}

function Leads({ ctx, opps, onOpen }: { ctx: Ctx; opps: Opp[]; onOpen: (id: string) => void }) {
  const [qt, setQt] = useState("all");
  const { list, bar } = useFilters(ctx, opps);
  const f = quick.find((x) => x.id === qt)!;
  const shown = list.filter(f.f);
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {quick.map((x) => (
          <button key={x.id} type="button" onClick={() => setQt(x.id)} className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium ring-1", qt === x.id ? "bg-signal text-signal-foreground ring-signal" : "text-mute ring-line hover:bg-base")}>
            {x.l} <span className="num opacity-70">({list.filter(x.f).length})</span>
          </button>
        ))}
      </div>
      {bar}
      <Panel>
        <div className="hidden grid-cols-[1.6fr_0.8fr_0.8fr_0.9fr_1fr_1.2fr_0.7fr] gap-3 border-b border-line/60 px-4 py-2 text-[11px] text-mute lg:grid">
          <span>Customer / Plant</span><span>Type</span><span>Branch</span><span>Sales Engineer</span><span>Stage</span><span>Next Action</span><span>Created</span>
        </div>
        <div className="divide-y divide-line/60">
          {shown.map((o) => (
            <button key={o.id} type="button" onClick={() => onOpen(o.id)} className="grid w-full gap-1 px-4 py-2.5 text-left text-sm hover:bg-black/[0.03] lg:grid-cols-[1.6fr_0.8fr_0.8fr_0.9fr_1fr_1.2fr_0.7fr] lg:items-center lg:gap-3">
              <span className="min-w-0"><span className="block truncate font-medium">{custLine(o)}</span><span className="num block text-[11px] text-mute">{o.number}{o.priority === "high" ? " · High priority" : ""}</span></span>
              <span className="text-xs">{o.type}</span>
              <span className="text-xs text-mute">{branchName(ctx, o.branchId)}</span>
              <span className="text-xs text-mute">{salesName(ctx, o.salesEngineerId)}</span>
              <span><Pill s={o.stage} /></span>
              <span className="text-xs"><span className="block truncate">{o.nextAction || "—"}</span>{o.nextActionDate ? <span className={cn("num", o.nextActionDate < TODAY ? "text-sev-critical" : "text-mute")}>{fmtDate(o.nextActionDate)}</span> : null}</span>
              <span className="num text-xs text-mute">{fmtDate(o.createdAt.slice(0, 10))}</span>
            </button>
          ))}
          {!shown.length ? <Empty>No opportunities here.</Empty> : null}
        </div>
      </Panel>
    </>
  );
}

/* ====================================================================== pipeline */
function Pipeline({ ctx, opps, onOpen }: { ctx: Ctx; opps: Opp[]; onOpen: (id: string) => void }) {
  const { list, bar } = useFilters(ctx, opps.filter((o) => !o.archived));
  return (
    <>
      {bar}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {pipelineCols.map((c) => {
          const items = list.filter((o) => c.stages.includes(o.stage));
          return (
            <div key={c.id} className="rounded-lg bg-base p-2 ring-1 ring-line/60">
              <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold"><span>{c.label}</span><span className="num text-mute">{items.length}</span></div>
              <div className="grid gap-1.5">
                {items.map((o) => (
                  <button key={o.id} type="button" onClick={() => onOpen(o.id)} className="rounded-md bg-panel px-2.5 py-2 text-left text-xs ring-1 ring-line/60 hover:ring-signal/40">
                    <div className="truncate text-sm font-medium">{o.customerName || "—"}</div>
                    {o.plantName ? <div className="truncate text-mute">{o.plantName}</div> : null}
                    <div className="text-mute">{o.type} · {branchName(ctx, o.branchId)} · {salesName(ctx, o.salesEngineerId)}</div>
                    {o.nextAction ? <div className={cn("mt-0.5", o.nextActionDate && o.nextActionDate < TODAY ? "text-sev-critical" : "")}>{o.nextAction}{o.nextActionDate ? ` · ${fmtDate(o.nextActionDate)}` : ""}</div> : null}
                  </button>
                ))}
                {!items.length ? <div className="px-1 py-2 text-[11px] text-mute">None</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ====================================================================== handover */
function Handover({ ctx, opps, onOpen }: { ctx: Ctx; opps: Opp[]; onOpen: (id: string) => void }) {
  const ex = useExecution();
  const groups: [string, Opp[]][] = [
    ["Ready for Execution handover", opps.filter((o) => !o.archived && !o.jobId && (o.stage === "order_won" || o.stage === "demo_planned" || (o.type === "Troubleshooting" && o.stage === "qualified")))],
    ["With Execution", opps.filter((o) => !!o.jobId && ["demo_planned", "demo_progress", "handed_exec", "exec_progress"].includes(o.stage))],
    ["Customer Success handover pending", opps.filter((o) => o.stage === "cs_handover" || o.stage === "exec_completed")],
    ["Recently handed to Customer Success", opps.filter((o) => o.stage === "cs_active").slice(0, 5)],
  ];
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {groups.map(([t, list]) => (
        <Panel key={t} title={t} meta={<span>{list.length}</span>}>
          <div className="divide-y divide-line/60">
            {list.map((o) => {
              const j = ex.jobs.find((x) => x.id === o.jobId);
              return (
                <button key={o.id} type="button" onClick={() => onOpen(o.id)} className="flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-black/[0.03]">
                  <div className="min-w-0"><div className="font-medium">{custLine(o)}</div><div className="text-xs text-mute">{o.number} · {o.type}{j ? ` · Job: ${execStatusLabel[j.status]}` : ""}{o.csEngineerId ? ` · CS: ${engineerName(ctx.data, o.csEngineerId)}` : ""}</div></div>
                  <Pill s={o.stage} />
                </button>
              );
            })}
            {!list.length ? <Empty>None.</Empty> : null}
          </div>
        </Panel>
      ))}
    </div>
  );
}

/* ====================================================================== form */
function OppForm({ ctx, initial, opps, onDone, onOpenExisting }: { ctx: Ctx; initial: Opp; opps: Opp[]; onDone: (o: Opp) => void; onOpenExisting: (id: string) => void }) {
  const [o, setO] = useState<Opp>(initial);
  const [existingPlant, setExistingPlant] = useState(!!initial.plantId || ctx.exec);
  const [busy, setBusy] = useState(false);
  const [dupOk, setDupOk] = useState(false);
  const set = (p: Partial<Opp>) => setO((x) => ({ ...x, ...p }));
  const isEdit = opps.some((x) => x.id === o.id);
  const prev = opps.find((x) => x.id === o.id);
  const own = ownershipOf(ctx.br, { branchId: o.branchId, salesEngineerId: o.salesEngineerId });
  const salesOpts = ctx.br.sales.filter((s) => s.status === "active" && (!o.branchId || s.branchId === o.branchId || s.id === o.salesEngineerId));
  const dups = useMemo(() => isEdit ? [] : opps.filter((x) => isOpen(x) && ((o.plantId && x.plantId === o.plantId) || (!!o.customerName && x.customerName.trim().toLowerCase() === o.customerName.trim().toLowerCase() && x.plantName.trim().toLowerCase() === o.plantName.trim().toLowerCase()))), [o.plantId, o.customerName, o.plantName, opps, isEdit]);

  const pickPlant = (id: string) => {
    const p = ctx.data.plants.find((x) => x.id === id);
    if (!p) return set({ plantId: "" });
    set({ plantId: p.id, customerName: p.customer, plantName: p.name, location: p.location, branchId: p.branchId ?? o.branchId, salesEngineerId: p.salesEngineerId ?? o.salesEngineerId, contactName: o.contactName || p.contact, contactMobile: o.contactMobile || p.contactPhone });
  };

  const submit = async () => {
    if (!o.customerName.trim()) return toast.error("Customer name is required");
    if (!o.requirement.trim()) return toast.error(ctx.exec ? "Describe the opportunity you observed" : "Requirement / summary is required");
    if (ctx.manager && !o.branchId) return toast.error("Branch is required");
    if (ctx.manager && !o.salesEngineerId) return toast.error("Sales Engineer / lead owner is required");
    if (dups.length && !dupOk) return toast.error("An open opportunity already exists for this plant — open it or tick 'Create new anyway'");
    setBusy(true);
    try {
      const saved = await saveOpp(o, prev, ctx.authId, ctx.myName);
      toast.success(isEdit ? "Opportunity updated" : `${saved.number} created${ctx.manager ? "" : " — sent to Sales / Manager"}`);
      onDone(saved);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-3 p-4">
      {!ctx.exec ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Lead source *"><Select value={o.leadSource} onChange={(e) => set({ leadSource: e.target.value })}>{leadSources.map((s) => <option key={s}>{s}</option>)}</Select></Field>
          <Field label="Opportunity type *"><Select value={o.type} onChange={(e) => set({ type: e.target.value })}>{oppTypes.map((s) => <option key={s}>{s}</option>)}</Select></Field>
          {o.leadSource === "Other" ? <div className="col-span-2"><Field label="Source description"><TextInput value={o.leadSourceOther} onChange={(e) => set({ leadSourceOther: e.target.value })} /></Field></div> : null}
        </div>
      ) : null}

      {!ctx.exec ? (
        <div className="flex gap-2 text-xs">
          {[true, false].map((v) => <button key={String(v)} type="button" onClick={() => setExistingPlant(v)} className={cn("rounded-md px-3 py-1.5 ring-1", existingPlant === v ? "bg-signal text-signal-foreground ring-signal" : "ring-line text-mute")}>{v ? "Existing plant" : "New customer / plant"}</button>)}
        </div>
      ) : null}
      {existingPlant ? (
        <Field label="Plant"><Select value={o.plantId} onChange={(e) => pickPlant(e.target.value)}><option value="">Select plant…</option>{[...ctx.data.plants].sort((a, b) => a.name.localeCompare(b.name)).map((p) => <option key={p.id} value={p.id}>{p.name} — {p.customer}</option>)}</Select></Field>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Customer name *"><TextInput value={o.customerName} onChange={(e) => set({ customerName: e.target.value })} /></Field>
        <Field label="Plant / site"><TextInput value={o.plantName} onChange={(e) => set({ plantName: e.target.value })} /></Field>
        <Field label="Location"><TextInput value={o.location} onChange={(e) => set({ location: e.target.value })} /></Field>
        {!ctx.exec ? <Field label="Priority"><Select value={o.priority} onChange={(e) => set({ priority: e.target.value as Opp["priority"] })}><option value="normal">Normal</option><option value="high">High</option></Select></Field> : null}
      </div>

      {dups.length ? (
        <div className="rounded-md bg-sev-medium/10 p-3 text-xs ring-1 ring-sev-medium/30">
          <div className="font-medium">An open opportunity already exists for this plant.</div>
          {dups.slice(0, 3).map((d) => <button key={d.id} type="button" onClick={() => onOpenExisting(d.id)} className="mt-1 block text-signal underline">{d.number} · {d.type} · {stages[d.stage]}</button>)}
          <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={dupOk} onChange={(e) => setDupOk(e.target.checked)} />Create new anyway</label>
        </div>
      ) : null}

      {!ctx.exec ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Branch${ctx.manager ? " *" : ""}`}><Select value={o.branchId} onChange={(e) => set({ branchId: e.target.value })}><option value="">Select…</option>{ctx.br.branches.filter((b) => b.status === "active" || b.id === o.branchId).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
          <Field label={`Sales Engineer / owner${ctx.manager ? " *" : ""}`}><Select value={o.salesEngineerId} onChange={(e) => set({ salesEngineerId: e.target.value })}><option value="">Select…</option>{salesOpts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <div className="col-span-2 text-[11px] text-mute">HO KAM: {own.kam?.name ?? "—"} · Branch RM: {own.branch?.rmName || "—"}{own.branch?.rmContact ? ` (${own.branch.rmContact})` : ""}</div>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-3">
        <Field label="Contact person"><TextInput value={o.contactName} onChange={(e) => set({ contactName: e.target.value })} /></Field>
        <Field label="Contact number"><TextInput value={o.contactMobile} onChange={(e) => set({ contactMobile: e.target.value })} /></Field>
        {!ctx.exec ? <Field label="Email"><TextInput value={o.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} /></Field> : null}
      </div>
      <Field label={ctx.exec ? "Opportunity observation / potential requirement *" : "Requirement / opportunity summary *"}><TextArea value={o.requirement} onChange={(e) => set({ requirement: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="Expected sensors"><TextInput type="number" min={0} value={o.sensors || ""} onChange={(e) => set({ sensors: Number(e.target.value) || 0 })} /></Field>
        <Field label="Expected machines"><TextInput type="number" min={0} value={o.machines || ""} onChange={(e) => set({ machines: Number(e.target.value) || 0 })} /></Field>
        {!ctx.exec ? <Field label="Next action date"><TextInput type="date" value={o.nextActionDate} onChange={(e) => set({ nextActionDate: e.target.value })} /></Field> : null}
        {!ctx.exec ? <Field label="Expected demo / execution"><TextInput type="date" value={o.expectedDate} onChange={(e) => set({ expectedDate: e.target.value })} /></Field> : null}
      </div>
      {!ctx.exec ? <Field label="Next action"><TextInput placeholder="e.g. Call customer, Send proposal" value={o.nextAction} onChange={(e) => set({ nextAction: e.target.value })} /></Field> : null}
      {ctx.manager ? <Field label="Estimated value (₹, optional — manager only)"><TextInput type="number" min={0} value={o.value ?? ""} onChange={(e) => set({ value: e.target.value === "" ? null : Number(e.target.value) })} /></Field> : null}
      <Field label={ctx.exec ? "Customer comments" : "Notes"}><TextArea className="min-h-14" value={o.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
      {!ctx.exec ? <Field label="Attachment links" hint="Paste links to documents (one per line)"><TextArea className="min-h-14" value={o.attachments} onChange={(e) => set({ attachments: e.target.value })} /></Field> : null}
      <div className="flex justify-end gap-2"><Button variant="solid" onClick={() => void submit()} disabled={busy}>{busy ? "Saving…" : isEdit ? "Save changes" : ctx.exec ? "Send suggestion" : "Create lead"}</Button></div>
    </div>
  );
}

/* ====================================================================== detail */
function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-lg ring-1 ring-line/70">
      <div className="flex items-center justify-between border-b border-line/60 px-3 py-2"><h3 className="text-xs font-semibold uppercase tracking-wide text-mute">{title}</h3>{action}</div>
      <div className="grid gap-1 px-3 py-2 text-sm">{children}</div>
    </section>
  );
}
const KV = ({ k, v }: { k: string; v: ReactNode }) => <div className="flex justify-between gap-3"><span className="text-xs text-mute">{k}</span><span className="text-right text-xs">{v || "—"}</span></div>;

function Detail({ ctx, o, activity, onEdit }: { ctx: Ctx; o: Opp; activity: { id: string; text: string; byUser: string; createdAt: string; kind: string }[]; onEdit: () => void }) {
  const ex = useExecution();
  const job = ex.jobs.find((j) => j.id === o.jobId);
  const own = ownershipOf(ctx.br, { branchId: o.branchId, salesEngineerId: o.salesEngineerId });
  const [stage, setStage] = useState<Stage>(o.stage);
  const [reason, setReason] = useState(o.stage === "lost" ? o.lostReason : o.holdReason);
  const [remark, setRemark] = useState(o.lostRemark);
  const [review, setReview] = useState(o.holdReviewDate);
  const [na, setNa] = useState({ text: o.nextAction, date: o.nextActionDate, owner: o.nextActionOwner });
  const [comment, setComment] = useState("");
  const [hand, setHand] = useState<"exec" | "cs" | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setStage(o.stage); setNa({ text: o.nextAction, date: o.nextActionDate, owner: o.nextActionOwner }); }, [o.id, o.stage, o.nextAction, o.nextActionDate, o.nextActionOwner]);

  const people = [...ctx.data.engineers];
  const save = async (p: Partial<Opp>, msg: string) => {
    setBusy(true);
    try { await saveOpp({ ...o, ...p }, o, ctx.authId, ctx.myName); toast.success(msg); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not save"); }
    finally { setBusy(false); }
  };
  const applyStage = () => {
    if (stage === "lost" && !reason) return toast.error("Choose a lost reason");
    if (stage === "on_hold" && !reason) return toast.error("Enter a hold reason");
    void save({ stage, ...(stage === "lost" ? { lostReason: reason, lostRemark: remark } : {}), ...(stage === "on_hold" ? { holdReason: reason, holdReviewDate: review } : {}) }, `Stage set to ${stages[stage]}`);
  };
  const addReminder = async () => {
    if (!na.text || !na.date) return toast.error("Set next action and date first");
    const r = blankReminder(na.owner || ctx.data.currentUserId, na.date);
    await saveReminder({ ...r, title: `${o.number}: ${na.text}`, description: custLine(o), plantId: o.plantId, createdBy: ctx.data.currentUserId });
    await logOpp(o.id, `Reminder added for ${fmtDate(na.date)}`, ctx.myName);
    toast.success("Reminder added to Daily Work");
  };

  const canHandExec = ctx.manager && !o.jobId && !["lost", "not_qualified", "cs_active"].includes(o.stage);
  const canHandCs = ctx.manager && (o.stage === "cs_handover" || o.stage === "exec_completed" || (job?.status === "completed" && o.type !== "Demo" && o.stage !== "cs_active"));

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex flex-wrap items-center gap-2">{custLine(o)} <Pill s={o.stage} /></SheetTitle>
        <div className="text-xs text-mute">{o.number} · {o.type} · {o.priority === "high" ? "High priority · " : ""}{salesName(ctx, o.salesEngineerId)} · {branchName(ctx, o.branchId)}</div>
      </SheetHeader>
      <div className="grid gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          {ctx.manager ? <Button onClick={onEdit}>Edit</Button> : null}
          {canHandExec ? <Button variant="solid" onClick={() => setHand("exec")}>{o.type === "Demo" ? "Create Demo Execution Job" : "Create Execution Handover"}</Button> : null}
          {canHandCs ? <Button variant="solid" onClick={() => setHand("cs")}>Customer Success Handover</Button> : null}
          {ctx.manager ? <Button variant="ghost" onClick={() => void save({ archived: !o.archived }, o.archived ? "Restored" : "Archived")}>{o.archived ? "Restore" : "Archive"}</Button> : null}
        </div>

        {hand === "exec" ? <ExecHandoverForm ctx={ctx} o={o} onClose={() => setHand(null)} /> : null}
        {hand === "cs" ? <CsHandoverForm ctx={ctx} o={o} onClose={() => setHand(null)} /> : null}

        {ctx.manager ? (
          <Card title="Stage">
            <div className="flex flex-wrap gap-2">
              <Select className="w-56" value={stage} onChange={(e) => { setStage(e.target.value as Stage); setReason(""); }}>{(Object.keys(stages) as Stage[]).map((s) => <option key={s} value={s}>{stages[s]}</option>)}</Select>
              <Button variant="solid" onClick={applyStage} disabled={busy || stage === o.stage}>Update stage</Button>
            </div>
            {stage === "lost" ? <div className="grid grid-cols-2 gap-2"><Select value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Lost reason *</option>{lostReasons.map((r) => <option key={r}>{r}</option>)}</Select><TextInput placeholder="Remark (optional)" value={remark} onChange={(e) => setRemark(e.target.value)} /></div> : null}
            {stage === "on_hold" ? <div className="grid grid-cols-2 gap-2"><TextInput placeholder="Hold reason *" value={reason} onChange={(e) => setReason(e.target.value)} /><TextInput type="date" value={review} onChange={(e) => setReview(e.target.value)} /></div> : null}
            {o.stage === "lost" ? <KV k="Lost reason" v={`${o.lostReason}${o.lostRemark ? ` — ${o.lostRemark}` : ""}`} /> : null}
            {o.stage === "on_hold" ? <KV k="On hold" v={`${o.holdReason}${o.holdReviewDate ? ` · review ${fmtDate(o.holdReviewDate)}` : ""}`} /> : null}
          </Card>
        ) : null}

        {ctx.manager ? (
          <Card title="Next Action" action={<button type="button" className="text-xs text-signal" onClick={() => void addReminder()}>+ Add Reminder</button>}>
            <div className="grid gap-2 md:grid-cols-[1.5fr_1fr_1fr_auto]">
              <TextInput placeholder="Next action" value={na.text} onChange={(e) => setNa({ ...na, text: e.target.value })} />
              <Select value={na.owner} onChange={(e) => setNa({ ...na, owner: e.target.value })}><option value="">Owner (me)</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
              <TextInput type="date" value={na.date} onChange={(e) => setNa({ ...na, date: e.target.value })} />
              <Button onClick={() => void save({ nextAction: na.text, nextActionDate: na.date, nextActionOwner: na.owner }, "Next action saved")} disabled={busy}>Save</Button>
            </div>
          </Card>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <Card title="Customer">
            <KV k="Customer" v={o.customerName} /><KV k="Plant" v={o.plantName} /><KV k="Location" v={o.location} />
            <KV k="Contact" v={o.contactName} /><KV k="Mobile" v={o.contactMobile ? <a className="text-signal" href={`tel:${o.contactMobile}`}>{o.contactMobile}</a> : ""} /><KV k="Email" v={o.contactEmail} />
            {o.plantId ? <Link to="/plants" className="text-xs text-signal">Open plant →</Link> : null}
          </Card>
          {!ctx.exec ? (
            <Card title="Commercial ownership">
              <KV k="Branch" v={own.branch?.name} /><KV k="HO Division KAM" v={own.kam?.name} /><KV k="Branch RM" v={own.branch?.rmName} />
              <KV k="RM contact" v={own.branch?.rmContact} /><KV k="Sales Engineer" v={own.sales?.name} /><KV k="Lead source" v={o.leadSource === "Other" ? `Other — ${o.leadSourceOther}` : o.leadSource} />
              {ctx.manager && o.value !== null ? <KV k="Estimated value" v={`₹ ${o.value.toLocaleString("en-IN")}`} /> : null}
            </Card>
          ) : null}
        </div>

        <Card title="Requirement">
          <div className="whitespace-pre-wrap text-sm">{o.requirement}</div>
          <KV k="Expected sensors / machines" v={`${o.sensors || 0} / ${o.machines || 0}`} />
          <KV k="Expected demo / execution" v={o.expectedDate ? fmtDate(o.expectedDate) : ""} />
          {o.notes ? <div className="mt-1 text-xs text-mute">{o.notes}</div> : null}
          {o.attachments ? <div className="mt-1 grid gap-0.5">{o.attachments.split(/\s+/).filter((u) => /^https?:\/\//.test(u)).map((u) => <a key={u} href={u} target="_blank" rel="noreferrer" className="truncate text-xs text-signal">{u}</a>)}</div> : null}
        </Card>

        {job ? (
          <Card title={o.type === "Demo" ? "Demo Execution" : "Execution"} action={ctx.manager ? <Link to="/execution" className="text-xs text-signal">View Execution →</Link> : null}>
            <KV k="Status" v={execStatusLabel[job.status]} />
            <KV k="Engineer" v={ex.engineers.find((e) => e.id === job.assignedEngineerId)?.name} />
            <KV k="Planned" v={job.plannedStart ? `${fmtDate(job.plannedStart)}${job.plannedEnd ? ` – ${fmtDate(job.plannedEnd)}` : ""}` : job.expectedDate ? fmtDate(job.expectedDate) : ""} />
            {job.status === "completed" || job.actualStart ? (
              <>
                <KV k="Actual dates" v={job.actualStart ? `${fmtDate(job.actualStart)}${job.actualEnd ? ` – ${fmtDate(job.actualEnd)}` : ""}` : ""} />
                <KV k="Sensors / machines" v={`${job.sensorsInstalled} / ${job.machinesCovered}`} />
                <KV k="Kickoff · Config · AIP" v={`${job.kickoff} · ${job.configuration} · ${job.aip}`} />
                <KV k="Report" v={job.reportLink ? <a href={job.reportLink} target="_blank" rel="noreferrer" className="text-signal">Open</a> : ""} />
                {job.comments ? <div className="text-xs text-mute">{job.comments}</div> : null}
              </>
            ) : null}
          </Card>
        ) : o.execHandover.status ? <Card title="Execution handover"><KV k="Status" v={o.execHandover.status} /></Card> : null}

        {o.csHandover.status ? (
          <Card title="Customer Success handover">
            <KV k="Status" v={o.csHandover.status === "accepted" ? "Accepted by Customer Success" : "Ready for Customer Success"} />
            <KV k="CS engineer" v={o.csEngineerId ? engineerName(ctx.data, o.csEngineerId) : ""} />
            <KV k="Pending items" v={o.csHandover.pendingItems} />
            <KV k="Accepted" v={o.csHandover.acceptedAt ? `${o.csHandover.acceptedBy} · ${fmtDate(o.csHandover.acceptedAt.slice(0, 10))}` : ""} />
          </Card>
        ) : null}

        <Card title="Timeline">
          {ctx.manager || !ctx.exec ? (
            <div className="mb-2 flex gap-2">
              <TextInput placeholder="Add a comment…" value={comment} onChange={(e) => setComment(e.target.value)} />
              <Button onClick={async () => { if (!comment.trim()) return; await logOpp(o.id, comment.trim(), ctx.myName, "comment"); setComment(""); const { loadOpps } = await import("@/lib/opportunities"); await loadOpps(); }}>Add</Button>
            </div>
          ) : null}
          <div className="grid gap-1.5">
            {activity.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 text-xs">
                <span className={a.kind === "comment" ? "" : "text-mute"}>{a.kind === "comment" ? "💬 " : ""}{a.text}</span>
                <span className="num shrink-0 text-mute">{a.byUser} · {fmtDate(a.createdAt.slice(0, 10))}</span>
              </div>
            ))}
            {!activity.length ? <span className="text-xs text-mute">No history yet.</span> : null}
          </div>
        </Card>
      </div>
    </>
  );
}

function ExecHandoverForm({ ctx, o, onClose }: { ctx: Ctx; o: Opp; onClose: () => void }) {
  const ex = useExecution();
  const engs = ex.engineers.filter((e) => e.status === "active");
  const [h, setH] = useState({
    poRef: o.execHandover.poRef ?? "", orderDate: o.execHandover.orderDate ?? "", scope: o.execHandover.scope ?? o.requirement,
    sensors: o.execHandover.sensors ?? o.sensors, machines: o.execHandover.machines ?? o.machines, expectedDate: o.execHandover.expectedDate ?? o.expectedDate,
    siteContact: o.execHandover.siteContact ?? o.contactName, mobile: o.execHandover.mobile ?? o.contactMobile, email: o.execHandover.email ?? o.contactEmail,
    instructions: o.execHandover.instructions ?? "", attachments: o.execHandover.attachments ?? o.attachments, engineerId: o.execHandover.engineerId ?? "",
  });
  const [busy, setBusy] = useState(false);
  const type: ExecInstallType = o.type === "Demo" ? "demo" : o.type === "Troubleshooting" ? "troubleshooting" : "order";
  const draft = async () => {
    await saveOpp({ ...o, execHandover: { ...o.execHandover, ...h, status: "draft", preparedBy: ctx.myName, preparedAt: new Date().toISOString() } }, o, ctx.authId, ctx.myName);
    toast.success("Handover draft saved");
  };
  const send = async () => {
    if (!h.engineerId) return toast.error("Choose the Execution engineer");
    setBusy(true);
    try {
      const j = blankJob(ctx.data.currentUserId);
      Object.assign(j, {
        installationType: type, plantId: o.plantId, customerName: o.customerName, plantName: o.plantName || o.customerName, location: o.location,
        contactPerson: h.siteContact, contactNumber: h.mobile, email: h.email, expectedDate: h.expectedDate || null,
        assignedEngineerId: h.engineerId, priority: o.priority, status: h.expectedDate ? "scheduled" : "lead",
        plannedStart: h.expectedDate || null,
        notes: [`From ${o.number}`, h.scope, h.sensors ? `Expected sensors: ${h.sensors}` : "", h.machines ? `Expected machines: ${h.machines}` : "", h.poRef ? `PO: ${h.poRef}${h.orderDate ? ` (${h.orderDate})` : ""}` : "", `Sales: ${salesName(ctx, o.salesEngineerId)} · Branch: ${branchName(ctx, o.branchId)}`].filter(Boolean).join("\n"),
        scheduleNotes: h.instructions,
        links: h.attachments.split(/\s+/).filter((u) => /^https?:\/\//.test(u)).map((u, i) => ({ label: `Document ${i + 1}`, url: u })),
      });
      await saveJob(j, undefined, ctx.myName);
      const now = new Date().toISOString();
      await saveOpp({
        ...o, jobId: j.id, stage: type === "demo" ? "demo_planned" : "handed_exec",
        execHandover: { ...o.execHandover, ...h, status: "accepted", preparedBy: o.execHandover.preparedBy ?? ctx.myName, preparedAt: o.execHandover.preparedAt ?? now, acceptedBy: ctx.myName, acceptedAt: now },
      }, o, ctx.authId, ctx.myName);
      toast.success(`Execution job created and assigned to ${engs.find((e) => e.id === h.engineerId)?.name}`);
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not create job"); }
    finally { setBusy(false); }
  };
  const S = (k: keyof typeof h) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setH({ ...h, [k]: k === "sensors" || k === "machines" ? Number(e.target.value) || 0 : e.target.value });
  return (
    <Card title={type === "demo" ? "Demo execution handover" : "Sales → Execution handover"}>
      <div className="grid grid-cols-2 gap-2">
        {type === "order" ? <><Field label="PO / order ref"><TextInput value={h.poRef} onChange={S("poRef")} /></Field><Field label="Order date"><TextInput type="date" value={h.orderDate} onChange={S("orderDate")} /></Field></> : null}
        <Field label="Execution engineer *"><Select value={h.engineerId} onChange={S("engineerId")}><option value="">Select…</option>{engs.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></Field>
        <Field label="Expected execution date"><TextInput type="date" value={h.expectedDate} onChange={S("expectedDate")} /></Field>
        <Field label="Sensors"><TextInput type="number" value={h.sensors || ""} onChange={S("sensors")} /></Field>
        <Field label="Machines"><TextInput type="number" value={h.machines || ""} onChange={S("machines")} /></Field>
        <Field label="Site contact"><TextInput value={h.siteContact} onChange={S("siteContact")} /></Field>
        <Field label="Mobile"><TextInput value={h.mobile} onChange={S("mobile")} /></Field>
      </div>
      <Field label="Scope / requirement"><TextArea className="min-h-14" value={h.scope} onChange={S("scope")} /></Field>
      <Field label="Special instructions"><TextArea className="min-h-12" value={h.instructions} onChange={S("instructions")} /></Field>
      <Field label="Document links (PO, scope, machine list)"><TextArea className="min-h-12" value={h.attachments} onChange={S("attachments")} /></Field>
      <div className="mt-1 flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => void draft()}>Save Draft</Button><Button variant="solid" onClick={() => void send()} disabled={busy}>{busy ? "Creating…" : "Send to Execution"}</Button></div>
    </Card>
  );
}

function CsHandoverForm({ ctx, o, onClose }: { ctx: Ctx; o: Opp; onClose: () => void }) {
  const team = analystsOf(ctx.data);
  const plant = ctx.data.plants.find((p) => p.id === o.plantId);
  const [eng, setEng] = useState(o.csEngineerId || plant?.engineerId || "");
  const [pending, setPending] = useState(o.csHandover.pendingItems ?? "");
  const [notes, setNotes] = useState(o.csHandover.customerNotes ?? "");
  const accept = async () => {
    if (!eng) return toast.error("Choose the Customer Success engineer");
    await saveOpp({ ...o, csEngineerId: eng, stage: "cs_active", csHandover: { ...o.csHandover, status: "accepted", pendingItems: pending, customerNotes: notes, engineerId: eng, acceptedBy: ctx.myName, acceptedAt: new Date().toISOString() } }, o, ctx.authId, ctx.myName);
    toast.success(`Handed to ${engineerName(ctx.data, eng)}${plant && plant.engineerId !== eng ? " — update the plant's engineer in Plants if needed" : ""}`);
    onClose();
  };
  return (
    <Card title="Execution → Customer Success handover">
      <Field label="Customer Success engineer *"><Select value={eng} onChange={(e) => setEng(e.target.value)}><option value="">Select…</option>{team.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
      <Field label="Pending technical items"><TextArea className="min-h-12" value={pending} onChange={(e) => setPending(e.target.value)} /></Field>
      <Field label="Customer notes"><TextArea className="min-h-12" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      {!plant ? <div className="text-[11px] text-sev-medium">This opportunity isn't linked to a plant yet — add the plant in Plants so it enters Customer Success monitoring.</div> : null}
      <div className="mt-1 flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="solid" onClick={() => void accept()}>Accept into Customer Success</Button></div>
    </Card>
  );
}
