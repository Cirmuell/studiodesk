import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { SettingsSkeleton } from "@/components/PageSkeleton";
import { getProfile, updateProfile } from "@/lib/profile.functions";
import { listRateCards, createRateCard, deleteRateCard } from "@/lib/rate-cards.functions";

import { supabase } from "@/integrations/supabase/client";
import {
  Building2,
  CreditCard,
  LogOut,
  Plus,
  Receipt,
  Sparkles,
  Upload,
  Shield,
  Crown,
  Lock,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Studio" }] }),
  component: () => (
    <Suspense fallback={<SettingsSkeleton />}>
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

  const { data: profile } = useSuspenseQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });
  const { data: rates } = useSuspenseQuery({
    queryKey: ["rate_cards"],
    queryFn: () => fetchRates(),
  });


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
    custom_font_url: (profile as any)?.custom_font_url ?? "",
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
        custom_font_url: (profile as any).custom_font_url ?? "",
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



  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [uploadingFont, setUploadingFont] = useState(false);

  const plan = (profile as any)?.plan || "trial";
  const logoEdits = (profile as any)?.logo_edits_this_month || 0;
  const sigEdits = (profile as any)?.signature_edits_this_month || 0;
  const colorEdits = (profile as any)?.color_edits_this_month || 0;

  const canEditLogo = plan === "premium" || (plan === "basic" && logoEdits < 3);
  const canEditSig = (plan === "premium" && sigEdits < 3) || ((plan === "trial" || plan === "basic") && !form.signature_url);
  const canEditColors = plan === "premium" || (plan === "basic" && colorEdits < 5) || (plan === "trial" && colorEdits < 1);
  const canUploadFont = plan === "premium";

  const rateLimit = plan === "premium" ? Infinity : plan === "basic" ? 20 : 3;
  const canAddRate = rates.length < rateLimit;

  const handleFileUpload = async (file: File, type: "logo" | "signature" | "custom_font") => {
    if (!profile?.id) {
      toast.error("User profile not loaded yet");
      return;
    }

    const setUploading = type === "logo" ? setUploadingLogo : type === "signature" ? setUploadingSignature : setUploadingFont;
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
        [type === "logo" ? "logo_url" : type === "signature" ? "signature_url" : "custom_font_url"]: publicUrl,
      }));
      toast.success(`${type === "logo" ? "Logo" : type === "signature" ? "Signature" : "Font"} uploaded successfully`);
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
          custom_font_url: (form as any).custom_font_url || null,
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

  async function deleteAccount() {
    try {
      toast.loading("Deactivating account...", { id: "delete-account" });
      
      const { error } = await supabase.functions.invoke("delete-account", {
        method: "POST",
      });
      
      if (error) throw error;
      
      toast.success("Account deactivated", { id: "delete-account" });
      await supabase.auth.signOut();
      window.location.href = "/auth";
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to deactivate account", { id: "delete-account" });
    }
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
          <div title="Contact support to change your business name" className="cursor-not-allowed opacity-70 relative group">
            <div className="absolute top-1 right-2 z-10 text-[10px] text-muted-foreground bg-background px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Contact support to change</div>
            <Input
              label="Business name"
              value={form.business_name}
              onChange={() => { }}
              icon={Building2}
              disabled
            />
          </div>
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
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 mb-2">
              Brand Logo
              {!canEditLogo && (
                <span className="flex items-center gap-1 text-primary bg-primary/10 px-1.5 py-0.5 rounded ml-2">
                  <Crown className="size-3" /> <span className="hidden sm:inline text-[9px] uppercase font-bold tracking-wider">Upgrade to modify</span>
                </span>
              )}
            </span>
            <div className="flex items-center gap-4">
              {form.logo_url ? (
                <div className={cn("relative border border-border rounded-lg p-2 bg-white flex items-center justify-center size-20 shrink-0", canEditLogo ? "group" : "")}>
                  <img
                    src={form.logo_url}
                    alt="Brand Logo"
                    className={cn("max-w-full max-h-full object-contain", !canEditLogo && "opacity-60")}
                  />
                  {canEditLogo && (
                    <button
                      onClick={() => setForm({ ...form, logo_url: "" })}
                      className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground size-5 rounded-full flex items-center justify-center text-[10px]"
                      title="Remove Logo"
                    >
                      ×
                    </button>
                  )}
                </div>
              ) : (
                <div className="border border-dashed border-border rounded-lg size-20 flex flex-col items-center justify-center text-muted-foreground bg-muted shrink-0">
                  {canEditLogo ? <span className="text-[10px]">No Logo</span> : <Lock className="size-4 opacity-50" />}
                </div>
              )}
              <label className={cn(
                "flex items-center gap-2 px-4 h-10 rounded-lg border border-border text-sm font-medium transition-colors",
                canEditLogo ? "bg-muted cursor-pointer hover:bg-muted/80 text-foreground" : "bg-muted/50 cursor-not-allowed opacity-60 text-muted-foreground"
              )}>
                {canEditLogo ? <Upload className="size-4 text-muted-foreground" /> : <Lock className="size-4 text-muted-foreground" />}
                {uploadingLogo ? "Uploading..." : form.logo_url ? (canEditLogo ? "Replace Logo" : "Limit Reached") : "Upload Logo"}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingLogo || !canEditLogo}
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
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 mb-2">
              Signature (for documents)
              {!canEditSig && (
                <span className="flex items-center gap-1 text-primary bg-primary/10 px-1.5 py-0.5 rounded ml-2">
                  <Crown className="size-3" /> <span className="hidden sm:inline text-[9px] uppercase font-bold tracking-wider">Upgrade to modify</span>
                </span>
              )}
            </span>
            <div className="flex items-center gap-4">
              {form.signature_url ? (
                <div className={cn("relative border border-border rounded-lg p-2 bg-white flex items-center justify-center size-20 shrink-0", canEditSig ? "group" : "")}>
                  <img
                    src={form.signature_url}
                    alt="Brand Signature"
                    className={cn("max-w-full max-h-full object-contain", !canEditSig && "opacity-60")}
                  />
                  {canEditSig && (
                    <button
                      onClick={() => setForm({ ...form, signature_url: "" })}
                      className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground size-5 rounded-full flex items-center justify-center text-[10px]"
                      title="Remove Signature"
                    >
                      ×
                    </button>
                  )}
                </div>
              ) : (
                <div className="border border-dashed border-border rounded-lg size-20 flex flex-col items-center justify-center text-muted-foreground bg-muted shrink-0">
                  {canEditSig ? <span className="text-[10px]">No Signature</span> : <Lock className="size-4 opacity-50" />}
                </div>
              )}
              <label className={cn(
                "flex items-center gap-2 px-4 h-10 rounded-lg border border-border text-sm font-medium transition-colors",
                canEditSig ? "bg-muted cursor-pointer hover:bg-muted/80 text-foreground" : "bg-muted/50 cursor-not-allowed opacity-60 text-muted-foreground"
              )}>
                {canEditSig ? <Upload className="size-4 text-muted-foreground" /> : <Lock className="size-4 text-muted-foreground" />}
                {uploadingSignature
                  ? "Uploading..."
                  : form.signature_url
                    ? (canEditSig ? "Replace Signature" : "Modify Signature")
                    : "Upload Signature"}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingSignature || !canEditSig}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "signature");
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-border/60 relative">
            {!canEditColors && (
              <div className="absolute inset-0 z-10 bg-background/5 backdrop-blur-[1px] flex items-center justify-center">
                <span className="flex items-center gap-1.5 bg-background shadow-md border border-border px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground">
                  <Crown className="size-3.5 text-primary" /> Upgrade to modify colors
                </span>
              </div>
            )}
            <div className={cn(!canEditColors && "opacity-50 pointer-events-none")}>
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

          <div className={cn("pt-2", !canEditColors && "opacity-50 pointer-events-none")}>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 mb-1.5">
              PDF Font Style
            </span>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <select
                value={form.brand_font}
                onChange={(e) =>
                  setForm({
                    ...form,
                    brand_font: e.target.value as "Helvetica" | "TimesRoman" | "Courier",
                  })
                }
                className="w-full sm:w-1/2 h-9 px-2 rounded-lg bg-muted border border-border text-xs font-medium mt-0"
              >
                <option value="Helvetica">Helvetica (Sans)</option>
                <option value="TimesRoman">Times Roman (Serif)</option>
                <option value="Courier">Courier (Mono)</option>
              </select>

              <div className="w-full sm:w-1/2 relative flex items-center">
                {!canUploadFont && (
                  <div className="absolute inset-0 z-10 bg-background/5 backdrop-blur-[1px] flex items-center justify-center rounded-lg">
                    <span className="flex items-center gap-1.5 bg-background shadow-sm border border-border px-2 py-1 rounded-full text-[10px] font-medium text-muted-foreground">
                      <Crown className="size-3 text-primary" /> Upgrade to upload font
                    </span>
                  </div>
                )}
                <label className={cn(
                  "flex items-center gap-2 px-3 h-9 w-full rounded-lg border border-border text-xs font-medium transition-colors justify-center",
                  canUploadFont ? "bg-muted cursor-pointer hover:bg-muted/80 text-foreground" : "bg-muted/50 cursor-not-allowed opacity-60 text-muted-foreground"
                )}>
                  {canUploadFont ? <Upload className="size-3.5 text-muted-foreground" /> : <Lock className="size-3.5 text-muted-foreground" />}
                  {uploadingFont ? "Uploading..." : (form as any).custom_font_url ? "Replace Custom Font (.ttf/.woff)" : "Upload Custom Font (.ttf/.woff)"}
                  <input
                    type="file"
                    accept=".ttf,.woff,.woff2,.otf"
                    disabled={uploadingFont || !canUploadFont}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "custom_font");
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
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
              <button onClick={() => delRateMut.mutate(r.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {canAddRate ? (
            <RateForm
              currency={form.currency}
              loading={addRateMut.isPending}
              onSubmit={(v) => addRateMut.mutate(v)}
            />
          ) : (
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm">
              <span className="text-muted-foreground text-xs flex items-center gap-1.5">
                <Crown className="size-4 text-primary" /> Rate card limit reached ({rates.length}/{rateLimit}).
              </span>
              <Link to="/subscription" className="text-primary font-semibold text-xs px-2 py-1 hover:underline">
                Upgrade Plan
              </Link>
            </div>
          )}
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

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="w-full h-12 rounded-full border border-border text-destructive font-medium flex items-center justify-center gap-2">
            <Trash2 className="size-4" /> Deactivate Account
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate your account?</AlertDialogTitle>
            <AlertDialogDescription>
              Your account will be deactivated and you will be signed out immediately.
              Your data is retained securely in accordance with our legal obligations
              and will not be accessible to you or visible in the app.
              To request permanent erasure of your data, contact support after deactivation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <p className="text-[11px] text-muted-foreground/70 text-center mt-8 flex items-center justify-center gap-1.5">
        Studio v1.0 · Built for creatives
      </p>


    </AppShell>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  // Use a predictable value for the accordion item based on the title
  const value = title.toLowerCase().replace(/\s+/g, "-");
  const isDefaultOpen = title === "Business profile" ? value : undefined;

  return (
    <Accordion type="single" collapsible defaultValue={isDefaultOpen} className="mb-6 w-full">
      <AccordionItem value={value} className="border-none">
        <AccordionTrigger className="px-1 py-3 hover:no-underline">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
            {title}
          </p>
        </AccordionTrigger>
        <AccordionContent className="pt-2">{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  icon: Icon,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  icon?: React.ComponentType<{ className?: string }>;
  placeholder?: string;
  disabled?: boolean;
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
        disabled={disabled}
        className="w-full h-10 px-3 rounded-lg bg-muted border border-border text-sm mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
