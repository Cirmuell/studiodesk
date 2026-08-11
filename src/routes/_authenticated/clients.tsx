import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ListPageSkeleton } from "@/components/PageSkeleton";
import { ClientAvatar, TierBadge } from "@/components/ClientBadge";
import { listClients, createClient, deleteClient } from "@/lib/clients.functions";
import { Plus, Search, ChevronRight, Building2, Crown, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Link, Outlet, useChildMatches } from "@tanstack/react-router";
import { getProfile } from "@/lib/profile.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({ meta: [{ title: "Clients — Studio" }] }),
  component: () => (
    <Suspense fallback={<ListPageSkeleton title="Clients" />}>
      <ClientsLayout />
    </Suspense>
  ),
});

function ClientsLayout() {
  const childMatches = useChildMatches();
  if (childMatches.length > 0) {
    return <Outlet />;
  }
  return <ClientsPage />;
}

function ClientsPage() {
  const fetchClients = useServerFn(listClients);
  const addClient = useServerFn(createClient);
  const delClient = useServerFn(deleteClient);
  const fetchProfile = useServerFn(getProfile);
  const qc = useQueryClient();

  const { data: clients } = useSuspenseQuery({
    queryKey: ["clients"],
    queryFn: () => fetchClients(),
  });
  const { data: profile } = useSuspenseQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });

  const plan = (profile as any)?.plan || "trial";
  const limit = plan === "premium" ? Infinity : plan === "basic" ? 10 : 1;
  const canAddClient = clients.length < limit;

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const mut = useMutation({
    mutationFn: (input: {
      name: string;
      company?: string;
      email?: string;
      phone?: string;
      tier: "standard" | "preferred" | "enterprise";
      status: "lead" | "active" | "past" | "archived";
      industry?: string;
    }) => addClient({ data: input }),
    onSuccess: () => {
      toast.success("Client added");
      qc.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const mutDelete = useMutation({
    mutationFn: (id: string) => delClient({ data: { id } }),
    onSuccess: () => {
      toast.success("Client deleted");
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete client"),
  });

  const filtered = clients.filter((c) =>
    !q
      ? true
      : `${c.name} ${c.company ?? ""} ${c.email ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <>
    <AppShell
      title="Clients"
      //subtitle={`${clients.length} relationships`}
      action={
        canAddClient ? (
          <button
            onClick={() => setOpen(true)}
            className="size-10 grid place-items-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95 shadow-sm"
            aria-label="Add client"
          >
            <Plus className="size-[18px]" />
          </button>
        ) : (
          <Link
            to="/subscription"
            className="h-10 px-3.5 flex items-center gap-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors shadow-sm"
            aria-label="Upgrade to add more clients"
          >
            <Crown className="size-[16px]" />
            <span className="text-xs font-semibold">Upgrade</span>
          </Link>
        )
      }
    >
      <div className="relative mb-4">
        <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search clients"
          className="w-full h-11 pl-10 pr-3 rounded-full bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {open && (
        <NewClientForm
          onCancel={() => setOpen(false)}
          onSubmit={(v) => mut.mutate(v)}
          loading={mut.isPending}
        />
      )}

      {filtered.length === 0 ? (
        <div className="text-center bg-muted/50 rounded-2xl px-4 py-8">
          <p className="text-sm text-muted-foreground mb-2">
            {clients.length === 0 ? "No clients yet." : "No matches."}
          </p>
          {clients.length === 0 && canAddClient && (
            <button onClick={() => setOpen(true)} className="text-primary font-semibold text-xs">Tap + to add your first</button>
          )}
          {!canAddClient && (
            <p className="text-xs text-muted-foreground/70 flex items-center justify-center gap-1.5 mt-2">
              <Crown className="size-3 text-primary" /> Client limit reached for {plan} tier.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((c) => (
            <Link key={c.id} to="/clients/$id" params={{ id: c.id }} className="card-soft p-4 flex items-center gap-3 hover:ring-2 hover:ring-primary/20 transition-all">
              <ClientAvatar name={c.name} size={44} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm truncate">{c.name}</p>
                  <TierBadge tier={c.tier} />
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider",
                    c.status === "active"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : c.status === "lead"
                      ? "bg-amber-500/10 text-amber-500"
                      : c.status === "past"
                      ? "bg-blue-500/10 text-blue-500"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {c.status ?? "active"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                  {c.company ? (
                    <><Building2 className="size-3" /> {c.company}</>
                  ) : c.industry ? (
                    <><Building2 className="size-3" /> {c.industry}</>
                  ) : null}
                  {c.email && (
                    <span className="truncate opacity-70 flex-1 ml-1">• {c.email}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeleteTarget({ id: c.id, name: c.name });
                  }}
                  disabled={mutDelete.isPending}
                  className="size-8 grid place-items-center rounded-full text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition"
                  title="Delete client"
                >
                  <Trash2 className="size-4" />
                </button>
                <ChevronRight className="size-4 text-muted-foreground/40" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
          onClick={() => setDeleteTarget(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Sheet */}
          <div
            className="relative w-full max-w-sm bg-background rounded-3xl shadow-2xl p-6 space-y-5 animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="flex justify-center">
              <div className="size-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="size-6 text-destructive" />
              </div>
            </div>

            {/* Text */}
            <div className="text-center space-y-1.5">
              <h2 className="font-display text-lg font-semibold">Delete Client?</h2>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{deleteTarget.name}</span> and all
                associated data will be permanently removed. This cannot be undone.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                disabled={mutDelete.isPending}
                onClick={() => {
                  mutDelete.mutate(deleteTarget.id, {
                    onSettled: () => setDeleteTarget(null),
                  });
                }}
                className="w-full h-12 rounded-full bg-destructive text-destructive-foreground text-sm font-semibold disabled:opacity-60 transition active:scale-[0.98]"
              >
                {mutDelete.isPending ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="w-full h-12 rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted transition active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NewClientForm({
  onSubmit,
  onCancel,
  loading,
}: {
  onSubmit: (v: {
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    tier: "standard" | "preferred" | "enterprise";
    status: "lead" | "active" | "past" | "archived";
    industry?: string;
  }) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [industry, setIndustry] = useState("");
  const [tier, setTier] = useState<"standard" | "preferred" | "enterprise">("standard");
  const [status, setStatus] = useState<"lead" | "active" | "past" | "archived">("lead");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({ name, company: company || undefined, email: email || undefined, phone: phone || undefined, industry: industry || undefined, tier, status });
      }}
      className="card-soft p-4 mb-4 space-y-3"
    >
      <input
        className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm"
        placeholder="Company"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
      />
      <input
        className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm"
        placeholder="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm"
        placeholder="Phone number"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <input
        className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm"
        placeholder="Industry"
        value={industry}
        onChange={(e) => setIndustry(e.target.value)}
      />
      <div className="flex gap-2">
        <select
          className="flex-1 h-11 px-3 rounded-xl bg-muted border border-border text-sm"
          value={tier}
          onChange={(e) => setTier(e.target.value as "standard" | "preferred" | "enterprise")}
        >
          <option value="standard">Standard Tier</option>
          <option value="preferred">Preferred Tier</option>
          <option value="enterprise">Enterprise Tier</option>
        </select>
        <select
          className="flex-1 h-11 px-3 rounded-xl bg-muted border border-border text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as "lead" | "active" | "past" | "archived")}
        >
          <option value="lead">Lead</option>
          <option value="active">Active</option>
          <option value="past">Past</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-11 rounded-full border border-border text-sm"
        >
          Cancel
        </button>
        <button
          disabled={loading}
          type="submit"
          className="flex-1 h-11 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
