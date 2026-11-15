import type { RecurringReport, ReportRow } from "@/lib/store";

export function dateOffset(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function deliveryWindow(today: string) {
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const monday = dateOffset(today, -(weekday === 0 ? 6 : weekday - 1));
  return { today, start: monday, end: dateOffset(monday, 6), nextStart: dateOffset(monday, 7), nextEnd: dateOffset(monday, 13) };
}

export type DeliveryLane = "overdue" | "week" | "next" | "later";
export function deliveryLane(due: string, today: string): DeliveryLane {
  const window = deliveryWindow(today);
  if (due < today) return "overdue";
  if (due <= window.end) return "week";
  if (due <= window.nextEnd) return "next";
  return "later";
}

export function pendingSchedules(reports: ReportRow[], schedules: RecurringReport[]) {
  return schedules.filter((schedule) => schedule.active && !reports.some((report) =>
    report.plantId === schedule.plantId && report.type === schedule.type && report.dueDate === schedule.nextDue,
  ));
}