import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn(), single: vi.fn(), select: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/lib/store", () => ({ fmtDate: (date: string) => date }));

const input = {
  jobId: "job-1", workDate: "2026-10-29", remark: "Checked sensor installation",
  workCompleted: "Installed 4 sensors", pendingNextAction: "Check network tomorrow",
  attachmentLink: "https://example.com/report", createdBy: "Engineer",
};
const saved = {
  id: "update-1", job_id: input.jobId, work_date: input.workDate, remark: input.remark,
  work_completed: input.workCompleted, pending_next_action: input.pendingNextAction,
  attachment_link: input.attachmentLink, created_by: input.createdBy, created_at: "2026-10-29T03:17:00Z",
};

describe("Execution remark saving", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.from.mockImplementation((table: string) => table === "execution_daily_updates"
      ? { insert: mocks.insert }
      : { insert: () => ({ select: async () => ({ data: [{ id: "activity-1", job_id: input.jobId }], error: null }) }) });
    mocks.insert.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ single: mocks.single });
  });

  it("sends every daily-update field using the database column names and reads back the saved remark", async () => {
    mocks.single.mockResolvedValue({ data: saved, error: null });
    const { addDailyUpdate, updatesFor } = await import("@/lib/execution");
    await addDailyUpdate(input, "Engineer");
    expect(mocks.insert).toHaveBeenCalledWith({ ...saved, id: expect.any(String), created_at: undefined });
    expect(updatesFor("job-1")).toEqual([{ ...input, id: saved.id, createdAt: saved.created_at }]);
  });

  it("keeps a rejected remark out of saved history and propagates the failure", async () => {
    const error = new Error("Save rejected");
    mocks.single.mockResolvedValue({ data: null, error });
    mocks.insert.mockReturnValue({ select: mocks.select, error });
    const { addDailyUpdate, updatesFor } = await import("@/lib/execution");
    await expect(addDailyUpdate(input, "Engineer")).rejects.toThrow("Save rejected");
    expect(updatesFor("job-1")).toEqual([]);
    expect(mocks.from).not.toHaveBeenCalledWith("execution_activity");
  });
});