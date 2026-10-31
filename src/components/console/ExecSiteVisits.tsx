import { useMemo, useState } from "react";
import { Archive, MoreHorizontal, Trash2, Undo2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useExecution } from "@/lib/execution";
import { toast } from "sonner";
import { Button, Empty, Field, Kpi, Panel, Select, TextArea, TextInput } from "@/components/console/ui";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { fmtDate, plantName, todayIso, type AppData } from "@/lib/store";
import {
  blankSiteVisit,
  deleteSiteVisit,
  saveSiteVisit,
  setSiteVisitArchived,
  siteVisitOutcomeLabel,
  siteVisitTypeLabel,
  type ExecEngineer,
  type ExecJob,
  type ExecSiteVisit,
  type SiteVisitOutcome,
  type SiteVisitType,
} from "@/lib/execution";

const outcomeTone: Record<SiteVisitOutcome, string> = {
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  follow_up: "bg-amber-50 text-amber-700 ring-amber-200",
  blocked: "bg-red-50 text-red-700 ring-red-200",
};

export function ExecSiteVisits({ data, visits, engineers, jobs, meId, myName, manager }: {
  data: AppData; visits: ExecSiteVisit[]; engineers: ExecEngineer[]; jobs: ExecJob[]; meId: string; myName: string; manager: boolean;
}) {
  const today = todayIso();
  const [eng, setEng] = useState("all");
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(today.slice(0, 8) + "01");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<ExecSiteVisit | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const archived = useExecution().archivedSiteVisits ?? [];
  const source = showArchived ? archived : visits;
  const nameOf = (id: string) => engineers.find((e) => e.id === id)?.name ?? "—";
  const where = (v: ExecSiteVisit) => [v.plantId ? plantName(data, v.plantId) : "", v.location].filter(Boolean).join(" · ") || "—";

  const list = useMemo(() => source.filter((v) =>
    (eng === "all" || v.engineerIds.includes(eng)) && (type === "all" || v.visitType === type) &&
    (!from || v.visitDate >= from) && (!to || v.visitDate <= to) &&
    (!q || `${where(v)} ${v.purpose} ${v.notes}`.toLowerCase().includes(q.toLowerCase())),
  ), [source, eng, type, from, to, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const siteDays = new Set(list.flatMap((v) => v.engineerIds.map((e) => `${e}|${v.visitDate}`))).size;
  const count = (t: SiteVisitType) => list.filter((v) => v.visitType === t).length;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        {manager ? (
          <Select className="w-48" value={eng} onChange={(e) => setEng(e.target.value)} aria-label="Engineer">
            <option value="all">All engineers</option>
            {engineers.filter((e) => e.status === "active").map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
        ) : null}
        <Select className="w-52" value={type} onChange={(e) => setType(e.target.value)} aria-label="Visit type">
          <option value="all">All visit types</option>
          {Object.entries(siteVisitTypeLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
        <TextInput type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
        <TextInput type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" />
        <TextInput className="w-48" placeholder="Search plant / purpose" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="flex items-center gap-1.5 text-xs text-mute"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived ({archived.length})</label>
        <div className="ml-auto"><Button variant="solid" onClick={() => setEditing(blankSiteVisit(today, meId, myName))}>+ Add Site Visit</Button></div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Site visits" value={list.length} />
        <Kpi label="Site days" value={siteDays} />
        <Kpi label="Factory inspections" value={count("factory_inspection")} />
        <Kpi label="Sensor collections" value={count("sensor_collection")} />
        <Kpi label="Sensors collected" value={list.reduce((s, v) => s + v.sensorsCollected, 0)} />
        <Kpi label="Follow-ups pending" value={list.filter((v) => v.outcome !== "completed").length} />
      </div>

      <Panel title="Site Visit Register" meta={<span>{list.length} shown</span>}>
        {list.length ? (
          <div className="divide-y divide-line/60">
            {list.map((v) => (
              <div key={v.id} className="flex flex-wrap items-start gap-3 px-4 py-3 text-sm">
                <div className="w-24 shrink-0">
                  <div className="font-medium">{fmtDate(v.visitDate)}</div>
                  <div className="text-[11px] text-mute">{[v.startTime, v.endTime].filter(Boolean).join("–")}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-signal/10 px-1.5 py-0.5 text-[11px] font-semibold text-signal">{siteVisitTypeLabel[v.visitType]}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] ring-1", outcomeTone[v.outcome])}>{siteVisitOutcomeLabel[v.outcome]}</span>
                  </div>
                  <div className="mt-1 font-medium">{where(v)}</div>
                  {v.purpose ? <div className="text-xs text-mute">{v.purpose}</div> : null}
                  <div className="mt-1 text-[11px] text-mute">
                    {v.engineerIds.map(nameOf).join(", ")}
                    {v.sensorsCollected ? ` · ${v.sensorsCollected} sensors collected` : ""}
                    {v.sensorsDelivered ? ` · ${v.sensorsDelivered} delivered` : ""}
                    {v.relatedJobId ? ` · Job: ${jobs.find((j) => j.id === v.relatedJobId)?.plantName ?? "linked"}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!v.archived ? <Button onClick={() => setEditing(v)}>Edit</Button> : null}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><button type="button" aria-label="More actions" className="rounded p-1.5 text-mute hover:bg-base"><MoreHorizontal className="size-4" /></button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {v.archived ? (
                        <DropdownMenuItem onClick={async () => { try { await setSiteVisitArchived(v.id, false); toast.success("Visit restored"); } catch { toast.error("Could not restore"); } }}><Undo2 className="size-4" /> Restore</DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={async () => { try { await setSiteVisitArchived(v.id, true); toast.success("Visit archived — removed from counts"); } catch { toast.error("Could not archive"); } }}><Archive className="size-4" /> Archive</DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-destructive" onClick={async () => { if (confirm("Delete this site visit permanently?")) { await deleteSiteVisit(v.id); toast.success("Visit deleted"); } }}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        ) : <Empty>No site visits in this range.</Empty>}
      </Panel>

      {editing ? <VisitForm v={editing} data={data} engineers={engineers} jobs={jobs} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

export function VisitForm({ v, data, engineers, jobs, onClose }: { v: ExecSiteVisit; data: AppData; engineers: ExecEngineer[]; jobs: ExecJob[]; onClose: () => void }) {
  const [f, setF] = useState(v);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof ExecSiteVisit>(k: K, val: ExecSiteVisit[K]) => setF((p) => ({ ...p, [k]: val }));
  const toggleEng = (id: string) => set("engineerIds", f.engineerIds.includes(id) ? f.engineerIds.filter((x) => x !== id) : [...f.engineerIds, id]);
  const valid = f.visitDate && f.engineerIds.length && (f.plantId || f.location.trim()) && (f.visitType !== "other" || f.purpose.trim());

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>{v.id ? "Edit Site Visit" : "Add Site Visit"}</SheetTitle></SheetHeader>
        <div className="space-y-3 px-4 pb-6">
          <Field label="Visit type">
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(siteVisitTypeLabel).map(([k, l]) => (
                <button key={k} type="button" onClick={() => set("visitType", k as SiteVisitType)}
                  className={cn("rounded-md px-2.5 py-2 text-left text-xs font-medium ring-1", f.visitType === k ? "bg-signal text-signal-foreground ring-signal" : "ring-line text-ink hover:bg-base")}>{l}</button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Date"><TextInput type="date" value={f.visitDate} onChange={(e) => set("visitDate", e.target.value)} /></Field>
            <Field label="Start"><TextInput type="time" value={f.startTime} onChange={(e) => set("startTime", e.target.value)} /></Field>
            <Field label="End"><TextInput type="time" value={f.endTime} onChange={(e) => set("endTime", e.target.value)} /></Field>
          </div>
          <Field label="Engineer(s)">
            <div className="flex flex-wrap gap-1.5">
              {engineers.filter((e) => e.status === "active" || f.engineerIds.includes(e.id)).map((e) => (
                <button key={e.id} type="button" onClick={() => toggleEng(e.id)}
                  className={cn("rounded-full px-2.5 py-1 text-xs ring-1", f.engineerIds.includes(e.id) ? "bg-signal text-signal-foreground ring-signal" : "ring-line text-mute")}>{e.name}</button>
              ))}
            </div>
          </Field>
          <Field label="Customer / plant" hint="Optional if a location is given">
            <Select value={f.plantId} onChange={(e) => set("plantId", e.target.value)}>
              <option value="">— None (e.g. own factory) —</option>
              {data.plants.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.customer}</option>)}
            </Select>
          </Field>
          <Field label="Location"><TextInput placeholder="e.g. Chakan factory" value={f.location} onChange={(e) => set("location", e.target.value)} /></Field>
          <Field label={f.visitType === "other" ? "Purpose (required)" : "Purpose"}><TextInput value={f.purpose} onChange={(e) => set("purpose", e.target.value)} /></Field>
          <Field label="Notes"><TextArea value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Sensors collected"><TextInput type="number" min={0} value={f.sensorsCollected} onChange={(e) => set("sensorsCollected", Math.max(0, Number(e.target.value) || 0))} /></Field>
            <Field label="Sensors / material delivered"><TextInput type="number" min={0} value={f.sensorsDelivered} onChange={(e) => set("sensorsDelivered", Math.max(0, Number(e.target.value) || 0))} /></Field>
          </div>
          <Field label="Outcome">
            <Select value={f.outcome} onChange={(e) => set("outcome", e.target.value as SiteVisitOutcome)}>
              {Object.entries(siteVisitOutcomeLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Link to execution job (optional)">
            <Select value={f.relatedJobId} onChange={(e) => {
              const id = e.target.value; const j = jobs.find((x) => x.id === id);
              setF((p) => ({ ...p, relatedJobId: id, ...(j ? { plantId: p.plantId || j.plantId, location: p.location || j.location, engineerIds: p.engineerIds.length ? p.engineerIds : [j.assignedEngineerId, j.secondaryEngineerId].filter(Boolean) } : {}) }));
            }}>
              <option value="">— Not linked —</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.plantName || j.customerName || "Job"} · {j.status}</option>)}
            </Select>
          </Field>
          <Field label="Photo / file link"><TextInput placeholder="https://" value={f.attachmentLink} onChange={(e) => set("attachmentLink", e.target.value)} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="solid" disabled={!valid || busy} onClick={async () => {
              setBusy(true);
              try { await saveSiteVisit(f); toast.success("Site visit saved"); onClose(); } catch { toast.error("Could not save visit"); } finally { setBusy(false); }
            }}>Save visit</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
