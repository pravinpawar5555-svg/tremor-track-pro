import { describe, expect, it } from "vitest";
import { buildContactsCsv, filterContacts, contactAttendee } from "@/lib/contact-rules";
const contact = { plant_id: "p1", name: "Customer A", area: "Boiler", department: "Maintenance", position: "Manager", phone: "+919876543210", alternate_phone: "", email: "customer@example.org", notes: "", active: true };
const rows = [contact, { ...contact, name: "Customer B", plant_id: "p2", area: "Turbine", department: "Production" }, { ...contact, name: "Former contact", active: false }];

/** Split one CSV line back into cells (RFC 4180) so assertions read like the input. */
function parseCsvLine(line?: string) {
  const cells: string[] = [];
  line = line ?? "";

  let cell = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { cells.push(cell); cell = ""; }
    else cell += ch;
  }
  cells.push(cell);
  return cells;
}
const exportRow = (over: Partial<import("@/lib/contact-rules").ContactExportRow> = {}) => ({ ...contact, is_primary: false, plant: "Plant 1", customer: "Customer X", ...over });
/** What a spreadsheet shows for a cell: the formula guard is stripped, the text remains. */
const visible = (cell?: string) => (cell && /^="(.*)"$/.test(cell) ? cell.slice(2, -1) : (cell ?? ""));


describe("customer contacts", () => {
  it("filters by plant", () => expect(filterContacts(rows, { plant: "p2" }).map(c => c.name)).toEqual(["Customer B"]));
  it("filters by area", () => expect(filterContacts(rows, { area: "Boiler" }).map(c => c.name)).toEqual(["Customer A"]));
  it("filters by department", () => expect(filterContacts(rows, { department: "Production" }).map(c => c.name)).toEqual(["Customer B"]));
  it("finds contacts by position", () => expect(filterContacts(rows, { query: "manager" })).toHaveLength(2));
  it("finds phone and email", () => { expect(filterContacts(rows, { plant: "p1", query: "9876543210" })).toHaveLength(1); expect(filterContacts(rows, { plant: "p1", query: "customer@example.org" })).toHaveLength(1); });
  it("omits inactive contacts unless requested", () => { expect(filterContacts(rows, {})).toHaveLength(2); expect(filterContacts(rows, { inactive: true })).toHaveLength(3); });
  it("copies name and phone to MOM without changing saved source", () => expect(contactAttendee(contact)).toEqual({ name: "Customer A", phone: "+919876543210" }));
  it("exports a header row and one row per contact", () => {
    const csv = buildContactsCsv([exportRow(), exportRow({ name: "Customer B", is_primary: true, active: false })]);
    const lines = csv.trimEnd().split("\r\n");
    expect(lines).toHaveLength(3);
    expect(parseCsvLine(lines[0])).toEqual(["Name", "Position", "Department", "Area", "Plant", "Customer", "Phone", "Alternate phone", "Email", "Primary", "Active", "Notes"]);
    expect(parseCsvLine(lines[1]).map(visible)).toEqual(["Customer A", "Manager", "Maintenance", "Boiler", "Plant 1", "Customer X", "+919876543210", "", "customer@example.org", "No", "Yes", ""]);
    expect(parseCsvLine(lines[2]).map(visible)).toEqual(["Customer B", "Manager", "Maintenance", "Boiler", "Plant 1", "Customer X", "+919876543210", "", "customer@example.org", "Yes", "No", ""]);

  });
  it("exports only the contacts passed in, so the current filter is kept", () => {
    const csv = buildContactsCsv([exportRow({ name: "Customer B" })]);
    expect(csv).not.toContain("Customer A");
    expect(csv.trimEnd().split("\r\n")).toHaveLength(2);
  });
  it("keeps a phone number readable instead of turning it into a formula", () => {
    const csv = buildContactsCsv([exportRow()]);
    expect(visible(parseCsvLine(csv.trimEnd().split("\r\n")[1])[6])).toBe("+919876543210");
  });
  it("quotes names containing commas or quotes", () => {
    const csv = buildContactsCsv([exportRow({ name: 'Doe, "Jr" Smith', notes: 'Said "hello, all"' })]);
    const cells = parseCsvLine(csv.trimEnd().split("\r\n")[1]);
    expect(cells[0]).toBe('Doe, "Jr" Smith');
    expect(cells[11]).toBe('Said "hello, all"');
  });
});
