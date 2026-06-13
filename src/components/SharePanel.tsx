import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createShare, listSharesForDocument, revokeShare } from "@/lib/shares.functions";
import { Copy, Link2, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { timeAgo } from "@/lib/format";

export function SharePanel({ documentId }: { documentId: string }) {
  const [open, setOpen] = useState(false);
  const list = useServerFn(listSharesForDocument);
  const create = useServerFn(createShare);
  const revoke = useServerFn(revokeShare);
  const qc = useQueryClient();

  const { data: shares = [] } = useQuery({
    queryKey: ["shares", documentId],
    queryFn: () => list({ data: { document_id: documentId } }),
    enabled: open,
  });

  const createMut = useMutation({
    mutationFn: (days: number | null) =>
      create({ data: { document_id: documentId, expires_in_days: days ?? undefined } }),
    onSuccess: () => {
      toast.success("Share link created");
      qc.invalidateQueries({ queryKey: ["shares", documentId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => {
      toast.success("Share revoked");
      qc.invalidateQueries({ queryKey: ["shares", documentId] });
    },
  });

  function copyLink(token: string) {
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Link copied"))
      .catch(() => toast.error("Copy failed"));
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full card-soft p-3 mb-4 flex items-center gap-3 active:scale-[0.99] transition"
      >
        <span className="size-9 rounded-full bg-primary/10 text-primary grid place-items-center">
          <Share2 className="size-[16px]" />
        </span>
        <span className="flex-1 text-left">
          <span className="block text-sm font-medium">Share with client</span>
          <span className="block text-xs text-muted-foreground">Send a secure tokenized link</span>
        </span>
      </button>
    );
  }

  return (
    <div className="card-soft p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Share2 className="size-4 text-primary" /> Client portal
        </p>
        <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground">
          Close
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <button
          onClick={() => createMut.mutate(7)}
          disabled={createMut.isPending}
          className="h-10 rounded-full bg-primary text-primary-foreground text-xs font-medium disabled:opacity-60"
        >
          7 days
        </button>
        <button
          onClick={() => createMut.mutate(30)}
          disabled={createMut.isPending}
          className="h-10 rounded-full bg-foreground text-background text-xs font-medium disabled:opacity-60"
        >
          30 days
        </button>
        <button
          onClick={() => createMut.mutate(null)}
          disabled={createMut.isPending}
          className="h-10 rounded-full border border-border text-xs font-medium disabled:opacity-60"
        >
          No expiry
        </button>
      </div>

      {shares.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">No share links yet.</p>
      ) : (
        <div className="space-y-2">
          {shares.map((s) => {
            const dead = s.revoked_at || (s.expires_at && new Date(s.expires_at) < new Date());
            return (
              <div key={s.id} className="rounded-xl border border-border bg-muted/30 p-3 text-xs">
                <div className="flex items-center gap-2 mb-1.5">
                  <Link2 className="size-3.5 text-primary shrink-0" />
                  <span className="font-mono truncate flex-1">/portal/{s.token.slice(0, 12)}…</span>
                  {!dead && (
                    <button
                      onClick={() => copyLink(s.token)}
                      className="size-7 grid place-items-center rounded-full bg-background border border-border"
                      aria-label="Copy"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  )}
                  {!s.revoked_at && (
                    <button
                      onClick={() => revokeMut.mutate(s.id)}
                      className="size-7 grid place-items-center rounded-full bg-background border border-border text-destructive"
                      aria-label="Revoke"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {s.revoked_at
                    ? `Revoked ${timeAgo(s.revoked_at)}`
                    : s.expires_at
                      ? `Expires ${new Date(s.expires_at).toLocaleDateString()}`
                      : "No expiry"}
                  {" · "}
                  {s.view_count} view{s.view_count === 1 ? "" : "s"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
