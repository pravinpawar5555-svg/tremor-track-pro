import { Field, Select } from "@/components/console/ui";
import { useContacts, type CustomerContact } from "@/lib/contacts";

export function ContactPicker({ plantId, onSelect }: { plantId: string; onSelect: (contact: CustomerContact) => void }) {
  const { contacts, error } = useContacts();
  const options = contacts.filter(c => c.plant_id === plantId && c.active);
  if (!plantId) return null;
  return <Field label="Saved customer contact">
    <Select aria-label="Saved customer contact" value="" onChange={e => { const c = options.find(x => x.id === e.target.value); if (c) onSelect(c); }}>
      <option value="">{error ? "Contacts unavailable — enter manually" : options.length ? "Select contact…" : "No saved contacts"}</option>
      {options.map(c => <option key={c.id} value={c.id}>{[c.name, c.department, c.area, c.position].filter(Boolean).join(" · ")}</option>)}
    </Select>
  </Field>;
}