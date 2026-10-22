/** AMC contract status rules — pure, shared by Plants and the Manager Dashboard. */
export const AMC_WINDOW = 60;
export type AmcState = "none" | "active" | "renewal" | "expired";

export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86400000);
}

export function amcStatus(amcEnd: string | null | undefined, today: string): { state: AmcState; days: number | null } {
  if (!amcEnd) return { state: "none", days: null };
  const days = daysBetween(today, amcEnd);
  if (days < 0) return { state: "expired", days };
  if (days <= AMC_WINDOW) return { state: "renewal", days };
  return { state: "active", days };
}
