import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ClientAvatar } from "@/components/ClientBadge";
import { formatCurrency, getClient, projects, type ProjectStatus } from "@/lib/mock-data";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Projects — Studio" }] }),
  component: ProjectsPage,
});

const filters: { key: ProjectStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "lead", label: "Leads" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
];

const statusStyle: Record<ProjectStatus, string> = {
  lead: "bg-warning/20 text-warning-foreground",
  active: "bg-success/15 text-success",
  completed: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
};

function ProjectsPage() {
  const [filter, setFilter] = useState<ProjectStatus | "all">("all");
  const filtered = filter === "all" ? projects : projects.filter((p) => p.status === filter);

  return (
    <AppShell
      title="Projects"
      subtitle={`${projects.length} total`}
      action={
        <button className="size-10 grid place-items-center rounded-full bg-primary text-primary-foreground" aria-label="New project">
          <Plus className="size-[18px]" />
        </button>
      }
    >
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 mb-2 [scrollbar-width:none]">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-4 h-9 rounded-full text-xs font-medium whitespace-nowrap border transition",
              filter === f.key
                ? "bg-foreground text-background border-foreground"
                : "bg-surface text-muted-foreground border-border",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((p) => {
          const c = getClient(p.clientId)!;
          return (
            <div key={p.id} className="card-soft p-4">
              <div className="flex items-start gap-3">
                <ClientAvatar client={c} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-base leading-tight truncate">{p.title}</p>
                    <span className={cn("text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold", statusStyle[p.status])}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.company}</p>
                  <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2">{p.scope}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
                    <p className="text-sm font-semibold">{formatCurrency(p.budget)}</p>
                    <p className="text-[11px] text-muted-foreground">Updated {p.updatedAt}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
