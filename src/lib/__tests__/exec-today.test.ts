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
