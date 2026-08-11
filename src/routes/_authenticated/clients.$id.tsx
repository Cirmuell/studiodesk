import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DetailPageSkeleton } from "@/components/PageSkeleton";
import { ClientAvatar, TierBadge } from "@/components/ClientBadge";
import { getClient, updateClient, addClientActivity, deleteClient } from "@/lib/clients.functions";
import { getProfile } from "@/lib/profile.functions";
import { formatCurrency } from "@/lib/format";
import {
  Building2,
  Globe,
  MapPin,
  Briefcase,
  FileText,
  PhoneCall,
  Mail,
  ChevronLeft,
  Calendar,
  Trash2,
  ChevronRight,
  Pencil,
  X,
  Check,
} from "lucide-react";
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
  const fetchProfile = useServerFn(getProfile);
  const addActivityFn = useServerFn(addClientActivity);
  const delClientFn = useServerFn(deleteClient);
  const updateClientFn = useServerFn(updateClient);
  const qc = useQueryClient();

  const { data: client } = useSuspenseQuery({
    queryKey: ["client", id],
    queryFn: () => fetchClient({ data: { id } }),
  });
  const { data: profile } = useSuspenseQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });

  const currency = profile?.currency || "NGN";
  const [activeTab, setActiveTab] = useState<"overview" | "activity">("overview");
  const [editOpen, setEditOpen] = useState(false);

  // Edit form local state
  const [editName, setEditName] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editIndustry, setEditIndustry] = useState("");

  const openEdit = () => {
    setEditName(client.name ?? "");
    setEditCompany(client.company ?? "");
    setEditEmail(client.email ?? "");
    setEditPhone(client.phone ?? "");
    setEditIndustry(client.industry ?? "");
    setEditOpen(true);
  };

  const mutActivity = useMutation({
    mutationFn: (input: { type: "note" | "email" | "call" | "meeting"; content: string }) =>
      addActivityFn({ data: { client_id: id, ...input } }),
    onSuccess: () => {
      toast.success("Activity logged");
      qc.invalidateQueries({ queryKey: ["client", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to log activity"),
  });

  const mutDelete = useMutation({
    mutationFn: () => delClientFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Client deleted");
      qc.invalidateQueries({ queryKey: ["clients"] });
      router.navigate({ to: "/clients" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete client"),
  });

  const mutUpdateStatus = useMutation({
    mutationFn: (status: "lead" | "active" | "past" | "archived") =>
      updateClientFn({ data: { id, status } }),
    onSuccess: (_, status) => {
      toast.success(`Client status updated to ${status}`);
      qc.invalidateQueries({ queryKey: ["client", id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update client status"),
  });

  const mutEdit = useMutation({
    mutationFn: () =>
      updateClientFn({
        data: {
          id,
          name: editName.trim() || undefined,
          company: editCompany.trim() || null,
          email: editEmail.trim() || null,
          phone: editPhone.trim() || null,
          industry: editIndustry.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Client updated");
      qc.invalidateQueries({ queryKey: ["client", id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      setEditOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update client"),
  });

  if (!client) return <AppShell title="Not Found">Client not found.</AppShell>;

  const activeProjectsCount = (client.projects ?? []).filter((p: any) => p.status === "active").length;
  const totalProjectsCount = client.projects?.length || 0;

  const invoices = (client.documents ?? []).filter((d: any) => d.type === "invoice");
  const invoiceCount = invoices.length;
  const totalValue = invoices.reduce((acc: number, d: any) => acc + (Number(d.total) || 0), 0);

  return (
    <AppShell
      title=""
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={openEdit}
            className="size-10 grid place-items-center rounded-full bg-surface border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition"
            title="Edit client"
          >
            <Pencil className="size-4" />
          </button>
          <button
            onClick={() => window.history.back()}
            className="size-10 grid place-items-center rounded-full bg-surface border border-border"
            title="Back"
          >
            <ChevronLeft className="size-5" />
          </button>
        </div>
      }
    >
      {/* Edit Form */}
      {editOpen && (
        <div className="card-soft p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold">Edit Client</h3>
            <button onClick={() => setEditOpen(false)} className="size-8 grid place-items-center rounded-full hover:bg-muted transition text-muted-foreground">
              <X className="size-4" />
            </button>
          </div>

          <input
            className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm"
            placeholder="Name *"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <input
            className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm"
            placeholder="Company"
            value={editCompany}
            onChange={(e) => setEditCompany(e.target.value)}
          />
          <input
            className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm"
            placeholder="Email"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
          />
          <input
            className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm"
            placeholder="Phone number"
            type="tel"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
          />
          <input
            className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm"
            placeholder="Industry"
            value={editIndustry}
            onChange={(e) => setEditIndustry(e.target.value)}
          />

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="flex-1 h-11 rounded-full border border-border text-sm"
            >
              Cancel
            </button>
            <button
              disabled={mutEdit.isPending || !editName.trim()}
              onClick={() => mutEdit.mutate()}
              className="flex-1 h-11 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {mutEdit.isPending ? "Saving…" : <><Check className="size-4" /> Save</>}
            </button>
          </div>
        </div>
      )}

      {/* Client Stage Controller Bar */}
      <div className="card-soft p-3 mb-4 flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Client Stage</p>
        <div className="flex gap-1.5 flex-wrap">
          {(["lead", "active", "past", "archived"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => mutUpdateStatus.mutate(s)}
              disabled={mutUpdateStatus.isPending}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-bold capitalize transition-all border",
                client.status === s
                  ? s === "lead"
                    ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                    : s === "active"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : s === "past"
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-muted-foreground text-white border-muted-foreground shadow-sm"
                  : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Profile Header */}
      <div className="flex flex-col items-center text-center mt-2 mb-8">
        <div className="text-2xl shadow-xl border-4 border-background mb-4 rounded-full">
          <ClientAvatar name={client.name} size={80} />
        </div>
        <h1 className="font-display text-2xl mb-1">{client.name}</h1>
        <div className="flex items-center justify-center gap-2 mb-3">
          <TierBadge tier={client.tier} />
          <select
            value={client.status || "active"}
            onChange={(e) => mutUpdateStatus.mutate(e.target.value as any)}
            disabled={mutUpdateStatus.isPending}
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider cursor-pointer border-none focus:outline-none bg-transparent",
              client.status === "active"
                ? "bg-emerald-500/10 text-emerald-500"
                : client.status === "lead"
                ? "bg-amber-500/10 text-amber-500"
                : client.status === "past"
                ? "bg-blue-500/10 text-blue-500"
                : "bg-muted text-muted-foreground"
            )}
          >
            <option value="lead" className="bg-background text-foreground">LEAD</option>
            <option value="active" className="bg-background text-foreground">ACTIVE</option>
            <option value="past" className="bg-background text-foreground">PAST</option>
            <option value="archived" className="bg-background text-foreground">ARCHIVED</option>
          </select>
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
          <p className="font-display text-2xl text-foreground">{activeProjectsCount}</p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            {totalProjectsCount} total project{totalProjectsCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="card-soft p-4 flex flex-col items-center justify-center text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1">Total Value</p>
          <p className="font-display text-2xl text-foreground">{formatCurrency(totalValue, currency)}</p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            {invoiceCount} generated invoice{invoiceCount === 1 ? "" : "s"}
          </p>
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
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Projects</h3>
              <span className="text-xs text-muted-foreground">{client.projects?.length || 0} total</span>
            </div>
            {client.projects && client.projects.length > 0 ? (
              <div className="space-y-2">
                {client.projects.map((p: any) => (
                  <Link
                    key={p.id}
                    to="/projects/$id"
                    params={{ id: p.id }}
                    className="card-soft p-4 flex items-center justify-between hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer group"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-medium group-hover:text-primary transition truncate">{p.title}</p>
                      <span className={cn(
                        "inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider",
                        p.status === "active" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
                      )}>
                        {p.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {p.budget ? (
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(Number(p.budget), currency)}
                        </span>
                      ) : null}
                      <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-primary transition" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="card-soft p-6 text-center text-sm text-muted-foreground">No projects yet</div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Documents</h3>
              <span className="text-xs text-muted-foreground">{client.documents?.length || 0} total</span>
            </div>
            {client.documents && client.documents.length > 0 ? (
              <div className="space-y-2">
                {client.documents.map((d: any) => (
                  <Link
                    key={d.id}
                    to="/documents/$id"
                    params={{ id: d.id }}
                    className="card-soft p-4 flex items-center justify-between hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer group"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-medium group-hover:text-primary transition truncate">
                        {d.title || `${d.type.toUpperCase()} ${d.number ? `#${d.number}` : ""}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground capitalize">{d.type}</span>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider",
                          d.status === "paid" || d.status === "accepted" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
                        )}>
                          {d.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {d.total ? (
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(Number(d.total), currency)}
                        </span>
                      ) : null}
                      <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-primary transition" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="card-soft p-6 text-center text-sm text-muted-foreground">No documents yet</div>
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
