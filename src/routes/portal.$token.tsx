import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { getSharedDocument, signSharedDocument } from "@/lib/shares.functions";
import { SignaturePad } from "@/components/SignaturePad";
import { formatCurrency, getDocumentFilename } from "@/lib/format";
import { DownloadConfirmModal } from "@/components/DownloadConfirmModal";
import { executeInAppDownload } from "@/lib/download";
import { Download, Sparkles } from "lucide-react";
import { toast } from "sonner";

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
  const qc = useQueryClient();
  const fetchShared = useServerFn(getSharedDocument);
  const signDoc = useServerFn(signSharedDocument);
  const [signatureData, setSignatureData] = useState("");
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { data } = useSuspenseQuery({
    queryKey: ["shared", token],
    queryFn: () => fetchShared({ data: { token } }),
  });

  const signMut = useMutation({
    mutationFn: (sig: string) => signDoc({ data: { token, signature: sig } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shared", token] });
      toast.success("Document legally signed!");
    },
    onError: (e) => toast.error(e.message),
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
  const filename = getDocumentFilename(doc);

  async function handlePortalDownload() {
    setDownloading(true);
    try {
      const fullUrl = `${window.location.origin}/api/public/portal/${token}/pdf`;
      await executeInAppDownload(fullUrl, filename);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  }

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

  const requiresSignature = doc.type === "contract" || doc.type === "proposal";
  const isSigned = !!doc.client_signature_data;

  return (
    <div className="min-h-dvh bg-background">
      <DownloadConfirmModal
        open={showDownloadConfirm}
        onOpenChange={setShowDownloadConfirm}
        filename={filename}
        onConfirm={handlePortalDownload}
        isDownloading={downloading}
      />
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
          <button
            type="button"
            onClick={() => handlePortalDownload()}
            disabled={downloading}
            className="shrink-0 h-11 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-[var(--shadow-pop)] disabled:opacity-50"
          >
            <Download className="size-4" /> {downloading ? "Downloading..." : "PDF"}
          </button>
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

        {requiresSignature && !isSigned && (
          <div className="card-soft p-5 mb-4 border-primary/20">
            <h3 className="font-display text-lg mb-1">E-Signature Required</h3>
            <p className="text-sm text-muted-foreground mb-4">Please draw your signature below to formally accept this document.</p>
            <SignaturePad onSign={setSignatureData} disabled={signMut.isPending} />
            <button
              onClick={() => signMut.mutate(signatureData)}
              disabled={!signatureData || signMut.isPending}
              className="mt-4 w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 transition"
            >
              {signMut.isPending ? "Signing..." : "Sign and Accept"}
            </button>
          </div>
        )}

        {requiresSignature && isSigned && (
          <div className="card-soft p-5 mb-4 bg-success/5 border border-success/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3">
               <span className="text-[10px] uppercase tracking-wider font-semibold bg-success/20 text-success px-2 py-1 rounded-full">Legally Signed</span>
            </div>
            <h3 className="font-display text-lg mb-1 text-success">Signed & Accepted</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Signed on {doc.client_signed_at ? new Date(doc.client_signed_at).toLocaleString() : "Unknown"}
            </p>
            <div className="bg-white rounded-lg p-2 inline-block border border-border">
              <img src={doc.client_signature_data} alt="Client signature" className="h-20 object-contain" />
            </div>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground text-center mt-6 flex items-center justify-center gap-1.5">
          Shared securely via Studio
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
