import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { docs, formatCurrency, getClient, type DocType } from "@/lib/mock-data";
import { FileText, Plus, Receipt, ScrollText, FileCheck2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Documents — Studio" }] }),
  component: DocumentsPage,
});

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
  const [filter, setFilter] = useState<DocType | "all">("all");
  const filtered = filter === "all" ? docs : docs.filter((d) => d.type === filter);

  return (
    <AppShell
      title="Documents"
      subtitle={`${docs.length} this month`}
      action={
        <button className="size-10 grid place-items-center rounded-full bg-primary text-primary-foreground" aria-label="New document">
          <Plus className="size-[18px]" />
        </button>
      }
    >
      {/* Type chooser */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {(Object.keys(typeMeta) as DocType[]).map((t) => {
          const m = typeMeta[t];
          const Icon = m.icon;
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className="card-soft p-3 flex flex-col items-center gap-1.5 active:scale-[0.97] transition"
            >
              <span className={cn("size-9 rounded-full grid place-items-center", m.tone)}>
                <Icon className="size-[16px]" />
              </span>
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
              filter === f.key
                ? "bg-foreground text-background border-foreground"
                : "bg-surface text-muted-foreground border-border",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {filtered.map((d) => {
          const c = getClient(d.clientId)!;
          const m = typeMeta[d.type];
          const Icon = m.icon;
          return (
            <div key={d.id} className="card-soft p-4 flex items-center gap-3">
              <span className={cn("size-11 rounded-xl grid place-items-center shrink-0", m.tone)}>
                <Icon className="size-[18px]" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate capitalize">{d.type}</p>
                  <span className="text-[10px] text-muted-foreground">{d.number}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {c.company} · {d.updatedAt}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatCurrency(d.total)}</p>
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full",
                    d.status === "ready"
                      ? "bg-success/15 text-success"
                      : d.status === "draft"
                        ? "bg-muted text-muted-foreground"
                        : "bg-warning/20 text-warning-foreground",
                  )}
                >
                  {d.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
