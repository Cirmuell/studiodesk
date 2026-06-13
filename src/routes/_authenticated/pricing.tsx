import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { listProjects } from "@/lib/projects.functions";
import { listPricingRuns, runPricingAnalysis, deletePricingRun } from "@/lib/pricing.functions";
import { formatCurrency, timeAgo } from "@/lib/format";
import { ArrowRight, Check, Sparkles, Wand2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pricing")({
  head: () => ({ meta: [{ title: "Pricing Studio — Studio" }] }),
  component: () => (
    <Suspense fallback={<AppShell title="Pricing Studio">{null}</AppShell>}>
      <PricingPage />
    </Suspense>
  ),
});

function PricingPage() {
  const fetchProjects = useServerFn(listProjects);
  const fetchRuns = useServerFn(listPricingRuns);
  const runAnalysis = useServerFn(runPricingAnalysis);
  const deleteRun = useServerFn(deletePricingRun);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: projects } = useSuspenseQuery({
    queryKey: ["projects"],
    queryFn: () => fetchProjects(),
  });
  const { data: runs } = useSuspenseQuery({
    queryKey: ["pricing_runs"],
    queryFn: () => fetchRuns(),
  });

  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const selected = projects.find((p) => p.id === projectId);
  const [hours, setHours] = useState(40);
  const [scope, setScope] = useState(selected?.scope ?? "");
  const [tier, setTier] = useState<"standard" | "preferred" | "enterprise">(
    (selected?.client?.tier as "standard" | "preferred" | "enterprise") ?? "standard",
  );
  const [selectedRun, setSelectedRun] = useState<any>(null);

  const mut = useMutation({
    mutationFn: () =>
      runAnalysis({
        data: { project_id: projectId || undefined, scope, hours, client_tier: tier },
      }),
    onSuccess: () => {
      toast.success("Pricing recommendation ready");
      setSelectedRun(null);
      qc.invalidateQueries({ queryKey: ["pricing_runs"] });
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Failed";
      if (msg.includes("free trial limit")) {
        toast.error(msg, {
          action: {
            label: "Go to Settings",
            onClick: () => navigate({ to: "/settings" }),
          },
        });
      } else {
        toast.error(msg);
      }
    },
  });

  const deleteRunMut = useMutation({
    mutationFn: (id: string) => deleteRun({ data: { id } }),
    onSuccess: () => {
      toast.success("Analysis deleted");
      qc.invalidateQueries({ queryKey: ["pricing_runs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete analysis"),
  });

  const latest = selectedRun ?? mut.data ?? runs[0];

  return (
    <AppShell title="Pricing Studio" subtitle="AI grounded in your context">
      {latest && (
        <section className="relative overflow-hidden rounded-3xl p-5 mb-5 bg-gradient-to-br from-primary/15 via-accent/40 to-secondary border border-primary/15">
          <div className="flex items-center gap-2 mb-2">
            <span className="size-7 rounded-full bg-primary text-primary-foreground grid place-items-center">
              <Sparkles className="size-3.5" />
            </span>
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-primary">
              AI estimate
            </p>
          </div>
          <p className="font-display text-4xl text-foreground">
            {formatCurrency(latest.recommended_total, latest.currency)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Range {formatCurrency(latest.range_low, latest.currency)} –{" "}
            {formatCurrency(latest.range_high, latest.currency)} · {latest.confidence} confidence
          </p>
          {latest.rationale && (
            <p className="text-xs text-foreground/80 mt-3 leading-relaxed">{latest.rationale}</p>
          )}
          {Array.isArray(latest.line_items) && latest.line_items.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {(latest.line_items as { label: string; amount: number }[]).map((li, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-foreground/80 truncate pr-2">{li.label}</span>
                  <span className="font-medium">{formatCurrency(li.amount, latest.currency)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="card-soft p-4 mb-5 space-y-4">
        <Field label="Project">
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              const p = projects.find((x) => x.id === e.target.value);
              if (p?.scope) setScope(p.scope);
              if (p?.client?.tier) setTier(p.client.tier as typeof tier);
            }}
            className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm"
          >
            <option value="">— Custom (no project) —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Client tier">
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as typeof tier)}
            className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm"
          >
            <option value="standard">Standard</option>
            <option value="preferred">Preferred</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </Field>

        <Field label={`Estimated hours · ${hours}`}>
          <input
            type="range"
            min={8}
            max={300}
            step={4}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="w-full accent-[color:var(--color-primary)]"
          />
        </Field>

        <Field label="Scope summary">
          <textarea
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            rows={4}
            placeholder="Describe deliverables, milestones, constraints…"
            className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm resize-none"
          />
        </Field>
      </div>

      <button
        onClick={() => {
          if (scope.trim().length < 10) {
            toast.error("Add a richer scope (10+ characters) for a useful estimate.");
            return;
          }
          mut.mutate();
        }}
        disabled={mut.isPending}
        className="w-full h-12 rounded-full bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 disabled:opacity-60 shadow-[var(--shadow-pop)]"
      >
        <Wand2 className="size-4" />
        {mut.isPending ? "Analysing…" : "Run pricing analysis"}
      </button>
      <p className="text-[11px] text-muted-foreground text-center mt-3 px-6">
        AI estimate grounded in your studio profile and the Nigerian market. Review before sending.
      </p>

      <h2 className="font-display text-lg mt-8 mb-3">Recent analyses</h2>
      {runs.length === 0 ? (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-2xl px-4 py-6 text-center">
          No analyses yet.
        </p>
      ) : (
        <div className="space-y-2.5">
          {runs.map((r) => (
            <div
              key={r.id}
              onClick={() => {
                setSelectedRun(r);
                setProjectId(r.project_id ?? "");
                setScope(r.scope ?? "");
                setHours(r.hours ? Number(r.hours) : 40);
                const proj = projects.find((p) => p.id === r.project_id);
                if (proj?.client?.tier) {
                  setTier(proj.client.tier as any);
                }
                toast.info("Loaded analysis parameters into form");
              }}
              className={cn(
                "card-soft p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition active:scale-[0.99]",
                latest?.id === r.id && "ring-1 ring-primary/30 bg-primary/5",
              )}
            >
              <div
                className={cn(
                  "size-10 rounded-xl grid place-items-center shrink-0",
                  r.confidence === "high"
                    ? "bg-success/15 text-success"
                    : "bg-warning/20 text-warning-foreground",
                )}
              >
                <Check className="size-[18px]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.project?.title ?? "Custom scope"}</p>
                <p className="text-xs text-muted-foreground">
                  {timeAgo(r.created_at)} · {r.confidence} confidence
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {formatCurrency(r.recommended_total, r.currency)}
                  </p>
                  <ArrowRight className="size-3.5 text-muted-foreground inline-block mt-0.5" />
                </div>
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (window.confirm("Are you sure you want to delete this pricing analysis?")) {
                      if (latest?.id === r.id) {
                        setSelectedRun(null);
                      }
                      await deleteRunMut.mutateAsync(r.id);
                    }
                  }}
                  className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/5 active:scale-95 transition"
                  title="Delete pricing analysis"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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
