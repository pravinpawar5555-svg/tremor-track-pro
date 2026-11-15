import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui";
import { connectDevicePush, disconnectDevicePush, type DeviceState } from "@/lib/device-push";
import { testDevicePush } from "@/lib/push.functions";

export function PushToggle() {
  const [state, setState] = useState<DeviceState>("loading");
  const [busy, setBusy] = useState(false);
  const testPush = useServerFn(testDevicePush);
  useEffect(() => { connectDevicePush().then(setState).catch(() => setState("error")); }, []);
  const change = async () => {
    setBusy(true);
    try {
      if (state === "on") { await disconnectDevicePush(); setState("off"); }
      else setState(await connectDevicePush(true));
    } catch { setState("error"); toast.error("Could not connect this device. Please retry."); }
    finally { setBusy(false); }
  };
  const test = async () => {
    setBusy(true);
    try {
      const result = await testPush();
      if (result.sent) toast.success("Test alert sent. Check your phone or laptop notifications.");
      else toast.error(result.failures.length ? `Delivery failed (${result.failures.join(", ")}). Reconnect this device.` : "No registered device. Turn notifications on first.");
    } catch { toast.error("Test alert could not be sent."); }
    finally { setBusy(false); }
  };
  const copy: Record<DeviceState, string> = {
    loading: "Checking this device…",
    unsupported: "This browser cannot receive device alerts. On iPhone, install the portal on your Home Screen first.",
    iframe: "Open the published portal in its own tab to allow notifications on this device.",
    blocked: "Allow notifications in your browser’s site settings, then reload.",
    off: "Permission is needed once on each phone or laptop for ticket, reminder and message alerts.",
    on: "Connected — ticket, reminder and message alerts can arrive even when the portal is closed.",
    error: "This device could not reconnect. Retry to restore alerts.",
  };
  return <section className="border-y border-line py-4">
    <div className="flex flex-wrap items-center gap-3"><BellRing className="size-4 text-mute" /><h2 className="text-sm font-semibold">Device notifications</h2>
      <span className="text-xs text-mute">{state === "on" ? "On" : state === "off" ? "Permission required" : ""}</span>
      {["off", "on", "error"].includes(state) && <Button variant="solid" disabled={busy} onClick={() => void change()}>{busy ? "Please wait…" : state === "on" ? "Turn off" : "Allow notifications"}</Button>}
      {state === "on" && <Button disabled={busy} onClick={() => void test()}>Send test alert</Button>}
    </div><p className="mt-2 text-xs text-mute">{copy[state]}</p>
  </section>;
}