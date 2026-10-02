import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button, Field, TextInput } from "@/components/console/ui";

const search = z.object({ status: z.enum(["pending", "rejected"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Sign in — Forbes Marshall CM Portal" },
      { name: "description", content: "Sign in or request an account for the Forbes Marshall condition monitoring work portal." },
      { property: "og:title", content: "Sign in — Forbes Marshall CM Portal" },
      { property: "og:description", content: "Engineer and manager sign-in for the condition monitoring work portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { status } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(
    status === "pending"
      ? { tone: "ok", text: "Your account is waiting for manager approval." }
      : status === "rejected"
        ? { tone: "err", text: "Your account request was not approved. Please contact your manager." }
        : null,
  );
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const login = async () => {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim().toLowerCase(), password: form.password });
    setBusy(false);
    if (error) {
      const m = error.message.toLowerCase();
      return setMsg({
        tone: "err",
        text: m.includes("confirm")
          ? "Please confirm your email first — open the link we sent to your inbox, then log in."
          : m.includes("invalid")
            ? "Email or password is wrong. Check capital letters, or use \"Forgot password\" below."
            : error.message,
      });
    }
    navigate({ to: "/", replace: true });
  };

  const signup = async () => {
    if (!form.name.trim()) return setMsg({ tone: "err", text: "Enter your full name." });
    if (form.password.length < 8) return setMsg({ tone: "err", text: "Password must be at least 8 characters." });
    if (form.password !== form.confirm) return setMsg({ tone: "err", text: "Passwords do not match." });
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin + "/auth",
        data: { full_name: form.name.trim(), phone: form.phone.trim() },
      },
    });
    await supabase.auth.signOut();
    setBusy(false);
    if (error) return setMsg({ tone: "err", text: error.message });
    setMode("login");
    setForm((f) => ({ ...f, password: "", confirm: "" }));
    setMsg({
      tone: "ok",
      text: "Your account has been created successfully. Please confirm your email, then your account is waiting for manager approval.",
    });
  };

  const forgot = async () => {
    const email = form.email.trim().toLowerCase();
    if (!email) return setMsg({ tone: "err", text: "Type your email above first, then tap Forgot password." });
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    setMsg(error ? { tone: "err", text: error.message } : { tone: "ok", text: "A password reset link has been sent to your email." });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-base px-4 text-ink">
      <div className="panel-glass w-full max-w-sm p-6">
        <div className="mb-5 flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-md bg-signal text-xs font-semibold text-signal-foreground">FM</div>
          <div>
            <div className="font-semibold tracking-tight">Forbes Marshall</div>
            <div className="text-xs text-mute">Condition Monitoring Work Portal</div>
          </div>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-md bg-black/5 p-1 text-sm">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setMsg(null); }}
              className={mode === m ? "rounded bg-panel py-1.5 font-medium shadow-sm" : "py-1.5 text-mute"}
            >
              {m === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>
        <form
          className="grid gap-3"
          onSubmit={(e) => { e.preventDefault(); void (mode === "login" ? login() : signup()); }}
        >
          {mode === "signup" ? (
            <>
              <Field label="Full name"><TextInput value={form.name} onChange={(e) => set("name", e.target.value)} required /></Field>
              <Field label="Mobile number"><TextInput type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            </>
          ) : null}
          <Field label="Email"><TextInput type="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={form.email} onChange={(e) => set("email", e.target.value)} required /></Field>
          <Field label="Password">
            <TextInput type={show ? "text" : "password"} autoCapitalize="none" autoCorrect="off" autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={(e) => set("password", e.target.value)} required />
          </Field>
          {mode === "signup" ? (
            <Field label="Confirm password"><TextInput type={show ? "text" : "password"} autoCapitalize="none" autoCorrect="off" autoComplete="new-password" value={form.confirm} onChange={(e) => set("confirm", e.target.value)} required /></Field>
          ) : null}
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-1.5 text-mute"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show password</label>
            {mode === "login" ? <button type="button" className="text-signal" onClick={() => void forgot()}>Forgot password?</button> : null}
          </div>
          {msg ? <p className={msg.tone === "ok" ? "text-sm text-sev-low" : "text-sm text-sev-high"}>{msg.text}</p> : null}
          <Button variant="solid" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </Button>
        </form>
      </div>
    </div>
  );
}
