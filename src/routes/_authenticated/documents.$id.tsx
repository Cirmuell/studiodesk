import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getDocument, updateDocument, type DocContent } from "@/lib/documents.functions";
import { formatCurrency } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Download, Save, Sparkles, Share2 } from "lucide-react";
import { toast } from "sonner";
import { SharePanel } from "@/components/SharePanel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/documents/$id")({
  head: () => ({ meta: [{ title: "Document — Studio" }] }),
  component: () => (
    <Suspense fallback={<AppShell title="Document">{null}</AppShell>}>
      <DocPage />
    </Suspense>
  ),
});

function DocPage() {
  const { id } = Route.useParams();
  const fetchDoc = useServerFn(getDocument);
  const update = useServerFn(updateDocument);
  const qc = useQueryClient();
  const { data: doc } = useSuspenseQuery({ queryKey: ["document", id], queryFn: () => fetchDoc({ data: { id } }) });

  const initialContent = (doc.content as DocContent) ?? { title: "", intro: "", sections: [], line_items: [], terms: "", payment_instructions: "" };
  const [content, setContent] = useState<DocContent>(initialContent);
  const [title, setTitle] = useState(doc.title ?? "");
  const [downloading, setDownloading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedOnce, setSavedOnce] = useState(doc.status !== "draft");

  useEffect(() => {
    setContent((doc.content as DocContent) ?? initialContent);
    setTitle(doc.title ?? "");
    setDirty(false);
    setSavedOnce(doc.status !== "draft");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  const subtotal = (content.line_items ?? []).reduce((s, li) => s + Number(li.amount || 0), 0);
  const tax = Math.round(subtotal * 0.075);
  const total = subtotal + tax;
  const step: 1 | 2 | 3 = savedOnce && !dirty ? 3 : 2;
  const updateContent = (next: DocContent | ((c: DocContent) => DocContent)) => {
    setDirty(true);
    setContent((c) => (typeof next === "function" ? (next as (c: DocContent) => DocContent)(c) : next));
  };
  const updateTitle = (v: string) => { setDirty(true); setTitle(v); };

  const saveMut = useMutation({
    mutationFn: (markReady: boolean) =>
      update({
        data: {
          id,
          patch: {
            title,
            content: content as unknown,
            subtotal,
            tax,
            total,
            ...(markReady ? { status: "ready" as const } : {}),
          },
        },
      }),
    onSuccess: () => {
      toast.success("Saved");
      setDirty(false);
      setSavedOnce(true);
      qc.invalidateQueries({ queryKey: ["document", id] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  async function handleDownload() {
    setDownloading(true);
    try {
      // Persist edits first
      await saveMut.mutateAsync(true);
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`/api/documents/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`PDF failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.type}-${doc.number ?? id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF failed");
    } finally {
      setDownloading(false);
    }
  }

  function updateLine(i: number, patch: Partial<{ label: string; quantity: number; unit_rate: number; amount: number; unit: string }>) {
    updateContent((c) => {
      const items = [...(c.line_items ?? [])];
      const cur = { ...items[i], ...patch };
      cur.amount = Number(cur.quantity) * Number(cur.unit_rate);
      items[i] = cur;
      return { ...c, line_items: items };
    });
  }

  function addLine() {
    updateContent((c) => ({
      ...c,
      line_items: [...(c.line_items ?? []), { label: "New item", quantity: 1, unit: "each", unit_rate: 0, amount: 0 }],
    }));
  }

  function removeLine(i: number) {
    updateContent((c) => ({ ...c, line_items: (c.line_items ?? []).filter((_, idx) => idx !== i) }));
  }

  return (
    <AppShell
      title={doc.type.toUpperCase()}
      subtitle={doc.number ?? "draft"}
      action={
        <button onClick={handleDownload} disabled={downloading || dirty || !savedOnce} className="size-10 grid place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40" aria-label="Download PDF" title={dirty || !savedOnce ? "Save first" : "Download PDF"}>
          <Download className="size-[18px]" />
        </button>
      }
    >
      <Link to="/documents" className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-4">
        <ArrowLeft className="size-3.5" /> All documents
      </Link>

      <StepIndicator step={step} dirty={dirty} />

      <SharePanel documentId={id} />


      <div className="card-soft p-4 mb-4">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Title</label>
        <input value={title} onChange={(e) => updateTitle(e.target.value)} className="w-full bg-transparent text-lg font-display mt-1 focus:outline-none" />
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-3 block">Intro</label>
        <textarea
          value={content.intro ?? ""}
          onChange={(e) => updateContent({ ...content, intro: e.target.value })}
          rows={3}
          className="w-full bg-muted/50 mt-1 p-2 rounded-lg text-sm border border-border"
        />
      </div>

      {(content.sections ?? []).map((s, i) => (
        <div key={i} className="card-soft p-4 mb-3 space-y-2">
          <input
            value={s.heading}
            onChange={(e) => {
              const sections = [...(content.sections ?? [])];
              sections[i] = { ...sections[i], heading: e.target.value };
              updateContent({ ...content, sections });
            }}
            className="w-full text-sm font-semibold bg-transparent focus:outline-none"
          />
          <textarea
            value={s.body}
            onChange={(e) => {
              const sections = [...(content.sections ?? [])];
              sections[i] = { ...sections[i], body: e.target.value };
              updateContent({ ...content, sections });
            }}
            rows={3}
            className="w-full bg-muted/50 p-2 rounded-lg text-sm border border-border"
          />
        </div>
      ))}

      <div className="card-soft p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Line items</p>
          <button onClick={addLine} className="text-xs text-primary font-medium">+ Add</button>
        </div>
        <div className="space-y-3">
          {(content.line_items ?? []).map((li, i) => (
            <div key={i} className="space-y-1.5">
              <input
                value={li.label}
                onChange={(e) => updateLine(i, { label: e.target.value })}
                className="w-full h-9 px-2 rounded-lg bg-muted border border-border text-sm"
                placeholder="Description"
              />
              <div className="grid grid-cols-3 gap-2">
                <input type="number" value={li.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} className="h-9 px-2 rounded-lg bg-muted border border-border text-sm" placeholder="Qty" />
                <input type="number" value={li.unit_rate} onChange={(e) => updateLine(i, { unit_rate: Number(e.target.value) })} className="h-9 px-2 rounded-lg bg-muted border border-border text-sm" placeholder="Rate" />
                <div className="h-9 px-2 rounded-lg bg-background border border-border text-sm flex items-center justify-end font-medium">
                  {formatCurrency(li.amount, doc.currency)}
                </div>
              </div>
              <button onClick={() => removeLine(i)} className="text-[11px] text-destructive">Remove</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card-soft p-4 mb-4 space-y-1.5 text-sm">
        <Row label="Subtotal" value={formatCurrency(subtotal, doc.currency)} />
        <Row label="VAT (7.5%)" value={formatCurrency(tax, doc.currency)} />
        <div className="h-px bg-border my-1" />
        <Row label="Total" value={formatCurrency(total, doc.currency)} bold />
      </div>

      <div className="card-soft p-4 mb-4">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Terms</label>
        <textarea value={content.terms ?? ""} onChange={(e) => updateContent({ ...content, terms: e.target.value })} rows={3} className="w-full bg-muted/50 mt-1 p-2 rounded-lg text-sm border border-border" />
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-3 block">Payment instructions</label>
        <textarea value={content.payment_instructions ?? ""} onChange={(e) => updateContent({ ...content, payment_instructions: e.target.value })} rows={2} className="w-full bg-muted/50 mt-1 p-2 rounded-lg text-sm border border-border" />
      </div>

      <div className="card-soft p-3 mb-3 flex items-center gap-2 text-xs">
        <span className={cn("size-2 rounded-full", dirty ? "bg-warning" : savedOnce ? "bg-success" : "bg-muted-foreground")} />
        <span className="text-muted-foreground">
          {dirty ? "Unsaved changes — save before exporting." : savedOnce ? "Saved. Ready to export." : "New draft — save when you're happy with edits."}
        </span>
      </div>

      <div className="space-y-2.5">
        <button
          onClick={() => saveMut.mutate(false)}
          disabled={saveMut.isPending || (!dirty && savedOnce)}
          className="w-full h-12 rounded-full border border-border text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save className="size-4" /> {saveMut.isPending ? "Saving…" : dirty || !savedOnce ? "Step 1 · Save edits" : "Saved"}
        </button>
        <button
          onClick={handleDownload}
          disabled={downloading || saveMut.isPending || dirty || !savedOnce}
          className="w-full h-12 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 shadow-[var(--shadow-pop)]"
        >
          <Download className="size-4" /> {downloading ? "Preparing PDF…" : "Step 2 · Download PDF"}
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground text-center mt-4 flex items-center justify-center gap-1.5">
        <Sparkles className="size-3" /> Drafted by AI · Always review before sending
      </p>
    </AppShell>
  );
}

function StepIndicator({ step, dirty }: { step: 1 | 2 | 3; dirty: boolean }) {
  const steps = [
    { n: 1, label: "Draft" },
    { n: 2, label: dirty ? "Editing" : "Edit" },
    { n: 3, label: "Export" },
  ];
  return (
    <div className="flex items-center gap-2 mb-4">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2 flex-1">
          <div className={cn(
            "size-6 rounded-full grid place-items-center text-[10px] font-semibold shrink-0",
            step >= s.n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}>{s.n}</div>
          <span className={cn("text-[11px] font-medium", step >= s.n ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
          {i < steps.length - 1 && <div className={cn("flex-1 h-px", step > s.n ? "bg-primary" : "bg-border")} />}
        </div>
      ))}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={bold ? "font-display" : "text-muted-foreground"}>{label}</span>
      <span className={bold ? "font-display text-primary" : "font-medium"}>{value}</span>
    </div>
  );
}
