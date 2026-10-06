import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

export const commModes = {
  phone: "Phone Call", email: "Email", whatsapp: "WhatsApp", online: "Online Meeting",
  site: "Customer Site Meeting", office: "Forbes Marshall Office Meeting", video: "Video Call", other: "Other",
} as const;
export type CommMode = keyof typeof commModes;

export const commTypes = [
  "Maintenance", "Regular Follow-up", "Visit", "Machine Details", "Report Discussion", "Observation / Recommendation",
  "Sensor / Data Issue", "Technical Clarification", "Customer Action / Commitment", "Shutdown / Maintenance Planning",
  "Configuration / Asset Details", "Customer Feedback", "Installation / Execution Coordination", "Other",
];

export const followUpLabel = {
  none: "No Follow-up Required", required: "Follow-up Required", waiting_customer: "Waiting for Customer",
  waiting_fm: "Waiting for Forbes Marshall", completed: "Follow-up Completed",
} as const;
export type FollowUp = keyof typeof followUpLabel;
export const openFollowUp = (f: FollowUp) => f === "required" || f === "waiting_customer" || f === "waiting_fm";

export interface CommAction { text: string; owner: string; due: string; status: "open" | "completed" | "cancelled" }
export interface CommHistory { at: string; by: string; text: string }

export interface Comm {
  id: string; plantId: string; date: string; time: string;
  contactPerson: string; contactNumber: string; contactEmail: string;
  fmRep: string; participants: string; mode: CommMode; type: string; subject: string;
  summary: string; customerComments: string; fmResponse: string; commitment: string;
  actionRequired: boolean; actions: CommAction[];
  followUp: FollowUp; nextFollowUp: string; followUpOwner: string;
  internalNote: string; attachments: string;
  ticketId: string; visitId: string; reportId: string; taskId: string; reminderId: string;
  history: CommHistory[];
  createdBy: string; createdAt: string; updatedBy: string; updatedAt: string;
}

const toComm = (r: any): Comm => ({
  id: r.id, plantId: r.plant_id, date: r.comm_date, time: r.comm_time,
  contactPerson: r.contact_person, contactNumber: r.contact_number, contactEmail: r.contact_email,
  fmRep: r.fm_representative, participants: r.participants, mode: r.mode, type: r.comm_type, subject: r.subject,
  summary: r.discussion_summary, customerComments: r.customer_comments, fmResponse: r.fm_response, commitment: r.customer_commitment,
  actionRequired: !!r.action_required, actions: r.actions ?? [],
  followUp: r.follow_up_status, nextFollowUp: r.next_follow_up_date ?? "", followUpOwner: r.follow_up_owner,
  internalNote: r.internal_note, attachments: r.attachment_links,
  ticketId: r.related_ticket_id, visitId: r.related_visit_id, reportId: r.related_report_id,
  taskId: r.linked_task_id, reminderId: r.linked_reminder_id,
  history: r.history ?? [], createdBy: r.created_by, createdAt: r.created_at, updatedBy: r.updated_by, updatedAt: r.updated_at,
});
const fromComm = (c: Comm) => ({
  id: c.id, plant_id: c.plantId, comm_date: c.date, comm_time: c.time,
  contact_person: c.contactPerson, contact_number: c.contactNumber, contact_email: c.contactEmail,
  fm_representative: c.fmRep, participants: c.participants, mode: c.mode, comm_type: c.type, subject: c.subject,
  discussion_summary: c.summary, customer_comments: c.customerComments, fm_response: c.fmResponse, customer_commitment: c.commitment,
  action_required: c.actionRequired, actions: c.actions,
  follow_up_status: c.followUp, next_follow_up_date: c.nextFollowUp || null, follow_up_owner: c.followUpOwner,
  internal_note: c.internalNote, attachment_links: c.attachments,
  related_ticket_id: c.ticketId, related_visit_id: c.visitId, related_report_id: c.reportId,
  linked_task_id: c.taskId, linked_reminder_id: c.reminderId,
  history: c.history, created_by: c.createdBy, updated_by: c.updatedBy, updated_at: new Date().toISOString(),
});

let comms: Comm[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function loadComms() {
  const { data } = await db.from("customer_communications").select("*").order("comm_date", { ascending: false });
  comms = (data ?? []).map(toComm);
  loaded = true;
  emit();
}

export function useComms() {
  useEffect(() => {
    if (!loaded) void loadComms();
  }, []);
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => comms,
    () => comms,
  );
}

export function blankComm(userId: string, date: string): Comm {
  return {
    id: crypto.randomUUID(), plantId: "", date, time: "", contactPerson: "", contactNumber: "", contactEmail: "",
    fmRep: userId, participants: "", mode: "phone", type: "Regular Follow-up", subject: "", summary: "",
    customerComments: "", fmResponse: "", commitment: "", actionRequired: false, actions: [],
    followUp: "none", nextFollowUp: "", followUpOwner: userId, internalNote: "", attachments: "",
    ticketId: "", visitId: "", reportId: "", taskId: "", reminderId: "", history: [],
    createdBy: userId, createdAt: new Date().toISOString(), updatedBy: userId, updatedAt: new Date().toISOString(),
  };
}

const fields: [keyof Comm, string][] = [
  ["subject", "Subject"], ["summary", "Discussion summary"], ["commitment", "Customer commitment"],
  ["followUp", "Follow-up status"], ["nextFollowUp", "Next follow-up date"], ["type", "Type"], ["mode", "Mode"],
  ["fmResponse", "FM response"], ["customerComments", "Customer comments"],
];

/** Saves a record; edits append a change line to its history instead of silently overwriting. */
export async function saveComm(c: Comm, by: string) {
  const prev = comms.find((x) => x.id === c.id);
  const at = new Date().toISOString();
  let history = c.history;
  if (!prev) history = [{ at, by, text: "Communication recorded" }];
  else {
    const changed = fields.filter(([k]) => JSON.stringify(prev[k]) !== JSON.stringify(c[k])).map(([, l]) => l);
    if (JSON.stringify(prev.actions) !== JSON.stringify(c.actions)) changed.push("Action items");
    if (changed.length) history = [...prev.history, { at, by, text: `Edited: ${changed.join(", ")}` }];
  }
  const next = { ...c, history, updatedBy: by, updatedAt: at };
  comms = prev ? comms.map((x) => (x.id === c.id ? next : x)) : [next, ...comms];
  emit();
  const { error } = await db.from("customer_communications").upsert(fromComm(next));
  if (error) throw new Error(error.message);
  return next;
}
