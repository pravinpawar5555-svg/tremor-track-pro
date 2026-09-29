import { useState } from "react";
import { Download, Eye, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import fmLogo from "@/assets/fm-logo-white.png.asset.json";
import { Button, Panel, Select, TextArea, TextInput } from "@/components/console/ui";
import { engineerName, fmtDate, plantName, useData, type AppData } from "@/lib/store";
import { cn } from "@/lib/utils";
import { frequencyText, saveVisit, visitTypeLabel, type Attendee, type Visit, type VisitAction } from "@/lib/visits";

/** Customer + Forbes Marshall attendee lists, editable any time after the visit is saved. */
export function AttendeesEditor({ v, canEdit }: { v: Visit; canEdit: boolean }) {
  const data = useData();
  const [cust, setCust] = useState<Attendee[]>(v.customerAttendees.length ? v.customerAttendees : [{ name: "", phone: "" }]);
  const [fm, setFm] = useState<string[]>(v.fmAttendees.length ? v.fmAttendees : v.engineerIds.map((id) => engineerName(data, id)));
  const save = async () => {
    try {
      await saveVisit({
        ...v,
        customerAttendees: cust.map((a) => ({ name: a.name.trim(), phone: a.phone.trim() })).filter((a) => a.name),
        fmAttendees: fm.map((n) => n.trim()).filter(Boolean),
      });
      toast.success("Attendees saved");
    } catch {
      toast.error("Could not save attendees");
    }
  };
  return (
    <div className="panel-inset grid gap-4 p-3 md:col-span-4 md:grid-cols-2">
      <div>
        <div className="label-caps mb-1">Customer attendees</div>
        {cust.map((a, i) => (
          <div key={i} className="mb-1.5 flex gap-2">
            <TextInput disabled={!canEdit} placeholder="Name" value={a.name} onChange={(e) => setCust((x) => x.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))} />
            <TextInput disabled={!canEdit} type="tel" placeholder="Contact number" value={a.phone} onChange={(e) => setCust((x) => x.map((y, j) => (j === i ? { ...y, phone: e.target.value } : y)))} />
            {canEdit ? <button type="button" className="text-xs text-mute" onClick={() => setCust((x) => x.filter((_, j) => j !== i))}>Remove</button> : null}
          </div>
        ))}
        {canEdit ? <button type="button" className="text-xs text-signal" onClick={() => setCust((x) => [...x, { name: "", phone: "" }])}>+ Add customer attendee</button> : null}
      </div>
      <div>
        <div className="label-caps mb-1">Forbes Marshall attendees</div>
        {fm.map((n, i) => (
          <div key={i} className="mb-1.5 flex gap-2">
            <TextInput disabled={!canEdit} placeholder="Name" value={n} onChange={(e) => setFm((x) => x.map((y, j) => (j === i ? e.target.value : y)))} />
            {canEdit ? <button type="button" className="text-xs text-mute" onClick={() => setFm((x) => x.filter((_, j) => j !== i))}>Remove</button> : null}
          </div>
        ))}
        {canEdit ? <button type="button" className="text-xs text-signal" onClick={() => setFm((x) => [...x, ""])}>+ Add Forbes Marshall attendee</button> : null}
      </div>
      {canEdit ? <div className="md:col-span-2"><Button onClick={() => void save()}>Save attendees</Button></div> : null}
    </div>
  );
}

const respName = (data: AppData, r: string) => (r === "customer" ? "Customer" : engineerName(data, r) || r);
const ACKNOWLEDGMENT = "By signing below, both parties acknowledge that these Minutes of Meeting accurately reflect the technical discussions, observations, decisions, responsibilities, and agreed action items recorded during the meeting.";

let logoDataUrl: string | null = null;
async function loadLogoDataUrl(): Promise<string | null> {
  if (logoDataUrl) return logoDataUrl;
  try {
    const res = await fetch(fmLogo.url);
    const blob = await res.blob();
    logoDataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    return logoDataUrl;
  } catch {
    return null;
  }
}

