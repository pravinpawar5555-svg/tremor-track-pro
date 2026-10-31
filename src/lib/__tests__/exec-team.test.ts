import { describe, expect, it } from "vitest";
import { jobEngineerIds, onJob, swapEngineer } from "@/lib/exec-team";

const job = { assignedEngineerId: "e1", secondaryEngineerId: "e2", engineerIds: ["e1", "e2", "cs1", "m1"] };

describe("execution job team", () => {
  it("keeps every selected person, lead first, no duplicates", () => {
    expect(jobEngineerIds(job)).toEqual(["e1", "e2", "cs1", "m1"]);
  });
  it("counts a job for any engineer on it, not only the first two", () => {
    expect(onJob(job, "cs1")).toBe(true);
    expect(onJob(job, "e3")).toBe(false);
  });
  it("handing over replaces only that person", () => {
    const n = swapEngineer(job, "e2", "e3");
    expect(n.secondaryEngineerId).toBe("e3");
    expect(n.engineerIds).toEqual(["e1", "e3", "cs1", "m1"]);
  });
});
