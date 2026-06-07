import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Studio" }] }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="min-h-dvh bg-background flex flex-col mx-auto max-w-md w-full px-6 py-10">
      <div className="flex-1 flex flex-col justify-center">
        <div className="size-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center mb-6">
          <Sparkles className="size-6" />
        </div>
        <h1 className="font-display text-4xl leading-tight">Run your creative business with confidence.</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          AI-grounded pricing, proposals, invoices and contracts — built for independent creatives.
        </p>

        <form className="mt-8 space-y-3">
          <input
            type="email"
            placeholder="you@studio.com"
            className="w-full h-12 px-4 rounded-2xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full h-12 px-4 rounded-2xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Link
            to="/"
            className="w-full h-12 rounded-full bg-primary text-primary-foreground font-medium flex items-center justify-center shadow-[var(--shadow-pop)]"
          >
            Continue
          </Link>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px bg-border flex-1" />
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">or</span>
          <div className="h-px bg-border flex-1" />
        </div>

        <button className="w-full h-12 rounded-full border border-border bg-surface text-sm font-medium">
          Continue with Google
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground/70 text-center mt-8">
        By continuing you agree to our Terms & Privacy.
      </p>
    </div>
  );
}
