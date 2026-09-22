// Demo dataset for the Forbes Marshall Vibration Operations Console.
// Deterministic (seeded) so trends/spectra are stable between renders.

export type Severity = "advisory" | "low" | "medium" | "high" | "critical";
export type Condition = "normal" | "watch" | "observation" | "abnormal" | "critical";
export type Criticality = "critical" | "high" | "medium" | "low";
export type ReviewStatus =
  | "pending"
  | "in-review"
  | "reviewed-normal"
  | "reviewed-observation"
  | "abnormality"
  | "alert-raised"
  | "awaiting-customer"
  | "closed";
export type DataQuality = "valid" | "no-data" | "sensor-offline" | "constant-value" | "invalid-rpm";

export interface Engineer {
  id: string;
  name: string;
  initials: string;
  role: "analyst" | "manager" | "admin";
}

export interface Customer {
  id: string;
  name: string;
  industry: string;
  lastReport: string;
  nextReportDue: string;
}

export interface Site {
  id: string;
  customerId: string;
  name: string;
  area: string;
}

export interface Machine {
  id: string;
  tag: string;
  name: string;
  type: string;
  customerId: string;
  siteId: string;
  area: string;
  group: string;
  criticality: Criticality;
  manufacturer: string;
  model: string;
  ratedRpm: number;
  operatingRpm: number;
  ratedPowerKw: number;
  bearingDe: string;
  bearingNde: string;
  couplingType: string;
  commissioned: string;
  monitoringFrequency: string;
  analystId: string;
  condition: Condition;
  dataQuality: DataQuality;
  reviewStatus: ReviewStatus;
  lastDataAt: string;
  lastReviewAt: string | null;
  velocityRms: number;
  peak: number;
  temperatureC: number;
  alertLimit: number;
  alarmLimit: number;
  trendPct: number;
  healthFactors: { label: string; value: string; weight: "raises" | "neutral" | "lowers" }[];
}

export interface Alert {
  id: string;
  machineId: string;
  component: string;
  point: string;
  raisedAt: string;
  analystId: string;
  parameter: string;
  observedValue: string;
  referenceValue: string;
  frequencyComponent: string;
  suspectedCategory: string;
  severity: Severity;
  observation: string;
  recommendedAction: string;
  customerNotified: boolean;
  actionOwner: string;
  targetDate: string;
  status: "open" | "awaiting-customer" | "closed";
  closureDate?: string;
  closureComments?: string;
}

export interface ActionItem {
  id: string;
  alertId: string;
  machineId: string;
  description: string;
  owner: string;
  targetDate: string;
  status: "open" | "in-progress" | "overdue" | "closed";
}

export interface Review {
  id: string;
  machineId: string;
  analystId: string;
  at: string;
  dataReviewed: string;
  observation: string;
  condition: Condition;
  recommendedAction: string;
  status: ReviewStatus;
}

export interface ReportDoc {
  id: string;
  customerId: string;
  period: string;
  type: "weekly" | "monthly";
  status: "draft" | "review" | "approved" | "sent";
  revision: string;
  preparedBy: string;
  approvedBy: string | null;
  generatedAt: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  userId: string;
  action: string;
  entity: string;
  previousValue: string;
  newValue: string;
}

export const TODAY = "22 Sep 2026";

export const engineers: Engineer[] = [
  { id: "eng-1", name: "R. Ahuja", initials: "RA", role: "analyst" },
  { id: "eng-2", name: "M. Desai", initials: "MD", role: "analyst" },
  { id: "mgr-1", name: "P. Pawar", initials: "PP", role: "manager" },
];

export const customers: Customer[] = [
  { id: "cus-a", name: "Meridian Utilities", industry: "Power & Utilities", lastReport: "15 Sep 2026", nextReportDue: "22 Sep 2026" },
  { id: "cus-b", name: "Sahyadri Textiles", industry: "Textiles", lastReport: "16 Sep 2026", nextReportDue: "23 Sep 2026" },
  { id: "cus-c", name: "Konkan Chemicals", industry: "Specialty Chemicals", lastReport: "12 Sep 2026", nextReportDue: "22 Sep 2026" },
  { id: "cus-d", name: "Deccan Paper Mills", industry: "Pulp & Paper", lastReport: "18 Sep 2026", nextReportDue: "25 Sep 2026" },
];

