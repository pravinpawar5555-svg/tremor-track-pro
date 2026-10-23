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