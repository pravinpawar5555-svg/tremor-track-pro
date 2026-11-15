import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { pushRecipients, type PushPerson } from "./push-rules";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sends a phone/laptop notification to whoever a new ticket or reminder is for. */
export const notifyNew = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: "ticket" | "reminder" | "message"; id: string }) => {
    if (!["ticket", "reminder", "message"].includes(d.kind) || typeof d.id !== "string" || !d.id || d.id.length > 100) throw new Error("Bad input");
    return d;
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    // The caller must be able to read the row (RLS); wait briefly for the save to land.
    let target = "";
    let title = "";
    let body = "";
    let url = "/";
    let targets: string[] = [];
    let plantChat = false;
    for (let i = 0; i < 6 && !target; i++) {
      if (data.kind === "ticket") {
        const { data: t } = await sb.from("tickets").select("ticket_no,subject,assigned_to,raised_by,plant_id").eq("id", data.id).maybeSingle();
        if (t) {
          const { data: mine } = await sb.rpc("my_person_ids", { _uid: context.userId });
          const { data: manager } = await sb.rpc("has_role", { _user_id: context.userId, _role: "manager" });
          if (!mine?.includes(t.raised_by) && !manager) throw new Error("Only the sender can notify");
          const { data: p } = await sb.from("plants").select("name").eq("id", t.plant_id).maybeSingle();
          target = t.assigned_to;
          title = `New ticket ${t.ticket_no}${p?.name ? ` — ${p.name}` : ""}`;
          body = t.subject;
          url = "/discussions";
          if (t.assigned_to === t.raised_by) return { sent: 0 };
        }
      } else if (data.kind === "reminder") {
        const { data: r } = await sb.from("reminders").select("title,user_id,created_by,remind_date,remind_time").eq("id", data.id).maybeSingle();
        if (r) {
          const { data: mine } = await sb.rpc("my_person_ids", { _uid: context.userId });
          if (!mine?.includes(r.created_by ?? "")) throw new Error("Only the sender can notify");
          if (!r.user_id || r.user_id === r.created_by) return { sent: 0 };
          target = r.user_id;
          title = "New reminder for you";
          body = `${r.title}${r.remind_date ? ` · ${r.remind_date}${r.remind_time ? " " + r.remind_time : ""}` : ""}`;
          url = "/tasks";
        }
      } else {
        const { data: m } = await sb.from("messages").select("thread,author_id,text").eq("id", data.id).maybeSingle();
        if (m) {
          const { data: mine } = await sb.rpc("my_person_ids", { _uid: context.userId });
          if (!mine?.includes(m.author_id)) throw new Error("Only the sender can notify");
          plantChat = m.thread.startsWith("plant:");
          if (!plantChat) {
            const { data: t } = await sb.from("tickets").select("raised_by,assigned_to").eq("id", m.thread.slice(7)).maybeSingle();
            if (!t) return { sent: 0 };
            targets = [t.raised_by, t.assigned_to];
          }
          target = "message";
          title = plantChat ? "New plant message" : "New ticket message";
          body = m.text.slice(0, 240);
          url = `/discussions?thread=${encodeURIComponent(m.thread)}`;
        }
      }
      if (!target) await sleep(700);
    }
    if (!target) return { sent: 0 };

    const priv = process.env["VAPID_PRIVATE_KEY"];
    if (!priv) throw new Error("Device notification sending is not configured");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { deliverPush } = await import("./push-delivery.server");
    // A person id may be an auth user id, an engineer id, or an execution engineer id.
    const ids = new Set<string>();
    if (data.kind === "message") {
      const { data: profiles } = await supabaseAdmin.from("profiles").select("id").eq("status", "approved");
      const people: PushPerson[] = [];
      for (const p of profiles ?? []) {
        const [person, domain, view] = await Promise.all([
          supabaseAdmin.rpc("my_person_ids", { _uid: p.id }),
          supabaseAdmin.rpc("user_domain", { _uid: p.id }),
          supabaseAdmin.rpc("perm_level", { _uid: p.id, _module: "discussions", _action: "view" }),
        ]);
        people.push({ id: p.id, personIds: person.data ?? [], domain: domain.data ?? "none", approved: true, view: view.data ?? "none" });
      }
      // Shared plant chat goes to all approved readers; ticket chat only to its participants/managers.
      const recipients = pushRecipients(people, context.userId, targets, plantChat);
      if (!plantChat) people.filter((p) => p.domain === "manager" && p.id !== context.userId).forEach((p) => recipients.push(p.id));
      return deliverPush([...new Set(recipients)], { title, body, url, tag: `message:${data.id}` }, priv);
    }
    if (/^[0-9a-f-]{36}$/i.test(target)) ids.add(target);
    const { data: profs } = await supabaseAdmin.from("profiles").select("id").eq("engineer_id", target);
    profs?.forEach((p) => ids.add(p.id));
    const { data: ex } = await supabaseAdmin.from("execution_engineers").select("linked_user_id").eq("id", target);
    ex?.forEach((e) => e.linked_user_id && ids.add(e.linked_user_id));
    if (!ids.size) return { sent: 0 };
    ids.delete(context.userId);
    for (const id of [...ids]) {
      const { data: approved } = await supabaseAdmin.rpc("is_approved", { _user_id: id });
      if (!approved) { ids.delete(id); continue; }
      if (data.kind === "ticket") {
        const [domain, view] = await Promise.all([
          supabaseAdmin.rpc("user_domain", { _uid: id }),
          supabaseAdmin.rpc("perm_level", { _uid: id, _module: "discussions", _action: "view" }),
        ]);
        if (view.data === "none" || (domain.data === "execution" && view.data !== "all")) ids.delete(id);
      }
    }
    return deliverPush([...ids], { title, body, url, tag: `${data.kind}:${data.id}` }, priv);
  });

export const testDevicePush = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const key = process.env["VAPID_PRIVATE_KEY"];
  if (!key) throw new Error("Device notification sending is not configured");
  const { deliverPush } = await import("./push-delivery.server");
  return deliverPush([context.userId], { title: "Forbes Marshall — test notification", body: "Device notifications are connected.", url: "/settings", tag: "device-test" }, key);
});
