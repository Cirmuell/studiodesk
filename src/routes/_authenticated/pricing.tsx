import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { formatCurrency, getClient, getProject, pricingRuns, projects } from "@/lib/mock-data";
import { ArrowRight, Check, Sparkles, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pricing")({
  head: () => ({ meta: [{ title: "Pricing Studio — Studio" }] }),
  component: PricingPage,
});

function PricingPage() {
  const [hours, setHours] = useState(40);
  const [projectId, setProjectId] = useState(projects[0].id);
  const project = getProject(projectId)!;
  const client = getClient(project.clientId)!;

  // mock-derived estimate
  const recommended = Math.round(hours * 140 + (client.tier === "enterprise" ? 2500 : client.tier === "preferred" ? 1200 : 600));
  const low = Math.round(recommended * 0.88);
  const high = Math.round(recommended * 1.15);

  return (
    <AppShell title="Pricing Studio" subtitle="AI grounded in your context">
      {/* AI hero */}
      <section className="relative overflow-hidden rounded-3xl p-5 mb-5 bg-gradient-to-br from-primary/15 via-accent/40 to-secondary border border-primary/15">
        <div className="flex items-center gap-2 mb-2">
          <span className="size-7 rounded-full bg-primary text-primary-foreground grid place-items-center">
            <Sparkles className="size-3.5" />
          </span>
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-primary">AI estimate</p>
        </div>
        <p className="font-display text-4xl text-foreground">{formatCurrency(recommended)}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Range {formatCurrency(low)} – {formatCurrency(high)} · {client.tier} client
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ["Confidence", "High"],
            ["Hours", `${hours}h`],
            ["Day-rate", "$1,120"],
          ].map(([k, v]) => (
            <div key={k} className="bg-surface/70 backdrop-blur rounded-xl px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p>
              <p className="text-sm font-semibold mt-0.5">{v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Inputs */}
      <div className="card-soft p-4 mb-5 space-y-4">
        <Field label="Project">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </Field>

        <Field label={`Estimated hours · ${hours}`}>
          <input
            type="range"
            min={8}
            max={160}
            step={4}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="w-full accent-[color:var(--color-primary)]"
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>8h</span>
            <span>160h</span>
          </div>
        </Field>

        <Field label="Scope summary">
          <textarea
            defaultValue={project.scope}
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </Field>
      </div>

      <button className="w-full h-12 rounded-full bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 active:scale-[0.99] transition shadow-[var(--shadow-pop)]">
        <Wand2 className="size-4" />
        Run pricing analysis
      </button>

      <p className="text-[11px] text-muted-foreground text-center mt-3 px-6">
        AI estimate, not financial advice. Review before sending to clients.
      </p>

      {/* History */}
      <h2 className="font-display text-lg mt-8 mb-3">Recent analyses</h2>
      <div className="space-y-2.5">
        {pricingRuns.map((r) => {
          const p = getProject(r.projectId)!;
          return (
            <div key={r.id} className="card-soft p-4 flex items-center gap-3">
              <div className={cn(
                "size-10 rounded-xl grid place-items-center",
                r.confidence === "high" ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground",
              )}>
                <Check className="size-[18px]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground">{r.createdAt} · {r.confidence} confidence</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatCurrency(r.recommendedTotal)}</p>
                <ArrowRight className="size-3.5 text-muted-foreground inline-block mt-0.5" />
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
