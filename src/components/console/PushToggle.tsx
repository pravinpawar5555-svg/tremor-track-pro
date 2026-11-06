import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY =
  "BDlgMlxE2HlljiT1RwuhP7PuaMxa5buSwd7ElHq6k-BNu4iiOyw9GsQ-Ya6kbz7Xh2yyWdy61mMsj977ktC_ofQ";

const toBytes = (s: string) => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

type State = "loading" | "unsupported" | "iframe" | "off" | "on" | "blocked";

/** One-tap switch so this phone / laptop gets notification banners even when the portal is closed. */
export function PushToggle() {
  const [st, setSt] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setSt("unsupported");
    if (window.self !== window.top) return setSt("iframe");
    if (Notification.permission === "denied") return setSt("blocked");
    navigator.serviceWorker.getRegistration("/push-sw.js").then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      setSt(sub ? "on" : "off");
    });
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setSt(perm === "denied" ? "blocked" : "off"); return; }
      const reg = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(VAPID_PUBLIC_KEY) }));
      const j = sub.toJSON();
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Please sign in again");
      await supabase.from("push_subscriptions").delete().eq("endpoint", j.endpoint!);
      const { error } = await supabase.from("push_subscriptions").insert({
        user_id: u.user.id, endpoint: j.endpoint!, p256dh: j.keys!["p256dh"]!, auth: j.keys!["auth"]!,
        user_agent: navigator.userAgent.slice(0, 200),
      });
      if (error) throw error;
      setSt("on");
      toast.success("Notifications turned on for this device");
    } catch (e) {
      console.error(e);
      toast.error("Could not turn on notifications on this device");
    } finally { setBusy(false); }
  };

  const disable = async () => {
    setBusy(true);
    const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    setSt("off"); setBusy(false);
    toast("Notifications turned off for this device");
  };

  const msg: Record<State, string> = {
    loading: "",
    unsupported: "This browser can't show notifications. On iPhone, add the portal to your Home Screen first.",
    iframe: "Open the portal in its own tab to turn on device notifications.",
    blocked: "Notifications are blocked. Allow them in your browser's site settings.",
    off: "Get a banner on this device for new tickets and reminders, even when the portal is closed.",
    on: "This device gets banners for new tickets and reminders.",
  };
  if (st === "loading") return null;
  return (
    <div className="border-t border-line px-3 py-2">
      <div className="flex items-center gap-2">
        <BellRing className="size-4 text-mute" />
        <span className="text-sm font-medium">Device notifications</span>
        {st === "off" || st === "on" ? (
          <button type="button" disabled={busy} onClick={st === "on" ? disable : enable}
            className="ml-auto rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? "…" : st === "on" ? "Turn off" : "Turn on"}
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-[11px] text-mute">{msg[st]}</p>
    </div>
  );
}
