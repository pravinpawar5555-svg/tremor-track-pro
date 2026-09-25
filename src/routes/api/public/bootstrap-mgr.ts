import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/bootstrap-mgr")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: "pppawar@forbesmarshall.in",
          password: "Pravin@5835",
          email_confirm: true,
          user_metadata: { full_name: "Pravin Pawar" },
        });
        return Response.json(error ? { ok: false, message: error.message } : { ok: true, id: data.user?.id });
      },
    },
  },
});
