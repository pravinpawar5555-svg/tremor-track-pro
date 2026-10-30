import { describe, expect, it } from "vitest";
import { buildTechCsv, gatewaySensorCount, pointSensors, searchTech, techTotals, type TechData } from "@/lib/technical";

const base = { plant_id: "p1", created_by: "", created_at: "2026-01-01", updated_at: "2026-01-01" };
const sensor = (id: string, serial: string, status: string, install: string, gateway: string | null = "g1") => ({
  ...base, id, point_id: "pt1", gateway_id: gateway, serial_no: serial, sensor_type: "Node 6", model: "", install_date: install,
  commission_date: null, firmware: "", battery: "", comm_status: "", status, notes: "", replaced_by: null, removed_date: null,
});
const d = {
  areas: [{ ...base, id: "a1", name: "Boiler House", code: "", description: "", status: "active" }],
  machines: [{ ...base, id: "m1", area_id: "a1", name: "Boiler Feed Pump-1", tag: "BFP-01", machine_type: "Pump", manufacturer: "", model: "", rated_kw: "", rated_rpm: "", operating_rpm: "", criticality: "", status: "running", notes: "" }],
  points: [{ ...base, id: "pt1", machine_id: "m1", name: "Motor DE", component: "", position: "", orientation: "", bearing_no: "", notes: "", status: "active" }],
  gateways: [{ ...base, id: "g1", area_id: null, name: "GW-ATUL-01", serial_no: "GW1", model: "", location: "", install_date: null, ip_address: "", connectivity: "", network_type: "", firmware: "", status: "online", notes: "" }],
  sensors: [sensor("s1", "N6-2411589", "replaced", "2026-01-05"), sensor("s2", "N6-2518742", "installed", "2026-10-16")],
  events: [],
} as TechData;

describe("technical register", () => {
  it("replaced sensor stays as history, new one is current at the point", () => {
    const r = pointSensors(d, "pt1");
    expect(r.current?.serial_no).toBe("N6-2518742");
    expect(r.previous.map((s) => s.serial_no)).toEqual(["N6-2411589"]);
  });
  it("totals and gateway counts ignore retired sensors", () => {
    expect(techTotals(d)).toMatchObject({ areas: 1, machines: 1, points: 1, sensors: 1, gateways: 1, issues: 0 });
    expect(gatewaySensorCount(d, "g1")).toBe(1);
  });
  it("a sensor under troubleshooting counts as an issue", () => {
    expect(techTotals({ ...d, sensors: [sensor("s3", "X", "troubleshooting", "2026-10-01")] }).issues).toBe(1);
  });
  it("search finds sensor serial and machine tag", () => {
    expect(searchTech(d, "2518742")[0]).toMatchObject({ kind: "sensor", id: "s2" });
    expect(searchTech(d, "bfp-01")[0]).toMatchObject({ kind: "machine", id: "m1" });
  });
  it("export writes one row per point with its current sensor", () => {
    const lines = buildTechCsv(d, "ATUL").split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("N6-2518742");
    expect(lines[1]).not.toContain("N6-2411589");
  });
});
