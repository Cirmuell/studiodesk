import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { getProfile, updateProfile } from "@/lib/profile.functions";
import { listRateCards, createRateCard, deleteRateCard } from "@/lib/rate-cards.functions";
import { getBillingInfo, subscribeToPlan } from "@/lib/subscription.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2,
  CreditCard,
  LogOut,
  Plus,
  Receipt,
  Sparkles,
  Trash2,
  Upload,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Studio" }] }),
  component: () => (
    <Suspense fallback={<AppShell title="Settings">{null}</AppShell>}>
      <SettingsPage />
    </Suspense>
  ),
});

const getPlanPrice = (plan: "basic" | "premium", userCurrency: string) => {
  const cur = (userCurrency || "NGN").toUpperCase();
  const prices: Record<string, { basic: string; premium: string }> = {
    NGN: { basic: "₦7,500", premium: "₦15,000" }, // Downward-reviewed from ₦15,000 / ₦35,000
    USD: { basic: "$9", premium: "$19" },
    EUR: { basic: "€9", premium: "€19" },
    GBP: { basic: "£8", premium: "£16" },
  };
  const set = prices[cur] || { basic: plan === "basic" ? "$9" : "$19", premium: "$19" };
  return plan === "basic" ? set.basic : set.premium;
};

function SettingsPage() {
  const router = useRouter();
  const fetchProfile = useServerFn(getProfile);
  const save = useServerFn(updateProfile);
  const fetchRates = useServerFn(listRateCards);
  const addRate = useServerFn(createRateCard);
  const delRate = useServerFn(deleteRateCard);
  const fetchBilling = useServerFn(getBillingInfo);
  const upgradePlan = useServerFn(subscribeToPlan);
  const qc = useQueryClient();

  const { data: profile } = useSuspenseQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });
  const { data: rates } = useSuspenseQuery({
    queryKey: ["rate_cards"],
    queryFn: () => fetchRates(),
  });
  const { data: billing } = useSuspenseQuery({
    queryKey: ["billing"],
    queryFn: () => fetchBilling(),
  });

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "premium">("basic");

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
    brand_color: (profile as any)?.brand_color ?? "#8B5CF6",
    brand_color_primary:
      (profile as any)?.brand_color_primary ?? (profile as any)?.brand_color ?? "#8B5CF6",
    brand_color_secondary: (profile as any)?.brand_color_secondary ?? "#10B981",
    brand_color_accent: (profile as any)?.brand_color_accent ?? "#F59E0B",
    brand_font:
      ((profile as any)?.brand_font as "Helvetica" | "TimesRoman" | "Courier") ?? "Helvetica",
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
        brand_color: (profile as any).brand_color ?? "#8B5CF6",
        brand_color_primary:
          (profile as any).brand_color_primary ?? (profile as any).brand_color ?? "#8B5CF6",
        brand_color_secondary: (profile as any).brand_color_secondary ?? "#10B981",
        brand_color_accent: (profile as any).brand_color_accent ?? "#F59E0B",
        brand_font:
          ((profile as any).brand_font as "Helvetica" | "TimesRoman" | "Courier") ?? "Helvetica",
      });
    }
  }, [profile]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("payment") === "success") {
      toast.success("Payment successful! Your subscription is being processed.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

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
      const { data, error } = await supabase.storage.from("brand-assets").upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

      if (error) throw error;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("brand-assets").getPublicUrl(filePath);

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
          brand_color: form.brand_color_primary,
          brand_color_primary: form.brand_color_primary,
          brand_color_secondary: form.brand_color_secondary,
          brand_color_accent: form.brand_color_accent,
          brand_font: form.brand_font,
        },
      }),
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const upgradeMut = useMutation({
    mutationFn: (plan: "basic" | "premium") => upgradePlan({ data: { plan, origin: window.location.origin } }),
    onSuccess: (res: any) => {
      if (res?.accessCode) {
        const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
        if (!paystackKey) {
          toast.error("Paystack Public Key not configured. Please add VITE_PAYSTACK_PUBLIC_KEY to your environment.");
          return;
        }

        const loadPaystack = () => {
          const handler = (window as any).PaystackPop.setup({
            key: paystackKey,
            access_code: res.accessCode,
            callback: function () {
              toast.success("Payment successful! Your subscription is being processed.");
              qc.invalidateQueries({ queryKey: ["billing"] });
              setCheckoutOpen(false);
            },
            onClose: function () {
              toast.info("Payment window closed.");
            },
          });
          handler.openIframe();
        };

        if (!(window as any).PaystackPop) {
          const script = document.createElement("script");
          script.src = "https://js.paystack.co/v1/inline.js";
          script.onload = loadPaystack;
          document.body.appendChild(script);
        } else {
          loadPaystack();
        }
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to subscribe"),
  });

  const addRateMut = useMutation({
    mutationFn: (v: { name: string; unit: string; rate: number }) =>
      addRate({ data: { ...v, currency: form.currency } }),
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
          <p className="text-xs text-muted-foreground truncate">
            {form.business_name || "Your studio"}
          </p>
        </div>
      </div>

      <Group title="Business profile">
        <div className="card-soft p-4 space-y-3">
          <Input
            label="Owner name"
            value={form.owner_name}
            onChange={(v) => setForm({ ...form, owner_name: v })}
          />
          <Input
            label="Business name"
            value={form.business_name}
            onChange={(v) => setForm({ ...form, business_name: v })}
            icon={Building2}
          />
          <Input
            label="Tagline"
            value={form.tagline}
            onChange={(v) => setForm({ ...form, tagline: v })}
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })}
          />
          <Textarea
            label="Address"
            value={form.address}
            onChange={(v) => setForm({ ...form, address: v })}
          />
          <Input
            label="Currency"
            value={form.currency}
            onChange={(v) => setForm({ ...form, currency: v.toUpperCase() })}
          />
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
                  <img
                    src={form.logo_url}
                    alt="Brand Logo"
                    className="max-w-full max-h-full object-contain"
                  />
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
                  <img
                    src={form.signature_url}
                    alt="Brand Signature"
                    className="max-w-full max-h-full object-contain"
                  />
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
                {uploadingSignature
                  ? "Uploading..."
                  : form.signature_url
                    ? "Replace Signature"
                    : "Upload Signature"}
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

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/60">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1.5">
                Primary Color
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.brand_color_primary}
                  onChange={(e) => setForm({ ...form, brand_color_primary: e.target.value })}
                  className="size-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
                <input
                  type="text"
                  value={form.brand_color_primary}
                  onChange={(e) => setForm({ ...form, brand_color_primary: e.target.value })}
                  className="flex-1 h-8 px-1.5 rounded-lg bg-muted border border-border text-[10px] font-mono uppercase mt-0"
                  placeholder="#8B5CF6"
                />
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1.5">
                Secondary Color
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.brand_color_secondary}
                  onChange={(e) => setForm({ ...form, brand_color_secondary: e.target.value })}
                  className="size-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
                <input
                  type="text"
                  value={form.brand_color_secondary}
                  onChange={(e) => setForm({ ...form, brand_color_secondary: e.target.value })}
                  className="flex-1 h-8 px-1.5 rounded-lg bg-muted border border-border text-[10px] font-mono uppercase mt-0"
                  placeholder="#10B981"
                />
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1.5">
                Accent Color
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.brand_color_accent}
                  onChange={(e) => setForm({ ...form, brand_color_accent: e.target.value })}
                  className="size-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
                <input
                  type="text"
                  value={form.brand_color_accent}
                  onChange={(e) => setForm({ ...form, brand_color_accent: e.target.value })}
                  className="flex-1 h-8 px-1.5 rounded-lg bg-muted border border-border text-[10px] font-mono uppercase mt-0"
                  placeholder="#F59E0B"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1.5">
              PDF Font Style
            </span>
            <select
              value={form.brand_font}
              onChange={(e) =>
                setForm({
                  ...form,
                  brand_font: e.target.value as "Helvetica" | "TimesRoman" | "Courier",
                })
              }
              className="w-full h-9 px-2 rounded-lg bg-muted border border-border text-xs font-medium mt-0"
            >
              <option value="Helvetica">Helvetica (Sans)</option>
              <option value="TimesRoman">Times Roman (Serif)</option>
              <option value="Courier">Courier (Mono)</option>
            </select>
          </div>
        </div>
      </Group>

      <Group title="Subscription & Billing">
        <div className="card-soft p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold capitalize">{billing.plan} Tier</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {billing.plan === "trial"
                  ? `Usage: ${billing.trial_generations_used} of ${billing.trial_generations_limit} free AI runs used`
                  : `Status: ${billing.subscription_status} · Renews ${billing.subscription_ends_at ? new Date(billing.subscription_ends_at).toLocaleDateString() : "—"}`}
              </p>
            </div>
            <span
              className={cn(
                "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full",
                billing.plan === "trial"
                  ? "bg-muted text-muted-foreground"
                  : "bg-success/15 text-success",
              )}
            >
              {billing.plan === "trial" ? "Free Trial" : "Active"}
            </span>
          </div>

          {billing.plan === "trial" && (
            <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (billing.trial_generations_used / billing.trial_generations_limit) * 100)}%`,
                }}
              />
            </div>
          )}

          {billing.plan === "trial" ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setCheckoutOpen(true)}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
              >
                <CreditCard className="size-4" /> Upgrade Plan
              </button>
            </div>
          ) : (
            <div className="pt-1 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedPlan("basic");
                  setCheckoutOpen(true);
                }}
                className={cn(
                  "flex-1 h-9 rounded-lg border border-border text-xs font-medium",
                  billing.plan === "basic" && "opacity-50 cursor-not-allowed",
                )}
                disabled={billing.plan === "basic"}
              >
                Switch to Basic
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedPlan("premium");
                  setCheckoutOpen(true);
                }}
                className={cn(
                  "flex-1 h-9 rounded-lg border border-border text-xs font-medium",
                  billing.plan === "premium" && "opacity-50 cursor-not-allowed",
                )}
                disabled={billing.plan === "premium"}
              >
                Switch to Premium
              </button>
            </div>
          )}
        </div>
      </Group>

      <Group title="Context for AI pricing">
        <div className="card-soft p-4 space-y-3">
          <Textarea
            label="Services you offer"
            value={form.services}
            onChange={(v) => setForm({ ...form, services: v })}
            placeholder="e.g. Brand identity, packaging design, editorial photography"
          />
          <Textarea
            label="Value proposition"
            value={form.value_prop}
            onChange={(v) => setForm({ ...form, value_prop: v })}
            placeholder="What makes your studio different?"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label={`Day rate min (${form.currency})`}
              value={String(form.day_rate_min)}
              onChange={(v) => setForm({ ...form, day_rate_min: v })}
              type="number"
            />
            <Input
              label={`Day rate max (${form.currency})`}
              value={String(form.day_rate_max)}
              onChange={(v) => setForm({ ...form, day_rate_max: v })}
              type="number"
            />
          </div>
          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
            <Sparkles className="size-3 text-primary mt-0.5 shrink-0" />
            AI pricing reads this profile and your rate cards to ground every recommendation.
          </p>
        </div>
      </Group>

      <Group title="Rate cards">
        <div className="card-soft p-4 space-y-3">
          {rates.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No rates yet — add common services for sharper AI estimates.
            </p>
          )}
          {rates.map((r) => (
            <div key={r.id} className="flex items-center gap-3 text-sm">
              <div className="flex-1 min-w-0">
                <p className="truncate">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.rate} {r.currency}/{r.unit}
                </p>
              </div>
              <button onClick={() => delRateMut.mutate(r.id)} className="text-muted-foreground">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <RateForm
            currency={form.currency}
            loading={addRateMut.isPending}
            onSubmit={(v) => addRateMut.mutate(v)}
          />
        </div>
      </Group>

      {profile?.is_admin && (
        <Group title="Administration">
          <div className="card-soft p-4 space-y-3 border-primary/20 bg-primary/5">
            <p className="text-xs text-muted-foreground">
              You are signed in as an administrator. You can configure system-wide settings and API
              keys here.
            </p>
            <Link
              to={"/admin" as any}
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center gap-2 hover:opacity-90 transition"
            >
              <Shield className="size-4" /> Open Admin Dashboard
            </Link>
          </div>
        </Group>
      )}

      <Group title="Payment">
        <div className="card-soft p-4">
          <Textarea
            label="Bank details / payment instructions"
            value={form.bank_details}
            onChange={(v) => setForm({ ...form, bank_details: v })}
            icon={CreditCard}
            placeholder="Account name, bank, number, sort code…"
          />
        </div>
      </Group>

      <button
        onClick={() => saveMut.mutate()}
        disabled={saveMut.isPending}
        className="w-full h-12 rounded-full bg-primary text-primary-foreground font-medium shadow-[var(--shadow-pop)] disabled:opacity-60 mb-3"
      >
        {saveMut.isPending ? "Saving…" : "Save profile"}
      </button>

      <button
        onClick={signOut}
        className="w-full h-12 rounded-full border border-border text-destructive font-medium flex items-center justify-center gap-2"
      >
        <LogOut className="size-4" /> Sign out
      </button>

      <p className="text-[11px] text-muted-foreground/70 text-center mt-8 flex items-center justify-center gap-1.5">
        <Receipt className="size-3" /> Studio v1.0 · Built for independent creatives
      </p>

      {checkoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs grid place-items-center p-4">
          <div className="card-soft bg-background w-full max-w-sm p-6 space-y-4 shadow-xl border border-border animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center">
              <h3 className="font-display text-xl">Upgrade Your Plan</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Select a plan to unlock full features
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setSelectedPlan("basic")}
                className={cn(
                  "w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between",
                  selectedPlan === "basic"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/30",
                )}
              >
                <div>
                  <p className="text-sm font-semibold">Basic Studio</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    30 runs/month · Standard speed
                  </p>
                </div>
                <p className="text-sm font-bold">
                  {getPlanPrice("basic", form.currency)}
                  <span className="text-[10px] font-normal text-muted-foreground">/mo</span>
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlan("premium")}
                className={cn(
                  "w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between",
                  selectedPlan === "premium"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/30",
                )}
              >
                <div>
                  <p className="text-sm font-semibold">Premium Studio</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    100 runs/month · Priority AI · portal logo
                  </p>
                </div>
                <p className="text-sm font-bold">
                  {getPlanPrice("premium", form.currency)}
                  <span className="text-[10px] font-normal text-muted-foreground">/mo</span>
                </p>
              </button>
            </div>

            <div className="bg-muted/60 p-3 rounded-lg text-[10px] text-muted-foreground flex items-start gap-1.5 leading-normal">
              <Sparkles className="size-3.5 text-primary shrink-0 mt-0.5" />
              Select your desired tier to upgrade instantly. Payments are securely processed. You
              can modify or cancel your subscription at any time.
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                className="flex-1 h-11 rounded-full border border-border text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={upgradeMut.isPending}
                onClick={() => upgradeMut.mutate(selectedPlan)}
                className="flex-1 h-11 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-sm disabled:opacity-60"
              >
                {upgradeMut.isPending ? "Connecting..." : "Proceed to Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold px-1 mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  icon: Icon,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  icon?: React.ComponentType<{ className?: string }>;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
        {Icon && <Icon className="size-3" />} {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 px-3 rounded-lg bg-muted border border-border text-sm mt-1"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
        {Icon && <Icon className="size-3" />} {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm mt-1 resize-none"
      />
    </label>
  );
}

function RateForm({
  currency,
  onSubmit,
  loading,
}: {
  currency: string;
  loading: boolean;
  onSubmit: (v: { name: string; unit: string; rate: number }) => void;
}) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("hour");
  const [rate, setRate] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || !rate) return;
        onSubmit({ name, unit, rate: Number(rate) });
        setName("");
        setRate("");
      }}
      className="border-t border-border pt-3 space-y-2"
    >
      <input
        className="w-full h-10 px-3 rounded-lg bg-muted border border-border text-sm"
        placeholder="Service name (e.g. Half-day shoot)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          className="h-10 px-3 rounded-lg bg-muted border border-border text-sm"
          placeholder={`Rate (${currency})`}
          type="number"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
        <select
          className="h-10 px-3 rounded-lg bg-muted border border-border text-sm"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        >
          <option value="hour">per hour</option>
          <option value="day">per day</option>
          <option value="project">per project</option>
          <option value="each">each</option>
        </select>
      </div>
      <button
        disabled={loading}
        type="submit"
        className="w-full h-10 rounded-lg bg-foreground text-background text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
      >
        <Plus className="size-4" /> Add rate
      </button>
    </form>
  );
}
