import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TODAY, fleetKpis } from "@/lib/data";

const nav = [
  { to: "/", label: "Dashboard" },
  { to: "/customers", label: "Customers" },
  { to: "/machines", label: "Machines" },
  { to: "/work-queue", label: "Daily Work Queue" },
  { to: "/alerts", label: "Alerts" },
  { to: "/actions", label: "Actions" },
  { to: "/reports", label: "Reports" },
  { to: "/team", label: "Team Monitoring" },
  { to: "/audit", label: "Audit Trail" },
  { to: "/administration", label: "Administration" },
] as const;

export interface Crumb {
  label: string;
  to?: string;
}

export function AppShell({ children, crumbs }: { children: ReactNode; crumbs?: Crumb[] }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const kpis = fleetKpis();

  return (
    <div className="min-h-screen bg-base text-ink">
      <header className="sticky top-0 z-30 flex h-11 items-center gap-4 bg-panel/70 px-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="grid size-6 place-items-center rounded-md bg-signal text-[10px] font-semibold text-signal-foreground">FM</div>
          <span className="font-semibold tracking-tight">Forbes Marshall</span>
          <span className="hidden text-xs text-mute sm:inline">Vibration Operations Console</span>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-mute">
          <span className="num hidden md:inline">{TODAY} · 14:38</span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-sev-critical" />
            <span className="num">{kpis.criticalAlerts} critical</span>
          </span>
          <span className="hidden items-center gap-1.5 lg:flex">
            <span className="grid size-6 place-items-center rounded-full bg-base text-[10px] font-semibold text-mute ring-1 ring-line">PP</span>
            <span>P. Pawar · Team Lead</span>
          </span>
        </div>
      </header>

      <div className="flex">
        <nav className="sticky top-11 hidden w-52 shrink-0 self-start bg-panel/55 px-3 py-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] backdrop-blur-md md:block md:min-h-[calc(100vh-2.75rem)]">
          <div className="label-caps px-2 pb-2">Console</div>
          <div className="flex flex-col gap-0.5">
            {nav.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 transition-[background-color]",
                    active ? "bg-signal/10 font-medium text-signal" : "text-mute hover:bg-black/5",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="panel-inset mt-6 p-3">
            <div className="label-caps">Data quality</div>
            <div className="mt-2 flex items-baseline justify-between gap-2 text-xs">
              <span className="text-mute">Sensors reporting</span>
              <span className="num">182 / 186</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="text-mute">Invalid / offline</span>
              <span className="num text-sev-medium">4</span>
            </div>
          </div>
        </nav>

        <main className="min-w-0 flex-1">
          <div className="px-4 py-4 md:px-6">
            {crumbs?.length ? (
              <div className="mb-3 flex flex-wrap items-center gap-1 text-xs text-mute">
                {crumbs.map((c, i) => (
                  <span key={`${c.label}-${i}`} className="flex items-center gap-1">
                    {i > 0 ? <span className="text-line">/</span> : null}
                    {c.to ? (
                      <Link to={c.to} className="hover:text-ink">
                        {c.label}
                      </Link>
                    ) : (
                      <span className={i === crumbs.length - 1 ? "font-medium text-ink" : undefined}>{c.label}</span>
                    )}
                  </span>
                ))}
              </div>
            ) : null}
            {children}
          </div>
          <div className="px-4 pb-8 md:px-6">
            <nav className="flex flex-wrap gap-2 md:hidden">
              {nav.map((item) => (
                <Link key={item.to} to={item.to} className="panel-inset px-2.5 py-1.5 text-xs text-mute">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </main>
      </div>
    </div>
  );
}
