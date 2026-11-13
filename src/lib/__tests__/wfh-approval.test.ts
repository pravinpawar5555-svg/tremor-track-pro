import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn(), order: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.from.mockReturnValue({ update: mocks.update, select: mocks.select });
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ single: mocks.single, order: mocks.order });
  mocks.order.mockResolvedValue({ data: [], error: null });
});

it("only confirms approval after the saved approved row reads back", async () => {
  mocks.single.mockResolvedValue({ data: { id: "wfh", status: "approved" }, error: null });
  const { reviewLeave } = await import("@/lib/workload");
  await reviewLeave("wfh", true, "Pravin Pawar");
  expect(mocks.update).toHaveBeenCalledWith({ status: "approved", reviewed_by: "Pravin Pawar" });
  expect(mocks.eq).toHaveBeenCalledWith("id", "wfh");
  expect(mocks.order).toHaveBeenCalledWith("start_date");
});

it("does not report approval success when no permitted row was updated", async () => {
  mocks.single.mockResolvedValue({ data: null, error: null });
  const { reviewLeave } = await import("@/lib/workload");
  await expect(reviewLeave("wfh", true, "Pravin Pawar")).rejects.toThrow("Approval could not be confirmed");
  expect(mocks.order).not.toHaveBeenCalled();
});