export const sites: Site[] = [
  { id: "site-1", customerId: "cus-a", name: "Pune Plant", area: "Utility Area" },
  { id: "site-2", customerId: "cus-a", name: "Chakan Plant", area: "Boiler House" },
  { id: "site-3", customerId: "cus-b", name: "Mumbai Plant", area: "Spinning Block" },
  { id: "site-4", customerId: "cus-c", name: "Nagpur Plant", area: "Process Area" },
  { id: "site-5", customerId: "cus-d", name: "Nashik Plant", area: "Paper Machine 2" },
];

function mk(m: Partial<Machine> & Pick<Machine, "id" | "tag" | "name" | "customerId" | "siteId">): Machine {
  return {
    type: "Centrifugal Pump",
    area: "Utility Area",
    group: "Pump Section",
    criticality: "high",
    manufacturer: "KSB",
    model: "ETN 125-100",
    ratedRpm: 2980,
    operatingRpm: 2950,
    ratedPowerKw: 75,
    bearingDe: "SKF 6312 C3",
    bearingNde: "SKF 6309 C3",
    couplingType: "Flexible pin-bush",
    commissioned: "14 Mar 2019",
    monitoringFrequency: "Daily",
    analystId: "eng-1",
    condition: "normal",
    dataQuality: "valid",
    reviewStatus: "pending",
    lastDataAt: "09:30",
    lastReviewAt: null,
    velocityRms: 2.4,
    peak: 6.1,
    temperatureC: 48,
    alertLimit: 7.1,
    alarmLimit: 11.2,
    trendPct: 3,
    healthFactors: [],
    ...m,
  } as Machine;
}

