import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button, Field, TextInput } from "./ui";
import { demoFollowUp } from "@/lib/amc";
import { blankReminder, loadDailyWork, useDailyWork } from "@/lib/dailywork";
import { supabase } from "@/integrations/supabase/client";
import type { Plant } from "@/lib/store";

export function DemoFollowUp({ plant, userId }: { plant: Plant; userId: string }) {
  const { reminders } = useDailyWork();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(plant.amcEnd ?? "");
  const [time, setTime] = useState("09:00");
  const [busy, setBusy] = useState(false);
  const draft = demoFollowUp(plant);
  if (!draft || !userId) return null;
  const existing = reminders.find((r) => r.plantId === plant.id && r.userId === userId && r.title === draft.title && r.status === "active");
  const save = async () => {
    if (!date || busy) return;
    setBusy(true);
    try {
      const reminder = existing ?? blankReminder(userId, date);
      const { error } = await supabase.from("reminders").upsert({
        id: reminder.id, user_id: userId, title: draft.title, description: draft.description,
        plant_id: plant.id, task_id: "", remind_date: date, remind_time: time,
        notify: "on_time", status: "active", created_by: reminder.createdBy, completed_at: null,
      }).select("id").single();
      if (error) throw error;
      await loadDailyWork();
      toast.success("Demo follow-up reminder saved");
      setOpen(false);
    } catch (error) {
      toast.error(`Reminder not saved: ${error instanceof Error ? error.message : "Please try again"}`);
    } finally { setBusy(false); }
  };
  return <>
    <Button variant="ghost" className="mt-1 px-1 py-1 text-xs" onClick={() => { setDate(existing?.date ?? draft.date); setTime(existing?.time || "09:00"); setOpen(true); }}>
      <Bell className="mr-1 size-3 shrink-0" />{existing ? "Demo reminder set" : "Demo end reminder"}
    </Button>
    <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Demo follow-up — {plant.name}</DialogTitle></DialogHeader>
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <div className="text-sm text-mute">{draft.description}</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Follow-up date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
            <Field label="Time"><TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
          </div>
          <Field label="Assigned person"><TextInput value="Me" readOnly /></Field>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link to="/tasks" className="text-signal">Daily Work</Link>
            <Link to="/opportunities" search={{ plant: plant.id }} className="text-signal">Quotation / order follow-up</Link>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="solid" type="submit" disabled={busy || !date}>{busy ? "Saving…" : "Save reminder"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}