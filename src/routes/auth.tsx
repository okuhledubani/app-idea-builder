import { ClientOnly, createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";

import { useSession } from "@/hooks/use-session";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · AuraBot AI" },
      { name: "description", content: "Sign in or create your AuraBot AI account for Glow Beauty Lounge." },
      { property: "og:title", content: "Sign in · AuraBot AI" },
      { property: "og:description", content: "Sign in or create your AuraBot AI account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={null}>
      <AuthPage />
    </ClientOnly>
  ),
});

const input = "min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm";

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (session) void navigate({ to: "/", replace: true });
  }, [session, navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "up") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) setMsg({ ok: false, text: error.message });
      else if (!data.session) setMsg({ ok: true, text: "Check your email to confirm your account, then sign in." });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ ok: false, text: error.message });
    }
    setBusy(false);
  }

  async function social(p: "google" | "lovable") {
    setMsg(null);
    const r = await lovable.auth.signInWithOAuth(p, { redirect_uri: window.location.origin });
    if (r.error) setMsg({ ok: false, text: r.error.message });
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-sm">
        <Link to="/" className="font-display text-3xl font-semibold">
          Aura<span className="text-rose">Bot</span> AI
        </Link>
        <h1 className="mt-2 text-lg font-semibold">{mode === "in" ? "Sign in" : "Create an account"}</h1>

        <div className="mt-4 grid gap-2">
          <button type="button" onClick={() => void social("google")} className="min-h-11 rounded-full border border-border text-sm font-semibold hover:bg-accent">
            Continue with Google
          </button>
          <button type="button" onClick={() => void social("lovable")} className="min-h-11 rounded-full border border-border text-sm font-semibold hover:bg-accent">
            Continue with Lovable
          </button>
        </div>
        <p className="my-4 text-center text-xs text-muted-foreground">or use email</p>

        <form onSubmit={submit} className="grid gap-3">
          <label className="grid gap-1 text-sm">
            Email
            <input className={input} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Password
            <input className={input} type="password" required minLength={6} autoComplete={mode === "in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {msg && <p className={cn("text-sm", msg.ok ? "text-foreground" : "text-destructive")}>{msg.text}</p>}
          <button disabled={busy} className="min-h-11 rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <button type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }} className="mt-4 w-full text-sm underline">
          {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
