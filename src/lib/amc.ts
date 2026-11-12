/** AMC contract status rules — pure, shared by Plants and the Manager Dashboard. */
export const AMC_WINDOW = 60;
export type AmcState = "none" | "active" | "renewal" | "expired";

type DatedPlant = { category?: string; amcEnd?: string | null };

/** Demo dates share storage with AMC dates, but never represent a contract. */
export function plantAmcStatus(plant: DatedPlant, today: string) {
  return plant.category === "demo" ? { state: "none" as const, days: null } : amcStatus(plant.amcEnd, today);
}

export function demoFollowUp(plant: DatedPlant & { id: string; name: string }) {
  if (plant.category !== "demo" || !plant.amcEnd) return null;
  return {
    plantId: plant.id,
    date: plant.amcEnd,
    title: `Demo end follow-up — ${plant.name}`,
    description: "Review demo results with the customer; confirm demo closure and next steps for quotation or order in Leads & Opportunities.",
  };
}

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