async function downloadMom(data: AppData, v: Visit) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const plant = data.plants.find((p) => p.id === v.plantId);
  doc.setFillColor(24, 44, 84);
  doc.rect(0, 0, W, 56, "F");
  doc.setTextColor(255);
  const logo = await loadLogoDataUrl();
  if (logo) doc.addImage(logo, "PNG", 40, 16, 108, 28);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Minutes of Meeting", W / 2, 34, { align: "center" });
  doc.setFont("helvetica", "normal");
  if (v.momNo) {
    doc.setFontSize(10);
    doc.text(`MOM No: ${v.momNo}`, W - 40, 34, { align: "right" });
  }
  doc.setTextColor(20, 26, 34);
  const head = { fillColor: [24, 44, 84] as [number, number, number] };
  autoTable(doc, {
    startY: 72,
    theme: "grid",
    styles: { fontSize: 9 },
    body: [
      ["Customer", plant?.customer ?? "", "Plant", plantName(data, v.plantId)],
      ["Visit type", visitTypeLabel[v.visitType], "Frequency", frequencyText(v)],
      ["Visit date", fmtDate(v.completedDate ?? v.plannedDate), "Next visit", fmtDate(v.nextVisitDate ?? undefined)],
      ["MOM No.", { content: v.momNo || "—", colSpan: 3 }],
      ["Purpose", { content: v.purpose || "—", colSpan: 3 }],
    ],
  });
  const y = () => (doc as any).lastAutoTable.finalY + 16;
  autoTable(doc, {
    startY: y(),
    headStyles: head,
    styles: { fontSize: 9 },
    head: [["Customer attendee", "Contact number", "Forbes Marshall attendee"]],
    body: Array.from({ length: Math.max(1, v.customerAttendees.length, v.fmAttendees.length) }, (_, i) => [
      v.customerAttendees[i]?.name ?? "",
      v.customerAttendees[i]?.phone ?? "",
      v.fmAttendees[i] ?? "",
    ]),
  });
  autoTable(doc, {
    startY: y(),
    headStyles: head,
    styles: { fontSize: 9 },
    head: [["#", "Discussion points"]],
    body: v.discussionPoints.length ? v.discussionPoints.map((p, i) => [String(i + 1), p]) : [["", "—"]],
    columnStyles: { 0: { cellWidth: 24 } },
  });
  autoTable(doc, { startY: y(), headStyles: head, styles: { fontSize: 9 }, head: [["Observations / findings"]], body: [[v.observations || "—"]] });
  autoTable(doc, {
    startY: y(),
    headStyles: head,
    styles: { fontSize: 9 },
    head: [["Action", "Responsible", "Due", "Status", "Remarks"]],
    body: v.actions.length ? v.actions.map((a) => [a.action, respName(data, a.responsible), fmtDate(a.dueDate), a.status === "open" ? "Open" : "Closed", a.remarks]) : [["—", "", "", "", ""]],
  });
  if (v.signOffRequired) {
    const sectionHeight = 190;
    const pageHeight = doc.internal.pageSize.getHeight();
    let signY = y();
    if (signY + sectionHeight > pageHeight - 40) {
      doc.addPage();
      signY = 48;
    }
    const margin = 40;
    const gap = 14;
    const blockWidth = (W - margin * 2 - gap) / 2;
    doc.setDrawColor(24, 44, 84);
    doc.setLineWidth(0.8);
    doc.line(margin, signY, W - margin, signY);
    doc.setTextColor(24, 44, 84);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Acknowledgment & Sign-Off", margin, signY + 18);
    doc.setTextColor(20, 26, 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const acknowledgmentLines = doc.splitTextToSize(ACKNOWLEDGMENT, W - margin * 2);
    doc.text(acknowledgmentLines, margin, signY + 34, { lineHeightFactor: 1.35 });
    const acknowledgmentBottom = signY + 34 + acknowledgmentLines.length * 11.5;
    const blockY = acknowledgmentBottom + 12;
    const blockHeight = 100;
    const drawSignatureBlock = (x: number, title: string) => {
      doc.setDrawColor(24, 44, 84);
      doc.roundedRect(x, blockY, blockWidth, blockHeight, 3, 3);
      doc.setFillColor(24, 44, 84);
      doc.rect(x, blockY, blockWidth, 24, "F");
      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(title, x + 10, blockY + 16, { maxWidth: blockWidth - 20 });
      doc.setTextColor(20, 26, 34);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      ["Signature: __________________________", "Name: ______________________________", "Designation: ________________________", "Date: _______________________________"].forEach((line, index) => {
        doc.text(line, x + 10, blockY + 42 + index * 15);
      });
    };
    drawSignatureBlock(margin, `For Customer: ${plant?.customer ?? ""}`);
    drawSignatureBlock(margin + blockWidth + gap, "For Forbes Marshall");
  }
  doc.save(`MOM_${v.momNo ? v.momNo.replace(/\//g, "-") + "_" : ""}${plantName(data, v.plantId).replace(/[^\w]+/g, "_")}_${v.completedDate ?? v.plannedDate}.pdf`);
}

