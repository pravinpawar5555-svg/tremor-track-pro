import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button, Field, Select, TextInput } from "./ui";
import { buildContactsCsv } from "@/lib/contact-rules";
import { importFields, makeImportDrafts, parseContactCsv, reviewImport, type ColumnMap, type ImportContact, type ImportDraft, type ImportField, type ImportPlant } from "@/lib/contact-import";
import type { ContactInput, CustomerContact } from "@/lib/contacts";

const labels: Record<ImportField, string> = { name: "Contact name", plant: "Plant", customer: "Customer", position: "Position", department: "Department", area: "Area", phone: "Phone", alternate_phone: "Alternate phone", email: "Email", is_primary: "Primary", active: "Active", notes: "Notes" };
type Props = { plants: ImportPlant[]; contacts: CustomerContact[]; defaultPlant: string; retry: () => Promise<{ data?: CustomerContact[] | undefined; error?: unknown }>; importContacts: (rows: ContactInput[]) => Promise<void> };

export function ContactImport({ plants, contacts, defaultPlant, retry, importContacts }: Props) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ReturnType<typeof parseContactCsv> | null>(null);
  const [mapping, setMapping] = useState<ColumnMap>({});
  const [fallback, setFallback] = useState(defaultPlant);
  const [drafts, setDrafts] = useState<ImportDraft[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [page, setPage] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const checks = reviewImport(drafts ?? [], contacts, plants);
  const selected = drafts?.filter(d => d.selected).length ?? 0;
  const blocked = drafts?.some((d, i) => d.selected && !checks[i]?.ready) ?? false;
  const update = (index: number, patch: Partial<ImportContact>) => setDrafts(old => old?.map((d, i) => i === index ? { ...d, contact: { ...d.contact, ...patch }, reviewed: false, sourceErrors: d.sourceErrors.filter(e => !(patch.active !== undefined && e.startsWith("Invalid Active")) && !(patch.is_primary !== undefined && e.startsWith("Invalid Primary"))) } : d) ?? null);
  const reset = () => { setParsed(null); setDrafts(null); setFileName(""); setError(""); setPage(0); setFallback(defaultPlant); };
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError(""); setReading(true); setDrafts(null); setParsed(null);
    try {
      if (!/\.csv$/i.test(file.name)) throw new Error("Choose a CSV file.");
      if (file.size > 5 * 1024 * 1024) throw new Error("Choose a CSV smaller than 5 MB.");
      const result = parseContactCsv(await file.text());
      setParsed(result); setMapping(result.mapping); setFileName(file.name); setPage(0);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not read the file."); }
    finally { setReading(false); }
  };
  const template = () => {
    const csv = buildContactsCsv([]), url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "customer-contacts-template.csv"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  const save = async () => {
    if (!drafts || !selected || blocked) return;
    setBusy(true); setError("");
    try {
      const fresh = await retry();
      if (fresh.error || !fresh.data) throw new Error("Could not refresh the phonebook. Nothing was saved; please retry.");
      const freshChecks = reviewImport(drafts, fresh.data, plants);
      if (drafts.some((d, i) => d.selected && !freshChecks[i]?.ready)) throw new Error("The phonebook changed. Review the updated warnings before saving.");
      await importContacts(drafts.filter(d => d.selected).map(d => ({ ...d.contact })));
      toast.success(`${selected} contacts imported`); setOpen(false); reset();
    } catch (e) { setError(e instanceof Error ? e.message : "Import failed. Nothing was saved."); }
    finally { setBusy(false); }
  };
  return <>
    <Button disabled={!plants.length} onClick={() => { reset(); setOpen(true); }}><Upload className="size-4" />Import CSV</Button>
    <Dialog open={open} onOpenChange={o => { if (!busy && !reading) setOpen(o); }}>
      <DialogContent className="sm:max-w-5xl" aria-describedby={undefined}>
        <DialogHeader><DialogTitle>Import customer contacts</DialogTitle></DialogHeader>
        <fieldset disabled={busy || reading} className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept=".csv,text/csv" aria-label="Upload contacts CSV" className="sr-only" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
            <Button onClick={() => fileRef.current?.click()}><Upload className="size-4" />{reading ? "Reading…" : "Choose CSV"}</Button>
            <Button onClick={template}><Download className="size-4" />Blank template</Button>
            <span className="break-all text-xs text-mute">{fileName}</span>
          </div>
          {error && <div role="alert" className="rounded-md border border-sev-high/30 bg-sev-high/5 p-3 text-sm text-sev-high">{error}</div>}
          {parsed && !drafts && <>
            <h3 className="text-sm font-semibold">Match columns · {parsed.rows.length} records</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {importFields.map(f => <Field key={f} label={labels[f]}><Select aria-label={`Column for ${labels[f]}`} value={mapping[f] ?? ""} onChange={e => setMapping(m => ({ ...m, [f]: e.target.value === "" ? undefined : Number(e.target.value) }))}><option value="">Not included</option>{parsed.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}</Select></Field>)}
            </div>
            <Field label="Plant for records without a plant name"><Select value={fallback} onChange={e => setFallback(e.target.value)}><option value="">Select in preview</option>{plants.map(p => <option key={p.id} value={p.id}>{p.name} · {p.customer}</option>)}</Select></Field>
            <Button variant="solid" disabled={mapping.name === undefined || new Set(Object.values(mapping).filter(v => v !== undefined)).size !== Object.values(mapping).filter(v => v !== undefined).length} onClick={() => { setDrafts(makeImportDrafts(parsed.rows, mapping, plants, fallback)); setError(""); }}>Preview records</Button>
          </>}
          {drafts && <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span>{drafts.length} records · {selected} selected · {checks.filter(c => c.errors.length).length} with errors · {checks.filter(c => c.warnings.length).length} with warnings</span>
              <div className="flex flex-wrap gap-2"><Button onClick={() => setDrafts(null)}>Columns</Button><Button onClick={() => setDrafts(drafts.map((d, i) => ({ ...d, selected: !!checks[i]?.ready })))}>Select ready only</Button><Button onClick={() => setDrafts(drafts.map(d => ({ ...d, selected: false })))}>Deselect all</Button></div>
            </div>
            <div className="space-y-3">
              {drafts.slice(page * 20, (page + 1) * 20).map((d, local) => {
                const i = page * 20 + local, check = checks[i];
                return <section key={d.row} className="rounded-md border border-line p-3">
                  <label className="mb-3 flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={d.selected} onChange={e => setDrafts(drafts.map((x, j) => j === i ? { ...x, selected: e.target.checked } : x))} />Row {d.row}<span className={check?.errors.length ? "text-sev-high" : check?.warnings.length ? "text-sev-medium" : "text-sev-low"}>{check?.errors.length ? "Needs correction" : check?.warnings.length ? "Review" : "Ready"}</span></label>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Contact name *"><TextInput value={d.contact.name} onChange={e => update(i, { name: e.target.value })} /></Field>
                    <Field label="Plant *"><Select value={d.contact.plant_id} onChange={e => update(i, { plant_id: e.target.value })}><option value="">Select plant</option>{plants.map(p => <option key={p.id} value={p.id}>{p.name} · {p.customer}</option>)}</Select></Field>
                    <Field label="Phone"><TextInput type="tel" value={d.contact.phone} onChange={e => update(i, { phone: e.target.value })} /></Field>
                    <Field label="Email"><TextInput value={d.contact.email} onChange={e => update(i, { email: e.target.value })} /></Field>
                  </div>
                  <details className="mt-3 text-xs"><summary className="cursor-pointer text-signal">Area, department & other details</summary><div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {(["area", "department", "position", "alternate_phone", "notes"] as const).map(f => <Field key={f} label={labels[f]}><TextInput value={d.contact[f]} onChange={e => update(i, { [f]: e.target.value })} /></Field>)}
                    <div className="flex flex-wrap items-center gap-3"><label><input type="checkbox" checked={d.contact.is_primary} onChange={e => update(i, { is_primary: e.target.checked })} /> Primary</label><label><input type="checkbox" checked={d.contact.active} onChange={e => update(i, { active: e.target.checked })} /> Active</label></div>
                  </div></details>
                  {check?.errors.map(e => <p key={e} className="mt-1 text-xs text-sev-high">{e}</p>)}
                  {check?.warnings.map(w => <p key={w} className="mt-1 text-xs text-sev-medium">{w}</p>)}
                  {!!check?.warnings.length && !check.errors.length && <label className="mt-2 flex items-start gap-2 text-xs"><input type="checkbox" checked={d.reviewed} onChange={e => setDrafts(drafts.map((x, j) => j === i ? { ...x, reviewed: e.target.checked } : x))} />Reviewed — add as a new contact without changing existing contacts</label>}
                </section>;
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Button disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-xs">Page {page + 1} of {Math.ceil(drafts.length / 20)}</span><Button disabled={(page + 1) * 20 >= drafts.length} onClick={() => setPage(page + 1)}>Next</Button></div><Button variant="solid" disabled={!selected || blocked || busy} onClick={() => void save()}>{busy ? "Saving…" : `Save ${selected} contacts`}</Button></div>
          </>}
          <Button disabled={busy || reading} onClick={() => setOpen(false)}>Cancel</Button>
        </fieldset>
      </DialogContent>
    </Dialog>
  </>;
}