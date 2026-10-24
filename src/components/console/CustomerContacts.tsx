import { useState } from "react";
import { Download, Mail, MessageCircle, Pencil, Phone, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button, Empty, Field, PageHeader, Select, TextArea, TextInput } from "@/components/console/ui";
import { useContacts, type ContactInput, type CustomerContact } from "@/lib/contacts";
import { buildContactsCsv, filterContacts, type ContactExportRow } from "@/lib/contact-rules";
import { useData } from "@/lib/store";

const departments = ["Maintenance", "Reliability", "Mechanical", "Electrical", "Instrumentation", "Production", "Utilities", "Purchase", "Management"];
const blank = (plant: string): ContactInput => ({ plant_id: plant, name: "", area: "", department: "", position: "", phone: "", alternate_phone: "", email: "", notes: "", active: true, is_primary: false });

export function CustomerContacts({ plantId }: { plantId?: string | undefined }) {
  const data = useData();
  const { contacts, loading, error, retry, save } = useContacts();
  const [plant, setPlant] = useState(plantId ?? "");
  const [customer, setCustomer] = useState("");
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [dept, setDept] = useState("");
  const [inactive, setInactive] = useState(false);
  const [form, setForm] = useState<ContactInput | null>(null);
  const [busy, setBusy] = useState(false);
  const scope = contacts.filter(c => (!plantId || c.plant_id === plantId) && (!customer || data.plants.find(p => p.id === c.plant_id)?.customer === customer));
  const filtered = filterContacts(scope, { plant, area, department: dept, inactive, query: q });
  const choices = scope.filter(c => !plant || c.plant_id === plant);
  const values = (field: "area" | "department") => [...new Set(choices.map(c => c[field]).filter(Boolean))].sort();
  const edit = (c: CustomerContact) => setForm({ ...c });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !form.name.trim() || !form.plant_id) return;
    setBusy(true);
    try { await save({ ...form, name: form.name.trim(), email: form.email?.trim() ?? "", phone: form.phone?.trim() ?? "" }); setForm(null); toast.success("Customer contact saved"); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not save contact"); }
    finally { setBusy(false); }
  };
  const exportCsv = () => {
    const rows: ContactExportRow[] = filtered.map(c => {
      const p = data.plants.find(x => x.id === c.plant_id);
      return { ...c, is_primary: !!c.is_primary, plant: p?.name ?? "", customer: p?.customer ?? "" };
    });
    const blob = new Blob(["\uFEFF" + buildContactsCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    toast.success(`${rows.length} contact${rows.length === 1 ? "" : "s"} exported`);
  };

  return <div className="min-w-0">
    <PageHeader title={plantId ? "Customer contacts" : "Customer Phonebook"} actions={<div className="flex gap-2"><Button onClick={() => void retry()}><RefreshCw className="size-4" />Refresh</Button><Button onClick={exportCsv} disabled={!filtered.length}><Download className="size-4" />Export CSV</Button><Button variant="solid" onClick={() => setForm(blank(plantId ?? plant))}><Plus className="size-4" />Add contact</Button></div>} />
    <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
      <TextInput aria-label="Search contacts" placeholder="Search name, position, phone or email…" value={q} onChange={e => setQ(e.target.value)} className="lg:min-w-56 lg:flex-1" />
      {!plantId && <><Select aria-label="Customer filter" className="lg:w-44" value={customer} onChange={e => { setCustomer(e.target.value); setPlant(""); setArea(""); setDept(""); }}><option value="">All customers</option>{[...new Set(data.plants.map(p => p.customer).filter(Boolean))].sort().map(c => <option key={c}>{c}</option>)}</Select><Select aria-label="Plant filter" className="lg:w-44" value={plant} onChange={e => { setPlant(e.target.value); setArea(""); setDept(""); }}><option value="">All plants</option>{data.plants.filter(p => !customer || p.customer === customer).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></>}
      <Select aria-label="Department filter" className="lg:w-40" value={dept} onChange={e => setDept(e.target.value)}><option value="">All departments</option>{values("department").map(v => <option key={v}>{v}</option>)}</Select>
      <Select aria-label="Area filter" className="lg:w-40" value={area} onChange={e => setArea(e.target.value)}><option value="">All areas</option>{values("area").map(v => <option key={v}>{v}</option>)}</Select>
    </div>
    <div className="mb-3 flex items-center justify-between gap-3 text-xs text-mute"><span>{filtered.length} contacts</span><label className="flex items-center gap-2"><input type="checkbox" checked={inactive} onChange={e => setInactive(e.target.checked)} />Include inactive</label></div>
    {error ? <div className="text-sev-high">Contacts could not be loaded. <Button onClick={() => void retry()}>Retry</Button></div> : loading ? <Empty>Loading contacts…</Empty> : !filtered.length ? <Empty>No contacts found.</Empty> :
      <div className="overflow-hidden rounded-md border border-line bg-panel">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-ink/5 text-left text-xs text-mute"><tr><th className="w-2/5 px-3 py-2 md:w-1/4">Contact</th><th className="hidden px-3 py-2 md:table-cell">Plant / Customer</th><th className="hidden px-3 py-2 lg:table-cell">Department · Area</th><th className="hidden px-3 py-2 md:table-cell">Phone / Email</th><th className="w-40 px-3 py-2 text-right">Actions</th></tr></thead>
          <tbody>{filtered.map(c => {
            const p = data.plants.find(p => p.id === c.plant_id);
            const wa = c.phone.replace(/\D/g, "");
            const icon = "inline-flex size-8 items-center justify-center rounded-md border border-line text-signal hover:bg-signal/10";
            return <tr key={c.id} className={`border-t border-line align-top ${c.active ? "" : "opacity-60"}`}>
              <td className="px-3 py-2"><div className="truncate font-medium" title={c.name}>{c.name}</div><div className="truncate text-xs text-mute">{c.position || "—"}</div><div className="mt-0.5 flex gap-2 text-[11px]">{c.is_primary && <span className="text-sev-low">Primary</span>}{!c.active && <span className="text-mute">Inactive</span>}</div><div className="truncate text-xs text-mute md:hidden">{p?.name}{c.department ? ` · ${c.department}` : ""}</div></td>
              <td className="hidden px-3 py-2 md:table-cell"><div className="truncate" title={p?.name}>{p?.name ?? "—"}</div><div className="truncate text-xs text-mute">{p?.customer}</div></td>
              <td className="hidden px-3 py-2 lg:table-cell"><div className="truncate">{c.department || "—"}</div><div className="truncate text-xs text-mute">{c.area}</div></td>
              <td className="hidden px-3 py-2 md:table-cell"><div className="truncate">{c.phone || "—"}</div><div className="truncate text-xs text-mute" title={c.email ?? ""}>{c.email}</div></td>
              <td className="px-3 py-2"><div className="flex flex-wrap justify-end gap-1">
                {c.phone && <a className={icon} href={`tel:${c.phone}`} title={`Call ${c.phone}`}><Phone className="size-4" /></a>}
                {wa && <a className={icon} href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" title="WhatsApp"><MessageCircle className="size-4" /></a>}
                {c.email && <a className={icon} href={`mailto:${c.email}`} title={c.email}><Mail className="size-4" /></a>}
                <button type="button" className={icon} onClick={() => edit(c)} title="Edit"><Pencil className="size-4" /><span className="sr-only">Edit {c.name}</span></button>
              </div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
    <Sheet open={!!form} onOpenChange={o => { if (!o && !busy) setForm(null); }}><SheetContent className="w-full overflow-y-auto sm:max-w-xl"><SheetHeader><SheetTitle>{form?.id ? "Edit customer contact" : "Add customer contact"}</SheetTitle></SheetHeader>
      {form && <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Plant *"><Select aria-label="Contact plant" required disabled={!!form.id || !!plantId} value={form.plant_id} onChange={e => setForm({ ...form, plant_id: e.target.value })}><option value="">Select plant</option>{data.plants.map(p => <option key={p.id} value={p.id}>{p.name} · {p.customer}</option>)}</Select></Field></div>
        <Field label="Contact name *"><TextInput required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Position / Designation"><TextInput value={form.position ?? ""} onChange={e => setForm({ ...form, position: e.target.value })} /></Field>
        <Field label="Department"><TextInput list="contact-departments" value={form.department ?? ""} onChange={e => setForm({ ...form, department: e.target.value })} /><datalist id="contact-departments">{departments.map(d => <option key={d}>{d}</option>)}</datalist></Field>
        <Field label="Area / Unit"><TextInput value={form.area ?? ""} onChange={e => setForm({ ...form, area: e.target.value })} /></Field>
        <Field label="Contact number"><TextInput type="tel" placeholder="Include country code" value={form.phone ?? ""} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Alternate number"><TextInput type="tel" value={form.alternate_phone ?? ""} onChange={e => setForm({ ...form, alternate_phone: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Email ID"><TextInput type="email" value={form.email ?? ""} onChange={e => setForm({ ...form, email: e.target.value })} /></Field></div>
        <div className="sm:col-span-2"><Field label="Notes"><TextArea value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_primary ?? false} onChange={e => setForm({ ...form, is_primary: e.target.checked })} />Primary contact</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active ?? true} onChange={e => setForm({ ...form, active: e.target.checked })} />Active</label>
        <div className="flex gap-2 sm:col-span-2"><Button type="submit" variant="solid" disabled={busy}>{busy ? "Saving…" : "Save contact"}</Button><Button disabled={busy} onClick={() => setForm(null)}>Cancel</Button></div>
      </form>}
    </SheetContent></Sheet>
  </div>;
}