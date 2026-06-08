import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { getAdminSettings, updateAdminSettings } from "@/lib/admin.functions";
import { ShieldAlert, Sparkles, Key, Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Studio" }] }),
  component: () => <AdminPage />,
});

function AdminPage() {
  const fetchAdminSettings = useServerFn(getAdminSettings);
  const save = useServerFn(updateAdminSettings);
  const qc = useQueryClient();

  const { data: settings, error, isLoading } = useQuery({
    queryKey: ["admin_settings"],
    queryFn: () => fetchAdminSettings(),
    retry: false,
  });

  const [form, setForm] = useState({
    gemini_api_key: "",
    openai_api_key: "",
    lovable_api_key: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        gemini_api_key: settings.gemini_api_key ?? "",
        openai_api_key: settings.openai_api_key ?? "",
        lovable_api_key: settings.lovable_api_key ?? "",
      });
    }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: () => save({ data: form }),
    onSuccess: () => {
      toast.success("Admin settings saved successfully");
      qc.invalidateQueries({ queryKey: ["admin_settings"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save settings"),
  });

  if (isLoading) {
    return (
      <AppShell title="Admin" subtitle="SaaS Administration">
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-sm">
          Loading settings...
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Access Denied" subtitle="SaaS Administration">
        <div className="card-soft p-6 border-destructive/20 text-center space-y-4">
          <div className="size-12 rounded-full bg-destructive/10 text-destructive grid place-items-center mx-auto">
            <ShieldAlert className="size-6" />
          </div>
          <div className="space-y-1">
            <p className="font-display text-lg font-medium">Admin Access Required</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Your account does not have administrator permissions. If you are the SaaS owner, please toggle <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">is_admin = true</code> in the profiles table in Supabase.
            </p>
            <div className="text-[11px] text-destructive bg-destructive/5 border border-destructive/10 px-3 py-2 rounded-lg max-w-xs mx-auto mt-2 font-mono text-left overflow-x-auto">
              Error: {error instanceof Error ? error.message : String(error)}
            </div>
          </div>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-border text-sm font-medium text-muted-foreground hover:text-foreground mx-auto"
          >
            <ArrowLeft className="size-4" /> Go back to Settings
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Admin Settings" subtitle="SaaS Administration">
      <div className="space-y-6">
        <div className="card-soft p-4 flex gap-3 bg-primary/5 border-primary/20 text-xs text-primary-foreground/90">
          <Lock className="size-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">Secure Vault</p>
            <p className="text-muted-foreground mt-0.5">
              These API keys are used server-side to power the AI operations. They are stored securely in a locked database table and are never sent to normal client browsers.
            </p>
          </div>
        </div>

        <div className="card-soft p-4 space-y-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-1">
            SaaS API Integrations
          </p>

          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
              <Key className="size-3" /> Gemini API Key
            </span>
            <input
              type="password"
              value={form.gemini_api_key}
              onChange={(e) => setForm({ ...form, gemini_api_key: e.target.value })}
              placeholder="Key starting with AIzaSy..."
              className="w-full h-10 px-3 rounded-lg bg-muted border border-border text-sm mt-1 focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
              <Key className="size-3" /> OpenAI API Key
            </span>
            <input
              type="password"
              value={form.openai_api_key}
              onChange={(e) => setForm({ ...form, openai_api_key: e.target.value })}
              placeholder="Key starting with sk-..."
              className="w-full h-10 px-3 rounded-lg bg-muted border border-border text-sm mt-1 focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
              <Key className="size-3" /> Lovable API Key (Fallback)
            </span>
            <input
              type="password"
              value={form.lovable_api_key}
              onChange={(e) => setForm({ ...form, lovable_api_key: e.target.value })}
              placeholder="Optional Lovable gateway key"
              className="w-full h-10 px-3 rounded-lg bg-muted border border-border text-sm mt-1 focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </label>

          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5 pt-1">
            <Sparkles className="size-3 text-primary mt-0.5 shrink-0" />
            Configuring these keys allows your users to generate pricing models and drafts. Leave a key empty to fallback to system environment variables.
          </p>
        </div>

        <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className="w-full h-12 rounded-full bg-primary text-primary-foreground font-medium shadow-[var(--shadow-pop)] disabled:opacity-60"
        >
          {saveMut.isPending ? "Saving API keys..." : "Save API keys"}
        </button>

        <Link
          to="/settings"
          className="w-full h-12 rounded-full border border-border font-medium flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition"
        >
          <ArrowLeft className="size-4" /> Go back to Settings
        </Link>
      </div>
    </AppShell>
  );
}
