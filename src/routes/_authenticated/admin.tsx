import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { getAdminSettings, updateAdminSettings, getAdminSubscribers, updateAdminSubscriber, restrictAdminSubscriber } from "@/lib/admin.functions";
import { ShieldAlert, Key, Lock, ArrowLeft, Users, Settings, Edit2, Ban, CheckCircle2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Studio" }] }),
  component: () => <AdminDashboard />,
});

function AdminDashboard() {
  const [tab, setTab] = useState<"settings" | "subscribers">("settings");
  const fetchSettings = useServerFn(getAdminSettings);
  const { data: settings } = useQuery({ queryKey: ["admin_settings"], queryFn: () => fetchSettings() });
  
  const isSuperAdmin = settings?.is_superadmin === true;

  // If not superadmin and somehow on subscribers tab, switch to settings
  useEffect(() => {
    if (tab === "subscribers" && settings && !isSuperAdmin) {
      setTab("settings");
    }
  }, [tab, settings, isSuperAdmin]);

  return (
    <AppShell title="Admin" subtitle="SaaS Administration">
      <div className="flex bg-muted/50 p-1 rounded-xl mb-6 w-full max-w-sm">
        <button
          onClick={() => setTab("settings")}
          className={`flex-1 text-xs font-medium py-2 rounded-lg transition flex items-center justify-center gap-2 ${
            tab === "settings" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="size-3.5" /> API Settings
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setTab("subscribers")}
            className={`flex-1 text-xs font-medium py-2 rounded-lg transition flex items-center justify-center gap-2 ${
              tab === "subscribers" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="size-3.5" /> Subscribers
          </button>
        )}
      </div>

      {tab === "settings" ? <AdminSettings /> : isSuperAdmin ? <AdminSubscribers /> : null}
    </AppShell>
  );
}

function AdminSettings() {
  const fetchAdminSettings = useServerFn(getAdminSettings);
  const save = useServerFn(updateAdminSettings);
  const qc = useQueryClient();

  const {
    data: settings,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["admin_settings"],
    queryFn: () => fetchAdminSettings(),
    retry: false,
  });

  const [form, setForm] = useState({
    gemini_api_key: "",
    openai_api_key: "",
    lovable_api_key: "",
    preferred_model: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        gemini_api_key: settings.gemini_api_key ?? "",
        openai_api_key: settings.openai_api_key ?? "",
        lovable_api_key: settings.lovable_api_key ?? "",
        preferred_model: (settings as any).preferred_model ?? "",
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
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-sm">
        Loading settings...
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-soft p-6 border-destructive/20 text-center space-y-4">
        <div className="size-12 rounded-full bg-destructive/10 text-destructive grid place-items-center mx-auto">
          <ShieldAlert className="size-6" />
        </div>
        <div className="space-y-1">
          <p className="font-display text-lg font-medium">Admin Access Required</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Your account does not have administrator permissions. If you are the SaaS owner,
            please toggle{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">is_admin = true</code> in
            the profiles table in Supabase.
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
    );
  }

  return (
    <div className="space-y-6">
      <div className="card-soft p-4 flex gap-3 bg-primary/5 border-primary/20 text-xs text-primary-foreground/90">
        <Lock className="size-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-foreground">Secure Vault</p>
          <p className="text-muted-foreground mt-0.5">
            These API keys are used server-side to power the AI operations. They are stored
            securely in a locked database table and are never sent to normal client browsers.
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

        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
            Preferred AI Model Override
          </span>
          <input
            type="text"
            value={form.preferred_model}
            onChange={(e) => setForm({ ...form, preferred_model: e.target.value })}
            placeholder="e.g. gemini-2.5-flash, gpt-4o-mini, google/gemini-3-flash-preview (leave blank for auto)"
            className="w-full h-10 px-3 rounded-lg bg-muted border border-border text-sm mt-1 focus:ring-1 focus:ring-primary focus:outline-none"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Leave blank to auto-detect model per provider. Override custom strings if needed.
          </p>
        </label>

        <p className="text-[11px] text-muted-foreground flex items-start gap-1.5 pt-1">
          Configuring these keys allows your users to generate pricing models and drafts. Leave a
          key empty to fallback to system environment variables.
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
  );
}

