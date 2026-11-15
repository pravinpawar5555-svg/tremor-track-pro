import { sendWebPush } from "./webpush.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function deliverPush(ids: string[], message: { title: string; body: string; url: string; tag: string }, key: string) {
  if (!ids.length) return { sent: 0, devices: 0, failures: [] as number[] };
  const { data: subs, error } = await supabaseAdmin.from("push_subscriptions").select("id,endpoint,p256dh,auth").in("user_id", ids);
  if (error) throw error;
  let sent = 0;
  const failures: number[] = [];
  for (const sub of subs ?? []) {
    try {
      const status = await sendWebPush(sub, message, key);
      if (status === 404 || status === 410) await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
      if (status >= 200 && status < 300) sent++;
      else failures.push(status);
    } catch { failures.push(500); }
  }
  return { sent, devices: subs?.length ?? 0, failures };
}