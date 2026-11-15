import type { TicketStatus } from "./store";

export type TicketFilter = TicketStatus | "all";
export const DEFAULT_TICKET_FILTER: TicketFilter = "open";

export function matchesTicketFilter(status: TicketStatus, filter: TicketFilter): boolean {
  return filter === "all" || status === filter;
}

export function selectedFilteredTicket<T extends { id: string }>(tickets: readonly T[], selectedId: string | null): T | undefined {
  return tickets.find((ticket) => ticket.id === selectedId) ?? tickets[0];
}