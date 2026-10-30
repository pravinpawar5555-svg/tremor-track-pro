import { TECH_HEADERS, isActiveSensor, type TechData } from "@/lib/technical";

/** One parsed row of the technical template (same columns as the Export CSV). */
export interface TechImportRow {
  line: number;
  area: string; machine: string; tag: string; machineType: string;
  point: string; component: string; position: string; bearing: string;
  serial: string; sensorType: string; model: string; gateway: string; installDate: string;
}
export type RowState = "new" | "exists" | "missing" | "problem";
export interface RowReview { row: TechImportRow; state: RowState; notes: string[] }

const FIELD: Record<string, keyof Omit<TechImportRow, "line">> = {
  "area name": "area", "machine name": "machine", "machine tag": "tag", "machine type": "machineType",
  "measurement point": "point", component: "component", position: "position", "bearing number": "bearing",
  "sensor serial number": "serial", "sensor type": "sensorType", "sensor model": "model",
  "gateway serial number": "gateway", "installation date": "installDate",
};
const norm = (s: unknown) => String(s ?? "").trim();
const low = (s: string) => s.trim().toLowerCase();

/** Accepts YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY or a Date; returns ISO or "" (invalid → "!"). */
export function toIsoDate(v: unknown): string {
  if (v instanceof Date && !isNaN(+v)) return v.toISOString().slice(0, 10);
  const s = norm(v);
  if (!s) return "";
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2]!.padStart(2, "0")}-${m[3]!.padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  return "!";
}

/** Turns a grid (first row = headers) into template rows; blank rows dropped. */
export function rowsFromGrid(grid: unknown[][]): TechImportRow[] {
  const [head, ...body] = grid;
  if (!head) return [];
  const idx = head.map((h) => FIELD[low(norm(h))]);
  const out: TechImportRow[] = [];
  body.forEach((cells, i) => {
    const r: TechImportRow = { line: i + 2, area: "", machine: "", tag: "", machineType: "", point: "", component: "", position: "", bearing: "", serial: "", sensorType: "", model: "", gateway: "", installDate: "" };
    cells.forEach((c, j) => { const k = idx[j]; if (k) r[k] = k === "installDate" ? toIsoDate(c) : norm(c); });
    if (Object.entries(r).some(([k, v]) => k !== "line" && v)) out.push(r);
  });
  return out;
}

export const missingHeaders = (head: unknown[]) => ["Area Name", "Machine Name"].filter((h) => !head.some((x) => low(norm(x)) === low(h)));

/** Marks each row new / exists / missing / problem against the plant's current register. */
export function reviewTechImport(rows: TechImportRow[], d: TechData): RowReview[] {
  const seenSerial = new Map<string, number>();
  return rows.map((row) => {
    const notes: string[] = [];
    let state: RowState = "exists";
    if (!row.area || !row.machine) return { row, state: "missing", notes: ["Area and machine name are required"] };
    if (row.serial && !row.point) { state = "problem"; notes.push("Sensor needs a measurement point"); }
    if (row.installDate === "!") { state = "problem"; notes.push("Installation date not understood (use DD-MM-YYYY)"); }
    if (row.serial) {
      const k = low(row.serial);
      if (seenSerial.has(k)) { state = "problem"; notes.push(`Serial repeated on line ${seenSerial.get(k)}`); } else seenSerial.set(k, row.line);
    }
    if (state === "problem") return { row, state, notes };

    const area = d.areas.find((a) => low(a.name) === low(row.area));
    const mach = area && d.machines.find((m) => m.area_id === area.id && low(m.name) === low(row.machine));
    const point = mach && row.point ? d.points.find((p) => p.machine_id === mach.id && low(p.name) === low(row.point)) : undefined;
    const sensor = row.serial ? d.sensors.find((s) => isActiveSensor(s) && low(s.serial_no) === low(row.serial)) : undefined;
    if (!area) notes.push("New area");
    if (!mach) notes.push("New machine");
    if (row.point && !point) notes.push("New point");
    if (row.serial) {
      if (sensor) notes.push("Sensor already in register — skipped");
      else notes.push("New sensor");
    }
    if (row.gateway && !d.gateways.some((g) => low(g.serial_no) === low(row.gateway))) notes.push("New gateway");
    if (notes.some((n) => n.startsWith("New"))) state = "new";
    if (row.serial && !row.sensorType && !sensor) { state = state === "new" ? "missing" : state; notes.push("Sensor type blank — saved as Other"); }
    return { row, state, notes };
  });
}

export const canSave = (r: RowReview[]) => r.length > 0 && !r.some((x) => x.state === "problem");

export function importCounts(r: RowReview[]) {
  const c = { new: 0, exists: 0, missing: 0, problem: 0 };
  r.forEach((x) => c[x.state]++);
  return c;
}

export const templateCsv = () => [TECH_HEADERS.join(","),
  "Plant,Boiler House,BFP-2,P-102,Pump,Motor NDE,Motor,Horizontal,6316,N6-10234,Node 6,,GW-01,15-10-2026,",
  "Plant,Boiler House,BFP-2,P-102,Pump,Motor DE,Motor,Vertical,6318,NX-55621,Node X,,GW-01,15-10-2026,",
].join("\r\n");
