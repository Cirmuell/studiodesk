import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ClientAvatar, TierBadge } from "@/components/ClientBadge";
import { listClients, createClient } from "@/lib/clients.functions";
import { Plus, Search, ChevronRight, Globe, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Link, Outlet, useChildMatches } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({ meta: [{ title: "Clients — Studio" }] }),
  component: () => (
    <Suspense fallback={<AppShell title="Clients">{null}</AppShell>}>
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
  const qc = useQueryClient();
  const { data: clients } = useSuspenseQuery({
    queryKey: ["clients"],
    queryFn: () => fetchClients(),
  });
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const mut = useMutation({
    mutationFn: (input: {
      name: string;
      company?: string;
      email?: string;
      tier: "standard" | "preferred" | "enterprise";
    }) => addClient({ data: input }),
    onSuccess: () => {
      toast.success("Client added");
      qc.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const filtered = clients.filter((c) =>
    !q
      ? true
      : `${c.name} ${c.company ?? ""} ${c.email ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell
      title="Clients"
      subtitle={`${clients.length} relationships`}
      action={
        <button
          onClick={() => setOpen(true)}
          className="size-10 grid place-items-center rounded-full bg-primary text-primary-foreground"
          aria-label="Add client"
        >
          <Plus className="size-[18px]" />
        </button>
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
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-2xl px-4 py-6 text-center">
          {clients.length === 0 ? "No clients yet — tap + to add your first." : "No matches."}
        </p>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((c) => (
            <Link key={c.id} to="/clients/$id" params={{ id: c.id }} className="card-soft p-4 flex items-center gap-3 hover:ring-2 hover:ring-primary/20 transition-all">
              <ClientAvatar name={c.name} size={44} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{c.name}</p>
                  <TierBadge tier={c.tier} />
                  {c.status && c.status !== 'active' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase font-bold tracking-wider">
                      {c.status}
                    </span>
                  )}
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
              <ChevronRight className="size-4 text-muted-foreground/40" />
            </Link>
          ))}
        </div>
      )}
    </AppShell>
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
  const [industry, setIndustry] = useState("");
  const [tier, setTier] = useState<"standard" | "preferred" | "enterprise">("standard");
  const [status, setStatus] = useState<"lead" | "active" | "past" | "archived">("lead");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({ name, company: company || undefined, email: email || undefined, industry: industry || undefined, tier, status });
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
