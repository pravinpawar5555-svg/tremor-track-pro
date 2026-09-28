import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { refreshData } from "@/lib/store";
import { loadVisits } from "@/lib/visits";
import { loadDailyWork } from "@/lib/dailywork";

const INTERVAL = 30_000;
let lastAt = Date.now();

function ago(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return `${m} min ago`;
}

/** "Refreshed: just now" + "Auto refresh: On/Off" — reloads all shared cloud data. */
export function RefreshControls() {
  const [auto, setAuto] = useState(true);
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    if (window.localStorage.getItem("fm.autoRefresh") === "off") setAuto(false);
  }, []);

  const refresh = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await Promise.all([refreshData(), loadVisits(), loadDailyWork()]);
      lastAt = Date.now();
    } finally {
      setBusy(false);
    }
  }, [busy]);

  // clock for the "x ago" label
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 10_000);
    return () => window.clearInterval(id);
  }, []);

  // auto refresh while the tab is visible, and on return to the tab
  useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, INTERVAL);
    const onVis = () => {
      if (document.visibilityState === "visible" && Date.now() - lastAt > INTERVAL) void refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [auto, refresh]);

  const toggle = () => {
    const next = !auto;
    setAuto(next);
    window.localStorage.setItem("fm.autoRefresh", next ? "on" : "off");
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => void refresh()}
        title="Refresh now"
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-mute ring-1 ring-line hover:bg-base"
      >
        <span className={cn("inline-block", busy && "animate-spin")}>⟳</span>
        <span className="hidden sm:inline">Refreshed: {busy ? "updating…" : ago(Date.now() - lastAt)}</span>
      </button>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={auto}
        title="Refresh automatically every 30 seconds"
        className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ring-1",
          auto ? "bg-signal/10 font-medium text-signal ring-signal/30" : "text-mute ring-line",
        )}
      >
        <span>◷</span>
        <span className="hidden sm:inline">Auto refresh:</span> {auto ? "On" : "Off"}
      </button>
    </div>
  );
}