export const machines: Machine[] = [
  mk({
    id: "m-101",
    tag: "P-101",
    name: "Cooling Water Pump P-101",
    customerId: "cus-a",
    siteId: "site-1",
    criticality: "critical",
    condition: "abnormal",
    reviewStatus: "awaiting-customer",
    velocityRms: 11.4,
    peak: 28.9,
    temperatureC: 64,
    trendPct: 38,
    lastDataAt: "09:30",
    lastReviewAt: "22 Sep 09:52",
    analystId: "eng-1",
    healthFactors: [
      { label: "Overall velocity 11.4 mm/s RMS", value: "Above alert limit 7.1", weight: "raises" },
      { label: "7-day trend", value: "+38%", weight: "raises" },
      { label: "Dominant component", value: "1X running speed", weight: "raises" },
      { label: "Bearing temperature 64 °C", value: "Within normal band", weight: "neutral" },
      { label: "Open alerts", value: "1 critical", weight: "raises" },
      { label: "Data quality", value: "Valid", weight: "lowers" },
    ],
  }),
  mk({
    id: "m-204",
    tag: "F-204",
    name: "Supply Fan F-204",
    type: "Centrifugal Fan",
    customerId: "cus-b",
    siteId: "site-3",
    group: "Fan Section",
    criticality: "high",
    condition: "observation",
    reviewStatus: "alert-raised",
    analystId: "eng-2",
    velocityRms: 6.8,
    peak: 19.4,
    temperatureC: 57,
    trendPct: 21,
    ratedRpm: 1480,
    operatingRpm: 1472,
    lastDataAt: "10:15",
    lastReviewAt: "22 Sep 10:40",
    healthFactors: [
      { label: "Overall velocity 6.8 mm/s RMS", value: "Just below alert limit 7.1", weight: "raises" },
      { label: "Envelope spectrum", value: "Bearing outer-race indication (verify)", weight: "raises" },
      { label: "30-day trend", value: "+21%", weight: "raises" },
      { label: "Data quality", value: "Valid", weight: "lowers" },
    ],
  }),
  mk({
    id: "m-118",
    tag: "B-118",
    name: "Process Blower B-118",
    type: "Roots Blower",
    customerId: "cus-a",
    siteId: "site-2",
    group: "Blower Section",
    condition: "watch",
    reviewStatus: "reviewed-observation",
    analystId: "eng-1",
    velocityRms: 5.2,
    peak: 13.8,
    trendPct: 12,
    lastDataAt: "08:45",
    lastReviewAt: "22 Sep 09:10",
    healthFactors: [
      { label: "Overall velocity 5.2 mm/s RMS", value: "Below alert limit", weight: "neutral" },
      { label: "7-day trend", value: "+12%", weight: "raises" },
      { label: "Analyst observation", value: "Possible unbalance, field confirm", weight: "raises" },
    ],
  }),
  mk({
    id: "m-302",
    tag: "C-302",
    name: "Air Compressor C-302",
    type: "Screw Compressor",
    customerId: "cus-c",
    siteId: "site-4",
    group: "Compressor House",
    criticality: "critical",
    condition: "normal",
    dataQuality: "sensor-offline",
    reviewStatus: "pending",
    analystId: "eng-1",
    velocityRms: 0,
    peak: 0,
    temperatureC: 0,
    trendPct: 0,
    lastDataAt: "14:30 (21 Sep)",
    lastReviewAt: null,
    healthFactors: [
      { label: "Data quality", value: "No valid data since 14:30 — sensor offline", weight: "raises" },
      { label: "Machine health", value: "Not assessable — no machine alarm raised", weight: "neutral" },
    ],
  }),
  mk({
    id: "m-104",
    tag: "P-104",
    name: "Boiler Feed Pump P-104",
    customerId: "cus-a",
    siteId: "site-1",
    condition: "normal",
    reviewStatus: "reviewed-normal",
    analystId: "eng-2",
    velocityRms: 2.1,
    peak: 5.4,
    trendPct: 1,
    lastDataAt: "08:50",
    lastReviewAt: "22 Sep 09:05",
    healthFactors: [
      { label: "Overall velocity 2.1 mm/s RMS", value: "Well below alert limit", weight: "lowers" },
      { label: "7-day trend", value: "+1%", weight: "neutral" },
    ],
  }),
  mk({
    id: "m-410",
    tag: "GB-410",
    name: "Dryer Gearbox GB-410",
    type: "Helical Gearbox",
    customerId: "cus-d",
    siteId: "site-5",
    group: "Drive Section",
    criticality: "critical",
    condition: "critical",
    reviewStatus: "alert-raised",
    analystId: "eng-2",
    velocityRms: 13.9,
    peak: 41.2,
    temperatureC: 79,
    trendPct: 54,
    ratedRpm: 990,
    operatingRpm: 982,
    alertLimit: 6.3,
    alarmLimit: 10.0,
    lastDataAt: "07:20",
    lastReviewAt: "22 Sep 08:15",
    healthFactors: [
      { label: "Overall velocity 13.9 mm/s RMS", value: "Above alarm limit 10.0", weight: "raises" },
      { label: "Gear mesh frequency", value: "Sidebands at 1X pinion (verify)", weight: "raises" },
      { label: "Rate of change", value: "+54% over 7 days", weight: "raises" },
      { label: "Bearing temperature 79 °C", value: "Above baseline +14 °C", weight: "raises" },
    ],
  }),
  mk({
    id: "m-207",
    tag: "F-207",
    name: "Exhaust Fan F-207",
    type: "Axial Fan",
    customerId: "cus-b",
    siteId: "site-3",
    group: "Fan Section",
    criticality: "medium",
    condition: "normal",
    reviewStatus: "reviewed-normal",
    analystId: "eng-2",
    velocityRms: 3.0,
    peak: 7.9,
    trendPct: 4,
    lastDataAt: "11:05",
    lastReviewAt: "22 Sep 11:22",
    healthFactors: [{ label: "Overall velocity 3.0 mm/s RMS", value: "Stable baseline", weight: "lowers" }],
  }),
  mk({
    id: "m-512",
    tag: "P-512",
    name: "Slurry Pump P-512",
    customerId: "cus-c",
    siteId: "site-4",
    criticality: "high",
    condition: "watch",
    reviewStatus: "in-review",
    analystId: "eng-1",
    velocityRms: 5.9,
    peak: 16.1,
    trendPct: 9,
    lastDataAt: "10:40",
    lastReviewAt: null,
    healthFactors: [
      { label: "Overall velocity 5.9 mm/s RMS", value: "Below alert limit", weight: "neutral" },
      { label: "Broadband noise", value: "Possible cavitation — check suction", weight: "raises" },
    ],
  }),
  mk({
    id: "m-620",
    tag: "M-620",
    name: "Drive Motor M-620",
    type: "Induction Motor",
    customerId: "cus-d",
    siteId: "site-5",
    group: "Drive Section",
    criticality: "medium",
    condition: "normal",
    dataQuality: "invalid-rpm",
    reviewStatus: "pending",
    analystId: "eng-2",
    velocityRms: 2.8,
    peak: 6.6,
    trendPct: 2,
    lastDataAt: "09:58",
    lastReviewAt: null,
    healthFactors: [
      { label: "Data quality", value: "Invalid RPM reading — order analysis disabled", weight: "raises" },
      { label: "Overall velocity 2.8 mm/s RMS", value: "Below alert limit", weight: "lowers" },
    ],
  }),
  mk({
    id: "m-133",
    tag: "P-133",
    name: "Condensate Pump P-133",
    customerId: "cus-a",
    siteId: "site-2",
    criticality: "low",
    condition: "normal",
    reviewStatus: "pending",
    analystId: "eng-1",
    velocityRms: 1.9,
    peak: 4.8,
    trendPct: 0,
    lastDataAt: "12:10",
    healthFactors: [{ label: "Overall velocity 1.9 mm/s RMS", value: "Stable baseline", weight: "lowers" }],
  }),
];

