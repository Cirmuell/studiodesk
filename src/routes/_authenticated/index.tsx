import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Suspense, useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { ClientAvatar, TierBadge } from "@/components/ClientBadge";
import { formatCurrency, timeAgo } from "@/lib/format";
import { listProjects } from "@/lib/projects.functions";
import { listDocuments } from "@/lib/documents.functions";
import { listPricingRuns } from "@/lib/pricing.functions";
import { getProfile, updateProfile } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowUpRight,
  Calculator,
  FileText,
  LogOut,
  Sparkles,
  TrendingUp,
  Check,
  ArrowRight,
  ArrowLeft,
  Building2,
  Palette,
  CreditCard,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Studio — Your creative business at a glance" },
      {
        name: "description",
        content: "AI pricing, proposals and invoices for independent creatives.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <Suspense fallback={<AppShell title="Loading…">{null}</AppShell>}>
      <DashboardInner />
    </Suspense>
  );
}

function DashboardInner() {
  const router = useRouter();
  const fetchProjects = useServerFn(listProjects);
  const fetchDocs = useServerFn(listDocuments);
  const fetchRuns = useServerFn(listPricingRuns);
  const fetchProfile = useServerFn(getProfile);

  const profileQ = useSuspenseQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const projectsQ = useSuspenseQuery({ queryKey: ["projects"], queryFn: () => fetchProjects() });
  const docsQ = useSuspenseQuery({ queryKey: ["documents"], queryFn: () => fetchDocs() });
  const runsQ = useSuspenseQuery({ queryKey: ["pricing_runs"], queryFn: () => fetchRuns() });

  const profile = profileQ.data;
  const projects = projectsQ.data;
  const docs = docsQ.data;
  const runs = runsQ.data;
  const currency = profile?.currency || "NGN";

  if (profile && !(profile as any).onboarded) {
    return <OnboardingWizard profile={profile} />;
  }

  const activeProjects = projects.filter((p) => p.status === "active");
  const recentDocs = docs.slice(0, 3);
  const lastRun = runs[0];

  const invoicedThisMonth = docs
    .filter((d) => d.type === "invoice" && d.status !== "draft")
    .reduce((s, d) => s + Number(d.total ?? 0), 0);

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  }

  return (
    <AppShell
      subtitle={new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })}
      title={`Hello, ${profile?.owner_name?.split(" ")[0] ?? "there"}`}
      action={
        <button
          onClick={signOut}
          aria-label="Sign out"
          className="size-10 grid place-items-center rounded-full bg-surface border border-border text-muted-foreground"
        >
          <LogOut className="size-[18px]" />
        </button>
      }
    >
      <section className="relative overflow-hidden rounded-3xl bg-foreground text-background p-5 mb-5">
        <div className="absolute -top-12 -right-10 size-44 rounded-full bg-primary/40 blur-2xl" />
        <div className="absolute -bottom-12 -left-8 size-32 rounded-full bg-accent/40 blur-2xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.2em] opacity-70">Invoiced</p>
          <p className="font-display text-4xl mt-1">
            {formatCurrency(invoicedThisMonth, currency)}
          </p>
          <p className="text-sm opacity-80 mt-0.5">
            Across {docs.filter((d) => d.type === "invoice").length} invoices
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-xs">
            <TrendingUp className="size-3.5 text-primary" />
            <span className="text-primary font-medium">{projects.length}</span>
            <span className="opacity-60">projects total</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          to="/pricing"
          className="card-soft p-4 flex flex-col gap-2 active:scale-[0.98] transition"
        >
          <div className="size-9 rounded-full bg-primary/10 grid place-items-center text-primary">
            <Calculator className="size-[18px]" />
          </div>
          <div>
            <p className="font-medium text-sm">Price a project</p>
            <p className="text-xs text-muted-foreground">AI-grounded estimates</p>
          </div>
        </Link>
        <Link
          to="/documents"
          className="card-soft p-4 flex flex-col gap-2 active:scale-[0.98] transition"
        >
          <div className="size-9 rounded-full bg-secondary grid place-items-center text-secondary-foreground">
            <FileText className="size-[18px]" />
          </div>
          <div>
            <p className="font-medium text-sm">New document</p>
            <p className="text-xs text-muted-foreground">Proposal · invoice · contract</p>
          </div>
        </Link>
      </div>

      {lastRun && (
        <section className="card-soft p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-4 text-primary" />
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">
              Latest pricing insight
            </p>
          </div>
          <p className="font-display text-lg leading-snug">
            {lastRun.project?.title ?? "Custom scope"}
          </p>
          <div className="flex items-end justify-between mt-2">
            <div>
              <p className="text-2xl font-display">
                {formatCurrency(lastRun.recommended_total, lastRun.currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                Range {formatCurrency(lastRun.range_low, lastRun.currency)}–
                {formatCurrency(lastRun.range_high, lastRun.currency)}
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-success/15 text-success font-semibold">
              {lastRun.confidence} confidence
            </span>
          </div>
        </section>
      )}

      <SectionHeader title="Active projects" href="/projects" />
      {activeProjects.length === 0 ? (
        <EmptyHint text="No active projects yet — start one from Projects." />
      ) : (
        <div className="space-y-2.5 mb-6">
          {activeProjects.map((p) => (
            <Link
              key={p.id}
              to="/projects/$id"
              params={{ id: p.id }}
              className="card-soft p-3.5 flex items-center gap-3 active:scale-[0.99] transition"
            >
              <ClientAvatar name={p.client?.name ?? p.title} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {p.client?.company ?? p.client?.name ?? "No client"} ·{" "}
                  {formatCurrency(p.budget ?? 0, p.currency)}
                </p>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}

      <SectionHeader title="Recent documents" href="/documents" />
      {recentDocs.length === 0 ? (
        <EmptyHint text="Draft your first proposal or invoice from Docs." />
      ) : (
        <div className="space-y-2.5">
          {recentDocs.map((d) => (
            <Link
              to="/documents/$id"
              params={{ id: d.id }}
              key={d.id}
              className="card-soft p-3.5 flex items-center gap-3 active:scale-[0.99] transition"
            >
              <div className="size-10 rounded-xl bg-muted grid place-items-center text-muted-foreground">
                <FileText className="size-[18px]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate capitalize">
                  {d.type} · {d.number ?? "draft"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {d.client?.company ?? d.client?.name ?? "—"} · {timeAgo(d.updated_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatCurrency(d.total, d.currency)}</p>
                {d.client?.tier && <TierBadge tier={d.client.tier} />}
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between mb-2.5 px-1">
      <h2 className="font-display text-lg">{title}</h2>
      <Link to={href as never} className="text-xs text-primary font-medium">
        See all
      </Link>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="text-xs text-muted-foreground bg-muted/50 rounded-2xl px-4 py-6 text-center mb-6">
      {text}
    </p>
  );
}

function OnboardingWizard({ profile }: { profile: any }) {
  const save = useServerFn(updateProfile);
  const qc = useQueryClient();
  const [step, setStep] = useState(1);

  const [ownerName, setOwnerName] = useState(profile?.owner_name ?? "");
  const [businessName, setBusinessName] = useState(profile?.business_name ?? "");
  const [currency, setCurrency] = useState(profile?.currency ?? "NGN");
  const [country, setCountry] = useState(profile?.country ?? "NG");

  const [services, setServices] = useState(profile?.services ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dayRateMin, setDayRateMin] = useState(profile?.day_rate_min ?? 50000);
  const [dayRateMax, setDayRateMax] = useState(profile?.day_rate_max ?? 150000);

  // Automatically detect user geolocation IP and default their currency & country
  useEffect(() => {
    if (!profile?.currency || !profile?.country) {
      fetch("/api/public/geo")
        .then((res) => res.json())
        .then((data) => {
          if (data.currency && !profile?.currency) {
            setCurrency(data.currency);
          }
          if (data.country && !profile?.country) {
            setCountry(data.country);
          }
        })
        .catch((err) => console.warn("Failed to fetch geo info:", err));
    }
  }, [profile]);

  // Adjust day rates based on active currency if profile limits are not set
  useEffect(() => {
    if (!profile?.day_rate_min) {
      if (currency === "NGN") {
        setDayRateMin(50000);
        setDayRateMax(150000);
      } else {
        setDayRateMin(500);
        setDayRateMax(1500);
      }
    }
  }, [currency, profile]);

  const [primaryColor, setPrimaryColor] = useState(
    profile?.brand_color_primary ?? profile?.brand_color ?? "#8B5CF6",
  );
  const [secondaryColor, setSecondaryColor] = useState(profile?.brand_color_secondary ?? "#10B981");
  const [accentColor, setAccentColor] = useState(profile?.brand_color_accent ?? "#F59E0B");
  const [brandFont, setBrandFont] = useState(profile?.brand_font ?? "Helvetica");

  const [bankDetails, setBankDetails] = useState(profile?.bank_details ?? "");

  useEffect(() => {
    if (selectedTags.length > 0) {
      setServices(`Creative studio focusing on: ${selectedTags.join(", ")}.`);
    }
  }, [selectedTags]);

  const saveMut = useMutation({
    mutationFn: () =>
      save({
        data: {
          owner_name: ownerName || null,
          business_name: businessName || null,
          currency,
          country,
          services: services || null,
          day_rate_min: Number(dayRateMin),
          day_rate_max: Number(dayRateMax),
          brand_color: primaryColor,
          brand_color_primary: primaryColor,
          brand_color_secondary: secondaryColor,
          brand_color_accent: accentColor,
          brand_font: brandFont,
          bank_details: bankDetails || null,
          onboarded: true,
        },
      }),
    onSuccess: () => {
      toast.success("Studio setup completed! Welcome to your dashboard.");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to complete onboarding"),
  });

  const creativeTagsPreset = [
    "Branding & Visual Identity",
    "Website UI/UX Design",
    "Editorial Photography",
    "Social Media Content Creation",
    "Videography & Sound Design",
    "Copywriting & Brand Voice",
    "Illustration & Art Direction",
  ];

  const currencyOptions = [
    { code: "USD", label: "US Dollar (USD)", flag: "🇺🇸" },
    { code: "EUR", label: "Euro (EUR)", flag: "🇪🇺" },
    { code: "GBP", label: "British Pound (GBP)", flag: "🇬🇧" },
    { code: "NGN", label: "Nigerian Naira (NGN)", flag: "🇳🇬" },
  ];

  const handleNext = () => {
    if (step === 1 && (!ownerName.trim() || !businessName.trim())) {
      toast.error("Please fill in your name and studio name");
      return;
    }
    if (step < 4) {
      setStep(step + 1);
    } else {
      saveMut.mutate();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-dvh bg-gradient-to-tr from-muted/50 via-background to-primary/5 flex flex-col justify-center py-12 px-6">
      <div className="max-w-xl w-full mx-auto space-y-6">
        {/* Progress header */}
        <div className="text-center space-y-2 animate-in fade-in duration-300">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-widest">
            <Sparkles className="size-3" /> Step {step} of 4
          </span>
          <h1 className="font-display text-3xl tracking-tight text-foreground">
            Set up your creative studio
          </h1>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Let's configure your initial profile to ground the AI in your context immediately.
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-1.5 max-w-xs mx-auto">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1.5 rounded-full flex-1 transition-all duration-300",
                step >= s ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>

        {/* Form card */}
        <div className="card-soft bg-background/60 backdrop-blur-md border border-border/60 p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
              <h2 className="font-display text-lg font-semibold border-b border-border/50 pb-2">
                Studio Identity
              </h2>

              <label className="block space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Your Name
                </span>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm mt-1 focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Studio / Business Name
                </span>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Apex Design Studio"
                  className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm mt-1 focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </label>

              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                  Preferred Currency
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {currencyOptions.map((opt) => (
                    <button
                      type="button"
                      key={opt.code}
                      onClick={() => setCurrency(opt.code)}
                      className={cn(
                        "h-11 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]",
                        currency === opt.code
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-muted/40 hover:bg-muted border-border text-muted-foreground",
                      )}
                    >
                      <span className="text-sm leading-none">{opt.flag}</span>
                      <span>{opt.code}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
              <h2 className="font-display text-lg font-semibold border-b border-border/50 pb-2">
                Focus & Standard Rates
              </h2>

              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                  Select Creative Disciplines (Tap to select)
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {creativeTagsPreset.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => {
                          if (active) {
                            setSelectedTags(selectedTags.filter((x) => x !== tag));
                          } else {
                            setSelectedTags([...selectedTags, tag]);
                          }
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-full border text-[11px] font-medium transition-all duration-200",
                          active
                            ? "bg-primary/15 border-primary/40 text-primary"
                            : "bg-muted/40 hover:bg-muted border-border text-muted-foreground",
                        )}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Services Summary
                </span>
                <textarea
                  value={services}
                  onChange={(e) => setServices(e.target.value)}
                  placeholder="Describe your services, e.g. Editorial photography and brand identity design..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm mt-1 focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                />
              </label>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Standard Day Rates ({currency})
                  </span>
                  <span className="text-[10px] font-mono font-bold text-primary">
                    {dayRateMin.toLocaleString()} – {dayRateMax.toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className="text-[9px] text-muted-foreground">Min rate</span>
                    <input
                      type="number"
                      value={dayRateMin}
                      onChange={(e) => setDayRateMin(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-lg bg-muted border border-border text-xs focus:outline-none"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[9px] text-muted-foreground">Max rate</span>
                    <input
                      type="number"
                      value={dayRateMax}
                      onChange={(e) => setDayRateMax(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-lg bg-muted border border-border text-xs focus:outline-none"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
              <h2 className="font-display text-lg font-semibold border-b border-border/50 pb-2">
                Brand Styles & Live Preview
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Inputs block */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                      Brand Color Palette
                    </span>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-muted-foreground">Primary Accent</span>
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="size-6 rounded cursor-pointer border-0 bg-transparent p-0"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-muted-foreground">Secondary Accent</span>
                        <input
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="size-6 rounded cursor-pointer border-0 bg-transparent p-0"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-muted-foreground">Highlighter Accent</span>
                        <input
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="size-6 rounded cursor-pointer border-0 bg-transparent p-0"
                        />
                      </div>
                    </div>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Standard Export Font
                    </span>
                    <select
                      value={brandFont}
                      onChange={(e) => setBrandFont(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-muted border border-border text-xs focus:outline-none"
                    >
                      <option value="Helvetica">Helvetica (Clean Sans)</option>
                      <option value="TimesRoman">Times Roman (Serif Class)</option>
                      <option value="Courier">Courier (Terminal Mono)</option>
                    </select>
                  </label>
                </div>

                {/* Mock preview block */}
                <div
                  className="border border-border/80 rounded-2xl bg-white p-4 text-[10px] text-black shadow-inner flex flex-col justify-between min-h-[180px] select-none"
                  style={{
                    fontFamily:
                      brandFont === "TimesRoman"
                        ? "Times New Roman, serif"
                        : brandFont === "Courier"
                          ? "Courier New, monospace"
                          : "Helvetica, sans-serif",
                  }}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p
                          className="font-bold uppercase tracking-wide text-gray-900"
                          style={{ color: primaryColor }}
                        >
                          {businessName || "My Studio"}
                        </p>
                        <p className="text-[8px] text-gray-500">{ownerName || "Creative Owner"}</p>
                      </div>
                      <span
                        className="font-bold text-[9px] uppercase tracking-widest"
                        style={{ color: accentColor }}
                      >
                        Proposal
                      </span>
                    </div>

                    <div className="h-[0.5px] w-full" style={{ backgroundColor: secondaryColor }} />

                    <div className="space-y-1">
                      <p className="font-bold text-gray-700">Project Overview</p>
                      <p className="text-[7px] leading-relaxed text-gray-500">
                        Scope includes creative strategy and production deliverables customized to
                        creative industry benchmarks.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                    <span className="font-bold text-gray-700">Recommended Budget</span>
                    <span className="font-bold text-[11px]" style={{ color: primaryColor }}>
                      500,000 {currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
              <h2 className="font-display text-lg font-semibold border-b border-border/50 pb-2">
                Billing & Setup Summary
              </h2>

              <label className="block space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Bank Details / Payment instructions
                </span>
                <textarea
                  value={bankDetails}
                  onChange={(e) => setBankDetails(e.target.value)}
                  placeholder="e.g. Access Bank · 1234567890 · Mayowa Agency"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm mt-1 focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                />
                <span className="text-[9px] text-muted-foreground leading-normal block mt-1">
                  Payment instructions are automatically parsed and written directly into invoice
                  and receipt PDF exports.
                </span>
              </label>

              <div className="bg-primary/5 border border-primary/10 rounded-xl p-3.5 flex gap-2.5 text-xs text-primary-foreground/90 leading-relaxed">
                <Shield className="size-5 text-primary shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">Secure & Grounded Context</p>
                  <p className="text-muted-foreground text-[10px] mt-0.5">
                    Your profile day rates, currencies, and brand presets are compiled into AI
                    queries so that generated drafts match your exact identity. You can adjust all
                    of this later in Settings.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex gap-2 pt-2">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 h-12 rounded-full border border-border text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <ArrowLeft className="size-4" /> Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={saveMut.isPending}
              className="flex-1 h-12 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {saveMut.isPending ? (
                "Saving Setup..."
              ) : step === 4 ? (
                <>
                  Finish & Open <Check className="size-4" />
                </>
              ) : (
                <>
                  Continue <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
