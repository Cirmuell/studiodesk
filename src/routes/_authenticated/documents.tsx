import { createFileRoute, Link, useNavigate, Outlet, useChildMatches } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { listDocuments, draftDocument } from "@/lib/documents.functions";
import { listProjects } from "@/lib/projects.functions";
import { formatCurrency, timeAgo } from "@/lib/format";
import { FileText, Plus, Receipt, ScrollText, FileCheck2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type DocType = "proposal" | "invoice" | "contract" | "receipt";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Documents — Studio" }] }),
  component: () => (
    <Suspense fallback={<AppShell title="Documents">{null}</AppShell>}>
      <DocumentsLayout />
    </Suspense>
  ),
});

function DocumentsLayout() {
  const childMatches = useChildMatches();
  if (childMatches.length > 0) {
    return <Outlet />;
  }
  return <DocumentsPage />;
}

const typeMeta: Record<DocType, { label: string; icon: typeof FileText; tone: string }> = {
  proposal: { label: "Proposals", icon: ScrollText, tone: "bg-primary/10 text-primary" },
  invoice: { label: "Invoices", icon: FileText, tone: "bg-secondary text-secondary-foreground" },
  receipt: { label: "Receipts", icon: Receipt, tone: "bg-success/15 text-success" },
  contract: { label: "Contracts", icon: FileCheck2, tone: "bg-accent text-accent-foreground" },
};

const filters: { key: DocType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "proposal", label: "Proposals" },
  { key: "invoice", label: "Invoices" },
  { key: "contract", label: "Contracts" },
  { key: "receipt", label: "Receipts" },
];

function DocumentsPage() {
  const fetchDocs = useServerFn(listDocuments);
  const fetchProjects = useServerFn(listProjects);
  const draft = useServerFn(draftDocument);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: docs } = useSuspenseQuery({ queryKey: ["documents"], queryFn: () => fetchDocs() });
  const { data: projects } = useSuspenseQuery({ queryKey: ["projects"], queryFn: () => fetchProjects() });

  const [filter, setFilter] = useState<DocType | "all">("all");
  const [open, setOpen] = useState(false);
  const filtered = filter === "all" ? docs : docs.filter((d) => d.type === filter);

  const mut = useMutation({
    mutationFn: (input: { type: DocType; project_id?: string; client_id?: string }) => draft({ data: input }),
    onSuccess: (row: { id: string }) => {
      toast.success("AI draft ready — review, edit & download");
      qc.invalidateQueries({ queryKey: ["documents"] });
      setOpen(false);
      if (row?.id) navigate({ to: "/documents/$id", params: { id: row.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <AppShell
      title="Documents"
      subtitle={`${docs.length} total`}
      action={
        <button onClick={() => setOpen(true)} className="size-10 grid place-items-center rounded-full bg-primary text-primary-foreground" aria-label="New document">
          <Plus className="size-[18px]" />
        </button>
      }
    >
      <div className="grid grid-cols-4 gap-2 mb-5">
        {(Object.keys(typeMeta) as DocType[]).map((t) => {
          const m = typeMeta[t];
          const Icon = m.icon;
          return (
            <button key={t} onClick={() => setFilter(t)} className="card-soft p-3 flex flex-col items-center gap-1.5 active:scale-[0.97] transition">
              <span className={cn("size-9 rounded-full grid place-items-center", m.tone)}><Icon className="size-[16px]" /></span>
              <span className="text-[10px] font-medium capitalize">{t}</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-2 [scrollbar-width:none]">
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
        <NewDocForm
          projects={projects}
          loading={mut.isPending}
          onCancel={() => setOpen(false)}
          onSubmit={(v) => mut.mutate(v)}
        />
      )}

      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-2xl px-4 py-6 text-center">No documents yet — tap + and let AI draft one.</p>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((d) => {
            const m = typeMeta[d.type as DocType];
            const Icon = m.icon;
            return (
              <Link
                to="/documents/$id"
                params={{ id: d.id }}
                key={d.id}
                className="card-soft p-4 flex items-center gap-3"
              >
                <span className={cn("size-11 rounded-xl grid place-items-center shrink-0", m.tone)}><Icon className="size-[18px]" /></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate capitalize">{d.type}</p>
                    {d.number && <span className="text-[10px] text-muted-foreground">{d.number}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {d.client?.company ?? d.client?.name ?? d.title ?? "—"} · {timeAgo(d.updated_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(d.total, d.currency)}</p>
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full",
                      d.status === "ready" || d.status === "sent" || d.status === "paid"
                        ? "bg-success/15 text-success"
                        : d.status === "draft"
                          ? "bg-muted text-muted-foreground"
                          : "bg-warning/20 text-warning-foreground",
                    )}
                  >
                    {d.status}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function NewDocForm({
  projects,
  onSubmit,
  onCancel,
  loading,
}: {
  projects: { id: string; title: string; client_id: string | null; client?: { id: string; name: string } | null }[];
  onSubmit: (v: { type: DocType; project_id?: string; client_id?: string }) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [type, setType] = useState<DocType>("proposal");
  const [projectId, setProjectId] = useState("");
  const selected = projects.find((p) => p.id === projectId);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ type, project_id: projectId || undefined, client_id: selected?.client_id ?? undefined });
      }}
      className="card-soft p-4 mb-4 space-y-3"
    >
      <div className="flex items-center gap-2 text-xs text-primary">
        <Sparkles className="size-3.5" /> AI will draft this for you to review and edit.
      </div>
      <select value={type} onChange={(e) => setType(e.target.value as DocType)} className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm">
        <option value="proposal">Proposal</option>
        <option value="invoice">Invoice</option>
        <option value="contract">Contract</option>
        <option value="receipt">Receipt</option>
      </select>
      <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm">
        <option value="">— No project —</option>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
      </select>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 h-11 rounded-full border border-border text-sm">Cancel</button>
        <button disabled={loading} type="submit" className="flex-1 h-11 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">{loading ? "Drafting…" : "Generate draft"}</button>
      </div>
    </form>
  );
}
