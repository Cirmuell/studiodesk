import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Mail } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — Studio" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name, business_name: business },
          },
        });
        if (error) throw error;

        // If email confirmation is enabled, session will be null and we need confirmation
        if (data && !data.session && data.user) {
          setVerificationEmail(email);
          setLoading(false);
          return;
        }

        toast.success("Account created — welcome!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  if (verificationEmail) {
    return (
      <div className="min-h-dvh bg-background flex flex-col mx-auto max-w-md w-full px-6 py-10">
        <div className="flex-1 flex flex-col justify-center text-center">
          <div className="size-16 rounded-full bg-primary/10 text-primary grid place-items-center mx-auto mb-6">
            <Mail className="size-8" />
          </div>
          <h1 className="font-display text-3xl leading-tight">Verify your email</h1>
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
            We have sent a verification link to{" "}
            <strong className="text-foreground">{verificationEmail}</strong>. Please click the link
            in the email to activate your account and access your creative studio.
          </p>
          <button
            onClick={() => {
              setVerificationEmail("");
              setMode("signin");
              setEmail(verificationEmail);
            }}
            className="mt-8 w-full h-12 rounded-full bg-primary text-primary-foreground font-medium flex items-center justify-center shadow-[var(--shadow-pop)]"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col mx-auto max-w-md w-full px-6 py-10">
      <div className="flex-1 flex flex-col justify-center">
        <div className="size-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center mb-6">
          <Sparkles className="size-6" />
        </div>
        <h1 className="font-display text-4xl leading-tight">
          {mode === "signup" ? "Start your creative studio." : "Welcome back."}
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          AI-grounded pricing, proposals, invoices and contracts — built for Nigerian creatives.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-3">
          {mode === "signup" && (
            <>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full h-12 px-4 rounded-2xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="text"
                placeholder="Studio / business name"
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </>
          )}
          <input
            type="email"
            placeholder="you@studio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-12 px-4 rounded-2xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full h-12 px-4 rounded-2xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full bg-primary text-primary-foreground font-medium flex items-center justify-center shadow-[var(--shadow-pop)] disabled:opacity-60"
          >
            {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="text-sm text-muted-foreground mt-6 text-center">
          {mode === "signin" ? (
            <>
              New here?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="font-medium text-primary hover:underline cursor-pointer"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="font-medium text-primary hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground/70 text-center mt-8">
        By continuing you agree to our Terms & Privacy.
      </p>
      <Toaster position="top-center" richColors />
    </div>
  );
}
