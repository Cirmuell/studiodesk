import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { getSharedDocument } from "@/lib/shares.functions";
import { formatCurrency } from "@/lib/format";
import { Download, Sparkles } from "lucide-react";

export const Route = createFileRoute("/portal/$token")({
  head: () => ({
    meta: [
      { title: "Document — Studio" },
      { name: "description", content: "Securely view and download your document." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <Suspense fallback={<Skeleton />}>
      <PortalPage />
    </Suspense>
  ),
});

function Skeleton() {
  return (
    <div className="min-h-dvh grid place-items-center text-muted-foreground text-sm">Loading…</div>
  );
}

function PortalPage() {
  const { token } = Route.useParams();
  const fetchShared = useServerFn(getSharedDocument);
  const { data } = useSuspenseQuery({
    queryKey: ["shared", token],
    queryFn: () => fetchShared({ data: { token } }),
  });

  if (data.status !== "ok") {
    const map = {
      revoked: { title: "Link revoked", body: "This share link has been disabled by the sender." },
      expired: { title: "Link expired", body: "This share link is no longer valid." },
      not_found: { title: "Not found", body: "This link is invalid or has been removed." },
    } as const;
    const m = map[data.status as keyof typeof map];
    return (
      <div className="min-h-dvh grid place-items-center bg-background px-6">
        <div className="text-center max-w-sm">
          <h1 className="font-display text-2xl mb-2">{m.title}</h1>
          <p className="text-sm text-muted-foreground">{m.body}</p>
        </div>
      </div>
    );
  }

  const { document: doc, profile } = data;
  const content = (doc.content ?? {}) as {
    title?: string;
    intro?: string;
    sections?: { heading: string; body: string }[];
    line_items?: {
      label: string;
      quantity: number;
      unit: string;
      unit_rate: number;
      amount: number;
    }[];
    terms?: string;
    payment_instructions?: string;
  };

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-2xl px-5 py-8 sm:py-12">
        <header className="flex items-start justify-between gap-3 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">
              {profile?.business_name ?? "Studio"}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl mt-1 capitalize">
              {doc.type} {doc.number ? `#${doc.number}` : ""}
            </h1>
            {doc.title && <p className="text-sm text-muted-foreground mt-1">{doc.title}</p>}
          </div>
          <a
            href={`/api/public/portal/${token}/pdf`}
            className="shrink-0 h-11 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-[var(--shadow-pop)]"
          >
            <Download className="size-4" /> PDF
          </a>
        </header>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="card-soft p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              From
            </p>
            <p className="font-medium text-sm">{profile?.business_name}</p>
            {profile?.owner_name && (
              <p className="text-xs text-muted-foreground">{profile.owner_name}</p>
            )}
            {profile?.email && <p className="text-xs text-muted-foreground">{profile.email}</p>}
            {profile?.phone && <p className="text-xs text-muted-foreground">{profile.phone}</p>}
          </div>
          <div className="card-soft p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              To
            </p>
            <p className="font-medium text-sm">{doc.client?.name ?? "—"}</p>
            {doc.client?.company && (
              <p className="text-xs text-muted-foreground">{doc.client.company}</p>
            )}
            {doc.client?.email && (
              <p className="text-xs text-muted-foreground">{doc.client.email}</p>
            )}
          </div>
        </div>

        {content.intro && (
          <div className="card-soft p-5 mb-4">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{content.intro}</p>
          </div>
        )}

        {(content.sections ?? []).map((s, i) => (
          <div key={i} className="card-soft p-5 mb-4">
            <h2 className="font-display text-lg mb-2">{s.heading}</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/85">
              {s.body}
            </p>
          </div>
        ))}

        {(content.line_items ?? []).length > 0 && (
          <div className="card-soft p-5 mb-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
              Line items
            </p>
            <div className="space-y-2">
              {(content.line_items ?? []).map((li, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm border-b border-border/60 pb-2 last:border-0"
                >
                  <div className="min-w-0 pr-3">
                    <p className="truncate">{li.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {li.quantity} × {formatCurrency(li.unit_rate, doc.currency)} / {li.unit}
                    </p>
                  </div>
                  <p className="font-medium tabular-nums">
                    {formatCurrency(li.amount, doc.currency)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1 text-sm">
              <Row
                label="Subtotal"
                value={formatCurrency(Number(doc.subtotal ?? 0), doc.currency)}
              />
              <Row label="VAT" value={formatCurrency(Number(doc.tax ?? 0), doc.currency)} />
              <div className="h-px bg-border my-1.5" />
              <Row
                label="Total"
                value={formatCurrency(Number(doc.total ?? 0), doc.currency)}
                bold
              />
            </div>
          </div>
        )}

        {content.terms && (
          <div className="card-soft p-5 mb-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Terms
            </p>
            <p className="text-sm whitespace-pre-wrap text-foreground/85">{content.terms}</p>
          </div>
        )}

        {content.payment_instructions && (
          <div className="card-soft p-5 mb-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Payment
            </p>
            <p className="text-sm whitespace-pre-wrap text-foreground/85">
              {content.payment_instructions}
            </p>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground text-center mt-6 flex items-center justify-center gap-1.5">
          <Sparkles className="size-3" /> Shared securely via Studio
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={bold ? "font-display" : "text-muted-foreground"}>{label}</span>
      <span className={bold ? "font-display text-primary" : "font-medium tabular-nums"}>
        {value}
      </span>
    </div>
  );
}
