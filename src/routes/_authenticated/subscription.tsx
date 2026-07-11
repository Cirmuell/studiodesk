import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { getProfile } from "@/lib/profile.functions";
import { getBillingInfo, subscribeToPlan } from "@/lib/subscription.functions";
import { CreditCard, Check, Sparkles, Zap, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({ meta: [{ title: "Subscription — Studio" }] }),
  component: () => (
    <Suspense fallback={<AppShell title="Subscription">{null}</AppShell>}>
      <SubscriptionPage />
    </Suspense>
  ),
});

const getPlanPrice = (plan: "basic" | "premium", userCurrency: string) => {
  const cur = (userCurrency || "NGN").toUpperCase();
  const prices: Record<string, { basic: string; premium: string }> = {
    NGN: { basic: "₦7,500", premium: "₦15,000" },
    USD: { basic: "$9", premium: "$19" },
    EUR: { basic: "€9", premium: "€19" },
    GBP: { basic: "£8", premium: "£16" },
  };
  const set = prices[cur] || { basic: plan === "basic" ? "$9" : "$19", premium: "$19" };
  return plan === "basic" ? set.basic : set.premium;
};

const tiers = {
  trial: {
    name: "Free Trial",
    features: [
      "5 AI Project Runs",
      "Standard PDF Document Export",
      "Max 1 Client Profile",
      "Max 3 Rate Cards",
      "Set Brand Colors once",
      "Upload Signature once",
    ],
  },
  basic: {
    name: "Basic Studio",
    features: [
      "50 AI Project Runs / month",
      "Standard PDF Document Export",
      "Max 10 Client Profiles",
      "Max 20 Rate Cards",
      "3 Logo edits / month",
      "5 Color edits / month",
      "Upload Signature once",
      "Standard Email Support",
    ],
  },
  premium: {
    name: "Premium Studio",
    features: [
      "Everything in Basic",
      "100 AI Project Runs / month",
      "Unlimited Clients & Rate Cards",
      "Unlimited Logo & Color edits",
      "3 Signature edits / month",
      "Custom PDF Fonts upload",
      "Priority AI Processing",
    ],
  },
};

