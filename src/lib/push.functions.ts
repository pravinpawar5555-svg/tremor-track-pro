import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sends a phone/laptop notification to whoever a new ticket or reminder is for. */
export const notifyNew = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: "ticket" | "reminder"; id: string }) => {
    if ((d.kind !== "ticket" && d.kind !== "reminder") || typeof d.id !== "string" || d.id.length > 100) throw new Error("Bad input");
    return d;
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    // The caller must be able to read the row (RLS); wait briefly for the save to land.
    let target = "";
    let title = "";
    let body = "";
    let url = "/";
    for (let i = 0; i < 6 && !target; i++) {
      if (data.kind === "ticket") {
        const { data: t } = await sb.from("tickets").select("ticket_no,subject,assigned_to,raised_by,plant_id").eq("id", data.id).maybeSingle();
        if (t) {
          const { data: p } = await sb.from("plants").select("name").eq("id", t.plant_id).maybeSingle();
          target = t.assigned_to;
          title = `New ticket ${t.ticket_no}${p?.name ? ` — ${p.name}` : ""}`;
          body = t.subject;
          url = "/discussions";
          if (t.assigned_to === t.raised_by) return { sent: 0 };
        }
      } else {
        const { data: r } = await sb.from("reminders").select("title,user_id,created_by,remind_date,remind_time").eq("id", data.id).maybeSingle();
        if (r) {
          if (!r.user_id || r.user_id === r.created_by) return { sent: 0 };
          target = r.user_id;
          title = "New reminder for you";
          body = `${r.title}${r.remind_date ? ` · ${r.remind_date}${r.remind_time ? " " + r.remind_time : ""}` : ""}`;
          url = "/tasks";
        }
      }
      if (!target) await sleep(700);
    }
    if (!target) return { sent: 0 };

    const priv = process.env["VAPID_PRIVATE_KEY"];
    if (!priv) return { sent: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendWebPush } = await import("./webpush.server");
    // A person id may be an auth user id, an engineer id, or an execution engineer id.
    const ids = new Set<string>();
    if (/^[0-9a-f-]{36}$/i.test(target)) ids.add(target);
    const { data: profs } = await supabaseAdmin.from("profiles").select("id").eq("engineer_id", target);
    profs?.forEach((p) => ids.add(p.id));
    const { data: ex } = await supabaseAdmin.from("execution_engineers").select("linked_user_id").eq("id", target);
    ex?.forEach((e) => e.linked_user_id && ids.add(e.linked_user_id));
    if (!ids.size) return { sent: 0 };
    const { data: subs } = await supabaseAdmin.from("push_subscriptions").select("id,endpoint,p256dh,auth").in("user_id", [...ids]);
    let sent = 0;
    for (const s of subs ?? []) {
      try {
        const status = await sendWebPush(s, { title, body, url, tag: `${data.kind}:${data.id}` }, priv);
        if (status === 404 || status === 410) await supabaseAdmin.from("push_subscriptions").delete().eq("id", s.id);
        else if (status < 300) sent++;
        else console.error("push failed", status);
      } catch (e) {
        console.error("push error", e);
      }
    }
    return { sent };
  });
