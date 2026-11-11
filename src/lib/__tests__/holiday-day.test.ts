import { describe, it, expect } from "vitest";
import { dayKind } from "@/lib/access";
import { dateRange } from "@/lib/workload";

describe("company holidays", () => {
  it("holiday inside approved leave counts as Holiday, not Leave", () => expect(dayKind(true, false, false, false, false, true)).toBe("holiday"));
  it("weekend inside leave is not counted as leave", () => expect(dayKind(true, true, false, false)).toBe("off"));
  it("site work on a holiday is Holiday work", () => expect(dayKind(false, false, true, false, false, true)).toBe("weekend"));
  it("leave on a working day is still Leave", () => expect(dayKind(true, false, false, false)).toBe("leave"));
  it("date range expands every date inclusive", () => expect(dateRange("2026-11-10", "2026-11-13")).toEqual(["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"]));
});
