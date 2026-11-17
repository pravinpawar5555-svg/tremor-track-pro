import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), delete: vi.fn(), eq: vi.fn(), select: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
import { removePeriod } from "../billing";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockReturnValue({ delete: mocks.delete });
  mocks.delete.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ eq: mocks.eq, select: mocks.select });
});
describe("billing record deletion", () => {
  it("deletes only the selected plant and period", async () => {
    mocks.select.mockResolvedValue({ data: [{ id: "sample" }], error: null });
    await removePeriod("pl-017dne1", "2026-08-01");
    expect(mocks.from).toHaveBeenCalledWith("billing_periods");
    expect(mocks.eq.mock.calls).toEqual([["plant_id", "pl-017dne1"], ["period_start", "2026-08-01"]]);
  });
  it("does not report success when no permitted record was deleted", async () => {
    mocks.select.mockResolvedValue({ data: [], error: null });
    await expect(removePeriod("pl-017dne1", "2026-08-01")).rejects.toThrow("not deleted");
  });
  it("rejects missing identifiers before deleting", async () => {
    await expect(removePeriod("", "2026-08-01")).rejects.toThrow("Select a saved");
    expect(mocks.from).not.toHaveBeenCalled();
  });
});