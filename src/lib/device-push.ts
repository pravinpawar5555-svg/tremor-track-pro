import { supabase } from "@/integrations/supabase/client";
import { VAPID_PUBLIC_KEY, shouldReconnectPush } from "./push-rules";

export type DeviceState = "loading" | "unsupported" | "iframe" | "off" | "on" | "blocked" | "error";
const optOutKey = "fm-device-push-opt-out";
export async function connectDevicePush(requestPermission = false): Promise<DeviceState> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (window.self !== window.top) return "iframe";
  if (Notification.permission === "denied") return "blocked";
  if (requestPermission) {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return permission === "denied" ? "blocked" : "off";
    localStorage.removeItem(optOutKey);
  }
  if (!shouldReconnectPush(Notification.permission, localStorage.getItem(optOutKey) === "1")) return "off";
  const { data: user, error: userError } = await supabase.auth.getUser();
  if (userError || !user.user) throw new Error("Please sign in again");
  const reg = await navigator.serviceWorker.register("/push-sw.js");
  await navigator.serviceWorker.ready;
  const bytes = Uint8Array.from(atob(VAPID_PUBLIC_KEY.replace(/-/g, "+").replace(/_/g, "/") + "="), (c) => c.charCodeAt(0));
  const sub = await reg.pushManager.getSubscription() ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
  const j = sub.toJSON();
  const endpoint = j.endpoint, p256dh = j.keys?.["p256dh"], auth = j.keys?.["auth"];
  if (!endpoint || !p256dh || !auth) throw new Error("Device registration is incomplete");
  const { error } = await supabase.from("push_subscriptions").upsert({ user_id: user.user.id, endpoint, p256dh, auth, user_agent: navigator.userAgent.slice(0, 200) }, { onConflict: "endpoint" });
  if (error) throw error;
  return "on";
}

export async function disconnectDevicePush() {
  const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    if (error) throw error;
    await sub.unsubscribe();
  }
  localStorage.setItem(optOutKey, "1");
}