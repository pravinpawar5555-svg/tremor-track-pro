import { describe, expect, it } from "vitest";
import {
  analysisProgress,
  analysisRows,
  blankAnalysis,
  markNormal,
  nextPendingIndex,
  reviewStage,
  NORMAL_OBSERVATION,
  type MachineAnalysis,
} from "../ticket-analysis";

const done = (m: string, condition: MachineAnalysis["condition"]): MachineAnalysis => ({
  ...blankAnalysis(m, "A"),
  condition,
  observation: "x",
  recommendation: "y",
  status: "complete",
});

describe("ticket machine-wise analysis", () => {
  it("old single-machine tickets show exactly one pending row", () => {
    const rows = analysisRows({ machine: "BFP 2A", area: "Boiler" });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.machine).toBe("BFP 2A");
    expect(rows[0]?.status).toBe("pending");
  });

  it("progress counts reviewed, pending, normal and attention", () => {
    const rows = [done("m1", "normal"), done("m2", "abnormal"), done("m3", "monitor"), blankAnalysis("m4")];
    expect(analysisProgress(rows)).toMatchObject({ total: 4, reviewed: 3, pending: 1, normal: 1, monitor: 1, attention: 1 });
  });

  it("Save & Next opens the next machine still pending", () => {
    const rows = [done("m1", "normal"), blankAnalysis("m2"), done("m3", "normal"), blankAnalysis("m4")];
    expect(nextPendingIndex(rows, 1)).toBe(3);
    expect(nextPendingIndex(rows, 3)).toBe(1);
    expect(nextPendingIndex([done("m1", "normal")], 0)).toBe(-1);
  });

  it("Mark as Normal fills defaults", () => {
    const a = markNormal(blankAnalysis("m1"));
    expect(a.condition).toBe("normal");
    expect(a.fault).toBe("None");
    expect(a.observation).toBe(NORMAL_OBSERVATION);
  });

  it("ticket is only ready to publish when every machine is complete", () => {
    expect(reviewStage([blankAnalysis("a"), blankAnalysis("b")], false)).toBe("under-review");
    expect(reviewStage([done("a", "normal"), blankAnalysis("b")], false)).toBe("partial");
    expect(reviewStage([done("a", "normal"), done("b", "critical")], false)).toBe("ready");
    expect(reviewStage([done("a", "normal")], true)).toBe("published");
  });
});

import { isEscalated } from "../ticket-analysis";
describe("ticket escalation SLA", () => {
  const base = { status: "open", priority: "medium", raisedOn: "2026-10-01", raisedAt: "10:00", analysis: [] as never[] };
  const now = new Date("2026-10-02T10:30:00");
  it("escalates a high priority ticket unreviewed for more than 24 hours", () => {
    expect(isEscalated({ ...base, priority: "high" }, now)).toBe(true);
  });
  it("does not escalate before 24 hours", () => {
    expect(isEscalated({ ...base, priority: "high" }, new Date("2026-10-02T09:59:00"))).toBe(false);
  });
  it("escalates when a machine needs more information", () => {
    expect(isEscalated({ ...base, analysis: [{ status: "more-info", severity: "" }] as never }, now)).toBe(true);
  });
  it("ignores normal tickets and responded ones", () => {
    expect(isEscalated(base, now)).toBe(false);
    expect(isEscalated({ ...base, priority: "critical", status: "responded" }, now)).toBe(false);
  });
});
