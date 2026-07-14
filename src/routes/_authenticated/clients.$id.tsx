import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DetailPageSkeleton } from "@/components/PageSkeleton";
import { ClientAvatar, TierBadge } from "@/components/ClientBadge";
import { getClient, updateClient, addClientActivity } from "@/lib/clients.functions";
import { Building2, Globe, MapPin, Briefcase, FileText, Activity, MessageSquare, PhoneCall, Mail, ChevronLeft, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/clients/$id")({
  head: () => ({ meta: [{ title: "Client Profile — Studio" }] }),
  component: () => (
    <Suspense fallback={<DetailPageSkeleton title="Client" />}>
      <ClientProfilePage />
    </Suspense>
  ),
});

function ClientProfilePage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const fetchClient = useServerFn(getClient);
  const addActivityFn = useServerFn(addClientActivity);
  const qc = useQueryClient();

  const { data: client } = useSuspenseQuery({
    queryKey: ["client", id],
    queryFn: () => fetchClient({ data: { id } }),
  });

  const [activeTab, setActiveTab] = useState<"overview" | "activity">("overview");

  const mutActivity = useMutation({
    mutationFn: (input: { type: "note" | "email" | "call" | "meeting"; content: string }) =>
      addActivityFn({ data: { client_id: id, ...input } }),
    onSuccess: () => {
      toast.success("Activity logged");
      qc.invalidateQueries({ queryKey: ["client", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to log activity"),
  });

  if (!client) return <AppShell title="Not Found">Client not found.</AppShell>;

  const totalBilled = client.projects?.reduce((acc: number, p: any) => acc + (Number(p.budget) || 0), 0) || 0;
  const activeProjects = client.projects?.filter((p: any) => p.status === "active").length || 0;

  return (
    <AppShell
      title=""
      action={
        <button onClick={() => window.history.back()} className="size-10 grid place-items-center rounded-full bg-surface border border-border">
          <ChevronLeft className="size-5" />
        </button>
      }
    >
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center mt-4 mb-8">
        <div className="text-2xl shadow-xl border-4 border-background mb-4 rounded-full">
          <ClientAvatar name={client.name} size={80} />
        </div>
        <h1 className="font-display text-2xl mb-1">{client.name}</h1>
        <div className="flex items-center justify-center gap-2 mb-3">
          <TierBadge tier={client.tier} />
          {client.status && (
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider",
              client.status === "active" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
            )}>
              {client.status}
            </span>
          )}
        </div>
        
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
          {client.company && <span className="flex items-center gap-1"><Building2 className="size-3.5" /> {client.company}</span>}
          {client.industry && <span className="flex items-center gap-1"><Briefcase className="size-3.5" /> {client.industry}</span>}
          {client.website && <a href={client.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline"><Globe className="size-3.5" /> Website</a>}
          {client.address && <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {client.address}</span>}
        </div>
      </div>

      {/* Financials / Stats */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="card-soft p-4 flex flex-col items-center justify-center text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1">Active Projects</p>
          <p className="font-display text-2xl text-foreground">{activeProjects}</p>
        </div>
        <div className="card-soft p-4 flex flex-col items-center justify-center text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1">Total Value</p>
          <p className="font-display text-2xl text-foreground">${totalBilled.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/60 mb-6">
        <button
          onClick={() => setActiveTab("overview")}
          className={cn("flex-1 pb-3 text-sm font-medium transition-colors border-b-2", activeTab === "overview" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={cn("flex-1 pb-3 text-sm font-medium transition-colors border-b-2", activeTab === "activity" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
        >
          Activity Log
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Contact Info</h3>
            <div className="card-soft p-4 space-y-3">
              {client.email ? (
                <div className="flex items-center gap-3"><Mail className="size-4 text-muted-foreground" /><a href={`mailto:${client.email}`} className="text-sm hover:text-primary transition">{client.email}</a></div>
              ) : <p className="text-sm text-muted-foreground">No email</p>}
              {client.phone && (
                <div className="flex items-center gap-3"><PhoneCall className="size-4 text-muted-foreground" /><a href={`tel:${client.phone}`} className="text-sm hover:text-primary transition">{client.phone}</a></div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Projects</h3>
            {client.projects && client.projects.length > 0 ? (
              <div className="space-y-2">
                {client.projects.map((p: any) => (
                  <div key={p.id} className="card-soft p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{p.status}</p>
                    </div>
                    {p.budget && <span className="text-sm font-medium">${Number(p.budget).toLocaleString()}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="card-soft p-6 text-center text-sm text-muted-foreground">No projects yet</div>
            )}
          </div>
        </div>
      )}

      {activeTab === "activity" && (
        <div className="space-y-6">
          <ActivityComposer onSubmit={(v) => mutActivity.mutate(v)} loading={mutActivity.isPending} />
          
          <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-[19px] before:w-px before:bg-border/60">
            {client.client_activities?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((act: any) => (
              <div key={act.id} className="relative pl-12">
                <div className="absolute left-0 top-1 size-10 rounded-full bg-background border border-border grid place-items-center z-10 text-muted-foreground">
                  {act.type === 'note' && <FileText className="size-4" />}
                  {act.type === 'email' && <Mail className="size-4" />}
                  {act.type === 'call' && <PhoneCall className="size-4" />}
                  {act.type === 'meeting' && <Calendar className="size-4" />}
                </div>
                <div className="card-soft p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium uppercase tracking-wider capitalize">{act.type}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(act.created_at), "MMM d, h:mm a")}</span>
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">{act.content}</p>
                </div>
              </div>
            ))}
            {(!client.client_activities || client.client_activities.length === 0) && (
              <p className="pl-12 text-sm text-muted-foreground">No activity logged yet.</p>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function ActivityComposer({ onSubmit, loading }: { onSubmit: (v: any) => void; loading: boolean }) {
  const [type, setType] = useState<"note"|"email"|"call"|"meeting">("note");
  const [content, setContent] = useState("");

  return (
    <div className="card-soft p-4 space-y-3">
      <div className="flex gap-2">
        {(["note", "email", "call", "meeting"] as const).map(t => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={cn("px-3 py-1.5 rounded-full text-xs font-medium capitalize transition", type === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}
          >
            {t}
          </button>
        ))}
      </div>
      <textarea
        placeholder={`Log a ${type}...`}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full min-h-[100px] p-3 rounded-xl bg-muted/50 border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      <div className="flex justify-end">
        <button
          disabled={!content.trim() || loading}
          onClick={() => {
            onSubmit({ type, content });
            setContent("");
          }}
          className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Log"}
        </button>
      </div>
    </div>
  );
}
