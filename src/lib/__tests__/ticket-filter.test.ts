import { describe, expect, it } from "vitest";
import { DEFAULT_TICKET_FILTER, matchesTicketFilter, selectedFilteredTicket } from "../ticket-filter";

describe("ticket status filters", () => {
  it("defaults to open tickets only", () => {
    expect(DEFAULT_TICKET_FILTER).toBe("open");
    expect(["open", "in-discussion", "responded", "closed"].filter((status) =>
      matchesTicketFilter(status as "open" | "in-discussion" | "responded" | "closed", DEFAULT_TICKET_FILTER),
    )).toEqual(["open"]);
  });

  it("shows responded tickets only under the responded filter", () => {
    expect(matchesTicketFilter("responded", "open")).toBe(false);
    expect(matchesTicketFilter("responded", "responded")).toBe(true);
    expect(matchesTicketFilter("open", "responded")).toBe(false);
  });

  it("keeps discussion and closed filters exact and All inclusive", () => {
    for (const status of ["open", "in-discussion", "responded", "closed"] as const) {
      expect(matchesTicketFilter(status, "in-discussion")).toBe(status === "in-discussion");
      expect(matchesTicketFilter(status, "closed")).toBe(status === "closed");
      expect(matchesTicketFilter(status, "all")).toBe(true);
    }
  });

  it("never shows a selected ticket outside the current filtered list", () => {
    expect(selectedFilteredTicket([{ id: "open-ticket" }], "responded-ticket")).toEqual({ id: "open-ticket" });
    expect(selectedFilteredTicket([], "responded-ticket")).toBeUndefined();
    expect(selectedFilteredTicket([{ id: "first" }, { id: "second" }], "second")).toEqual({ id: "second" });
  });
});