import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Frequency, ReportStatus, Severity } from "@/lib/store";
import { frequencyLabel, reportStatusLabel } from "@/lib/store";

const sevText: Record<Severity, string> = {
  advisory: "text-sev-advisory",
  low: "text-sev-low",
  medium: "text-sev-medium",
  high: "text-sev-high",
  critical: "text-sev-critical",
};

const sevDot: Record<Severity, string> = {
  advisory: "bg-sev-advisory",
  low: "bg-sev-low",
  medium: "bg-sev-medium",
  high: "bg-sev-high",
  critical: "bg-sev-critical",
};

const sevBg: Record<Severity, string> = {
  advisory: "bg-sev-advisory/10",
  low: "bg-sev-low/10",
  medium: "bg-sev-medium/10",
  high: "bg-sev-high/10",
  critical: "bg-sev-critical/10",
};

export function Panel({
  title,
  meta,
  children,
  className,
}: {
  title?: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel-glass min-w-0", className)}>
      {title ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-4 py-3">
          <h2 className="font-semibold tracking-tight text-balance">{title}</h2>
          {meta ? <div className="text-xs text-mute">{meta}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Kpi({
  label,
  value,
  unit,
  tone,
  hint,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  tone?: Severity;
  hint?: string;
}) {
  return (
    <div className="panel-glass p-3">
      <div className="label-caps">{label}</div>
      <div className={cn("num mt-1 text-2xl font-semibold", tone && sevText[tone])}>
        {value}
        {unit ? <span className="text-base text-mute">{unit}</span> : null}
      </div>
      {hint ? <div className="mt-1 text-[11px] text-mute">{hint}</div> : null}
    </div>
  );
}

export function Chip({ severity, label }: { severity: Severity; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide",
        sevBg[severity],
        sevText[severity],
      )}
    >
      <span className={cn("size-1.5 rounded-full", sevDot[severity])} />
      {label}
    </span>
  );
}

export function StatusChip({ status }: { status: ReportStatus }) {
  const sev: Severity = status === "sent" ? "low" : status === "prepared" ? "medium" : "advisory";
  return <Chip severity={sev} label={reportStatusLabel[status]} />;
}

export function TimingChip({ late, label }: { late: boolean; label: string }) {
  return <Chip severity={late ? "high" : "low"} label={label} />;
}

export function FrequencyChip({ frequency }: { frequency: Frequency }) {
  const sev: Severity = frequency === "weekly" ? "low" : frequency === "monthly" ? "medium" : "advisory";
  return <Chip severity={sev} label={frequencyLabel[frequency]} />;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-xs text-mute">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function Th({
  children,
  align = "left",
  className,
}: {
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th className={cn("label-caps px-2 py-2 font-medium first:pl-4 last:pr-4", align === "right" && "text-right", className)}>
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className,
  mono,
}: {
  children: ReactNode;
  align?: "left" | "right";
  className?: string | undefined;
  mono?: boolean;
}) {
  return (
    <td className={cn("px-2 py-2 first:pl-4 last:pr-4", align === "right" && "text-right", mono && "num", className)}>
      {children}
    </td>
  );
}

export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn("border-t border-line/60 transition-[background-color] hover:bg-black/[0.03]", className)}>{children}</tr>;
}

export function Button({
  children,
  variant = "outline",
  onClick,
  type = "button",
  className,
  disabled,
}: {
  children: ReactNode;
  variant?: "outline" | "solid" | "ghost";
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-[background-color] disabled:opacity-40",
        variant === "outline" && "text-signal ring-1 ring-signal/40 hover:bg-signal/10",
        variant === "solid" && "bg-signal text-signal-foreground ring-1 ring-signal/40 hover:bg-signal/90",
        variant === "ghost" && "text-mute hover:bg-black/5",
        className,
      )}
    >
      {children}
    </button>
  );
}

const control =
  "w-full rounded-md bg-panel px-2.5 py-1.5 text-sm text-ink ring-1 ring-line/80 outline-none transition-[box-shadow] focus:ring-2 focus:ring-signal/50";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label-caps">{label}</span>
      <span className="mt-1 block">{children}</span>
      {hint ? <span className="mt-1 block text-[11px] text-mute">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(control, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(control, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(control, "min-h-20", props.className)} />;
}

export function SpecRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/50 py-1.5 last:border-0">
      <span className="text-xs text-mute">{label}</span>
      <span className="num text-xs">{value}</span>
    </div>
  );
}

export function Bar({ pct, severity = "low" }: { pct: number; severity?: Severity }) {
  return (
    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line/70">
      <div className={cn("h-full rounded-full", sevDot[severity])} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-4 py-6 text-xs text-mute">{children}</div>;
}
