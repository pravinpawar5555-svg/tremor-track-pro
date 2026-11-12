import { describe, expect, it } from "vitest";
import { conditionTrend, machineHistory, previouslyObserved, sensorChangesSince, showFault, showText } from "@/lib/machine-history";
import { blankAnalysis, type MachineAnalysis } from "@/lib/ticket-analysis";

const done = (machine: string, area: string, extra: Partial<MachineAnalysis> = {}): MachineAnalysis => ({
  ...blankAnalysis(machine, area), condition: "monitor", fault: "Gear Defect", observation: "o", recommendation: "r", status: "complete", ...extra,
});
const t = (id: string, date: string, analysis: MachineAnalysis[], plantId = "p1") => ({ id, ticketNo: `FM-${id}`, plantId, raisedOn: date, assignedTo: "m1", analysis });

describe("machine history", () => {
  const tickets = [
    t("a", "2026-06-10", [done("Kobe Compressor", "Kobe Comp", { machineId: "M1", condition: "attention" })]),
    t("b", "2026-11-02", [done("Kobe Compressor", "Kobe Comp", { machineId: "M1" }), done("ID Fan 1", "Boiler")]),
    t("c", "2026-11-05", [done("Kobe Compressor", "Kobe Comp", { machineId: "M2" })]),
    t("d", "2026-11-06", [{ ...done("Kobe Compressor", "Kobe Comp", { machineId: "M1" }), status: "draft" }]),
    t("e", "2026-11-07", [done("Kobe Compressor", "Kobe Comp", { machineId: "M1" })], "p2"),
    t("cur", "2026-11-12", [done("Kobe Compressor", "Kobe Comp", { machineId: "M1" })]),
  ];
  it("links by machine id, newest first, completed only, same plant, excluding the current ticket", () => {
    const h = machineHistory(tickets, { plantId: "p1", machineId: "M1", machine: "Kobe Compressor", area: "Kobe Comp" }, "cur");
    expect(h.map((x) => x.ticketId)).toEqual(["b", "a"]);
  });
  it("each machine only sees its own history", () => {
    const h = machineHistory(tickets, { plantId: "p1", machine: "ID Fan 1", area: "Boiler" }, "cur");
    expect(h.map((x) => x.ticketId)).toEqual(["b"]);
  });
  it("first-time machine has no history", () => {
    expect(machineHistory(tickets, { plantId: "p1", machineId: "M9", machine: "BFP Pump 1", area: "Boiler" })).toEqual([]);
  });
  it("condition comparison is informational", () => {
    expect(conditionTrend("monitor", "attention")).toBe("escalated");
    expect(conditionTrend("attention", "normal")).toBe("improved");
    expect(conditionTrend("monitor", "")).toBeNull();
  });
  it("previously observed fault matches exactly", () => {
    const h = machineHistory(tickets, { plantId: "p1", machineId: "M1", machine: "Kobe Compressor", area: "Kobe Comp" }, "cur");
    expect(previouslyObserved(h, "gear defect")?.ticketId).toBe("b");
    expect(previouslyObserved(h, "Unbalance")).toBeNull();
    expect(previouslyObserved(h, "None")).toBeNull();
  });
  it("cleans ugly stored values for display", () => {
    expect(showFault("None")).toBe("—");
    expect(showText(" . ")).toBe("Not recorded");
    expect(showText("")).toBe("Not recorded");
  });
  it("flags sensor change only after the previous analysis", () => {
    const pts = [{ id: "pt", name: "Motor DE", machine_id: "M1" }];
    const s = (id: string, serial: string, status: string, install: string) => ({ id, point_id: "pt", serial_no: serial, status, install_date: install, removed_date: null, created_at: install });
    const sensors = [s("1", "N6-2411589", "replaced", "2026-01-01"), s("2", "N6-2518742", "installed", "2026-10-16")];
    expect(sensorChangesSince(pts, sensors, "M1", "2026-08-15")).toEqual([{ pointName: "Motor DE", previous: "N6-2411589", current: "N6-2518742", changed: "2026-10-16" }]);
    expect(sensorChangesSince(pts, sensors, "M1", "2026-11-02")).toEqual([]);
  });
});
