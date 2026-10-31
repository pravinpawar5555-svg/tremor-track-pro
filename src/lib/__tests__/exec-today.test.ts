import { describe, expect, it } from "vitest";
import { isDueToday, isOverdue, needsRemark } from "@/lib/exec-today";
import type { ExecJob } from "@/lib/execution";

const job = (p: Partial<ExecJob>) => ({ status: "scheduled", plannedStart: null, plannedEnd: null, actualStart: null, ...p }) as ExecJob;
const T = "2026-10-31";

describe("execution today rules", () => {
  it("overdue when planned end passed and not closed", () => {
    expect(isOverdue(job({ status: "in_progress", plannedEnd: "2026-10-30" }), T)).toBe(true);
    expect(isOverdue(job({ status: "completed", plannedEnd: "2026-10-30" }), T)).toBe(false);
  });
  it("due today inside planned range", () => {
    expect(isDueToday(job({ plannedStart: "2026-10-29", plannedEnd: "2026-11-02" }), T)).toBe(true);
    expect(isDueToday(job({ plannedStart: "2026-11-01" }), T)).toBe(false);
  });
  it("red dot after 2 days without remark", () => {
    expect(needsRemark(job({ status: "in_progress" }), "2026-10-29", T)).toBe(true);
    expect(needsRemark(job({ status: "in_progress" }), "2026-10-30", T)).toBe(false);
  });
});

import { attentionItems, focusJobs, isReadyToClose, jobBucket } from "@/lib/exec-today";
describe("ready to close + attention", () => {
  const base = { id: "x", status: "in_progress", sensorsInstalled: 4, machinesCovered: 2, configuration: "yes", aip: "no", reportLink: "", installationType: "order", plannedStart: "2026-11-01", plannedEnd: "2026-11-30", pendingReason: "" } as any;
  it("in-progress job with sensors, machines and configuration is ready to close", () => {
    expect(isReadyToClose(base)).toBe(true);
    expect(jobBucket(base)).toBe("ready");
  });
  it("configuration still missing keeps it in progress", () => {
    expect(jobBucket({ ...base, configuration: "no" })).toBe("in_progress");
  });
  it("attention hides zero rows and flags AIP + report link", () => {
    const keys = attentionItems([base], () => "2026-11-05", "2026-11-05").map((a) => a.key);
    expect(keys).toEqual(["aip", "report"]);
  });
  it("focus falls back to ready-to-close when nothing upcoming", () => {
    expect(focusJobs([base]).map((j) => j.id)).toEqual(["x"]);
  });
});
