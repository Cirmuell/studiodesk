import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ClientAvatar } from "@/components/ClientBadge";
import { listProjects, createProject } from "@/lib/projects.functions";
import { listClients } from "@/lib/clients.functions";
import { formatCurrency, timeAgo } from "@/lib/format";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Status = "lead" | "active" | "completed" | "archived";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "Projects — Studio" }] }),
  component: () => (
    <Suspense fallback={<AppShell title="Projects">{null}</AppShell>}>
      <ProjectsPage />
    </Suspense>
  ),
});

const filters: { key: Status | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "lead", label: "Leads" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
];

const statusStyle: Record<Status, string> = {
  lead: "bg-warning/20 text-warning-foreground",
  active: "bg-success/15 text-success",
  completed: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
};

function ProjectsPage() {
  const fetchProjects = useServerFn(listProjects);
  const fetchClients = useServerFn(listClients);
  const addProject = useServerFn(createProject);
  const qc = useQueryClient();
  const { data: projects } = useSuspenseQuery({ queryKey: ["projects"], queryFn: () => fetchProjects() });
  const { data: clients } = useSuspenseQuery({ queryKey: ["clients"], queryFn: () => fetchClients() });

  const [filter, setFilter] = useState<Status | "all">("all");
  const [open, setOpen] = useState(false);
  const filtered = filter === "all" ? projects : projects.filter((p) => p.status === filter);

  const mut = useMutation({
    mutationFn: (input: { title: string; client_id?: string; budget?: number; scope?: string }) => addProject({ data: { ...input, status: "lead", currency: "NGN" } }),
    onSuccess: () => {
      toast.success("Project created");
      qc.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <AppShell
      title="Projects"
      subtitle={`${projects.length} total`}
      action={
        <button onClick={() => setOpen(true)} className="size-10 grid place-items-center rounded-full bg-primary text-primary-foreground" aria-label="New project">
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
              filter === f.key ? "bg-foreground text-background border-foreground" : "bg-surface text-muted-foreground border-border",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {open && (
        <NewProjectForm
          clients={clients}
          loading={mut.isPending}
          onCancel={() => setOpen(false)}
          onSubmit={(v) => mut.mutate(v)}
        />
      )}

      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-2xl px-4 py-6 text-center">No projects in this view.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="card-soft p-4">
              <div className="flex items-start gap-3">
                <ClientAvatar name={p.client?.name ?? p.title} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-base leading-tight truncate">{p.title}</p>
                    <span className={cn("text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold", statusStyle[p.status as Status])}>{p.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.client?.company ?? p.client?.name ?? "No client"}</p>
                  {p.scope && <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2">{p.scope}</p>}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
                    <p className="text-sm font-semibold">{formatCurrency(p.budget ?? 0, p.currency)}</p>
                    <p className="text-[11px] text-muted-foreground">Updated {timeAgo(p.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function NewProjectForm({
  clients,
  onSubmit,
  onCancel,
  loading,
}: {
  clients: { id: string; name: string; company: string | null }[];
  onSubmit: (v: { title: string; client_id?: string; budget?: number; scope?: string }) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [budget, setBudget] = useState("");
  const [scope, setScope] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSubmit({
          title,
          client_id: clientId || undefined,
          budget: budget ? Number(budget) : undefined,
          scope: scope || undefined,
        });
      }}
      className="card-soft p-4 mb-4 space-y-3"
    >
      <input className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm" placeholder="Project title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <select className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm" value={clientId} onChange={(e) => setClientId(e.target.value)}>
        <option value="">No client</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ""}</option>
        ))}
      </select>
      <input className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm" type="number" placeholder="Budget (NGN)" value={budget} onChange={(e) => setBudget(e.target.value)} />
      <textarea className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm" rows={3} placeholder="Scope summary" value={scope} onChange={(e) => setScope(e.target.value)} />
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 h-11 rounded-full border border-border text-sm">Cancel</button>
        <button disabled={loading} type="submit" className="flex-1 h-11 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">{loading ? "Saving…" : "Create"}</button>
      </div>
    </form>
  );
}
