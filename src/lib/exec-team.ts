// Pure helpers for the people on an execution job (covered by __tests__/exec-team.test.ts).
export type TeamJob = { assignedEngineerId: string; secondaryEngineerId: string; engineerIds?: string[] };

export function uniqIds(ids: (string | null | undefined)[]) {
  return [...new Set(ids.filter((x): x is string => !!x))];
}
/** All people on a job (lead first). */
export function jobEngineerIds(j: TeamJob) {
  return uniqIds([j.assignedEngineerId, j.secondaryEngineerId, ...(j.engineerIds ?? [])]);
}
export function onJob(j: TeamJob, id: string) {
  return !!id && jobEngineerIds(j).includes(id);
}
/** Swap one person for another on a job, keeping lead / second slots in step. */
export function swapEngineer<T extends TeamJob>(j: T, fromId: string, toId: string): T {
  const sw = (x: string) => (x === fromId ? toId : x);
  return { ...j, assignedEngineerId: sw(j.assignedEngineerId), secondaryEngineerId: sw(j.secondaryEngineerId), engineerIds: uniqIds(jobEngineerIds(j).map(sw)) };
}

