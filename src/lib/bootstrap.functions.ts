import { createServerFn } from "@tanstack/react-start";

// One-off: creates the initial manager login. Removed after use.
export const bootstrapManager = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: "pppawar@forbesmarshall.in",
    password: "Pravin@5835",
    email_confirm: true,
    user_metadata: { full_name: "Pravin Pawar" },
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, id: data.user?.id };
});
