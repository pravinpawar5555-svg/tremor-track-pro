import { describe, it, expect } from "vitest";
import { navAllowed } from "@/lib/access";
import { levelOf, type Perm } from "@/lib/permissions";

describe("role access matrix", () => {
  it("missing rows keep today's level 'own'", () => expect(levelOf([], "execution", "plants", "view")).toBe("own"));
  it("admin can open Execution for CS engineers", () => {
    const p: Perm[] = [{ role: "customer_success", module: "execution", action: "view", level: "all" }];
    expect(navAllowed(false, "customer_success", "/execution", p)).toBe(true);
  });
  it("deny hides a tab", () => {
    const p: Perm[] = [{ role: "execution", module: "plants", action: "view", level: "none" }];
    expect(navAllowed(false, "execution", "/plants", p)).toBe(false);
  });
  it("Settings stays manager-only", () => {
    const p: Perm[] = [{ role: "execution", module: "settings", action: "view", level: "all" }];
    expect(navAllowed(false, "execution", "/settings", p)).toBe(false);
    expect(navAllowed(true, "manager", "/settings", p)).toBe(true);
  });
});
