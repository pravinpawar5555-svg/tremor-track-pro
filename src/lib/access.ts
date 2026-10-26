// Pure role/count rules shared by the UI and covered by src/lib/__tests__/role-access.test.ts.
import type { Domain } from "@/lib/domain";
import type { ExecJob, ExecSiteVisit } from "@/lib/execution";
import { levelOf, PATH_MODULE, type Perm } from "@/lib/permissions";

export const NAV_PATHS = ["/", "/tasks", "/discussions", "/visits", "/execution", "/opportunities", "/reports", "/plants", "/contacts", "/engineers", "/settings"] as const;
export type NavPath = (typeof NAV_PATHS)[number];

/** Which main tabs a login sees. `perms` (role access matrix from Settings) overrides the defaults when loaded. */
export function navAllowed(manager: boolean, domain: Domain, to: string, perms?: Perm[] | null): boolean {
  if (manager) return true;
  if (to === "/settings") return false;
  const mod = PATH_MODULE[to];
  if (perms && perms.length && mod && (domain === "customer_success" || domain === "execution")) return levelOf(perms, domain, mod, "view") !== "none";
  if (to === "/engineers") return false;
  if (domain === "execution") return to !== "/visits" && to !== "/reports";
  return to !== "/execution";
}

/** Execution screen scoping and tab counts. meExecId = the login's Execution Engineer record (null for manager). */
export function execScope(jobs: ExecJob[], visits: ExecSiteVisit[], meExecId: string | null, today: string) {
  const visible = meExecId ? jobs.filter((j) => j.assignedEngineerId === meExecId || j.secondaryEngineerId === meExecId) : jobs;
  const myVisits = meExecId ? visits.filter((v) => v.engineerIds.includes(meExecId)) : visits;
  return {
    visible,
    myVisits,
    leadCount: visible.filter((j) => j.status === "lead" || j.status === "planning").length,
    visitsMonth: myVisits.filter((v) => v.visitDate.slice(0, 7) === today.slice(0, 7)).length,
  };
}

const jStart = (j: ExecJob) => j.actualStart || j.plannedStart || j.expectedDate || "";
const jEnd = (j: ExecJob) => j.actualEnd || j.plannedEnd || jStart(j);

/** Whether an Execution Engineer is on site on a day: a job in progress, a demo removal, or a non-job site visit. */
export function execOnSite(jobs: ExecJob[], visits: ExecSiteVisit[], id: string, d: string) {
  const mine = jobs.filter((j) => (j.assignedEngineerId === id || j.secondaryEngineerId === id) && j.status !== "cancelled");
  const job = mine.find((z) => jStart(z) && d >= jStart(z) && d <= jEnd(z)) ?? mine.find((z) => z.removalPlanned === d || z.removalCompleted === d);
  const visit = visits.find((v) => v.visitDate === d && v.engineerIds.includes(id));
  return { job, visit, site: !!job || !!visit };
}

export type DayKind = "site" | "office" | "leave" | "off" | "weekend";
export function dayKind(onLeave: boolean, nonWorking: boolean, site: boolean, worked: boolean): DayKind {
  if (onLeave) return "leave";
  if (nonWorking) return site || worked ? "weekend" : "off";
  return site ? "site" : "office";
}