export const alerts: Alert[] = [
  {
    id: "ALT-2026-0148",
    machineId: "m-101",
    component: "Motor",
    point: "DE Bearing — Horizontal",
    raisedAt: "22 Sep 2026 09:52",
    analystId: "eng-1",
    parameter: "Overall velocity (RMS)",
    observedValue: "11.4 mm/s",
    referenceValue: "3.2 mm/s (baseline)",
    frequencyComponent: "1X running speed, 49.2 Hz",
    suspectedCategory: "Unbalance (possible) / Coupling issue",
    severity: "critical",
    observation:
      "Dominant 1X running-speed component with progressive rise in radial velocity over seven days. Axial level unchanged. Possible unbalance condition; requires verification in field.",
    recommendedAction:
      "Inspect impeller for deposit or erosion, verify coupling condition and confirm operating point. Repeat measurement after correction.",
    customerNotified: true,
    actionOwner: "Customer — Maintenance Lead, Pune",
    targetDate: "24 Sep 2026",
    status: "awaiting-customer",
  },
  {
    id: "ALT-2026-0149",
    machineId: "m-410",
    component: "Gearbox",
    point: "Pinion end — Radial",
    raisedAt: "22 Sep 2026 08:15",
    analystId: "eng-2",
    parameter: "Overall velocity (RMS)",
    observedValue: "13.9 mm/s",
    referenceValue: "5.8 mm/s (baseline)",
    frequencyComponent: "Gear mesh 412 Hz with 1X pinion sidebands",
    suspectedCategory: "Gear tooth defect (suspected) / Gear eccentricity",
    severity: "critical",
    observation:
      "Gear mesh frequency elevated with symmetric sidebands spaced at pinion running speed. Bearing temperature 14 °C above baseline. Indication of gear tooth or eccentricity problem; requires verification.",
    recommendedAction: "Arrange inspection window, check lubrication condition and backlash. Increase monitoring to twice daily.",
    customerNotified: true,
    actionOwner: "Customer — Reliability Engineer, Nashik",
    targetDate: "23 Sep 2026",
    status: "open",
  },
  {
    id: "ALT-2026-0145",
    machineId: "m-204",
    component: "Fan Bearing",
    point: "NDE Bearing — Vertical",
    raisedAt: "20 Sep 2026 10:40",
    analystId: "eng-2",
    parameter: "Envelope acceleration",
    observedValue: "2.9 gE",
    referenceValue: "0.8 gE (baseline)",
    frequencyComponent: "BPFO 128 Hz with harmonics",
    suspectedCategory: "Bearing outer-race indication (suspected)",
    severity: "high",
    observation:
      "Repeatable outer-race defect frequency with harmonics in envelope spectrum. Overall velocity still below alert limit. Requires verification through re-measurement.",
    recommendedAction: "Re-grease per schedule and re-measure within 48 hours. Plan bearing replacement if amplitude continues rising.",
    customerNotified: true,
    actionOwner: "Customer — Maintenance Planner, Mumbai",
    targetDate: "21 Sep 2026",
    status: "open",
  },
  {
    id: "ALT-2026-0141",
    machineId: "m-118",
    component: "Blower Rotor",
    point: "DE Bearing — Horizontal",
    raisedAt: "18 Sep 2026 09:10",
    analystId: "eng-1",
    parameter: "Overall velocity (RMS)",
    observedValue: "5.2 mm/s",
    referenceValue: "4.0 mm/s (baseline)",
    frequencyComponent: "1X running speed",
    suspectedCategory: "Unbalance (possible)",
    severity: "medium",
    observation: "Mild rise in 1X radial component. Possible unbalance or minor looseness. Continue monitoring.",
    recommendedAction: "Confirm mounting bolt torque during next shutdown; keep on watch list.",
    customerNotified: false,
    actionOwner: "Analyst — R. Ahuja",
    targetDate: "26 Sep 2026",
    status: "open",
  },
  {
    id: "ALT-2026-0132",
    machineId: "m-512",
    component: "Pump",
    point: "Suction side — Radial",
    raisedAt: "09 Sep 2026 15:20",
    analystId: "eng-1",
    parameter: "Broadband acceleration",
    observedValue: "1.6 g",
    referenceValue: "0.9 g",
    frequencyComponent: "Broadband 2–8 kHz",
    suspectedCategory: "Cavitation (possible)",
    severity: "low",
    observation: "Elevated broadband energy with no discrete component. Possible cavitation under low suction pressure.",
    recommendedAction: "Verify suction pressure and strainer condition.",
    customerNotified: true,
    actionOwner: "Customer — Shift Engineer, Nagpur",
    targetDate: "12 Sep 2026",
    status: "closed",
    closureDate: "14 Sep 2026",
    closureComments: "Strainer cleaned; broadband energy returned to baseline on re-measurement.",
  },
];

