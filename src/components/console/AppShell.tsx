import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useState, type ReactNode } from "react";
import { CalendarDays, Factory, Wrench, FileText, LayoutDashboard, ListChecks, Menu, MessageSquare, Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { RefreshControls } from "@/components/console/RefreshControls";
import { NotificationBell } from "@/components/console/NotificationBell";
import {
  TODAY,
  analystsOf,
  currentUser,
  fmtDate,
  reportKpis,
  taskStats,
  chatUnread,
  ticketAttention,
  useData,
} from "@/lib/store";

const nav = [
  { to: "/", label: "Dashboard" },
  { to: "/tasks", label: "Daily Work" },
  { to: "/discussions", label: "Discussion & Tickets" },
  { to: "/visits", label: "Visits" },
  { to: "/execution", label: "Execution" },
  { to: "/reports", label: "Reports" },
  { to: "/plants", label: "Plants" },
  { to: "/engineers", label: "Engineers" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const data = useData();
  const meId = data.currentUserId;
  const manager = data.role === "manager";
  const myReports = manager ? data.reports : data.reports.filter((r) => r.byEngineerId === meId);
  const kpis = reportKpis({ ...data, reports: myReports });
  const team = analystsOf(data);
  const me = currentUser(data);
  const unread = chatUnread(data);
  const tickets = ticketAttention(data);
  const navigate = useNavigate();
  const items = nav.filter((n) => manager || n.to !== "/engineers");
  const [moreOpen, setMoreOpen] = useState(false);
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
  const primary = [
    { to: "/", short: "Home", icon: LayoutDashboard },
    { to: "/tasks", short: "Daily Work", icon: ListChecks },
    { to: "/reports", short: "Reports", icon: FileText },
  ] as const;
  const moreIcons = { "/discussions": MessageSquare, "/visits": CalendarDays, "/execution": Wrench, "/plants": Factory, "/engineers": Users } as Record<string, typeof Menu>;
  const more = items.filter((n) => !primary.some((p) => p.to === n.to)).map((n) => ({ ...n, icon: moreIcons[n.to] ?? Menu }));
  const moreActive = more.some((m) => isActive(m.to));
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-base text-ink">
      <header className="sticky top-0 z-30 bg-panel/90 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] backdrop-blur-md md:hidden">
        <div className="flex h-12 items-center gap-2 px-4">
          <div className="grid size-7 shrink-0 place-items-center rounded-md bg-signal text-[11px] font-semibold text-signal-foreground">FM</div>
          <span className="min-w-0 truncate text-[15px] font-semibold tracking-tight">Forbes Marshall</span>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <NotificationBell />
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" aria-label="Profile and alerts" className="relative grid size-9 place-items-center rounded-full bg-base text-xs font-semibold text-mute ring-1 ring-line">
                  {me?.initials ?? "—"}
                  {kpis.overdue || unread || tickets ? <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-sev-high ring-2 ring-panel" /> : null}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-2">
                <div className="px-2 py-1.5">
                  <div className="text-sm font-semibold">{me?.name ?? ""}</div>
                  <div className="text-xs text-mute">{manager ? "Manager" : "Customer Success Engineer"}</div>
                </div>
                <div className="mt-1 flex flex-col gap-1">
                  <Link to="/reports" search={{ timing: "overdue", eng: manager ? undefined : meId }} className="flex min-h-11 items-center gap-2 rounded-md px-2 text-sm hover:bg-base">
                    <span className={cn("size-2 rounded-full", kpis.overdue ? "bg-sev-high" : "bg-sev-low")} />Overdue reports<span className="num ml-auto">{kpis.overdue}</span>
                  </Link>
                  <Link to="/discussions" search={{ unread: unread ? true : undefined }} className="flex min-h-11 items-center gap-2 rounded-md px-2 text-sm hover:bg-base">
                    <span className={cn("size-2 rounded-full", unread ? "bg-sev-medium" : "bg-sev-low")} />Unread messages<span className="num ml-auto">{unread}</span>
                  </Link>
                  <Link to="/discussions" search={{ tickets: true }} className="flex min-h-11 items-center gap-2 rounded-md px-2 text-sm hover:bg-base">
                    <span className={cn("size-2 rounded-full", tickets ? "bg-sev-high" : "bg-sev-low")} />Tickets<span className="num ml-auto">{tickets}</span>
                  </Link>
                  <button onClick={() => void signOut()} className="mt-1 min-h-11 rounded-md text-sm font-medium text-signal ring-1 ring-signal/40">Sign out</button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="flex h-10 items-center justify-between gap-2 border-t border-line/50 px-4 text-xs text-mute">
          <span className="num">{fmtDate(TODAY)}</span>
          <RefreshControls />
        </div>
      </header>

      <header className="sticky top-0 z-30 hidden h-11 items-center gap-4 bg-panel/70 px-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] backdrop-blur-md md:flex">
        <div className="flex items-center gap-2">
          <div className="grid size-6 place-items-center rounded-md bg-signal text-[10px] font-semibold text-signal-foreground">FM</div>
          <span className="font-semibold tracking-tight">Forbes Marshall</span>
          <span className="hidden text-xs text-mute sm:inline">Condition Monitoring Work Portal</span>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-mute">
          <RefreshControls />
          <NotificationBell />
          <span className="num hidden md:inline">{fmtDate(TODAY)}</span>
          <Link
            to="/reports"
            search={{ timing: "overdue", eng: manager ? undefined : meId }}
            title="Open overdue reports"
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-mute ring-1 ring-line hover:bg-base hover:text-ink"
          >
            <span className={cn("size-2 rounded-full", kpis.overdue ? "bg-sev-high" : "bg-sev-low")} />
            <span className="num">{kpis.overdue} overdue reports</span>
          </Link>
          <Link
            to="/discussions"
            search={{ unread: unread ? true : undefined }}
            title={unread ? "Open the newest unread plant chat message" : "Open plant chats"}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-mute ring-1 ring-line hover:bg-base hover:text-ink"
          >
            <span className={cn("size-2 rounded-full", unread ? "bg-sev-medium" : "bg-sev-low")} />
            <span className="num">{unread} unread</span>
          </Link>
          <Link
            to="/discussions"
            search={{ tickets: true }}
            title={manager ? "Tickets awaiting your reply" : "Your tickets with new replies"}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-mute ring-1 ring-line hover:bg-base hover:text-ink"
          >
            <span className={cn("size-2 rounded-full", tickets ? "bg-sev-high" : "bg-sev-low")} />
            <span className="num">{tickets} tickets</span>
          </Link>
          <span className="hidden items-center gap-1.5 lg:flex">
            <span className="grid size-6 place-items-center rounded-full bg-base text-[10px] font-semibold text-mute ring-1 ring-line">
              {me?.initials ?? "—"}
            </span>
            <span className="text-xs text-mute">{me?.name ?? ""} · {manager ? "Manager" : "Customer Success Engineer"}</span>
          </span>
          <button onClick={() => void signOut()} className="rounded-md px-2 py-1 text-xs text-signal ring-1 ring-signal/40">
            Sign out
          </button>
        </div>
      </header>

      <div className="flex">
        <nav className="sticky top-11 hidden w-52 shrink-0 self-start bg-panel/55 px-3 py-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] backdrop-blur-md md:block md:min-h-[calc(100vh-2.75rem)]">
          <div className="label-caps px-2 pb-2">Portal</div>
          <div className="flex flex-col gap-0.5">
            {items.map((item) => {
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
            <div className="label-caps">Today's tasks</div>
            {(manager ? team : me ? [me] : []).map((a) => {
              const st = taskStats(data, a.id);
              return (
                <div key={a.id} className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <span className="text-mute">{a.name}</span>
                  <span className={cn("num", st.total && !st.pending ? "text-sev-low" : st.total ? "text-sev-medium" : "text-sev-high")}>
                    {st.done}/{st.total}
                  </span>
                </div>
              );
            })}
          </div>
        </nav>

        <main className="min-w-0 flex-1">
          <div className="mx-4 mt-3 flex items-center gap-2 overflow-x-auto text-xs md:hidden">
            <span className="label-caps shrink-0">Today's tasks</span>
            {(manager ? team : me ? [me] : []).map((a) => {
              const st = taskStats(data, a.id);
              const done = st.total > 0 && st.pending === 0;
              return (
                <span
                  key={a.id}
                  className={cn(
                    "num shrink-0 rounded-full px-2 py-0.5 ring-1",
                    done ? "text-sev-low ring-sev-low/40" : "text-sev-high ring-sev-high/40",
                  )}
                >
                  {a.name.split(" ")[0]} {st.done}/{st.total}
                </span>
              );
            })}
          </div>
          <div className="px-4 py-4 pb-28 md:px-6 md:pb-4">{children}</div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 gap-1 border-t border-line/60 bg-panel/95 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
        {primary.map((item) => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-md text-xs",
                active ? "bg-signal/10 font-semibold text-signal" : "text-mute",
              )}
            >
              <item.icon className="size-5" />
              {item.short}
            </Link>
          );
        })}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-md text-xs",
                moreActive ? "bg-signal/10 font-semibold text-signal" : "text-mute",
              )}
            >
              <Menu className="size-5" />
              More
              {unread || tickets ? <span className="absolute right-[30%] top-1 size-2 rounded-full bg-sev-high" /> : null}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
            <SheetHeader><SheetTitle>More</SheetTitle></SheetHeader>
            <div className="mt-3 flex flex-col gap-1">
              {more.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-md px-3 text-[15px]",
                    isActive(item.to) ? "bg-signal/10 font-semibold text-signal" : "hover:bg-base",
                  )}
                >
                  <item.icon className="size-5" />
                  {item.label}
                  {item.to === "/discussions" && unread + tickets ? (
                    <span className="num ml-auto rounded-full bg-sev-high px-2 text-xs font-semibold text-signal-foreground">{unread + tickets}</span>
                  ) : null}
                </Link>
              ))}
              <button onClick={() => void signOut()} className="mt-2 min-h-12 rounded-md text-sm font-medium text-signal ring-1 ring-signal/40">Sign out</button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
