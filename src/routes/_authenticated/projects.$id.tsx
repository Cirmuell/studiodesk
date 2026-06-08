import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { ClientAvatar, TierBadge } from "@/components/ClientBadge";
import { getProject } from "@/lib/projects.functions";
import { formatCurrency, timeAgo } from "@/lib/format";
import { ArrowLeft, Calculator, FileText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/$id")({
  head: () => ({ meta: [{ title: "Project — Studio" }] }),
  component: () => (
    <Suspense fallback={<AppShell title="Project">{null}</AppShell>}>
      <ProjectPage />
    </Suspense>
  ),
});

function ProjectPage() {
  const { id } = Route.useParams();
  const fetchProject = useServerFn(getProject);
  const { data } = useSuspenseQuery({ queryKey: ["project", id], queryFn: () => fetchProject({ data: { id } }) });

  const { project, client, pricing_runs, documents } = data;

  return (
    <AppShell
      title={project.title}
      subtitle={project.status}
      action={
        <Link
          to="/projects"
          className="size-10 grid place-items-center rounded-full bg-surface border border-border text-muted-foreground"
          aria-label="Back to projects"
        >
          <ArrowLeft className="size-[18px]" />
        </Link>
      }
    >
      {client && (
        <div className="card-soft p-4 mb-5 flex items-center gap-3">
          <ClientAvatar name={client.name} size={44} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{client.name}</p>
              <TierBadge tier={client.tier} />
            </div>
            {client.company && <p className="text-xs text-muted-foreground truncate">{client.company}</p>}
          </div>
        </div>
      )}

      <section className="card-soft p-5 mb-5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Budget</p>
        <p className="font-display text-3xl mt-1">{formatCurrency(project.budget ?? 0, project.currency)}</p>
        {project.deadline && (
          <p className="text-xs text-muted-foreground mt-1">Deadline {new Date(project.deadline).toLocaleDateString()}</p>
        )}
        {project.scope && (
          <>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-4 mb-1">Scope</p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/85">{project.scope}</p>
          </>
        )}
        {project.deliverables && (
          <>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-3 mb-1">Deliverables</p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/85">{project.deliverables}</p>
          </>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link to="/pricing" className="card-soft p-4 flex flex-col gap-2 active:scale-[0.98] transition">
          <div className="size-9 rounded-full bg-primary/10 grid place-items-center text-primary">
            <Calculator className="size-[18px]" />
          </div>
          <p className="font-medium text-sm">Price this</p>
        </Link>
        <Link to="/documents" className="card-soft p-4 flex flex-col gap-2 active:scale-[0.98] transition">
          <div className="size-9 rounded-full bg-secondary grid place-items-center text-secondary-foreground">
            <FileText className="size-[18px]" />
          </div>
          <p className="font-medium text-sm">New document</p>
        </Link>
      </div>

      <SectionHeader title="Pricing history" />
      {pricing_runs.length === 0 ? (
        <EmptyHint text="No pricing runs yet for this project." />
      ) : (
        <div className="space-y-2.5 mb-6">
          {pricing_runs.map((r) => (
            <div key={r.id} className="card-soft p-4 flex items-center gap-3">
              <div className={cn("size-10 rounded-xl grid place-items-center", r.confidence === "high" ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground")}>
                <Sparkles className="size-[18px]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{formatCurrency(r.recommended_total, r.currency)}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {timeAgo(r.created_at)} · {r.confidence} confidence
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(r.range_low, r.currency)}–{formatCurrency(r.range_high, r.currency)}
              </p>
            </div>
          ))}
        </div>
      )}

      <SectionHeader title="Documents" />
      {documents.length === 0 ? (
        <EmptyHint text="No documents yet — draft one from Docs." />
      ) : (
        <div className="space-y-2.5">
          {documents.map((d) => (
            <Link key={d.id} to="/documents/$id" params={{ id: d.id }} className="card-soft p-3.5 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-muted grid place-items-center text-muted-foreground">
                <FileText className="size-[18px]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium capitalize">{d.type} {d.number ? `· ${d.number}` : ""}</p>
                <p className="text-xs text-muted-foreground truncate">{d.title ?? "Untitled"} · {timeAgo(d.updated_at)}</p>
              </div>
              <p className="text-sm font-semibold">{formatCurrency(Number(d.total ?? 0), d.currency)}</p>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <h2 className="font-display text-lg">{title}</h2>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground bg-muted/50 rounded-2xl px-4 py-5 text-center mb-6">{text}</p>;
}
