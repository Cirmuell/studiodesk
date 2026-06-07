import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ClientAvatar, TierBadge } from "@/components/ClientBadge";
import { clients } from "@/lib/mock-data";
import { Plus, Search } from "lucide-react";

export const Route = createFileRoute("/clients")({
  head: () => ({ meta: [{ title: "Clients — Studio" }] }),
  component: ClientsPage,
});

function ClientsPage() {
  return (
    <AppShell
      title="Clients"
      subtitle={`${clients.length} relationships`}
      action={
        <button className="size-10 grid place-items-center rounded-full bg-primary text-primary-foreground" aria-label="Add client">
          <Plus className="size-[18px]" />
        </button>
      }
    >
      <div className="relative mb-4">
        <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Search clients"
          className="w-full h-11 pl-10 pr-3 rounded-full bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="space-y-2.5">
        {clients.map((c) => (
          <div key={c.id} className="card-soft p-4 flex items-center gap-3">
            <ClientAvatar client={c} size={44} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{c.name}</p>
                <TierBadge tier={c.tier} />
              </div>
              <p className="text-xs text-muted-foreground truncate">{c.company}</p>
              <p className="text-xs text-muted-foreground/70 truncate">{c.email}</p>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
