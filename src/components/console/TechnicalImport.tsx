import { useRef, useState } from "react";
import Papa from "papaparse";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "./ui";
import { supabase } from "@/integrations/supabase/client";
import type { TechData } from "@/lib/technical";
import { canSave, importCounts, missingHeaders, reviewTechImport, rowsFromGrid, templateCsv, type RowReview } from "@/lib/technical-import";

const download = (name: string, text: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
};
const tone: Record<RowReview["state"], string> = { new: "text-signal", exists: "text-mute", missing: "text-sev-medium", problem: "text-sev-high" };
const label: Record<RowReview["state"], string> = { new: "New", exists: "Already exists", missing: "Missing details", problem: "Problem" };

export function TechnicalImport({ plantId, data, by, onDone }: { plantId: string; data: TechData; by: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<RowReview[]>([]);
  const [file, setFile] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const read = async (f: File) => {
    try {
      let grid: unknown[][];
      if (/\.xlsx$/i.test(f.name)) {
        const { readSheet } = await import("read-excel-file/browser");
        grid = (await readSheet(f)) as unknown as unknown[][];
      } else {
        grid = Papa.parse<string[]>(await f.text(), { skipEmptyLines: true }).data;
      }
      const miss = missingHeaders(grid[0] ?? []);
      if (miss.length) { toast.error(`Column missing: ${miss.join(", ")}. Use the template.`); return; }
      setFile(f.name);
      setRows(reviewTechImport(rowsFromGrid(grid), data));
    } catch (e) { toast.error(`Could not read file: ${(e as Error).message}`); }
  };

  const save = async () => {
    setBusy(true);
    const { data: res, error } = await supabase.rpc("import_technical", { p_plant: plantId, p_rows: rows.map((r) => r.row) as never, p_by: by });
    setBusy(false);
    if (error) { toast.error(`Nothing saved: ${error.message}`); return; }
    const c = res as { areas: number; machines: number; points: number; sensors: number; gateways: number; skipped: number };
    toast.success(`Imported ${c.areas} areas, ${c.machines} machines, ${c.points} points, ${c.sensors} sensors, ${c.gateways} gateways${c.skipped ? ` (${c.skipped} sensors already present)` : ""}`);
    setOpen(false); setRows([]); setFile(""); onDone();
  };
  const c = importCounts(rows);

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}><Upload className="size-3.5" />Import</Button>
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="sm:max-w-5xl" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Import machines, points &amp; sensors</DialogTitle></DialogHeader>
          <p className="text-xs text-mute">One row per sensor location. Same area or machine names are matched, nothing is overwritten. CSV or Excel (.xlsx).</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => download("technical_template.csv", templateCsv())}><Download className="size-3.5" />Download template</Button>
            <Button variant="solid" onClick={() => input.current?.click()}><Upload className="size-3.5" />Choose file</Button>
            <input ref={input} type="file" accept=".csv,.xlsx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void read(f); e.target.value = ""; }} />
            {file ? <span className="self-center text-xs text-mute">{file} · {rows.length} rows</span> : null}
          </div>
          {rows.length ? (
            <>
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="text-signal">{c.new} new</span><span className="text-mute">{c.exists} already exist</span>
                <span className="text-sev-medium">{c.missing} missing details</span><span className="text-sev-high">{c.problem} problems</span>
              </div>
              <div className="max-h-[50vh] overflow-auto rounded border border-line">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-panel text-left"><tr>{["Line", "Area / Machine", "Point", "Sensor", "Gateway", "Check"].map((h) => <th key={h} className="px-2 py-1.5 font-medium">{h}</th>)}</tr></thead>
                  <tbody>
                    {rows.map(({ row: r, state, notes }) => (
                      <tr key={r.line} className="border-t border-line align-top">
                        <td className="px-2 py-1.5 text-mute">{r.line}</td>
                        <td className="px-2 py-1.5">{r.area || "—"} / <span className="font-medium">{r.machine || "—"}</span></td>
                        <td className="px-2 py-1.5">{r.point || "—"}</td>
                        <td className="px-2 py-1.5">{r.serial ? `${r.serial} · ${r.sensorType || "?"}` : "—"}</td>
                        <td className="px-2 py-1.5">{r.gateway || "—"}</td>
                        <td className={`px-2 py-1.5 ${tone[state]}`}><span className="font-medium">{label[state]}</span><br />{notes.join(" · ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-end gap-2">
                {!canSave(rows) ? <span className="text-xs text-sev-high">Fix the problem rows in the file and choose it again.</span> : null}
                <Button onClick={() => { setRows([]); setFile(""); }}>Clear</Button>
                <Button variant="solid" disabled={!canSave(rows) || busy} onClick={() => void save()}>{busy ? "Saving…" : "Save all"}</Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
