import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import logoAsset from "@/assets/studiodesk-logo.png.asset.json";

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
  const [loading, setLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") navigate({ to: "/" });
    });
    return () => sub.subscription.unsubscribe();
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
            emailRedirectTo: "https://studiodesk-rouge.vercel.app",
            data: { full_name: name },
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
        <div className="flex justify-center mb-6">
          <img
            src={logoAsset.url}
            alt="StudioDesk"
            className="size-16 rounded-2xl shadow-[var(--shadow-pop)]"
          />
        </div>
        <h1 className="font-display text-4xl leading-tight text-center">
          {mode === "signup" ? "Start your creative studio." : "Welcome back."}
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed text-center">
          AI-grounded pricing, proposals, invoices and contracts — built for Nigerian creatives.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-3">
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full h-12 px-4 rounded-2xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          )}
          <input
            type="email"
            placeholder="you@studio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-12 px-4 rounded-2xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full h-12 pl-4 pr-10 rounded-2xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowPassword(!showPassword);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
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
