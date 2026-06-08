import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { getProfile, updateProfile } from "@/lib/profile.functions";
import { listRateCards, createRateCard, deleteRateCard } from "@/lib/rate-cards.functions";
import { supabase } from "@/integrations/supabase/client";
import { Building2, CreditCard, LogOut, Plus, Receipt, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Studio" }] }),
  component: () => (
    <Suspense fallback={<AppShell title="Settings">{null}</AppShell>}>
      <SettingsPage />
    </Suspense>
  ),
});

function SettingsPage() {
  const router = useRouter();
  const fetchProfile = useServerFn(getProfile);
  const save = useServerFn(updateProfile);
  const fetchRates = useServerFn(listRateCards);
  const addRate = useServerFn(createRateCard);
  const delRate = useServerFn(deleteRateCard);
  const qc = useQueryClient();

  const { data: profile } = useSuspenseQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const { data: rates } = useSuspenseQuery({ queryKey: ["rate_cards"], queryFn: () => fetchRates() });

  const [form, setForm] = useState({
    owner_name: profile?.owner_name ?? "",
    business_name: profile?.business_name ?? "",
    tagline: profile?.tagline ?? "",
    phone: profile?.phone ?? "",
    address: profile?.address ?? "",
    services: profile?.services ?? "",
    value_prop: profile?.value_prop ?? "",
    day_rate_min: profile?.day_rate_min ?? "",
    day_rate_max: profile?.day_rate_max ?? "",
    bank_details: profile?.bank_details ?? "",
    currency: profile?.currency ?? "NGN",
    logo_url: profile?.logo_url ?? "",
    signature_url: profile?.signature_url ?? "",
    gemini_api_key: profile?.gemini_api_key ?? "",
    openai_api_key: profile?.openai_api_key ?? "",
    lovable_api_key: profile?.lovable_api_key ?? "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        owner_name: profile.owner_name ?? "",
        business_name: profile.business_name ?? "",
        tagline: profile.tagline ?? "",
        phone: profile.phone ?? "",
        address: profile.address ?? "",
        services: profile.services ?? "",
        value_prop: profile.value_prop ?? "",
        day_rate_min: profile.day_rate_min ?? "",
        day_rate_max: profile.day_rate_max ?? "",
        bank_details: profile.bank_details ?? "",
        currency: profile.currency ?? "NGN",
        logo_url: profile.logo_url ?? "",
        signature_url: profile.signature_url ?? "",
        gemini_api_key: profile.gemini_api_key ?? "",
        openai_api_key: profile.openai_api_key ?? "",
        lovable_api_key: profile.lovable_api_key ?? "",
      });
    }
  }, [profile]);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  const handleFileUpload = async (file: File, type: "logo" | "signature") => {
    if (!profile?.id) {
      toast.error("User profile not loaded yet");
      return;
    }

    const setUploading = type === "logo" ? setUploadingLogo : setUploadingSignature;
    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.id}/${type}_${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from("brand-assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("brand-assets")
        .getPublicUrl(filePath);

      setForm((prev) => ({
        ...prev,
        [type === "logo" ? "logo_url" : "signature_url"]: publicUrl,
      }));
      toast.success(`${type === "logo" ? "Logo" : "Signature"} uploaded successfully`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const saveMut = useMutation({
    mutationFn: () =>
      save({
        data: {
          owner_name: form.owner_name || null,
          business_name: form.business_name || null,
          tagline: form.tagline || null,
          phone: form.phone || null,
          address: form.address || null,
          services: form.services || null,
          value_prop: form.value_prop || null,
          day_rate_min: form.day_rate_min ? Number(form.day_rate_min) : null,
          day_rate_max: form.day_rate_max ? Number(form.day_rate_max) : null,
          bank_details: form.bank_details || null,
          currency: form.currency,
          logo_url: form.logo_url || null,
          signature_url: form.signature_url || null,
          gemini_api_key: form.gemini_api_key || null,
          openai_api_key: form.openai_api_key || null,
          lovable_api_key: form.lovable_api_key || null,
        },
      }),
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const addRateMut = useMutation({
    mutationFn: (v: { name: string; unit: string; rate: number }) => addRate({ data: { ...v, currency: form.currency } }),
    onSuccess: () => {
      toast.success("Rate added");
      qc.invalidateQueries({ queryKey: ["rate_cards"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const delRateMut = useMutation({
    mutationFn: (id: string) => delRate({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rate_cards"] }),
  });

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  }

  return (
    <AppShell title="Settings" subtitle="Your business profile">
      <div className="card-soft p-5 mb-5 flex items-center gap-4">
        <div className="size-14 rounded-full bg-primary text-primary-foreground grid place-items-center font-display text-xl">
          {(form.owner_name || form.business_name || "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-lg truncate">{form.owner_name || "Your name"}</p>
          <p className="text-xs text-muted-foreground truncate">{form.business_name || "Your studio"}</p>
        </div>
      </div>

      <Group title="Business profile">
        <div className="card-soft p-4 space-y-3">
          <Input label="Owner name" value={form.owner_name} onChange={(v) => setForm({ ...form, owner_name: v })} />
          <Input label="Business name" value={form.business_name} onChange={(v) => setForm({ ...form, business_name: v })} icon={Building2} />
          <Input label="Tagline" value={form.tagline} onChange={(v) => setForm({ ...form, tagline: v })} />
          <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Textarea label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          <Input label="Currency" value={form.currency} onChange={(v) => setForm({ ...form, currency: v.toUpperCase() })} />
        </div>
      </Group>

      <Group title="Brand assets">
        <div className="card-soft p-4 space-y-4">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-2">
              Brand Logo
            </span>
            <div className="flex items-center gap-4">
              {form.logo_url ? (
                <div className="relative group border border-border rounded-lg p-2 bg-white flex items-center justify-center size-20 shrink-0">
                  <img src={form.logo_url} alt="Brand Logo" className="max-w-full max-h-full object-contain" />
                  <button
                    onClick={() => setForm({ ...form, logo_url: "" })}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground size-5 rounded-full flex items-center justify-center text-[10px]"
                    title="Remove Logo"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="border border-dashed border-border rounded-lg size-20 flex flex-col items-center justify-center text-muted-foreground bg-muted shrink-0">
                  <span className="text-[10px]">No Logo</span>
                </div>
              )}
              <label className="flex items-center gap-2 px-4 h-10 rounded-lg bg-muted border border-border text-sm font-medium cursor-pointer hover:bg-muted/80 transition-colors">
                <Upload className="size-4 text-muted-foreground" />
                {uploadingLogo ? "Uploading..." : form.logo_url ? "Replace Logo" : "Upload Logo"}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingLogo}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "logo");
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-2">
              Signature (for documents)
            </span>
            <div className="flex items-center gap-4">
              {form.signature_url ? (
                <div className="relative group border border-border rounded-lg p-2 bg-white flex items-center justify-center size-20 shrink-0">
                  <img src={form.signature_url} alt="Brand Signature" className="max-w-full max-h-full object-contain" />
                  <button
                    onClick={() => setForm({ ...form, signature_url: "" })}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground size-5 rounded-full flex items-center justify-center text-[10px]"
                    title="Remove Signature"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="border border-dashed border-border rounded-lg size-20 flex flex-col items-center justify-center text-muted-foreground bg-muted shrink-0">
                  <span className="text-[10px]">No Signature</span>
                </div>
              )}
              <label className="flex items-center gap-2 px-4 h-10 rounded-lg bg-muted border border-border text-sm font-medium cursor-pointer hover:bg-muted/80 transition-colors">
                <Upload className="size-4 text-muted-foreground" />
                {uploadingSignature ? "Uploading..." : form.signature_url ? "Replace Signature" : "Upload Signature"}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingSignature}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "signature");
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </Group>

      <Group title="Context for AI pricing">
        <div className="card-soft p-4 space-y-3">
          <Textarea label="Services you offer" value={form.services} onChange={(v) => setForm({ ...form, services: v })} placeholder="e.g. Brand identity, packaging design, editorial photography" />
          <Textarea label="Value proposition" value={form.value_prop} onChange={(v) => setForm({ ...form, value_prop: v })} placeholder="What makes your studio different?" />
          <div className="grid grid-cols-2 gap-2">
            <Input label={`Day rate min (${form.currency})`} value={String(form.day_rate_min)} onChange={(v) => setForm({ ...form, day_rate_min: v })} type="number" />
            <Input label={`Day rate max (${form.currency})`} value={String(form.day_rate_max)} onChange={(v) => setForm({ ...form, day_rate_max: v })} type="number" />
          </div>
          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
            <Sparkles className="size-3 text-primary mt-0.5 shrink-0" />
            AI pricing reads this profile and your rate cards to ground every recommendation.
          </p>
        </div>
      </Group>

      <Group title="Rate cards">
        <div className="card-soft p-4 space-y-3">
          {rates.length === 0 && <p className="text-xs text-muted-foreground">No rates yet — add common services for sharper AI estimates.</p>}
          {rates.map((r) => (
            <div key={r.id} className="flex items-center gap-3 text-sm">
              <div className="flex-1 min-w-0">
                <p className="truncate">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.rate} {r.currency}/{r.unit}</p>
              </div>
              <button onClick={() => delRateMut.mutate(r.id)} className="text-muted-foreground"><Trash2 className="size-4" /></button>
            </div>
          ))}
          <RateForm currency={form.currency} loading={addRateMut.isPending} onSubmit={(v) => addRateMut.mutate(v)} />
        </div>
      </Group>

      <Group title="AI & API Keys Configuration">
        <div className="card-soft p-4 space-y-3">
          <Input
            label="Gemini API Key"
            value={form.gemini_api_key}
            onChange={(v) => setForm({ ...form, gemini_api_key: v })}
            type="password"
            placeholder="Key starting with AIzaSy..."
          />
          <Input
            label="OpenAI API Key"
            value={form.openai_api_key}
            onChange={(v) => setForm({ ...form, openai_api_key: v })}
            type="password"
            placeholder="Key starting with sk-..."
          />
          <Input
            label="Lovable API Key"
            value={form.lovable_api_key}
            onChange={(v) => setForm({ ...form, lovable_api_key: v })}
            type="password"
            placeholder="Lovable gateway key"
          />
          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
            <Sparkles className="size-3 text-primary mt-0.5 shrink-0" />
            Save your own API keys to run pricing analysis and document generation. Keys are stored securely in your database.
          </p>
        </div>
      </Group>

      <Group title="Payment">
        <div className="card-soft p-4">
          <Textarea label="Bank details / payment instructions" value={form.bank_details} onChange={(v) => setForm({ ...form, bank_details: v })} icon={CreditCard} placeholder="Account name, bank, number, sort code…" />
        </div>
      </Group>

      <button
        onClick={() => saveMut.mutate()}
        disabled={saveMut.isPending}
        className="w-full h-12 rounded-full bg-primary text-primary-foreground font-medium shadow-[var(--shadow-pop)] disabled:opacity-60 mb-3"
      >
        {saveMut.isPending ? "Saving…" : "Save profile"}
      </button>

      <button onClick={signOut} className="w-full h-12 rounded-full border border-border text-destructive font-medium flex items-center justify-center gap-2">
        <LogOut className="size-4" /> Sign out
      </button>

      <p className="text-[11px] text-muted-foreground/70 text-center mt-8 flex items-center justify-center gap-1.5">
        <Receipt className="size-3" /> Studio v1.0 · Built for Nigerian creatives
      </p>
    </AppShell>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold px-1 mb-2">{title}</p>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, type = "text", icon: Icon, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; icon?: React.ComponentType<{ className?: string }>; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
        {Icon && <Icon className="size-3" />} {label}
      </span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full h-10 px-3 rounded-lg bg-muted border border-border text-sm mt-1" />
    </label>
  );
}

function Textarea({ label, value, onChange, placeholder, icon: Icon }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
        {Icon && <Icon className="size-3" />} {label}
      </span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm mt-1 resize-none" />
    </label>
  );
}

function RateForm({ currency, onSubmit, loading }: { currency: string; loading: boolean; onSubmit: (v: { name: string; unit: string; rate: number }) => void }) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("hour");
  const [rate, setRate] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || !rate) return;
        onSubmit({ name, unit, rate: Number(rate) });
        setName(""); setRate("");
      }}
      className="border-t border-border pt-3 space-y-2"
    >
      <input className="w-full h-10 px-3 rounded-lg bg-muted border border-border text-sm" placeholder="Service name (e.g. Half-day shoot)" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <input className="h-10 px-3 rounded-lg bg-muted border border-border text-sm" placeholder={`Rate (${currency})`} type="number" value={rate} onChange={(e) => setRate(e.target.value)} />
        <select className="h-10 px-3 rounded-lg bg-muted border border-border text-sm" value={unit} onChange={(e) => setUnit(e.target.value)}>
          <option value="hour">per hour</option>
          <option value="day">per day</option>
          <option value="project">per project</option>
          <option value="each">each</option>
        </select>
      </div>
      <button disabled={loading} type="submit" className="w-full h-10 rounded-lg bg-foreground text-background text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
        <Plus className="size-4" /> Add rate
      </button>
    </form>
  );
}
