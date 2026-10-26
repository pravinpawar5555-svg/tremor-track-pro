/** Machine-wise analysis for one consolidated ticket. Pure helpers — no store access. */

export type Condition = "normal" | "monitor" | "attention" | "abnormal" | "critical" | "insufficient";
export type AnalysisSeverity = "normal" | "low" | "medium" | "high" | "critical";
export type AnalysisStatus = "pending" | "draft" | "complete" | "more-info";

export interface MachineAnalysis {
  machine: string;
  area: string;
  note: string; // engineer's optional machine-specific note
  condition: Condition | "";
  fault: string;
  severity: AnalysisSeverity | "";
  observation: string;
  recommendation: string;
  status: AnalysisStatus;
  infoRequest: string;
}

export const conditionLabel: Record<Condition, string> = {
  normal: "Normal",
  monitor: "Monitor",
  attention: "Attention Required",
  abnormal: "Abnormal",
  critical: "Critical",
  insufficient: "Data Insufficient",
};
export const allConditions = Object.keys(conditionLabel) as Condition[];

export const severityLabel: Record<AnalysisSeverity, string> = {
  normal: "Normal",
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};
export const allAnalysisSeverities = Object.keys(severityLabel) as AnalysisSeverity[];

export const analysisStatusLabel: Record<AnalysisStatus, string> = {
  pending: "Pending Review",
  draft: "Draft",
  complete: "Analysis Complete",
  "more-info": "More Information Required",
};

export const FAULT_TYPES = [
  "Unbalance",
  "Misalignment",
  "Mechanical Looseness",
  "Bearing Defect",
  "Lubrication Issue",
  "Belt / Sheave Issue",
  "Gear Defect",
  "Resonance",
  "Structural Issue",
  "Electrical Issue",
  "Cavitation",
  "Hydraulic / Flow Issue",
  "Soft Foot",
  "Bent Shaft",
  "Rub",
  "Foundation Issue",
  "Unknown / Requires Verification",
  "Other",
];

export const NORMAL_OBSERVATION = "Vibration condition reviewed and found within acceptable operating condition.";
export const NORMAL_RECOMMENDATION = "Continue routine monitoring.";

export function blankAnalysis(machine: string, area = "", note = ""): MachineAnalysis {
  return {
    machine,
    area,
    note,
    condition: "",
    fault: "",
    severity: "",
    observation: "",
    recommendation: "",
    status: "pending",
    infoRequest: "",
  };
}

/** Rows for a ticket. Old tickets (no saved analysis) get one pending row per machine name. */
export function analysisRows(t: {
  analysis?: MachineAnalysis[] | undefined;
  machines?: string[] | undefined;
  machine?: string | undefined;
  area?: string | undefined;
}): MachineAnalysis[] {
  if (t.analysis?.length) return t.analysis;
  const names = t.machines?.length ? t.machines : t.machine ? [t.machine] : [];
  return names.map((m) => blankAnalysis(m, t.area ?? ""));
}

export function markNormal(a: MachineAnalysis): MachineAnalysis {
  return {
    ...a,
    condition: "normal",
    fault: "None",
    severity: "normal",
    observation: a.observation.trim() ? a.observation : NORMAL_OBSERVATION,
    recommendation: a.recommendation.trim() ? a.recommendation : NORMAL_RECOMMENDATION,
  };
}

/** A machine counts as attention/abnormal when its condition is above Monitor (excluding insufficient data). */
const isAttention = (c: MachineAnalysis["condition"]) => c === "attention" || c === "abnormal" || c === "critical";

export function analysisProgress(rows: MachineAnalysis[]) {
  const reviewed = rows.filter((r) => r.status === "complete");
  return {
    total: rows.length,
    reviewed: reviewed.length,
    pending: rows.length - reviewed.length,
    normal: reviewed.filter((r) => r.condition === "normal").length,
    monitor: reviewed.filter((r) => r.condition === "monitor").length,
    attention: reviewed.filter((r) => isAttention(r.condition)).length,
    moreInfo: rows.filter((r) => r.status === "more-info").length,
  };
}

/** Index of the next machine still needing review after `from`, wrapping round; -1 when none. */
export function nextPendingIndex(rows: MachineAnalysis[], from: number): number {
  for (let k = 1; k <= rows.length; k++) {
    const i = (from + k) % rows.length;
    const s = rows[i]?.status;
    if (i !== from && (s === "pending" || s === "draft")) return i;
  }
  return -1;
}

export function canComplete(a: MachineAnalysis) {
  return !!a.condition && !!a.observation.trim() && !!a.recommendation.trim();
}

export type ReviewStage = "open" | "under-review" | "partial" | "ready" | "published";

/** Overall review stage shown on the ticket; publishing is only allowed once every machine is complete. */
export function reviewStage(rows: MachineAnalysis[], published: boolean): ReviewStage {
  if (published) return "published";
  const p = analysisProgress(rows);
  if (!p.total) return "open";
  if (p.reviewed === p.total) return "ready";
  if (p.reviewed > 0 || rows.some((r) => r.status !== "pending")) return "partial";
  return "under-review";
}

export const reviewStageLabel: Record<ReviewStage, string> = {
  open: "Open",
  "under-review": "Under Review",
  partial: "Partially Reviewed",
  ready: "Ready to Publish",
  published: "Recommendation Issued",
};

/** Text posted to the ticket thread (and used for "Use in Report") once published. */
export function analysisSummaryText(rows: MachineAnalysis[], managerName: string, plant: string, ticketNo: string) {
  const p = analysisProgress(rows);
  const head = [
    `Manager Analysis Completed — ${plant} · ${ticketNo}`,
    `${managerName} has completed machine-wise vibration analysis for ${p.total} machine${p.total === 1 ? "" : "s"}.`,
    `Normal: ${p.normal} · Monitor: ${p.monitor} · Attention / Abnormal: ${p.attention}`,
  ];
  const body = rows.map((r, i) =>
    [
      `${i + 1}. ${r.machine}${r.area ? ` (${r.area})` : ""}`,
      `   Condition: ${r.condition ? conditionLabel[r.condition] : "—"}${r.fault ? ` · Fault: ${r.fault}` : ""}${r.severity ? ` · Severity: ${severityLabel[r.severity]}` : ""}`,
      `   Observation: ${r.observation}`,
      `   Recommendation: ${r.recommendation}`,
    ].join("\n"),
  );
  return [...head, "", ...body].join("\n");
}