function AdminSubscribers() {
  const [page, setPage] = useState(1);
  const limit = 10;
  
  const fetchSubscribers = useServerFn(getAdminSubscribers);
  const updateSub = useServerFn(updateAdminSubscriber);
  const restrictSub = useServerFn(restrictAdminSubscriber);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_subscribers", page],
    queryFn: () => fetchSubscribers({ data: { page, limit } }),
  });

  const [editingUser, setEditingUser] = useState<any>(null);

  const updateMut = useMutation({
    mutationFn: (vars: any) => updateSub({ data: vars }),
    onSuccess: () => {
      toast.success("Subscriber updated");
      qc.invalidateQueries({ queryKey: ["admin_subscribers"] });
      setEditingUser(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const restrictMut = useMutation({
    mutationFn: (vars: { userId: string; restricted: boolean }) => restrictSub({ data: vars }),
    onSuccess: () => {
      toast.success("Subscriber restriction updated");
      qc.invalidateQueries({ queryKey: ["admin_subscribers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Action failed"),
  });

  if (isLoading) return <div className="text-center py-10 text-sm text-muted-foreground">Loading subscribers...</div>;
  if (error) return <div className="text-center py-10 text-sm text-destructive">Error loading subscribers</div>;

  const totalPages = Math.ceil((data?.count || 0) / limit);

  return (
    <div className="space-y-4">
      <div className="card-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground">User</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Plan</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Generations</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.profiles?.map((profile: any) => (
                <tr key={profile.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{profile.email || "No Email"}</span>
                      <span className="text-xs text-muted-foreground">ID: {profile.id.slice(0, 8)}...</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="capitalize">{profile.plan}</span>
                  </td>
                  <td className="px-4 py-3">
                    {profile.trial_generations_used} / {profile.plan === "premium" ? 100 : profile.plan === "basic" ? 50 : (profile.trial_generations_limit || 5)}
                  </td>
                  <td className="px-4 py-3">
                    {profile.restricted ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                        <Ban className="size-3" /> Restricted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded">
                        <CheckCircle2 className="size-3" /> Active
                      </span>
                    )}
                    {profile.is_admin && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-foreground/10 text-foreground px-2 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingUser(profile)}
                        className="size-8 grid place-items-center rounded-lg border border-border hover:bg-muted transition"
                        title="Edit User"
                      >
                        <Edit2 className="size-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to ${profile.restricted ? 'unrestrict' : 'restrict'} this user?`)) {
                            restrictMut.mutate({ userId: profile.id, restricted: !profile.restricted });
                          }
                        }}
                        className={`size-8 grid place-items-center rounded-lg border transition ${
                          profile.restricted ? "border-primary text-primary hover:bg-primary/10" : "border-destructive text-destructive hover:bg-destructive/10"
                        }`}
                        title={profile.restricted ? "Unrestrict User" : "Restrict User"}
                      >
                        {profile.restricted ? <CheckCircle2 className="size-4" /> : <Ban className="size-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data?.profiles?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No subscribers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="size-8 grid place-items-center rounded-lg border border-border disabled:opacity-50"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="size-8 grid place-items-center rounded-lg border border-border disabled:opacity-50"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold">Edit Subscriber</h3>
              <button onClick={() => setEditingUser(null)} className="text-muted-foreground hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                updateMut.mutate({
                  userId: editingUser.id,
                  plan: formData.get("plan"),
                  trial_generations_limit: Number(formData.get("limit")),
                  is_admin: formData.get("is_admin") === "on",
                });
              }}
              className="p-4 space-y-4"
            >
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Email</label>
                <input
                  type="text"
                  disabled
                  value={editingUser.email || ""}
                  className="w-full h-10 px-3 rounded-lg bg-muted border border-border text-sm opacity-70"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Plan</label>
                <select
                  name="plan"
                  defaultValue={editingUser.plan}
                  className="w-full h-10 px-3 rounded-lg bg-surface border border-border text-sm"
                >
                  <option value="trial">Trial</option>
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Generations Limit</label>
                <input
                  type="number"
                  name="limit"
                  defaultValue={editingUser.trial_generations_limit}
                  className="w-full h-10 px-3 rounded-lg bg-surface border border-border text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_admin"
                  name="is_admin"
                  defaultChecked={editingUser.is_admin}
                  className="size-4 rounded border-border"
                />
                <label htmlFor="is_admin" className="text-sm font-medium">Administrator access</label>
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 h-10 rounded-lg border border-border text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMut.isPending}
                  className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                >
                  {updateMut.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
