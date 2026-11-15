import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "./ui";
import { TODAY, updatePlantLifecycle, type Plant } from "@/lib/store";
import { lifecycleChange, type PlantLifecycleAction } from "@/lib/plant-lifecycle";

export function PlantLifecycleDialog({ plant, action, onClose }: { plant: Plant; action: PlantLifecycleAction; onClose: () => void }) {
  const [date, setDate] = useState(TODAY);
  const [followup, setFollowup] = useState(plant.salesFollowupDate ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const titles = { removed: "Record demo removal", won: "Confirm order", lost: "Close as lost", reopen: "Reopen sales follow-up" };
  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await updatePlantLifecycle(plant.id, lifecycleChange(action, date, note, followup));
      toast.success(action === "won" ? "Order confirmed — plant is active" : "Plant status saved");
      onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Plant status not saved"); }
    finally { setBusy(false); }
  };
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{titles[action]} · {plant.name}</DialogTitle></DialogHeader>
    <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      {action === "removed" ? <Field label="Actual sensor removal date"><TextInput aria-label="Actual sensor removal date" type="date" value={date} onChange={(event) => setDate(event.target.value)} max={TODAY} required /></Field> : null}
      {action === "removed" || action === "reopen" ? <Field label="Next sales follow-up date"><TextInput aria-label="Next sales follow-up date" type="date" value={followup} onChange={(event) => setFollowup(event.target.value)} /></Field> : null}
      <Field label={action === "lost" ? "Lost-order reason" : action === "won" ? "Order / PO reference" : "Notes"}><TextInput aria-label="Lifecycle notes" value={note} onChange={(event) => setNote(event.target.value)} required={action === "lost"} /></Field>
      {action === "won" ? <p className="text-sm text-mute">The plant returns to Active as Order now. Previous demo dates remain in history; set the new AMC dates separately.</p> : null}
      <div className="flex justify-end gap-2"><Button variant="ghost" type="button" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : titles[action]}</Button></div>
    </form>
  </DialogContent></Dialog>;
}