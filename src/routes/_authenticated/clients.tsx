import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ClientAvatar, TierBadge } from "@/components/ClientBadge";
import { listClients, createClient } from "@/lib/clients.functions";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({ meta: [{ title: "Clients — Studio" }] }),
  component: () => (
    <Suspense fallback={<AppShell title="Clients">{null}</AppShell>}>
      <ClientsPage />
    </Suspense>
  ),
});

function ClientsPage() {
  const fetchClients = useServerFn(listClients);
  const addClient = useServerFn(createClient);
  const qc = useQueryClient();
  const { data: clients } = useSuspenseQuery({ queryKey: ["clients"], queryFn: () => fetchClients() });
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const mut = useMutation({
    mutationFn: (input: { name: string; company?: string; email?: string; tier: "standard" | "preferred" | "enterprise" }) =>
      addClient({ data: input }),
    onSuccess: () => {
      toast.success("Client added");
      qc.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const filtered = clients.filter((c) =>
    !q ? true : `${c.name} ${c.company ?? ""} ${c.email ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell
      title="Clients"
      subtitle={`${clients.length} relationships`}
      action={
        <button onClick={() => setOpen(true)} className="size-10 grid place-items-center rounded-full bg-primary text-primary-foreground" aria-label="Add client">
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

      {open && <NewClientForm onCancel={() => setOpen(false)} onSubmit={(v) => mut.mutate(v)} loading={mut.isPending} />}

      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-2xl px-4 py-6 text-center">
          {clients.length === 0 ? "No clients yet — tap + to add your first." : "No matches."}
        </p>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((c) => (
            <div key={c.id} className="card-soft p-4 flex items-center gap-3">
              <ClientAvatar name={c.name} size={44} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{c.name}</p>
                  <TierBadge tier={c.tier} />
                </div>
                {c.company && <p className="text-xs text-muted-foreground truncate">{c.company}</p>}
                {c.email && <p className="text-xs text-muted-foreground/70 truncate">{c.email}</p>}
              </div>
            </div>
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
  onSubmit: (v: { name: string; company?: string; email?: string; tier: "standard" | "preferred" | "enterprise" }) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<"standard" | "preferred" | "enterprise">("standard");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({ name, company: company || undefined, email: email || undefined, tier });
      }}
      className="card-soft p-4 mb-4 space-y-3"
    >
      <input className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm" placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
      <input className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <select className="w-full h-11 px-3 rounded-xl bg-muted border border-border text-sm" value={tier} onChange={(e) => setTier(e.target.value as "standard" | "preferred" | "enterprise")}>
        <option value="standard">Standard</option>
        <option value="preferred">Preferred</option>
        <option value="enterprise">Enterprise</option>
      </select>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 h-11 rounded-full border border-border text-sm">Cancel</button>
        <button disabled={loading} type="submit" className="flex-1 h-11 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
          {loading ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