export const actionItems: ActionItem[] = [
  { id: "ACT-091", alertId: "ALT-2026-0148", machineId: "m-101", description: "Impeller and coupling inspection", owner: "Customer — Pune", targetDate: "24 Sep 2026", status: "in-progress" },
  { id: "ACT-092", alertId: "ALT-2026-0149", machineId: "m-410", description: "Gearbox inspection window + lubrication check", owner: "Customer — Nashik", targetDate: "23 Sep 2026", status: "open" },
  { id: "ACT-088", alertId: "ALT-2026-0145", machineId: "m-204", description: "Re-grease and re-measure within 48 h", owner: "Customer — Mumbai", targetDate: "21 Sep 2026", status: "overdue" },
  { id: "ACT-085", alertId: "ALT-2026-0141", machineId: "m-118", description: "Confirm mounting bolt torque", owner: "Analyst — R. Ahuja", targetDate: "26 Sep 2026", status: "open" },
  { id: "ACT-080", alertId: "ALT-2026-0145", machineId: "m-204", description: "Send trend + envelope spectrum extract to customer", owner: "Analyst — M. Desai", targetDate: "20 Sep 2026", status: "overdue" },
  { id: "ACT-076", alertId: "ALT-2026-0132", machineId: "m-512", description: "Verify suction pressure and strainer", owner: "Customer — Nagpur", targetDate: "12 Sep 2026", status: "closed" },
];

export const reviews: Review[] = [
  {
    id: "REV-5521",
    machineId: "m-101",
    analystId: "eng-1",
    at: "22 Sep 2026 09:52",
    dataReviewed: "Trend 30 d, velocity spectrum, time waveform, RPM",
    observation:
      "Dominant 1X running-speed component observed with increased radial vibration. Possible unbalance condition. Recommend field inspection and confirmation of operating condition.",
    condition: "abnormal",
    recommendedAction: "Field inspection of impeller and coupling; re-measure after correction.",
    status: "alert-raised",
  },
  {
    id: "REV-5520",
    machineId: "m-410",
    analystId: "eng-2",
    at: "22 Sep 2026 08:15",
    dataReviewed: "Trend 90 d, velocity spectrum, envelope spectrum, temperature",
    observation:
      "Gear mesh frequency amplitude increased with 1X pinion sidebands. Indication of gear tooth defect; requires verification during inspection.",
    condition: "critical",
    recommendedAction: "Plan inspection within 24 h; increase monitoring frequency to twice daily.",
    status: "alert-raised",
  },
  {
    id: "REV-5519",
    machineId: "m-118",
    analystId: "eng-1",
    at: "22 Sep 2026 09:10",
    dataReviewed: "Trend 7 d, velocity spectrum",
    observation: "Mild increase in 1X radial component since 16 Sep. Possible unbalance or minor looseness; no alarm exceedance.",
    condition: "watch",
    recommendedAction: "Keep on watch list; confirm bolt torque next shutdown.",
    status: "reviewed-observation",
  },
  {
    id: "REV-5518",
    machineId: "m-104",
    analystId: "eng-2",
    at: "22 Sep 2026 09:05",
    dataReviewed: "Trend 7 d, velocity spectrum",
    observation: "All parameters within baseline. No spectral change against previous measurement.",
    condition: "normal",
    recommendedAction: "Continue routine monitoring.",
    status: "reviewed-normal",
  },
  {
    id: "REV-5517",
    machineId: "m-207",
    analystId: "eng-2",
    at: "22 Sep 2026 11:22",
    dataReviewed: "Trend 7 d, velocity spectrum",
    observation: "Stable overall levels; no abnormality observed.",
    condition: "normal",
    recommendedAction: "Continue routine monitoring.",
    status: "reviewed-normal",
  },
];

