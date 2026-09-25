import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { startSession } from "@/lib/store";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("status, engineer_id, full_name").eq("id", data.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", data.user.id),
    ]);
    if (!profile || profile.status !== "approved") {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth", search: { status: profile?.status === "rejected" ? "rejected" : "pending" } });
    }
    const role = (roles ?? []).some((r) => r.role === "manager") ? "manager" : "engineer";
    startSession(profile.engineer_id || data.user.id, role);
    return { user: data.user, role };
  },
  component: () => <Outlet />,
});
