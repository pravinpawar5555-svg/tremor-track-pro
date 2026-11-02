import { describe, expect, it } from "vitest";
import { parseCard } from "../card-parse";

const card = `Rahul Deshmukh
Senior Maintenance Manager
JSW Steel Ltd
Plot 12, MIDC Chakan, Pune 410501
Mob: +91 98220 12345
Tel: 020-2745 6789
rahul.deshmukh@jsw.in
www.jsw.in`;

describe("visiting card parsing", () => {
  const f = parseCard(card);
  it("reads the email", () => expect(f.email).toBe("rahul.deshmukh@jsw.in"));
  it("reads the first phone with country code", () => expect(f.phone).toBe("+919822012345"));
  it("reads the second number as alternate", () => expect(f.altPhone).toBe("02027456789"));
  it("reads name, position and company", () => {
    expect(f.name).toBe("Rahul Deshmukh");
    expect(f.position).toBe("Senior Maintenance Manager");
    expect(f.company).toBe("JSW Steel Ltd");
  });
  it("does not treat a PIN code as a phone", () => expect(parseCard("Pune 411001").phone).toBe(""));
});
