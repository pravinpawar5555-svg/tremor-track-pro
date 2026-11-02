import { useRef, useState } from "react";
import { ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/console/ui";
import { parseCard, type CardFields } from "@/lib/card-parse";

// Reads a visiting card on the device itself (Tesseract.js) — free, no AI credits.
export function CardScanButton({ onScan, label = "Scan card" }: { onScan: (f: CardFields) => void; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState<number | null>(null);

  const read = async (file: File) => {
    setPct(0);
    try {
      const { recognize } = await import("tesseract.js");
      const res = await recognize(file, "eng", { logger: (m: { status: string; progress: number }) => { if (m.status === "recognizing text") setPct(Math.round(m.progress * 100)); } });
      const f = parseCard(res.data.text);
      if (!f.name && !f.phone && !f.email) toast.error("Couldn't read the card clearly — try a sharper, well-lit photo");
      else toast.success("Card read — please check the details before saving");
      onScan(f);
    } catch {
      toast.error("Card scan failed — please try again");
    } finally { setPct(null); if (ref.current) ref.current.value = ""; }
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
