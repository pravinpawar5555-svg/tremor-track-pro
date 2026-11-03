import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { normSerial, deviceBlocker } from "@/lib/technical";

describe("serial rule", () => {
  it("treats spacing and case differences as the same serial", () => {
    expect(normSerial(" sn 62041 ")).toBe("SN62041");
    expect(normSerial("SN62041")).toBe(normSerial("sn62041"));
  });
  it("blocks deleting a gateway that still has active sensors", () => {
    const d = { areas: [], machines: [], points: [], events: [], gateways: [], sensors: [{ id: "s1", gateway_id: "g1", status: "installed" }] } as never;
    expect(deviceBlocker(d, "gateway", "g1")).toMatch(/1 sensor/);
    expect(deviceBlocker(d, "gateway", "g2")).toBeNull();
  });
});
