import { useRef, useState } from "react";
import { ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/console/ui";
import { parseCard, cardScore, type CardFields } from "@/lib/card-parse";

// Reads a visiting card on the device itself (Tesseract.js) — free, no AI credits.
// Cleans the photo first and tries two cleaned versions, keeping the better read.
export function CardScanButton({ onScan, label = "Scan card" }: { onScan: (f: CardFields) => void; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState<number | null>(null);

  const read = async (file: File) => {
    setPct(0);
    type W = { recognize: (i: HTMLCanvasElement) => Promise<{ data: { text: string } }>; setParameters: (p: Record<string, string>) => Promise<unknown>; terminate: () => Promise<unknown> };
    let worker = null as W | null;
    try {
      const [{ createWorker }, { prepareCardImage }] = await Promise.all([import("tesseract.js"), import("@/lib/card-image")]);
      let pass = 0;
      worker = (await createWorker("eng", 1, {
        logger: (m: { status: string; progress: number }) => { if (m.status === "recognizing text") setPct(Math.round((pass * 100 + m.progress * 100) / 2)); },
      })) as unknown as W;
      await worker!.setParameters({ tessedit_pageseg_mode: "11", preserve_interword_spaces: "1" });
      const imgA = await prepareCardImage(file, true);
      const a = parseCard((await worker!.recognize(imgA)).data.text);
      pass = 1;
      const imgB = await prepareCardImage(file, false);
      const b = parseCard((await worker!.recognize(imgB)).data.text);
      const f = cardScore(b) > cardScore(a) ? mergeFields(b, a) : mergeFields(a, b);
      if (!f.name && !f.phone && !f.email) toast.error("Couldn't read the card clearly — try a sharper, well-lit photo filling the screen");
      else toast.success("Card read — please check the details before saving");
      onScan(f);
    } catch {
      toast.error("Card scan failed — please try again");
    } finally {
      await worker?.terminate().catch(() => {});
      setPct(null); if (ref.current) ref.current.value = "";
    }
  };

  return (
    <>
      <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void read(f); }} />
      <Button type="button" disabled={pct !== null} onClick={() => ref.current?.click()}>
        <ScanLine className="size-4" />{pct !== null ? `Reading… ${pct}%` : label}
      </Button>
    </>
  );
}

function mergeFields(main: CardFields, extra: CardFields): CardFields {
  const out = { ...main };
  (Object.keys(out) as (keyof CardFields)[]).forEach((k) => { if (!out[k]) out[k] = extra[k]; });
  if (out.altPhone === out.phone) out.altPhone = main.altPhone && main.altPhone !== out.phone ? main.altPhone : (extra.phone !== out.phone ? extra.phone : "");
  return out;
}
