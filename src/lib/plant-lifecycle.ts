export type PlantStatus = "active" | "sales_followup" | "closed_lost";
export type PlantLifecycleAction = "removed" | "won" | "lost" | "reopen";
export interface LifecycleHistory { from: PlantStatus; to: PlantStatus; date: string; by: string; note: string; removed_date?: string }
export const plantStatus = (plant: { operationalStatus?: PlantStatus }) => plant.operationalStatus ?? "active";
export function lifecycleChange(action: PlantLifecycleAction, date: string, note: string, followup: string) {
  if (action === "removed" && !date) throw new Error("Sensor removal date is required");
  if (action === "lost" && !note.trim()) throw new Error("Lost-order reason is required");
  return { operational_status: action === "removed" || action === "reopen" ? "sales_followup" : action === "lost" ? "closed_lost" : "active", ...(action === "won" ? { category: "order" } : {}), ...(action === "removed" ? { demo_removed_date: date } : {}), sales_followup_date: action === "lost" || action === "won" ? null : followup || null, lifecycle_note: note.trim() };
}