/** Minutes of Meeting: edit, preview and download as PDF (completed visits). */
export function MomPanel({ visit, canEdit, onClose }: { visit: Visit; canEdit: boolean; onClose: () => void }) {
  const data = useData();
  const [v, setV] = useState<Visit>(visit);
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [downloading, setDownloading] = useState(false);
  const plant = data.plants.find((p) => p.id === v.plantId);
  const setAction = (i: number, p: Partial<VisitAction>) => setV((x) => ({ ...x, actions: x.actions.map((a, j) => (j === i ? { ...a, ...p } : a)) }));
  const save = async () => {
    try {
      await saveVisit({ ...v, discussionPoints: v.discussionPoints.filter((p) => p.trim()), customerAttendees: v.customerAttendees.filter((a) => a.name.trim()), fmAttendees: v.fmAttendees.filter((n) => n.trim()) });
      toast.success("MOM saved");
      setMode("preview");
    } catch {
      toast.error("Could not save MOM");
    }
  };
  const download = async () => {
    setDownloading(true);
    try {
      await downloadMom(data, v);
      toast.success("PDF downloaded");
    } catch {
      toast.error("Could not create the PDF");
    } finally {
      setDownloading(false);
    }
  };
  const toolBtn = "inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs font-medium text-ink shadow-sm transition-colors hover:bg-base";
  return (
    <Panel
      className="mt-4"
      title={`MOM${v.momNo ? " " + v.momNo : ""} — ${plantName(data, v.plantId)}`}
      meta={
        <span className="flex flex-wrap items-center gap-1.5">
          {canEdit ? (
            <span className="inline-flex overflow-hidden rounded-md border border-line shadow-sm">
              <button
                type="button"
                title="Preview"
                onClick={() => setMode("preview")}
                className={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors", mode === "preview" ? "bg-signal text-signal-foreground" : "bg-panel text-ink hover:bg-base")}
              >
                <Eye className="size-3.5" /> Preview
              </button>
              <button
                type="button"
                title="Edit"
                onClick={() => setMode("edit")}
                className={cn("inline-flex items-center gap-1.5 border-l border-line px-2.5 py-1.5 text-xs font-medium transition-colors", mode === "edit" ? "bg-signal text-signal-foreground" : "bg-panel text-ink hover:bg-base")}
              >
                <Pencil className="size-3.5" /> Edit
              </button>
            </span>
          ) : null}
          <button type="button" title="Download PDF" disabled={downloading} onClick={() => void download()} className={cn(toolBtn, "disabled:opacity-50")}>
            {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />} {downloading ? "Preparing…" : "Download PDF"}
          </button>
          <button type="button" title="Close" onClick={onClose} className={toolBtn}>
            <X className="size-3.5" /> Close
          </button>
        </span>
      }
    >
      {mode === "preview" ? (
        <div className="p-4">
          <div className="mx-auto max-w-3xl bg-panel p-6 text-sm shadow ring-1 ring-line">
            <div className="relative -mx-6 -mt-6 mb-4 flex items-center gap-3 px-6 py-3 text-white" style={{ backgroundColor: "#182C54" }}>
              <img src={fmLogo.url} alt="Forbes Marshall" className="h-7 w-auto shrink-0" />
              <span className="absolute left-1/2 -translate-x-1/2 truncate font-semibold">Minutes of Meeting</span>
              {v.momNo ? <span className="num ml-auto text-xs">MOM No: {v.momNo}</span> : null}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><span className="label-caps">Customer</span><div>{plant?.customer}</div></div>
              <div><span className="label-caps">Plant</span><div>{plantName(data, v.plantId)}</div></div>
              <div><span className="label-caps">Visit</span><div>{visitTypeLabel[v.visitType]} · {frequencyText(v)}</div></div>
              <div><span className="label-caps">Date</span><div className="num">{fmtDate(v.completedDate ?? v.plannedDate)}</div></div>
              <div className="col-span-2"><span className="label-caps">Purpose</span><div>{v.purpose || "—"}</div></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <div className="label-caps">Customer attendees</div>
                {v.customerAttendees.length ? v.customerAttendees.map((a, i) => <div key={i}>{a.name} <span className="num text-mute">{a.phone}</span></div>) : <div className="text-mute">—</div>}
              </div>
              <div>
                <div className="label-caps">Forbes Marshall attendees</div>
                {v.fmAttendees.length ? v.fmAttendees.map((n, i) => <div key={i}>{n}</div>) : <div className="text-mute">—</div>}
              </div>
            </div>
            <div className="mt-4 label-caps">Discussion points</div>
            {v.discussionPoints.length ? <ol className="list-decimal pl-5">{v.discussionPoints.map((p, i) => <li key={i}>{p}</li>)}</ol> : <div className="text-mute">—</div>}
            <div className="mt-4 label-caps">Observations / findings</div>
            <p className="whitespace-pre-wrap">{v.observations || "—"}</p>
            <div className="mt-4 label-caps">Next actions</div>
            <table className="w-full text-xs">
              <thead><tr className="text-left text-mute"><th>Action</th><th>Responsible</th><th>Due</th><th>Status</th><th>Remarks</th></tr></thead>
              <tbody>
                {v.actions.map((a, i) => (
                  <tr key={i} className="border-t border-line/60"><td>{a.action}</td><td>{respName(data, a.responsible)}</td><td className="num">{fmtDate(a.dueDate)}</td><td>{a.status === "open" ? "Open" : "Closed"}</td><td>{a.remarks}</td></tr>
                ))}
              </tbody>
            </table>
            {!v.actions.length ? <div className="text-mute">—</div> : null}
            {v.signOffRequired ? (
              <div className="mt-6 border-t-2 pt-4" style={{ borderColor: "#182C54" }}>
                <div className="font-semibold" style={{ color: "#182C54" }}>Acknowledgment &amp; Sign-Off</div>
                <p className="mt-2 text-xs leading-relaxed text-mute">{ACKNOWLEDGMENT}</p>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[`For Customer: ${plant?.customer ?? ""}`, "For Forbes Marshall"].map((title) => (
                    <div key={title} className="overflow-hidden rounded border border-line">
                      <div className="px-3 py-2 text-xs font-semibold text-white" style={{ backgroundColor: "#182C54" }}>{title}</div>
                      <div className="space-y-2 p-3 text-xs">
                        <div>Signature: __________________________</div>
                        <div>Name: ______________________________</div>
                        <div>Designation: ________________________</div>
                        <div>Date: _______________________________</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 p-4 text-sm">
          <div className="label-caps">Customer attendees</div>
          {v.customerAttendees.map((a, i) => (
            <div key={i} className="flex gap-2">
              <TextInput placeholder="Name" value={a.name} onChange={(e) => setV((x) => ({ ...x, customerAttendees: x.customerAttendees.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)) }))} />
              <TextInput placeholder="Contact number" value={a.phone} onChange={(e) => setV((x) => ({ ...x, customerAttendees: x.customerAttendees.map((y, j) => (j === i ? { ...y, phone: e.target.value } : y)) }))} />
              <button type="button" className="text-xs text-mute" onClick={() => setV((x) => ({ ...x, customerAttendees: x.customerAttendees.filter((_, j) => j !== i) }))}>Remove</button>
            </div>
          ))}
          <button type="button" className="w-fit text-xs text-signal" onClick={() => setV((x) => ({ ...x, customerAttendees: [...x.customerAttendees, { name: "", phone: "" }] }))}>+ Add customer attendee</button>
          <div className="label-caps">Forbes Marshall attendees</div>
          {v.fmAttendees.map((n, i) => (
            <div key={i} className="flex gap-2">
              <TextInput value={n} onChange={(e) => setV((x) => ({ ...x, fmAttendees: x.fmAttendees.map((y, j) => (j === i ? e.target.value : y)) }))} />
              <button type="button" className="text-xs text-mute" onClick={() => setV((x) => ({ ...x, fmAttendees: x.fmAttendees.filter((_, j) => j !== i) }))}>Remove</button>
            </div>
          ))}
          <button type="button" className="w-fit text-xs text-signal" onClick={() => setV((x) => ({ ...x, fmAttendees: [...x.fmAttendees, ""] }))}>+ Add Forbes Marshall attendee</button>
          <div className="label-caps">Purpose</div>
          <TextInput value={v.purpose} onChange={(e) => setV((x) => ({ ...x, purpose: e.target.value }))} />
          <div className="label-caps">Discussion points</div>
          {v.discussionPoints.map((p, i) => (
            <div key={i} className="flex gap-2">
              <TextInput value={p} onChange={(e) => setV((x) => ({ ...x, discussionPoints: x.discussionPoints.map((y, j) => (j === i ? e.target.value : y)) }))} />
              <button type="button" className="text-xs text-mute" onClick={() => setV((x) => ({ ...x, discussionPoints: x.discussionPoints.filter((_, j) => j !== i) }))}>Remove</button>
            </div>
          ))}
          <button type="button" className="w-fit text-xs text-signal" onClick={() => setV((x) => ({ ...x, discussionPoints: [...x.discussionPoints, ""] }))}>+ Add point</button>
          <div className="label-caps">Observations / findings</div>
          <TextArea rows={3} value={v.observations} onChange={(e) => setV((x) => ({ ...x, observations: e.target.value }))} />
          <label className="panel-inset flex cursor-pointer items-center justify-between gap-4 p-3">
            <span>
              <span className="block font-medium">Sign-Off Required</span>
              <span className="block text-xs text-mute">Add acknowledgment and signature blocks to the bottom of the PDF.</span>
            </span>
            <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", v.signOffRequired ? "bg-signal" : "bg-line") }>
              <input className="sr-only" type="checkbox" checked={v.signOffRequired} onChange={(e) => setV((x) => ({ ...x, signOffRequired: e.target.checked }))} />
              <span className={cn("absolute top-1 size-4 rounded-full bg-panel shadow transition-transform", v.signOffRequired ? "translate-x-6" : "translate-x-1")} />
            </span>
          </label>
          <div className="label-caps">Next actions</div>
          {v.actions.map((a, i) => (
            <div key={i} className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr_2fr]">
              <TextInput value={a.action} onChange={(e) => setAction(i, { action: e.target.value })} />
              <Select value={a.responsible} onChange={(e) => setAction(i, { responsible: e.target.value })}>
                {data.engineers.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                <option value="customer">Customer</option>
              </Select>
              <TextInput type="date" value={a.dueDate} onChange={(e) => setAction(i, { dueDate: e.target.value })} />
              <Select value={a.status} onChange={(e) => setAction(i, { status: e.target.value as VisitAction["status"] })}>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </Select>
              <TextInput value={a.remarks} onChange={(e) => setAction(i, { remarks: e.target.value })} />
            </div>
          ))}
          <div><Button onClick={() => void save()}>Save MOM</Button></div>
        </div>
      )}
    </Panel>
  );
}
