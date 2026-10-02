import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button, Field, TextInput } from "@/components/console/ui";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Forbes Marshall CM Portal" },
      { name: "description", content: "Set a new password for your Forbes Marshall CM Portal account." },
      { property: "og:title", content: "Reset password — Forbes Marshall CM Portal" },
      { property: "og:description", content: "Set a new password for the condition monitoring work portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (pw.length < 8) return setMsg({ ok: false, text: "Password must be at least 8 characters." });
    if (pw !== pw2) return setMsg({ ok: false, text: "Passwords do not match." });
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message });
    await supabase.auth.signOut();
    setMsg({ ok: true, text: "Password changed. Taking you to log in…" });
    setTimeout(() => navigate({ to: "/auth", replace: true }), 1500);
  };
  return (
    <div className="grid min-h-screen place-items-center bg-base px-4 text-ink">
      <form className="panel-glass grid w-full max-w-sm gap-3 p-6" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <div className="font-semibold">Set a new password</div>
        <Field label="New password"><TextInput type="password" autoCapitalize="none" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></Field>
        <Field label="Confirm password"><TextInput type="password" autoCapitalize="none" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required /></Field>
        {msg ? <p className={msg.ok ? "text-sm text-sev-low" : "text-sm text-sev-high"}>{msg.text}</p> : null}
        <Button variant="solid" type="submit" disabled={busy}>{busy ? "Please wait…" : "Save password"}</Button>
      </form>
    </div>
  );
}
