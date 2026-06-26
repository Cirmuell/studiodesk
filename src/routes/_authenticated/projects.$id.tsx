import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ClientAvatar, TierBadge } from "@/components/ClientBadge";
import { getProject, addTask, updateTaskStatus, deleteTask, addProjectLink, deleteProjectLink } from "@/lib/projects.functions";
import { formatCurrency, timeAgo } from "@/lib/format";
import { ArrowLeft, Calculator, FileText, Sparkles, CheckCircle2, Circle, Clock, Columns, ExternalLink, Plus, Github, Figma, HelpCircle, HardDrive, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/projects/$id")({
  head: () => ({ meta: [{ title: "Project — Studio" }] }),
  component: () => (
    <Suspense fallback={<AppShell title="Project">{null}</AppShell>}>
      <ProjectPage />
    </Suspense>
  ),
});

function SectionHeader({ title }: { title: string }) {
  return <h3 className="font-semibold text-sm mb-3 px-1">{title}</h3>;
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="text-xs text-muted-foreground bg-muted/50 rounded-2xl px-4 py-6 text-center mb-6">
      {text}
    </p>
  );
}

const getIconForType = (type: string) => {
  switch (type) {
    case 'figma': return <Figma className="size-4" />;
    case 'github': return <Github className="size-4" />;
    case 'drive': return <HardDrive className="size-4" />;
    case 'notion': return <FileText className="size-4" />;
    default: return <ExternalLink className="size-4" />;
  }
};

const determineLinkType = (url: string) => {
  if (url.includes('figma.com')) return 'figma';
  if (url.includes('github.com')) return 'github';
  if (url.includes('drive.google.com')) return 'drive';
  if (url.includes('notion.so') || url.includes('notion.site')) return 'notion';
  return 'other';
};

