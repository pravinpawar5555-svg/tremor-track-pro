import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { blankOpp, fromOpp, oppTypes, toOpp } from "@/lib/opportunities";

describe("Exhibition opportunities", () => {
  it("offers Exhibition as an opportunity type", () => {
    expect(oppTypes).toContain("Exhibition");
  });

  it("round-trips exhibition name independently from the customer", () => {
    const opportunity = { ...blankOpp("user-1"), type: "Exhibition", customerName: "Test Customer", exhibitionName: "Engineering Expo" };
    const row = fromOpp(opportunity, "user-1");
    expect(row.exhibition_name).toBe("Engineering Expo");
    const saved = toOpp(row);
    expect(saved.exhibitionName).toBe("Engineering Expo");
    expect(saved.customerName).toBe("Test Customer");
  });

  it("round-trips exhibition location without changing plant location", () => {
    const opportunity = { ...blankOpp("user-1"), type: "Exhibition", location: "Chakan plant", exhibitionLocation: "Pune exhibition centre" };
    const row = fromOpp(opportunity, "user-1");
    expect(row.exhibition_location).toBe("Pune exhibition centre");
    const saved = toOpp(row);
    expect(saved.exhibitionLocation).toBe("Pune exhibition centre");
    expect(saved.location).toBe("Chakan plant");
  });

  it("defaults missing exhibition details to blank for existing leads", () => {
    const row = fromOpp(blankOpp("user-1"), "user-1");
    const { exhibition_name: _name, exhibition_location: _location, ...legacy } = row;
    expect(toOpp(legacy).exhibitionName).toBe("");
    expect(toOpp(legacy).exhibitionLocation).toBe("");
  });
});