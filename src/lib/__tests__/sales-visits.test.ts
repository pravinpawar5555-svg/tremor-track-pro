import { describe, expect, it } from "vitest";
import { blankSalesVisit, hasPotential, matchesFilter, salesSummary, statusAfterCompletion } from "@/lib/sales-visits";

const v = (o: Partial<ReturnType<typeof blankSalesVisit>>) => ({ ...blankSalesVisit("u1"), ...o });

describe("sales visits", () => {
  it("follow-up next steps mark the visit Follow-up Required", () => {
    expect(statusAfterCompletion("Follow-up Call", "Customer Interested")).toBe("followup");
    expect(statusAfterCompletion("No Further Action", "No Immediate Opportunity")).toBe("completed");
    expect(statusAfterCompletion("Create Lead", "Follow-up Required")).toBe("followup");
  });
  it("potential is shown for business outcomes or an explicit yes, never auto for no", () => {
    expect(hasPotential({ outcome: "Potential Identified", potential: "" })).toBe(true);
    expect(hasPotential({ outcome: "Other", potential: "yes" })).toBe(true);
    expect(hasPotential({ outcome: "Customer Not Interested", potential: "no" })).toBe(false);
  });
  it("planned visits are not counted as potential; cancelled are excluded from summary", () => {
    const list = [
      v({ status: "planned", outcome: "Potential Identified" }),
      v({ status: "completed", outcome: "Potential Identified" }),
      v({ status: "followup", outcome: "Follow-up Required" }),
      v({ status: "cancelled" }),
    ];
    expect(list.filter((x) => matchesFilter(x, "potential")).length).toBe(1);
    const s = salesSummary(list);
    expect(s).toMatchObject({ planned: 1, completed: 2, followup: 1, potential: 1 });
  });
});