function ProjectPage() {
  const { id } = Route.useParams();
  const fetchProject = useServerFn(getProject);
  const { data } = useSuspenseQuery({
    queryKey: ["project", id],
    queryFn: () => fetchProject({ data: { id } }),
  });
  const qc = useQueryClient();

  const { project, client, pricing_runs, documents, tasks, links } = data;
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "resources">("overview");

  const completedTasks = tasks.filter((t: any) => t.status === 'done').length;
  const totalTasks = tasks.length;
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

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
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium">Project Progress</p>
          <p className="text-xs text-muted-foreground">{progress}%</p>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 mb-2 [scrollbar-width:none]">
        {(["overview", "tasks", "resources"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "h-9 px-4 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              activeTab === tab
                ? "bg-foreground text-background"
                : "bg-muted/50 text-muted-foreground hover:bg-muted",
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {client && (
            <div className="card-soft p-4 mb-5 flex items-center gap-3">
              <ClientAvatar name={client.name} size={44} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{client.name}</p>
                  <TierBadge tier={client.tier} />
                </div>
                {client.company && (
                  <p className="text-xs text-muted-foreground truncate">{client.company}</p>
                )}
              </div>
            </div>
          )}

          <section className="card-soft p-5 mb-5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Budget
            </p>
            <p className="font-display text-3xl mt-1">
              {formatCurrency(project.budget ?? 0, project.currency)}
            </p>
            {project.deadline && (
              <p className="text-xs text-muted-foreground mt-1">
                Deadline {new Date(project.deadline).toLocaleDateString()}
              </p>
            )}
            {project.scope && (
              <>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-4 mb-1">
                  Scope
                </p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/85">
                  {project.scope}
                </p>
              </>
            )}
            {project.deliverables && (
              <>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-3 mb-1">
                  Deliverables
                </p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/85">
                  {project.deliverables}
                </p>
              </>
            )}
          </section>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <Link
              to="/pricing"
              className="card-soft p-4 flex flex-col gap-2 active:scale-[0.98] transition"
            >
              <div className="size-9 rounded-full bg-primary/10 grid place-items-center text-primary">
                <Calculator className="size-[18px]" />
              </div>
              <p className="font-medium text-sm">Price this</p>
            </Link>
            <Link
              to="/documents"
              className="card-soft p-4 flex flex-col gap-2 active:scale-[0.98] transition"
            >
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
              {pricing_runs.map((r: any) => (
                <div key={r.id} className="card-soft p-4 flex items-center gap-3">
                  <div
                    className={cn(
                      "size-10 rounded-xl grid place-items-center",
                      r.confidence === "high"
                        ? "bg-success/15 text-success"
                        : "bg-warning/20 text-warning-foreground",
                    )}
                  >
                    <Sparkles className="size-[18px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {formatCurrency(r.recommended_total, r.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {timeAgo(r.created_at)} · {r.confidence} confidence
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(r.range_low, r.currency)}–
                    {formatCurrency(r.range_high, r.currency)}
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
              {documents.map((d: any) => (
                <Link
                  key={d.id}
                  to="/documents/$id"
                  params={{ id: d.id }}
                  className="card-soft p-3.5 flex items-center gap-3"
                >
                  <div className="size-10 rounded-xl bg-muted grid place-items-center text-muted-foreground">
                    <FileText className="size-[18px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">
                      {d.type} {d.number ? `· ${d.number}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {d.title ?? "Untitled"} · {timeAgo(d.updated_at)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">
                    {formatCurrency(Number(d.total ?? 0), d.currency)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "tasks" && (
        <TasksTab projectId={id} tasks={tasks} qc={qc} />
      )}

      {activeTab === "resources" && (
        <ResourcesTab projectId={id} links={links} qc={qc} />
      )}
    </AppShell>
  );
}

function TasksTab({ projectId, tasks, qc }: { projectId: string, tasks: any[], qc: any }) {
  const submitTask = useServerFn(addTask);
  const updateTask = useServerFn(updateTaskStatus);
  const delTask = useServerFn(deleteTask);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const mutAdd = useMutation({
    mutationFn: (title: string) => submitTask({ data: { project_id: projectId, title } }),
    onSuccess: () => {
      setNewTaskTitle("");
      setShowAdd(false);
      qc.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const mutUpdate = useMutation({
    mutationFn: ({ id, status }: { id: string, status: "todo" | "in_progress" | "review" | "done" }) =>
      updateTask({ data: { id, status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", projectId] }),
    onError: (e) => toast.error(e.message),
  });

  const columns: { id: "todo" | "in_progress" | "done", label: string }[] = [
    { id: "todo", label: "To Do" },
    { id: "in_progress", label: "In Progress" },
    { id: "done", label: "Done" }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="font-semibold flex items-center gap-2"><Columns className="size-4" /> Kanban Board</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="text-primary p-1 hover:bg-muted rounded-full">
          <Plus className="size-5" />
        </button>
      </div>

      {showAdd && (
        <form
          className="card-soft p-3 mb-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (newTaskTitle.trim()) mutAdd.mutate(newTaskTitle);
          }}
        >
          <input
            autoFocus
            className="flex-1 bg-transparent border-none outline-none text-sm px-2"
            placeholder="Task description..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />
          <button type="submit" disabled={mutAdd.isPending} className="text-primary text-sm font-medium px-2 disabled:opacity-50">
            Add
          </button>
        </form>
      )}

      <div className="space-y-6">
        {columns.map(col => {
          const colTasks = tasks.filter((t: any) => t.status === col.id);
          return (
            <div key={col.id} className="bg-muted/30 p-3 rounded-2xl border border-border/50">
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className={cn(
                  "size-2 rounded-full",
                  col.id === 'todo' ? "bg-muted-foreground" : col.id === 'in_progress' ? "bg-warning" : "bg-success"
                )} />
                <h3 className="font-medium text-sm">{col.label}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{colTasks.length}</span>
              </div>
              <div className="space-y-2">
                {colTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4 opacity-70 border border-dashed border-border rounded-xl">Empty</p>
                ) : (
                  colTasks.map((t: any) => (
                    <div key={t.id} className="bg-surface p-3 rounded-xl border border-border shadow-sm flex items-start gap-3 group">
                      <button
                        onClick={() => mutUpdate.mutate({ id: t.id, status: t.status === 'done' ? 'todo' : 'done' })}
                        className="mt-0.5 text-muted-foreground hover:text-success transition-colors"
                      >
                        {t.status === 'done' ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium", t.status === 'done' && "line-through opacity-60")}>
                          {t.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          {t.priority !== 'medium' && (
                            <span className={cn(
                              "text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded",
                              t.priority === 'high' ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                            )}>
                              {t.priority}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="size-3" /> {timeAgo(t.created_at)}
                          </span>
                        </div>
                      </div>
                      {col.id === 'todo' && (
                        <button onClick={() => mutUpdate.mutate({ id: t.id, status: 'in_progress' })} className="opacity-0 group-hover:opacity-100 text-xs text-primary transition-opacity font-medium">
                          Start
                        </button>
                      )}
                      {col.id === 'done' && (
                        <button onClick={() => delTask({ data: { id: t.id } }).then(() => qc.invalidateQueries({ queryKey: ["project", projectId] }))} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResourcesTab({ projectId, links, qc }: { projectId: string, links: any[], qc: any }) {
  const submitLink = useServerFn(addProjectLink);
  const delLink = useServerFn(deleteProjectLink);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  const mutAdd = useMutation({
    mutationFn: () => submitLink({ data: { project_id: projectId, title, url, type: determineLinkType(url) as any } }),
    onSuccess: () => {
      setTitle("");
      setUrl("");
      setShowAdd(false);
      qc.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const mutDel = useMutation({
    mutationFn: (id: string) => delLink({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", projectId] }),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="font-semibold">External Resources</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="text-primary p-1 hover:bg-muted rounded-full">
          <Plus className="size-5" />
        </button>
      </div>

      {showAdd && (
        <form
          className="card-soft p-3 mb-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim() && url.trim()) mutAdd.mutate();
          }}
        >
          <input
            className="w-full h-9 bg-muted border-none rounded-lg px-3 text-sm outline-none"
            placeholder="Link Title (e.g. Figma Design)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            type="url"
            className="w-full h-9 bg-muted border-none rounded-lg px-3 text-sm outline-none"
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setShowAdd(false)} className="text-sm px-3 py-1 text-muted-foreground">Cancel</button>
            <button type="submit" disabled={mutAdd.isPending} className="text-sm px-3 py-1 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50">
              Save Link
            </button>
          </div>
        </form>
      )}

      {links.length === 0 ? (
        <EmptyHint text="No resources added. Link your Figma files or GitHub repos here." />
      ) : (
        <div className="space-y-2">
          {links.map((link: any) => (
            <div key={link.id} className="card-soft p-3 flex items-center gap-3 group">
              <div className="size-10 rounded-xl bg-muted grid place-items-center text-muted-foreground">
                {getIconForType(link.type)}
              </div>
              <div className="flex-1 min-w-0">
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline flex items-center gap-1.5">
                  {link.title} <ExternalLink className="size-3 opacity-50" />
                </a>
                <p className="text-xs text-muted-foreground truncate">{link.url}</p>
              </div>
              <button 
                onClick={() => mutDel.mutate(link.id)}
                className="p-2 opacity-0 md:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