export const reportDocs: ReportDoc[] = [
  { id: "FM-VM-2026-0142", customerId: "cus-a", period: "15–21 Sep 2026", type: "weekly", status: "review", revision: "R0", preparedBy: "R. Ahuja", approvedBy: null, generatedAt: "22 Sep 2026 07:40" },
  { id: "FM-VM-2026-0141", customerId: "cus-b", period: "15–21 Sep 2026", type: "weekly", status: "approved", revision: "R1", preparedBy: "M. Desai", approvedBy: "P. Pawar", generatedAt: "21 Sep 2026 18:05" },
  { id: "FM-VM-2026-0140", customerId: "cus-c", period: "Aug 2026", type: "monthly", status: "sent", revision: "R1", preparedBy: "R. Ahuja", approvedBy: "P. Pawar", generatedAt: "03 Sep 2026 11:12" },
  { id: "FM-VM-2026-0143", customerId: "cus-d", period: "15–21 Sep 2026", type: "weekly", status: "draft", revision: "R0", preparedBy: "M. Desai", approvedBy: null, generatedAt: "22 Sep 2026 12:30" },
];

export const auditLog: AuditEntry[] = [
  { id: "AUD-9912", at: "22 Sep 2026 10:42", userId: "eng-1", action: "Condition changed", entity: "Machine P-101", previousValue: "Watch", newValue: "Abnormal" },
  { id: "AUD-9911", at: "22 Sep 2026 09:52", userId: "eng-1", action: "Alert raised", entity: "ALT-2026-0148", previousValue: "—", newValue: "Critical" },
  { id: "AUD-9910", at: "22 Sep 2026 08:15", userId: "eng-2", action: "Alert raised", entity: "ALT-2026-0149", previousValue: "—", newValue: "Critical" },
  { id: "AUD-9909", at: "22 Sep 2026 07:40", userId: "eng-1", action: "Report generated", entity: "FM-VM-2026-0142", previousValue: "—", newValue: "Draft → Review" },
  { id: "AUD-9908", at: "21 Sep 2026 18:05", userId: "mgr-1", action: "Report approved", entity: "FM-VM-2026-0141", previousValue: "Review", newValue: "Approved" },
  { id: "AUD-9907", at: "21 Sep 2026 14:31", userId: "eng-2", action: "Action status changed", entity: "ACT-088", previousValue: "Open", newValue: "Overdue" },
  { id: "AUD-9906", at: "20 Sep 2026 10:40", userId: "eng-2", action: "Observation recorded", entity: "Machine F-204", previousValue: "Normal", newValue: "Observation" },
];

// ---------- lookups ----------

export const customerById = (id: string) => customers.find((c) => c.id === id)!;
export const siteById = (id: string) => sites.find((s) => s.id === id)!;
export const engineerById = (id: string) => engineers.find((e) => e.id === id)!;
export const machineById = (id: string) => machines.find((m) => m.id === id);
export const alertsForMachine = (id: string) => alerts.filter((a) => a.machineId === id);
export const reviewsForMachine = (id: string) => reviews.filter((r) => r.machineId === id);

export const conditionLabel: Record<Condition, string> = {
  normal: "Normal",
  watch: "Watch",
  observation: "Observation",
  abnormal: "Abnormal",
  critical: "Critical",
};

export const conditionSeverity: Record<Condition, Severity> = {
  normal: "low",
  watch: "medium",
  observation: "medium",
  abnormal: "high",
  critical: "critical",
};

export const reviewStatusLabel: Record<ReviewStatus, string> = {
  pending: "Pending",
  "in-review": "In Review",
  "reviewed-normal": "Reviewed – Normal",
  "reviewed-observation": "Reviewed – Observation",
  abnormality: "Abnormality Identified",
  "alert-raised": "Alert Raised",
  "awaiting-customer": "Awaiting Customer Action",
  closed: "Closed",
};

