import { describe, expect, it } from "vitest";
import { amcStatus } from "../amc";

describe("AMC 60-day renewal countdown", () => {
  it("no end date → none", () => expect(amcStatus(null, "2026-10-22").state).toBe("none"));
  it("exactly 60 days left → renewal", () => expect(amcStatus("2026-12-21", "2026-10-22")).toEqual({ state: "renewal", days: 60 }));
  it("61 days left → active", () => expect(amcStatus("2026-12-22", "2026-10-22").state).toBe("active"));
  it("ends today → renewal with 0 days", () => expect(amcStatus("2026-10-22", "2026-10-22")).toEqual({ state: "renewal", days: 0 }));
  it("past end → expired", () => expect(amcStatus("2026-10-20", "2026-10-22")).toEqual({ state: "expired", days: -2 }));
});
