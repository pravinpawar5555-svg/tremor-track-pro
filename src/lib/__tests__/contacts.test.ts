import { describe, expect, it } from "vitest";
import { filterContacts, contactAttendee } from "@/lib/contact-rules";
const contact = { plant_id: "p1", name: "Customer A", area: "Boiler", department: "Maintenance", position: "Manager", phone: "+919876543210", alternate_phone: "", email: "customer@example.org", notes: "", active: true };
const rows = [contact, { ...contact, name: "Customer B", plant_id: "p2", area: "Turbine", department: "Production" }, { ...contact, name: "Former contact", active: false }];
describe("customer contacts", () => {
  it("filters by plant", () => expect(filterContacts(rows, { plant: "p2" }).map(c => c.name)).toEqual(["Customer B"]));
  it("filters by area", () => expect(filterContacts(rows, { area: "Boiler" }).map(c => c.name)).toEqual(["Customer A"]));
  it("filters by department", () => expect(filterContacts(rows, { department: "Production" }).map(c => c.name)).toEqual(["Customer B"]));
  it("finds contacts by position", () => expect(filterContacts(rows, { query: "manager" })).toHaveLength(2));
  it("finds phone and email", () => { expect(filterContacts(rows, { plant: "p1", query: "9876543210" })).toHaveLength(1); expect(filterContacts(rows, { plant: "p1", query: "customer@example.org" })).toHaveLength(1); });
  it("omits inactive contacts unless requested", () => { expect(filterContacts(rows, {})).toHaveLength(2); expect(filterContacts(rows, { inactive: true })).toHaveLength(3); });
  it("copies name and phone to MOM without changing saved source", () => expect(contactAttendee(contact)).toEqual({ name: "Customer A", phone: "+919876543210" }));
});