function SubscriptionPage() {
  const router = useRouter();
  const fetchProfile = useServerFn(getProfile);
  const fetchBilling = useServerFn(getBillingInfo);
  const upgradePlan = useServerFn(subscribeToPlan);
  const qc = useQueryClient();

  const { data: profile } = useSuspenseQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });
  const { data: billing } = useSuspenseQuery({
    queryKey: ["billing"],
    queryFn: () => fetchBilling(),
  });

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "premium">("basic");

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("payment") === "success") {
      toast.success("Payment successful! Your subscription is being processed.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const upgradeMut = useMutation({
    mutationFn: (plan: "basic" | "premium") =>
      upgradePlan({ data: { plan, origin: window.location.origin } }),
    onSuccess: (res: any) => {
      if (res?.accessCode) {
        const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
        if (!paystackKey) {
          toast.error(
            "Paystack Public Key not configured. Please add VITE_PAYSTACK_PUBLIC_KEY to your environment."
          );
          return;
        }

        const loadPaystack = () => {
          const handler = (window as any).PaystackPop.setup({
            key: paystackKey,
            email: res.email,
            amount: res.amount,
            access_code: res.accessCode,
            metadata: {
              userId: profile?.id,
              plan: selectedPlan,
            },
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

  const limit = billing.plan === "premium" ? 100 : billing.plan === "basic" ? 50 : billing.trial_generations_limit || 5;
  const used = billing.trial_generations_used || 0;
  const currency = profile?.currency || "NGN";

  return (
    <AppShell title="Subscription" subtitle="Manage your plan">
      {/* Usage Progress Bar */}
      <div className="card-soft p-5 mb-8 border-border bg-surface shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-display text-lg capitalize">{billing.plan} Tier</h4>
              <span
                className={cn(
                  "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ml-1",
                  billing.plan === "trial"
                    ? "bg-muted-foreground/15 text-muted-foreground"
                    : "bg-success/15 text-success"
                )}
              >
                {billing.plan === "trial" ? "Free Trial" : "Active"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {billing.plan === "trial"
                ? "Experience the full power of Studio AI for free before deciding."
                : `Your subscription is active and renews on ${billing.subscription_ends_at ? new Date(billing.subscription_ends_at).toLocaleDateString() : "—"}.`}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-muted/30 border border-border">
          <div className="flex justify-between items-end mb-2">
            <p className="text-sm font-semibold">{billing.plan === "trial" ? "Trial Usage" : "Monthly Usage"}</p>
            <p className="text-xs font-medium text-muted-foreground">{used} of {limit} runs used</p>
          </div>
          <div className="w-full bg-muted/80 h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (used / limit) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Pricing Tiers */}
      <div className="space-y-4 mb-8">
        <h3 className="font-display text-xl text-center mb-6">Choose the right plan for your studio</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Basic Tier */}
          <div className={cn(
            "relative flex flex-col p-6 rounded-2xl border transition-all duration-200 shadow-sm",
            billing.plan === "basic" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-surface hover:border-primary/50"
          )}>
            {billing.plan === "basic" && (
              <div className="absolute top-0 right-6 -translate-y-1/2 bg-primary text-primary-foreground text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full shadow-sm">
                Current Plan
              </div>
            )}

            <div className="mb-4">
              <h4 className="font-display text-lg mb-1">{tiers.basic.name}</h4>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold">{getPlanPrice("basic", currency)}</span>
                <span className="text-sm text-muted-foreground mb-1">/mo</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {tiers.basic.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="size-4 text-primary shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => {
                setSelectedPlan("basic");
                setCheckoutOpen(true);
              }}
              className={cn(
                "w-full h-11 rounded-xl font-semibold transition-all active:scale-[0.98]",
                billing.plan === "basic"
                  ? "bg-muted text-muted-foreground cursor-default"
                  : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
              )}
              disabled={billing.plan === "basic"}
            >
              {billing.plan === "basic" ? "Active" : billing.plan === "premium" ? "Downgrade to Basic" : "Upgrade to Basic"}
            </button>
          </div>

          {/* Premium Tier */}
          <div className={cn(
            "relative flex flex-col p-6 rounded-2xl border transition-all duration-200 shadow-md",
            billing.plan === "premium" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-surface hover:border-primary/50"
          )}>
            {billing.plan === "premium" && (
              <div className="absolute top-0 right-6 -translate-y-1/2 bg-primary text-primary-foreground text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full shadow-sm">
                Current Plan
              </div>
            )}
            {billing.plan !== "premium" && (
              <div className="absolute top-0 right-6 -translate-y-1/2 bg-gradient-to-r from-orange-400 to-primary text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                <Sparkles className="size-3" /> Recommended
              </div>
            )}

            <div className="mb-4">
              <h4 className="font-display text-lg mb-1">{tiers.premium.name}</h4>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold">{getPlanPrice("premium", currency)}</span>
                <span className="text-sm text-muted-foreground mb-1">/mo</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {tiers.premium.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="size-4 text-primary shrink-0 mt-0.5" />
                  <span className={idx < 2 ? "font-medium text-foreground" : ""}>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => {
                setSelectedPlan("premium");
                setCheckoutOpen(true);
              }}
              className={cn(
                "w-full h-11 rounded-xl font-semibold shadow-[var(--shadow-pop)] transition-all active:scale-[0.98]",
                billing.plan === "premium"
                  ? "bg-muted text-muted-foreground cursor-default shadow-none"
                  : "bg-primary text-primary-foreground"
              )}
              disabled={billing.plan === "premium"}
            >
              {billing.plan === "premium" ? "Active" : "Upgrade to Premium"}
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs grid place-items-center p-4">
          <div className="card-soft bg-background w-full max-w-sm p-6 space-y-4 shadow-xl border border-border animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <h3 className="font-display text-xl">Confirm Upgrade</h3>
              <p className="text-xs text-muted-foreground mt-1">
                You are about to subscribe to the {selectedPlan === "premium" ? "Premium" : "Basic"} Studio plan.
              </p>
            </div>

            <div className="bg-muted/30 p-4 rounded-xl border border-border mb-6 flex justify-between items-center">
              <div>
                <p className="font-semibold capitalize">{selectedPlan} Plan</p>
                <p className="text-xs text-muted-foreground">Billed monthly</p>
              </div>
              <p className="text-xl font-bold">{getPlanPrice(selectedPlan, currency)}</p>
            </div>

            <div className="bg-muted/60 p-3 rounded-lg text-[10px] text-muted-foreground flex items-start gap-1.5 leading-normal mb-6">
              <Shield className="size-3.5 shrink-0 mt-0.5" />
              Payments are securely processed by Paystack. You can modify or cancel your subscription at any time.
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                className="flex-1 h-11 rounded-full border border-border text-xs font-semibold hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={upgradeMut.isPending}
                onClick={() => upgradeMut.mutate(selectedPlan)}
                className="flex-1 h-11 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
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
