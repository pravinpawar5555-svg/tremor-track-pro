import { describe, expect, it } from "vitest";
import { dayKind } from "@/lib/access";
import { leaveOn, wfhOn, WFH_REASON, type Leave } from "@/lib/workload";
const l = (reason: string, status = "approved"): Leave => ({ id: "1", personId: "p", start: "2026-11-12", end: "2026-11-12", reason, note: "", status });
describe("WFH days", () => {
  it("approved WFH shows as WFH, not leave", () => {
    expect(wfhOn([l(WFH_REASON)], "p", "2026-11-12")).toBeTruthy();
    expect(leaveOn([l(WFH_REASON)], "p", "2026-11-12")).toBeUndefined();
    expect(dayKind(false, false, false, false, true)).toBe("wfh");
  });
  it("pending WFH does not count", () => expect(wfhOn([l(WFH_REASON, "pending")], "p", "2026-11-12")).toBeUndefined());
  it("site work wins over WFH", () => expect(dayKind(false, false, true, false, true)).toBe("site"));
});
