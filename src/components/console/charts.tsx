import { useState } from "react";
import type { Machine } from "@/lib/data";
import { spectrumSeries, trendSeries, waveformSeries } from "@/lib/data";

const W = 320;
const H = 120;

function pathFrom(points: { x: number; y: number }[]) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

export const TREND_RANGES = ["24 h", "7 d", "30 d", "3 m", "6 m", "1 y"] as const;

export function TrendChart({ machine, range = "7 d" }: { machine: Machine; range?: string }) {
  const series = trendSeries(machine);
  const max = Math.max(machine.alarmLimit * 1.15, ...series.map((p) => p.value));
  const y = (v: number) => H - (v / max) * (H - 8) - 4;
  const pts = series.map((p, i) => ({ x: (i / (series.length - 1)) * W, y: y(p.value) }));

  return (
    <div className="panel-inset p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="label-caps">Overall vibration trend · {range} · mm/s RMS</span>
        <span className="num text-[10px] text-mute">
          alert {machine.alertLimit.toFixed(1)} · alarm {machine.alarmLimit.toFixed(1)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-28 w-full" preserveAspectRatio="none" role="img" aria-label="Overall vibration trend">
        <line x1="0" y1={y(machine.alarmLimit)} x2={W} y2={y(machine.alarmLimit)} stroke="var(--sev-critical)" strokeWidth="1" strokeDasharray="4 3" />
        <line x1="0" y1={y(machine.alertLimit)} x2={W} y2={y(machine.alertLimit)} stroke="var(--sev-high)" strokeWidth="1" strokeDasharray="4 3" />
        <path d={pathFrom(pts)} fill="none" stroke="var(--signal)" strokeWidth="2" />
        <circle cx={pts[pts.length - 1]?.x ?? 0} cy={pts[pts.length - 1]?.y ?? 0} r="3" fill="var(--signal)" />
      </svg>
    </div>
  );
}

export function SpectrumChart({ machine }: { machine: Machine }) {
  const [cursor, setCursor] = useState<{ f: number; a: number } | null>(null);
  const series = spectrumSeries(machine);
  const max = Math.max(0.5, ...series.map((p) => p.a));
  const fMax = series[series.length - 1].f;
  const x = (f: number) => (f / fMax) * W;
  const y = (a: number) => H - (a / max) * (H - 20) - 8;
  const pts = series.map((p) => ({ x: x(p.f), y: y(p.a) }));
  const oneX = machine.operatingRpm / 60;

  const markers = [
    { f: oneX, label: "1X" },
    { f: oneX * 2, label: "2X" },
    { f: oneX * 3, label: "3X" },
    ...(machine.type.includes("Gearbox") ? [{ f: 412, label: "GMF" }] : []),
    ...(machine.name.includes("Fan F-204") ? [{ f: 128, label: "BPFO" }] : []),
  ].filter((m) => m.f <= fMax);

  return (
    <div className="panel-inset p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="label-caps">FFT spectrum · velocity</span>
        <span className="num text-[10px] text-mute">
          {cursor ? `${cursor.f.toFixed(1)} Hz · ${cursor.a.toFixed(2)} mm/s` : `0–${fMax.toFixed(0)} Hz`}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-28 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Velocity FFT spectrum"
        onMouseLeave={() => setCursor(null)}
        onMouseMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - box.left) / box.width;
          const idx = Math.min(series.length - 1, Math.max(0, Math.round(ratio * (series.length - 1))));
          setCursor(series[idx]);
        }}
      >
        <line x1="0" y1={H - 8} x2={W} y2={H - 8} stroke="var(--line)" strokeWidth="1" />
        {markers.map((m) => (
          <g key={m.label}>
            <line x1={x(m.f)} y1={H - 8} x2={x(m.f)} y2="16" stroke="var(--mute)" strokeWidth="1" strokeDasharray="3 2" />
            <text x={x(m.f) - 4} y="12" fontSize="8" fill="var(--mute)" className="num">
              {m.label}
            </text>
          </g>
        ))}
        <path d={pathFrom(pts)} fill="none" stroke="var(--signal)" strokeWidth="1.5" />
        {cursor ? <line x1={x(cursor.f)} y1={H - 8} x2={x(cursor.f)} y2="8" stroke="var(--signal)" strokeWidth="1" /> : null}
      </svg>
    </div>
  );
}

export function WaveformChart({ machine }: { machine: Machine }) {
  const series = waveformSeries(machine);
  const max = Math.max(...series.map((p) => Math.abs(p.v))) || 1;
  const y = (v: number) => H / 2 - (v / max) * (H / 2 - 6);
  const pts = series.map((p, i) => ({ x: (i / (series.length - 1)) * W, y: y(p.v) }));

  return (
    <div className="panel-inset p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="label-caps">Time waveform · 200 ms</span>
        <span className="num text-[10px] text-mute">amplitude mm/s</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-28 w-full" preserveAspectRatio="none" role="img" aria-label="Time waveform">
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="var(--line)" strokeWidth="1" />
        <path d={pathFrom(pts)} fill="none" stroke="var(--signal)" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

export function DistributionBars({ rows }: { rows: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-mute">{r.label}</span>
            <span className="num">{r.value}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line/70">
            <div className={`h-full rounded-full ${r.color}`} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