export const dataQualityLabel: Record<DataQuality, string> = {
  valid: "Valid",
  "no-data": "No data received",
  "sensor-offline": "Sensor offline",
  "constant-value": "Constant value",
  "invalid-rpm": "Invalid RPM",
};

export const severityLabel: Record<Severity, string> = {
  advisory: "Advisory",
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const criticalityLabel: Record<Criticality, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const faultCategories: { group: string; items: string[] }[] = [
  {
    group: "Rotating Equipment",
    items: ["Unbalance", "Misalignment", "Mechanical looseness", "Structural looseness", "Soft foot", "Resonance", "Rub", "Bent shaft", "Coupling issue"],
  },
  {
    group: "Bearing",
    items: ["Bearing defect", "Outer race indication", "Inner race indication", "Rolling-element indication", "Cage-related indication", "Lubrication-related indication"],
  },
  { group: "Gearbox", items: ["Gear mesh", "Gear tooth defect", "Sidebands", "Gear eccentricity", "Backlash", "Lubrication issue"] },
  { group: "Process", items: ["Cavitation", "Recirculation", "Flow-related vibration"] },
  { group: "Electrical", items: ["Electrical frequency-related vibration", "Rotor/stator-related indication", "Other electrical signature"] },
  { group: "Unknown", items: ["Further investigation required"] },
];

// ---------- derived KPIs ----------

export interface AnalystStats {
  engineer: Engineer;
  assigned: number;
  reviewed: number;
  pending: number;
  abnormalities: number;
  alertsRaised: number;
  followUps: number;
  reports: number;
  avgReviewMin: number;
}

const reviewedStatuses: ReviewStatus[] = ["reviewed-normal", "reviewed-observation", "abnormality", "alert-raised", "awaiting-customer", "closed"];

// Portfolio counts are scaled to reflect the full monitored fleet while the
// demo dataset carries a representative sample of machines.
const FLEET_SCALE: Record<"assigned" | "reviewed" | "reports", number[]> = {
  assigned: [42, 38],
  reviewed: [35, 31],
  reports: [10, 1],
};

export function analystStats(): AnalystStats[] {
  return engineers
    .filter((e) => e.role === "analyst")
    .map((e, i) => {
      const mine = machines.filter((m) => m.analystId === e.id);
      const assigned = FLEET_SCALE.assigned[i] ?? 0;
      const reviewed = FLEET_SCALE.reviewed[i] ?? 0;
      return {
        engineer: e,
        assigned,
        reviewed,
        pending: assigned - reviewed,
        abnormalities: mine.filter((m) => m.condition === "abnormal" || m.condition === "critical").length + (i === 0 ? 2 : 1),
        alertsRaised: alerts.filter((a) => a.analystId === e.id && a.raisedAt.includes("22 Sep")).length + 1,
        followUps: actionItems.filter((a) => a.owner.includes(e.name)).length + (i === 0 ? 3 : 2),
        reports: FLEET_SCALE.reports[i] ?? 0,
        avgReviewMin: i === 0 ? 6.4 : 7.1,
      };
    });
}

export function fleetKpis() {
  const due = 80;
  const reviewed = analystStats().reduce((s, a) => s + a.reviewed, 0);
  return {
    customers: customers.length,
    sites: sites.length,
    machines: 164,
    due,
    reviewed,
    pending: due - reviewed,
    completion: Math.round((reviewed / due) * 100),
    openAlerts: alerts.filter((a) => a.status !== "closed").length,
    criticalAlerts: alerts.filter((a) => a.severity === "critical" && a.status !== "closed").length,
    pendingActions: actionItems.filter((a) => a.status !== "closed").length,
    overdueActions: actionItems.filter((a) => a.status === "overdue").length,
    reportsPending: reportDocs.filter((r) => r.status === "draft" || r.status === "review").length,
    reportsGenerated: reportDocs.length,
  };
}

export interface AttentionItem {
  machineId: string;
  title: string;
  detail: string;
  severity: Severity;
  tag: string;
}

export function attentionItems(): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const a of alerts.filter((x) => x.status !== "closed")) {
    const m = machineById(a.machineId)!;
    items.push({
      machineId: m.id,
      title: m.name,
      detail: `${a.suspectedCategory} · ${a.status === "awaiting-customer" ? "customer action pending" : "analyst follow-up"}`,
      severity: a.severity,
      tag: severityLabel[a.severity],
    });
  }
  for (const m of machines.filter((x) => x.dataQuality !== "valid")) {
    items.push({
      machineId: m.id,
      title: m.name,
      detail: `${dataQualityLabel[m.dataQuality]} · last valid data ${m.lastDataAt}`,
      severity: "advisory",
      tag: "Data",
    });
  }
  const order: Severity[] = ["critical", "high", "medium", "low", "advisory"];
  return items.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
}

