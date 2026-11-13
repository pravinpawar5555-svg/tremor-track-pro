import { describe, expect, it } from "vitest";
import { dayKind } from "@/lib/access";
import { effectiveLeaves, leaveOn, wfhOn, WFH_REASON, type Leave } from "@/lib/workload";
const l = (reason: string, status = "approved"): Leave => ({ id: "1", personId: "p", start: "2026-11-12", end: "2026-11-12", reason, note: "", status });
describe("WFH days", () => {
  it("approved WFH shows as WFH, not leave", () => {
    expect(wfhOn([l(WFH_REASON)], "p", "2026-11-12")).toBeTruthy();
    expect(leaveOn([l(WFH_REASON)], "p", "2026-11-12")).toBeUndefined();
    expect(dayKind(false, false, false, false, true)).toBe("wfh");
  });
  it("pending WFH does not count", () => expect(wfhOn([l(WFH_REASON, "pending")], "p", "2026-11-12")).toBeUndefined());
  it("site work wins over WFH", () => expect(dayKind(false, false, true, false, true)).toBe("site"));
  it.each([
    ["eng-d61pqda", "2026-11-09", "2026-11-20"],
    ["eng-7327n69", "2026-11-06", "2026-11-19"],
  ])("approved November 13 WFH replaces overlapping leave for %s", (personId, start, end) => {
    const rows: Leave[] = [
      { ...l("Casual"), id: "leave", personId, start, end },
      { ...l(WFH_REASON), id: "wfh", personId, start: "2026-11-13", end: "2026-11-13" },
    ];
    expect(leaveOn(rows, personId, "2026-11-13")).toBeUndefined();
    expect(dayKind(true, false, false, false, !!wfhOn(rows, personId, "2026-11-13"))).toBe("wfh");
    expect(effectiveLeaves(rows).filter((x) => !isHome(x)).map((x) => [x.start, x.end])).toEqual([[start, "2026-11-12"], ["2026-11-14", end]]);
    expect(leaveOn(rows, personId, "2026-11-12")?.id).toBe("leave");
  });
  it("pending or rejected WFH never removes leave", () => {
    for (const status of ["pending", "rejected"]) {
      const rows = [l("Casual"), { ...l(WFH_REASON, status), id: "wfh" }];
      expect(leaveOn(rows, "p", "2026-11-12")?.reason).toBe("Casual");
      expect(effectiveLeaves(rows)).toHaveLength(2);
    }
  });
  it("full overlap removes visible leave but preserves the original request", () => {
    const rows = [l("Casual"), { ...l(WFH_REASON), id: "wfh" }];
    expect(effectiveLeaves(rows).map((x) => x.id)).toEqual(["wfh"]);
    expect(rows).toHaveLength(2);
  });
  it("WFH with overlapping leave remains Site on a site working day", () => expect(dayKind(true, false, true, false, true)).toBe("site"));
  it("company holidays still override WFH and leave", () => expect(dayKind(true, false, false, false, true, true)).toBe("holiday"));
});
const isHome = (row: Leave) => row.reason === WFH_REASON;
