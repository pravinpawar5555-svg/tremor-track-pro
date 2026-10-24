export interface ContactDetails {
  plant_id: string; name: string; area: string; department: string; position: string;
  phone: string; alternate_phone: string; email: string; notes: string; active: boolean;
}
export function filterContacts<T extends ContactDetails>(contacts: T[], filters: { plant?: string; area?: string; department?: string; query?: string; inactive?: boolean }) {
  const q = filters.query?.trim().toLowerCase() ?? "";
  return contacts.filter(c => (filters.inactive || c.active) && (!filters.plant || c.plant_id === filters.plant)
    && (!filters.area || c.area === filters.area) && (!filters.department || c.department === filters.department)
    && (!q || [c.name, c.area, c.department, c.position, c.phone, c.alternate_phone, c.email].join(" ").toLowerCase().includes(q)));
}
export const contactAttendee = (c: Pick<ContactDetails, "name" | "phone">) => ({ name: c.name, phone: c.phone });

export interface ContactExportRow extends ContactDetails {
  is_primary: boolean;
  plant: string;
  customer: string;
}

const HEADERS = ["Name", "Position", "Department", "Area", "Plant", "Customer", "Phone", "Alternate phone", "Email", "Primary", "Active", "Notes"];

/** RFC 4180 cell: quote when needed, and stop Excel reading a phone/email as a formula. */
function csvCell(value: string | boolean) {
  let s = typeof value === "boolean" ? (value ? "Yes" : "No") : value ?? "";
  if (/^[=+\-@\t\r]/.test(s)) s = `="${s.replace(/"/g, '""')}"`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV of the contacts currently shown, one row per contact. */
export function buildContactsCsv(rows: ContactExportRow[]) {
  const lines = [HEADERS.join(",")];
  for (const r of rows) lines.push([r.name, r.position, r.department, r.area, r.plant, r.customer, r.phone, r.alternate_phone, r.email, r.is_primary, r.active, r.notes].map(csvCell).join(","));
  return lines.join("\r\n") + "\r\n";
}
