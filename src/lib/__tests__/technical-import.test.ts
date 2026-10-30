import { describe, expect, it } from "vitest";
import { canSave, reviewTechImport, rowsFromGrid, toIsoDate } from "@/lib/technical-import";
import type { TechData } from "@/lib/technical";

const head = ["Plant Name", "Area Name", "Machine Name", "Measurement Point", "Sensor Serial Number", "Sensor Type", "Installation Date"];
const data = {
  areas: [{ id: "a1", name: "Boiler House" }], machines: [{ id: "m1", area_id: "a1", name: "BFP-2" }],
  points: [{ id: "p1", machine_id: "m1", name: "Motor DE" }], gateways: [],
  sensors: [{ id: "s1", serial_no: "N6-1", status: "installed" }], events: [],
} as unknown as TechData;

describe("technical import", () => {
  it("reads DD-MM-YYYY dates", () => expect(toIsoDate("05-03-2026")).toBe("2026-03-05"));
  it("skips existing active sensors and existing machines", () => {
    const r = reviewTechImport(rowsFromGrid([head, ["X", "boiler house", "bfp-2", "Motor DE", "n6-1", "Node 6", ""]]), data);
    expect(r[0]!.state).toBe("exists");
  });
  it("marks a new machine under an existing area as new", () => {
    const r = reviewTechImport(rowsFromGrid([head, ["X", "Boiler House", "ID Fan", "", "", "", ""]]), data);
    expect(r[0]!.state).toBe("new");
  });
  it("blocks a sensor without a measurement point", () => {
    const r = reviewTechImport(rowsFromGrid([head, ["X", "Boiler House", "BFP-2", "", "N6-9", "Node 6", ""]]), data);
    expect(r[0]!.state).toBe("problem");
    expect(canSave(r)).toBe(false);
  });
  it("blocks a serial repeated in the same file", () => {
    const r = reviewTechImport(rowsFromGrid([head, ["X", "A", "M", "P1", "S9", "Node 6", ""], ["X", "A", "M", "P2", "s9", "Node 6", ""]]), data);
    expect(r[1]!.state).toBe("problem");
  });
});
