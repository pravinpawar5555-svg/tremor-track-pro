import { describe, expect, it } from "vitest";
import { buildContactsCsv } from "../contact-rules";
import { makeImportDrafts, parseContactCsv, reviewImport, type ImportContact } from "../contact-import";

const plants = [{ id: "p1", name: "Plant A", customer: "Customer A" }];
const contact: ImportContact = { plant_id: "p1", name: "Test Person", department: "Maintenance", area: "Unit 1", position: "Manager", phone: "+91 9876543210", alternate_phone: "", email: "person@example.com", notes: "", active: true, is_primary: false };
const draft = (csv: string) => { const p = parseContactCsv(csv); return makeImportDrafts(p.rows, p.mapping, plants); };

describe("contact CSV import", () => {
  it("round-trips exported phones, quotes, Unicode and multiline notes", () => {
    const c = { ...contact, name: 'Person, "Pawar"', notes: "Line 1\nमराठी", plant: "Plant A", customer: "Customer A" };
    const [row] = draft("\uFEFF" + buildContactsCsv([c]));
    expect(row?.contact).toEqual({ ...contact, name: c.name, notes: c.notes });
  });
  it("rejects malformed quoting, inconsistent columns and duplicate headers", () => {
    expect(() => parseContactCsv('Name,Plant\n"Unclosed,Plant A')).toThrow();
    expect(() => parseContactCsv("Name,Plant\nPerson,Plant A,Extra")).toThrow();
    expect(() => parseContactCsv("Name, name\nA,B")).toThrow();
  });
  it("matches reordered headers and preserves leading zero phones", () => {
    const [row] = draft("Phone,Plant,Name\n0123456789,Plant A,Test");
    expect(row?.contact.phone).toBe("0123456789"); expect(row?.contact.plant_id).toBe("p1");
  });
  it("requires a name and unambiguous visible plant", () => {
    const rows = draft("Name,Plant\n,Unknown");
    expect(reviewImport(rows, [], plants)[0]?.errors).toEqual(["Contact name is required", "Select a matching plant"]);
    const p = parseContactCsv("Name,Plant\nTest,Plant A");
    expect(makeImportDrafts(p.rows, p.mapping, [...plants, { id: "p2", name: "Plant A", customer: "Other" }])[0]?.contact.plant_id).toBe("");
  });
  it("matches customer to resolve repeated plant names", () => {
    const p = parseContactCsv("Name,Plant,Customer\nTest,Plant A,Customer A");
    expect(makeImportDrafts(p.rows, p.mapping, [...plants, { id: "p2", name: "Plant A", customer: "Other" }])[0]?.contact.plant_id).toBe("p1");
  });
  it("flags missing details and requires review", () => {
    const rows = draft("Name,Plant\nTest,Plant A");
    expect(reviewImport(rows, [], plants)[0]?.warnings).toContain("Phone and email are missing");
    expect(reviewImport(rows, [], plants)[0]?.ready).toBe(false);
    rows.forEach(r => r.reviewed = true);
    expect(reviewImport(rows, [], plants)[0]?.ready).toBe(true);
  });
  it("flags existing and in-file duplicates including inactive contacts", () => {
    const rows = [{ row: 2, contact, selected: true, reviewed: false, sourceErrors: [] }, { row: 3, contact: { ...contact, name: "Another Person" }, selected: true, reviewed: false, sourceErrors: [] }];
    expect(reviewImport(rows, [{ ...contact, active: false }], plants)[0]?.warnings).toEqual(["Possible duplicate in phonebook", "Possible duplicate in this file"]);
    rows.forEach(r => r.reviewed = true);
    expect(reviewImport(rows, [], plants).every(r => r.ready)).toBe(true);
  });
  it("blocks primary changes and multiple primary records", () => {
    const rows = [{ row: 2, contact: { ...contact, is_primary: true }, selected: true, reviewed: true, sourceErrors: [] }];
    expect(reviewImport(rows, [{ ...contact, is_primary: true }], plants)[0]?.ready).toBe(false);
    expect(reviewImport([...rows, { ...rows[0], row: 3, contact: { ...contact, name: "Other", is_primary: true }, selected: true, reviewed: true, sourceErrors: [] }], [], plants).every(r => !r.ready)).toBe(true);
  });
  it("blocks invalid emails, phones and boolean values", () => {
    const rows = draft("Name,Plant,Phone,Email,Active\nTest,Plant A,ABC,bad,maybe");
    expect(reviewImport(rows, [], plants)[0]?.errors).toEqual(["Invalid Active value: maybe", "Email address is invalid", "Phone is invalid"]);
  });
  it("limits imports to 1000 records", () => {
    expect(() => parseContactCsv("Name\n" + Array.from({ length: 1001 }, () => "Test").join("\n"))).toThrow("1,000");
  });
});