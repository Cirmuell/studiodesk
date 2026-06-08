import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { ClientAvatar, TierBadge } from "@/components/ClientBadge";
import { formatCurrency, timeAgo } from "@/lib/format";
import { listProjects } from "@/lib/projects.functions";
import { listDocuments } from "@/lib/documents.functions";
import { listPricingRuns } from "@/lib/pricing.functions";
import { getProfile } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpRight, Calculator, FileText, LogOut, Sparkles, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Studio — Your creative business at a glance" },
      { name: "description", content: "AI pricing, proposals and invoices for Nigerian creatives." },
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
      subtitle={new Date().toLocaleDateString("en-NG", { weekday: "long", month: "short", day: "numeric" })}
      title={`Hello, ${profile?.owner_name?.split(" ")[0] ?? "there"}`}
      action={
        <button onClick={signOut} aria-label="Sign out" className="size-10 grid place-items-center rounded-full bg-surface border border-border text-muted-foreground">
          <LogOut className="size-[18px]" />
        </button>
      }
    >
      <section className="relative overflow-hidden rounded-3xl bg-foreground text-background p-5 mb-5">
        <div className="absolute -top-12 -right-10 size-44 rounded-full bg-primary/40 blur-2xl" />
        <div className="absolute -bottom-12 -left-8 size-32 rounded-full bg-accent/40 blur-2xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.2em] opacity-70">Invoiced</p>
          <p className="font-display text-4xl mt-1">{formatCurrency(invoicedThisMonth, currency)}</p>
          <p className="text-sm opacity-80 mt-0.5">Across {docs.filter((d) => d.type === "invoice").length} invoices</p>
          <div className="flex items-center gap-1.5 mt-3 text-xs">
            <TrendingUp className="size-3.5 text-primary" />
            <span className="text-primary font-medium">{projects.length}</span>
            <span className="opacity-60">projects total</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link to="/pricing" className="card-soft p-4 flex flex-col gap-2 active:scale-[0.98] transition">
          <div className="size-9 rounded-full bg-primary/10 grid place-items-center text-primary">
            <Calculator className="size-[18px]" />
          </div>
          <div>
            <p className="font-medium text-sm">Price a project</p>
            <p className="text-xs text-muted-foreground">AI-grounded estimates</p>
          </div>
        </Link>
        <Link to="/documents" className="card-soft p-4 flex flex-col gap-2 active:scale-[0.98] transition">
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
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">Latest pricing insight</p>
          </div>
          <p className="font-display text-lg leading-snug">{lastRun.project?.title ?? "Custom scope"}</p>
          <div className="flex items-end justify-between mt-2">
            <div>
              <p className="text-2xl font-display">{formatCurrency(lastRun.recommended_total, lastRun.currency)}</p>
              <p className="text-xs text-muted-foreground">
                Range {formatCurrency(lastRun.range_low, lastRun.currency)}–{formatCurrency(lastRun.range_high, lastRun.currency)}
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
            <Link key={p.id} to="/projects/$id" params={{ id: p.id }} className="card-soft p-3.5 flex items-center gap-3 active:scale-[0.99] transition">
              <ClientAvatar name={p.client?.name ?? p.title} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {p.client?.company ?? p.client?.name ?? "No client"} · {formatCurrency(p.budget ?? 0, p.currency)}
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
            <div key={d.id} className="card-soft p-3.5 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-muted grid place-items-center text-muted-foreground">
                <FileText className="size-[18px]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate capitalize">{d.type} · {d.number ?? "draft"}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {d.client?.company ?? d.client?.name ?? "—"} · {timeAgo(d.updated_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatCurrency(d.total, d.currency)}</p>
                {d.client?.tier && <TierBadge tier={d.client.tier} />}
              </div>
            </div>
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
      <Link to={href as never} className="text-xs text-primary font-medium">See all</Link>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground bg-muted/50 rounded-2xl px-4 py-6 text-center mb-6">{text}</p>;
}
