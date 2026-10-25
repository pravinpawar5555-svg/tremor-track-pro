import Papa from "papaparse";
import type { ContactDetails } from "./contact-rules";

export const importFields = ["name", "plant", "customer", "position", "department", "area", "phone", "alternate_phone", "email", "is_primary", "active", "notes"] as const;
export type ImportField = typeof importFields[number];
export type ColumnMap = Partial<Record<ImportField, number>>;
export type ImportPlant = { id: string; name: string; customer: string };
export type ImportContact = ContactDetails & { is_primary: boolean };
export type ImportDraft = { row: number; contact: ImportContact; selected: boolean; reviewed: boolean; sourceErrors: string[] };
const normalized = (s: string) => s.trim().toLowerCase().replace(/[_\s]+/g, " ");
const aliases: Record<ImportField, string[]> = {
  name: ["name", "contact name"], plant: ["plant", "plant name"], customer: ["customer", "customer name"],
  position: ["position", "designation", "position / designation"], department: ["department"], area: ["area", "unit", "area / unit"],
  phone: ["phone", "contact number", "phone number"], alternate_phone: ["alternate phone", "alternate number"],
  email: ["email", "email id"], is_primary: ["primary", "is primary"], active: ["active"], notes: ["notes"],
};
export function parseContactCsv(text: string) {
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), { skipEmptyLines: "greedy" });
  if (parsed.errors.length) throw new Error(`CSV could not be read: ${parsed.errors[0]?.message ?? "Invalid format"}`);
  const [headers, ...rows] = parsed.data;
  if (!headers?.length || !rows.length) throw new Error("The CSV needs a header and at least one contact.");
  if (rows.length > 1000) throw new Error("Upload up to 1,000 contacts at a time.");
  if (rows.some(r => r.length !== headers.length)) throw new Error("Some records have a different number of columns. Check the CSV before uploading again.");
  const keys = headers.map(normalized);
  if (new Set(keys).size !== keys.length) throw new Error("Duplicate column headings found. Give each column a unique heading.");
  const mapping: ColumnMap = {};
  for (const f of importFields) { const i = keys.findIndex(k => aliases[f].includes(k)); if (i >= 0) mapping[f] = i; }
  return { headers, rows, mapping };
}
// Undo only the text guard emitted by the phonebook's own CSV exporter.
function cell(s: string) { const v = s.trim(); return /^="(?:[^"]|"")*"$/.test(v) ? v.slice(2, -1).replace(/""/g, '"') : v; }
export function makeImportDrafts(rows: string[][], mapping: ColumnMap, plants: ImportPlant[], fallback = ""): ImportDraft[] {
  return rows.map((r, i) => {
    const get = (f: ImportField) => { const n = mapping[f]; return n === undefined ? "" : cell(r[n] ?? ""); };
    const sourceErrors: string[] = [];
    const bool = (f: "is_primary" | "active", defaultValue: boolean) => {
      const v = get(f).toLowerCase(); if (!v) return defaultValue;
      if (["yes", "true", "1"].includes(v)) return true;
      if (["no", "false", "0"].includes(v)) return false;
      sourceErrors.push(`Invalid ${f === "active" ? "Active" : "Primary"} value: ${get(f)}`); return defaultValue;
    };
    const plantName = get("plant"), customer = get("customer");
    const matches = plants.filter(p => normalized(p.name) === normalized(plantName) && (!customer || normalized(p.customer) === normalized(customer)));
    const plant_id = plantName ? (matches.length === 1 ? matches[0]?.id ?? "" : "") : fallback;
    const contact: ImportContact = { plant_id, name: get("name"), position: get("position"), department: get("department"), area: get("area"), phone: get("phone"), alternate_phone: get("alternate_phone"), email: get("email"), notes: get("notes"), is_primary: bool("is_primary", false), active: bool("active", true) };
    return { row: i + 2, contact, selected: true, reviewed: false, sourceErrors };
  });
}
const digits = (s: string) => s.replace(/\D/g, "");
export function duplicateContact(a: ImportContact, b: ImportContact) {
  return a.plant_id === b.plant_id && !!a.plant_id && (
    (!!a.name && normalized(a.name) === normalized(b.name)) ||
    (!!a.email && normalized(a.email) === normalized(b.email)) ||
    [a.phone, a.alternate_phone].some(p => digits(p) && [b.phone, b.alternate_phone].some(q => digits(p) === digits(q)))
  );
}
export function reviewImport(drafts: ImportDraft[], existing: ImportContact[], plants: ImportPlant[]) {
  return drafts.map((d, index) => {
    const c = d.contact;
    const errors = [...d.sourceErrors];
    const warnings: string[] = [];
    if (!c.name.trim()) errors.push("Contact name is required");
    if (!plants.some(p => p.id === c.plant_id)) errors.push("Select a matching plant");
    if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) errors.push("Email address is invalid");
    for (const [label, value] of [["Phone", c.phone], ["Alternate phone", c.alternate_phone]]) {
      if (value && (!/^[+\d\s().-]+$/.test(value) || digits(value).length < 6 || digits(value).length > 15)) errors.push(`${label} is invalid`);
    }
    if (!c.phone && !c.email) warnings.push("Phone and email are missing");
    const missing = [!c.area && "area", !c.department && "department", !c.position && "position"].filter(Boolean);
    if (missing.length) warnings.push(`Missing ${missing.join(", ")}`);
    if (existing.some(e => duplicateContact(c, e))) warnings.push("Possible duplicate in phonebook");
    if (drafts.some((other, j) => j !== index && other.selected && duplicateContact(c, other.contact))) warnings.push("Possible duplicate in this file");
    if (c.active && c.is_primary && (existing.some(e => e.plant_id === c.plant_id && e.active && e.is_primary) || drafts.some((other, j) => j !== index && other.selected && other.contact.plant_id === c.plant_id && other.contact.active && other.contact.is_primary))) errors.push("Another active primary contact exists; clear Primary to add this contact");
    return { errors, warnings, ready: errors.length === 0 && (!warnings.length || d.reviewed) };
  });
}