export function customerHealth() {
  return customers.map((c) => {
    const ms = machines.filter((m) => m.customerId === c.id);
    return {
      customer: c,
      total: ms.length,
      healthy: ms.filter((m) => m.condition === "normal").length,
      watch: ms.filter((m) => m.condition === "watch" || m.condition === "observation").length,
      abnormal: ms.filter((m) => m.condition === "abnormal").length,
      critical: ms.filter((m) => m.condition === "critical").length,
      openAlerts: alerts.filter((a) => a.status !== "closed" && machineById(a.machineId)!.customerId === c.id).length,
      overdue: actionItems.filter((a) => a.status === "overdue" && machineById(a.machineId)!.customerId === c.id).length,
    };
  });
}

export function workQueue() {
  const order: Record<Criticality, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return [...machines].sort((a, b) => {
    const byStatus = Number(reviewedStatuses.includes(a.reviewStatus)) - Number(reviewedStatuses.includes(b.reviewStatus));
    if (byStatus !== 0) return byStatus;
    return order[a.criticality] - order[b.criticality];
  });
}

export const isReviewed = (s: ReviewStatus) => reviewedStatuses.includes(s);

// ---------- signal generation (deterministic) ----------

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function seedOf(id: string) {
  return [...id].reduce((a, c) => a + c.charCodeAt(0) * 31, 7);
}

export function trendSeries(m: Machine, points = 60) {
  const r = rand(seedOf(m.id));
  const start = m.velocityRms / (1 + m.trendPct / 100);
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const base = start + (m.velocityRms - start) * Math.pow(t, 1.6);
    return { i, value: Math.max(0.1, base * (0.94 + r() * 0.12)) };
  });
}

export function spectrumSeries(m: Machine, bins = 240) {
  const r = rand(seedOf(m.id) + 5);
  const oneX = m.operatingRpm / 60;
  const peaks: { f: number; a: number }[] = [
    { f: oneX, a: m.velocityRms * 0.75 },
    { f: oneX * 2, a: m.velocityRms * 0.22 },
    { f: oneX * 3, a: m.velocityRms * 0.1 },
  ];
  if (m.type.includes("Gearbox")) {
    peaks.push({ f: 412, a: m.velocityRms * 0.55 }, { f: 412 - oneX, a: m.velocityRms * 0.2 }, { f: 412 + oneX, a: m.velocityRms * 0.2 });
  }
  if (m.name.includes("Fan F-204")) peaks.push({ f: 128, a: m.velocityRms * 0.4 }, { f: 256, a: m.velocityRms * 0.22 });
  const fMax = 1000;
  return Array.from({ length: bins }, (_, i) => {
    const f = (i / (bins - 1)) * fMax;
    let a = 0.04 + r() * 0.06;
    for (const p of peaks) a += p.a * Math.exp(-Math.pow((f - p.f) / 6, 2));
    return { f, a };
  });
}

export function waveformSeries(m: Machine, points = 400) {
  const r = rand(seedOf(m.id) + 11);
  const oneX = m.operatingRpm / 60;
  return Array.from({ length: points }, (_, i) => {
    const t = (i / points) * 0.2;
    const v =
      m.peak * 0.5 * Math.sin(2 * Math.PI * oneX * t) +
      m.peak * 0.12 * Math.sin(2 * Math.PI * oneX * 2 * t + 1.1) +
      m.peak * 0.08 * (r() - 0.5);
    return { t, v };
  });
}

export function waveformStats(m: Machine) {
  const w = waveformSeries(m);
  const rms = Math.sqrt(w.reduce((s, p) => s + p.v * p.v, 0) / w.length);
  const peak = Math.max(...w.map((p) => Math.abs(p.v)));
  const min = Math.min(...w.map((p) => p.v));
  const max = Math.max(...w.map((p) => p.v));
  const kurt =
    w.reduce((s, p) => s + Math.pow(p.v / (rms || 1), 4), 0) / w.length;
  return { rms, peak, peakToPeak: max - min, crest: peak / (rms || 1), kurtosis: kurt };
}
