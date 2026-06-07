import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ClientAvatar, TierBadge } from "@/components/ClientBadge";
import {
  clients,
  docs,
  formatCurrency,
  getClient,
  getProject,
  projects,
  pricingRuns,
} from "@/lib/mock-data";
import { ArrowUpRight, Calculator, FileText, Sparkles, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Studio — Your creative business at a glance" },
      { name: "description", content: "Pricing, proposals, invoices and contracts for independent creatives." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const activeProjects = projects.filter((p) => p.status === "active");
  const recentDocs = docs.slice(0, 3);
  const lastPricing = pricingRuns[0];
  const lastProject = getProject(lastPricing.projectId);

  return (
    <AppShell subtitle="Tuesday, May 26" title="Good morning, Sam">
      {/* Hero metric */}
      <section className="relative overflow-hidden rounded-3xl bg-foreground text-background p-5 mb-5">
        <div className="absolute -top-12 -right-10 size-44 rounded-full bg-primary/40 blur-2xl" />
        <div className="absolute -bottom-12 -left-8 size-32 rounded-full bg-accent/40 blur-2xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.2em] opacity-70">This month</p>
          <p className="font-display text-4xl mt-1">{formatCurrency(28400)}</p>
          <p className="text-sm opacity-80 mt-0.5">Invoiced across 4 projects</p>
          <div className="flex items-center gap-1.5 mt-3 text-xs">
            <TrendingUp className="size-3.5 text-primary" />
            <span className="text-primary font-medium">+18%</span>
            <span className="opacity-60">vs. last month</span>
          </div>
        </div>
      </section>

      {/* Quick actions */}
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

      {/* Latest pricing insight */}
      {lastPricing && lastProject && (
        <section className="card-soft p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-4 text-primary" />
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-medium">
              Latest pricing insight
            </p>
          </div>
          <p className="font-display text-lg leading-snug">{lastProject.title}</p>
          <div className="flex items-end justify-between mt-2">
            <div>
              <p className="text-2xl font-display">{formatCurrency(lastPricing.recommendedTotal)}</p>
              <p className="text-xs text-muted-foreground">
                Range {formatCurrency(lastPricing.rangeLow)}–{formatCurrency(lastPricing.rangeHigh)}
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-success/15 text-success font-semibold">
              {lastPricing.confidence} confidence
            </span>
          </div>
        </section>
      )}

      {/* Active projects */}
      <SectionHeader title="Active projects" href="/projects" />
      <div className="space-y-2.5 mb-6">
        {activeProjects.map((p) => {
          const c = getClient(p.clientId)!;
          return (
            <Link
              key={p.id}
              to="/projects"
              className="card-soft p-3.5 flex items-center gap-3 active:scale-[0.99] transition"
            >
              <ClientAvatar client={c} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {c.company} · {formatCurrency(p.budget)}
                </p>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </Link>
          );
        })}
      </div>

      {/* Recent docs */}
      <SectionHeader title="Recent documents" href="/documents" />
      <div className="space-y-2.5">
        {recentDocs.map((d) => {
          const c = getClient(d.clientId)!;
          return (
            <div key={d.id} className="card-soft p-3.5 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-muted grid place-items-center text-muted-foreground">
                <FileText className="size-[18px]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate capitalize">
                  {d.type} · {d.number}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {c.company} · {d.updatedAt}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatCurrency(d.total)}</p>
                <TierBadge tier={c.tier} />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground/70 mt-8 text-center">
        {clients.length} clients · {projects.length} projects
      </p>
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
