import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), upsert: vi.fn(), select: vi.fn(), single: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));

const settings = {
  csHigh: null, csOver: null, execHigh: null, execOver: null,
  nonWorkingDays: [0, 6], holidays: ["2026-10-20"],
  holidayNames: { "2026-10-20": "Dussehra" },
};

describe("holiday persistence", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ upsert: mocks.upsert });
    mocks.upsert.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ single: mocks.single });
  });

  it("adding a date preserves existing dates and names", async () => {
    const { addHolidayDates } = await import("@/lib/workload");
    const next = addHolidayDates(settings, ["2026-11-09", "2026-11-10"], "Diwali");
    expect(next.holidays).toEqual(["2026-10-20", "2026-11-09", "2026-11-10"]);
    expect(next.holidayNames).toEqual({
      "2026-10-20": "Dussehra",
      "2026-11-09": "Diwali",
      "2026-11-10": "Diwali",
    });
    expect(settings.holidays).toEqual(["2026-10-20"]);
  });

  it("renaming a holiday never removes its date", async () => {
    const { renameHoliday } = await import("@/lib/workload");
    const next = renameHoliday(settings, "2026-10-20", "Dussehra Holiday");
    expect(next.holidays).toEqual(["2026-10-20"]);
    expect(next.holidayNames["2026-10-20"]).toBe("Dussehra Holiday");
  });

  it("saves dates and names together, then reads back the saved row", async () => {
    mocks.single.mockResolvedValue({ data: {
      cs_high: null, cs_over: null, exec_high: null, exec_over: null,
      non_working_days: [0, 6], holidays: ["2026-10-20"],
      holiday_names: { "2026-10-20": "Dussehra" },
    }, error: null });
    const { saveWorkloadSettings } = await import("@/lib/workload");
    await saveWorkloadSettings(settings, "Pravin Pawar");
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      id: "default",
      holidays: ["2026-10-20"],
      holiday_names: { "2026-10-20": "Dussehra" },
      updated_by: "Pravin Pawar",
    }));
    expect(mocks.single).toHaveBeenCalledOnce();
  });

  it("does not accept an unconfirmed save", async () => {
    mocks.single.mockResolvedValue({ data: null, error: { message: "Save rejected" } });
    const { saveWorkloadSettings } = await import("@/lib/workload");
    await expect(saveWorkloadSettings(settings, "Pravin Pawar")).rejects.toThrow("Save rejected");
  });
});
