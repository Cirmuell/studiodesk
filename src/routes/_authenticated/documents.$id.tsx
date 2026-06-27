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
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
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
  const { data: doc } = useSuspenseQuery({
    queryKey: ["document", id],
    queryFn: () => fetchDoc({ data: { id } }),
  });

  const initialContent = (doc.content as DocContent) ?? {
    title: "",
    intro: "",
    sections: [],
    line_items: [],
    terms: "",
    payment_instructions: "",
  };
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

  const isReceipt = doc.type === "receipt";
  const projectTotal = content.project_total;
  const prevPaid = content.previous_payments || 0;
  const amtPaid = total;
  const balanceDue = projectTotal !== undefined ? Math.max(0, projectTotal - prevPaid - amtPaid) : undefined;

  const step: 1 | 2 | 3 = savedOnce && !dirty ? 3 : 2;
  const updateContent = (next: DocContent | ((c: DocContent) => DocContent)) => {
    setDirty(true);
    setContent((c) =>
      typeof next === "function" ? (next as (c: DocContent) => DocContent)(c) : next,
    );
  };
  const updateTitle = (v: string) => {
    setDirty(true);
    setTitle(v);
  };

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

      toast.info("Downloading PDF...");
      const fullUrl = `${window.location.origin}/api/documents/${id}/pdf?token=${token}`;
      
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: fullUrl });
      } else {
        window.open(fullUrl, "_blank");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF failed");
    } finally {
      setTimeout(() => setDownloading(false), 1000);
    }
  }

  function updateLine(
    i: number,
    patch: Partial<{
      label: string;
      quantity: number;
      unit_rate: number;
      amount: number;
      unit: string;
    }>,
  ) {
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
      line_items: [
        ...(c.line_items ?? []),
        { label: "New item", quantity: 1, unit: "each", unit_rate: 0, amount: 0 },
      ],
    }));
  }

  function removeLine(i: number) {
    updateContent((c) => ({
      ...c,
      line_items: (c.line_items ?? []).filter((_, idx) => idx !== i),
    }));
  }

  return (
    <AppShell
      title={doc.type.toUpperCase()}
      subtitle={doc.number ?? "draft"}
      action={
        <button
          onClick={handleDownload}
          disabled={downloading || dirty || !savedOnce}
          className="size-10 grid place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          aria-label="Download PDF"
          title={dirty || !savedOnce ? "Save first" : "Download PDF"}
        >
          <Download className="size-[18px]" />
        </button>
      }
    >
      <Link
        to="/documents"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-4"
      >
        <ArrowLeft className="size-3.5" /> All documents
      </Link>

      <StepIndicator step={step} dirty={dirty} />

      <SharePanel documentId={id} />

      <div className="card-soft p-4 mb-4">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Title
        </label>
        <input
          value={title}
          onChange={(e) => updateTitle(e.target.value)}
          className="w-full bg-transparent text-lg font-display mt-1 focus:outline-none"
        />
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-3 block">
          Intro
        </label>
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

      {/* --- Proposal Specific Editor Blocks --- */}
      {doc.type === "proposal" && (
        <>
          {/* Objectives */}
          <div className="card-soft p-4 mb-3 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Objectives</h3>
              <button onClick={() => {
                const arr = [...(content.proposal_objectives ?? []), ""];
                updateContent({ ...content, proposal_objectives: arr });
              }} className="text-xs text-primary font-medium">+ Add</button>
            </div>
            {(content.proposal_objectives ?? []).map((obj, i) => (
              <textarea
                key={i}
                value={obj}
                onChange={(e) => {
                  const arr = [...(content.proposal_objectives ?? [])];
                  arr[i] = e.target.value;
                  updateContent({ ...content, proposal_objectives: arr });
                }}
                rows={2}
                className="w-full bg-muted/50 p-2 rounded-lg text-sm border border-border"
              />
            ))}
          </div>

          {/* Scope Inclusions */}
          <div className="card-soft p-4 mb-3 space-y-2">
            <h3 className="text-sm font-semibold">Scope (Inclusions)</h3>
            {(content.proposal_scope_inclusions ?? []).map((item, i) => (
              <input
                key={i}
                value={item}
                onChange={(e) => {
                  const arr = [...(content.proposal_scope_inclusions ?? [])];
                  arr[i] = e.target.value;
                  updateContent({ ...content, proposal_scope_inclusions: arr });
                }}
                className="w-full bg-muted/50 p-2 rounded-lg text-sm border border-border"
              />
            ))}
          </div>

          {/* Scope Exclusions */}
          <div className="card-soft p-4 mb-3 space-y-2">
            <h3 className="text-sm font-semibold">Scope (Exclusions)</h3>
            {(content.proposal_scope_exclusions ?? []).map((item, i) => (
              <input
                key={i}
                value={item}
                onChange={(e) => {
                  const arr = [...(content.proposal_scope_exclusions ?? [])];
                  arr[i] = e.target.value;
                  updateContent({ ...content, proposal_scope_exclusions: arr });
                }}
                className="w-full bg-muted/50 p-2 rounded-lg text-sm border border-border"
              />
            ))}
          </div>

          {/* Key Deliverables */}
          <div className="card-soft p-4 mb-3 space-y-2">
            <h3 className="text-sm font-semibold">Key Deliverables</h3>
            {(content.proposal_deliverables ?? []).map((item, i) => (
              <input
                key={i}
                value={item}
                onChange={(e) => {
                  const arr = [...(content.proposal_deliverables ?? [])];
                  arr[i] = e.target.value;
                  updateContent({ ...content, proposal_deliverables: arr });
                }}
                className="w-full bg-muted/50 p-2 rounded-lg text-sm border border-border"
              />
            ))}
          </div>
          
          {/* Methodology */}
          <div className="card-soft p-4 mb-3 space-y-2">
            <h3 className="text-sm font-semibold">Methodology</h3>
            {(content.proposal_methodology ?? []).map((m, i) => (
              <div key={i} className="bg-muted/50 p-3 rounded-lg border border-border">
                <input
                  value={m.title}
                  onChange={(e) => {
                    const arr = [...(content.proposal_methodology ?? [])];
                    arr[i] = { ...m, title: e.target.value };
                    updateContent({ ...content, proposal_methodology: arr });
                  }}
                  className="w-full text-sm font-semibold bg-transparent focus:outline-none mb-1"
                />
                <textarea
                  value={m.description}
                  onChange={(e) => {
                    const arr = [...(content.proposal_methodology ?? [])];
                    arr[i] = { ...m, description: e.target.value };
                    updateContent({ ...content, proposal_methodology: arr });
                  }}
                  rows={2}
                  className="w-full bg-background p-2 rounded text-sm border border-border"
                />
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="card-soft p-4 mb-3 space-y-2">
            <h3 className="text-sm font-semibold">Timeline</h3>
            {(content.proposal_timeline ?? []).map((t, i) => (
              <div key={i} className="bg-muted/50 p-3 rounded-lg border border-border flex flex-wrap gap-2 text-sm">
                <input
                  value={t.phase}
                  onChange={(e) => {
                    const arr = [...(content.proposal_timeline ?? [])];
                    arr[i] = { ...t, phase: e.target.value };
                    updateContent({ ...content, proposal_timeline: arr });
                  }}
                  className="bg-background p-1 rounded border flex-1 min-w-[100px]" placeholder="Phase"
                />
                <input
                  value={t.start_date}
                  onChange={(e) => {
                    const arr = [...(content.proposal_timeline ?? [])];
                    arr[i] = { ...t, start_date: e.target.value };
                    updateContent({ ...content, proposal_timeline: arr });
                  }}
                  className="bg-background p-1 rounded border flex-1 min-w-[80px]" placeholder="Start Date"
                />
                <input
                  value={t.end_date}
                  onChange={(e) => {
                    const arr = [...(content.proposal_timeline ?? [])];
                    arr[i] = { ...t, end_date: e.target.value };
                    updateContent({ ...content, proposal_timeline: arr });
                  }}
                  className="bg-background p-1 rounded border flex-1 min-w-[80px]" placeholder="End Date"
                />
                <input
                  value={t.milestone}
                  onChange={(e) => {
                    const arr = [...(content.proposal_timeline ?? [])];
                    arr[i] = { ...t, milestone: e.target.value };
                    updateContent({ ...content, proposal_timeline: arr });
                  }}
                  className="bg-background p-1 rounded border w-full mt-1" placeholder="Milestone"
                />
              </div>
            ))}
          </div>

          {/* Risks */}
          <div className="card-soft p-4 mb-3 space-y-2">
            <h3 className="text-sm font-semibold">Risk Assessment</h3>
            {(content.proposal_risks ?? []).map((r, i) => (
              <div key={i} className="bg-muted/50 p-3 rounded-lg border border-border flex flex-wrap gap-2 text-sm">
                <input
                  value={r.risk}
                  onChange={(e) => {
                    const arr = [...(content.proposal_risks ?? [])];
                    arr[i] = { ...r, risk: e.target.value };
                    updateContent({ ...content, proposal_risks: arr });
                  }}
                  className="bg-background p-1 rounded border w-full" placeholder="Risk"
                />
                <input
                  value={r.likelihood}
                  onChange={(e) => {
                    const arr = [...(content.proposal_risks ?? [])];
                    arr[i] = { ...r, likelihood: e.target.value };
                    updateContent({ ...content, proposal_risks: arr });
                  }}
                  className="bg-background p-1 rounded border flex-1" placeholder="Likelihood"
                />
                <input
                  value={r.impact}
                  onChange={(e) => {
                    const arr = [...(content.proposal_risks ?? [])];
                    arr[i] = { ...r, impact: e.target.value };
                    updateContent({ ...content, proposal_risks: arr });
                  }}
                  className="bg-background p-1 rounded border flex-1" placeholder="Impact"
                />
                <input
                  value={r.mitigation}
                  onChange={(e) => {
                    const arr = [...(content.proposal_risks ?? [])];
                    arr[i] = { ...r, mitigation: e.target.value };
                    updateContent({ ...content, proposal_risks: arr });
                  }}
                  className="bg-background p-1 rounded border w-full mt-1" placeholder="Mitigation"
                />
              </div>
            ))}
          </div>
          {/* Stakeholders */}
          <div className="card-soft p-4 mb-3 space-y-2">
            <h3 className="text-sm font-semibold">Stakeholders</h3>
            {(content.proposal_stakeholders ?? []).map((s, i) => (
              <div key={i} className="bg-muted/50 p-2 rounded-lg border border-border flex flex-col sm:flex-row gap-2 text-sm min-w-0">
                <input
                  value={s.team}
                  onChange={(e) => {
                    const arr = [...(content.proposal_stakeholders ?? [])];
                    arr[i] = { ...s, team: e.target.value };
                    updateContent({ ...content, proposal_stakeholders: arr });
                  }}
                  className="bg-background p-1 rounded border flex-1" placeholder="Team/Name"
                />
                <input
                  value={s.role}
                  onChange={(e) => {
                    const arr = [...(content.proposal_stakeholders ?? [])];
                    arr[i] = { ...s, role: e.target.value };
                    updateContent({ ...content, proposal_stakeholders: arr });
                  }}
                  className="bg-background p-1 rounded border flex-1" placeholder="Role"
                />
              </div>
            ))}
          </div>

          {/* Outcomes */}
          <div className="card-soft p-4 mb-3 space-y-2">
            <h3 className="text-sm font-semibold">Expected Outcomes</h3>
            {(content.proposal_outcomes ?? []).map((item, i) => (
              <textarea
                key={i}
                value={item}
                onChange={(e) => {
                  const arr = [...(content.proposal_outcomes ?? [])];
                  arr[i] = e.target.value;
                  updateContent({ ...content, proposal_outcomes: arr });
                }}
                rows={2}
                className="w-full bg-muted/50 p-2 rounded-lg text-sm border border-border"
              />
            ))}
          </div>
        </>
      )}

      <div className="card-soft p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Line items
          </p>
          <button onClick={addLine} className="text-xs text-primary font-medium">
            + Add
          </button>
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
                <input
                  type="number"
                  value={li.quantity}
                  onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                  className="h-9 px-2 rounded-lg bg-muted border border-border text-sm"
                  placeholder="Qty"
                />
                <input
                  type="number"
                  value={li.unit_rate}
                  onChange={(e) => updateLine(i, { unit_rate: Number(e.target.value) })}
                  className="h-9 px-2 rounded-lg bg-muted border border-border text-sm"
                  placeholder="Rate"
                />
                <div className="h-9 px-2 rounded-lg bg-background border border-border text-sm flex items-center justify-end font-medium">
                  {formatCurrency(li.amount, doc.currency)}
                </div>
              </div>
              <button onClick={() => removeLine(i)} className="text-[11px] text-destructive">
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card-soft p-4 mb-4 space-y-1.5 text-sm">
        {isReceipt && projectTotal !== undefined ? (
          <>
            <Row label="Project Total" value={formatCurrency(projectTotal, doc.currency)} />
            <Row label="Previously Paid" value={formatCurrency(prevPaid, doc.currency)} />
            <Row label="Amount Paid Now" value={formatCurrency(amtPaid, doc.currency)} bold />
            <div className="h-px bg-border my-1" />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Balance Due</span>
              {balanceDue === 0 ? (
                <span className="text-[10px] uppercase tracking-wider font-bold bg-success/15 text-success px-2 py-0.5 rounded-full">
                  Final Payment
                </span>
              ) : (
                <span className="font-display text-primary">{formatCurrency(balanceDue ?? 0, doc.currency)}</span>
              )}
            </div>
          </>
        ) : (
          <>
            <Row label="Subtotal" value={formatCurrency(subtotal, doc.currency)} />
            <Row label="VAT (7.5%)" value={formatCurrency(tax, doc.currency)} />
            <div className="h-px bg-border my-1" />
            <Row label="Total" value={formatCurrency(total, doc.currency)} bold />
          </>
        )}
      </div>

      <div className="card-soft p-4 mb-4">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Terms
        </label>
        <textarea
          value={content.terms ?? ""}
          onChange={(e) => updateContent({ ...content, terms: e.target.value })}
          rows={3}
          className="w-full bg-muted/50 mt-1 p-2 rounded-lg text-sm border border-border"
        />
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-3 block">
          Payment instructions
        </label>
        <textarea
          value={content.payment_instructions ?? ""}
          onChange={(e) => updateContent({ ...content, payment_instructions: e.target.value })}
          rows={2}
          className="w-full bg-muted/50 mt-1 p-2 rounded-lg text-sm border border-border"
        />
      </div>

      {doc.client_signature_data && (
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

      <div className="card-soft p-3 mb-3 flex items-center gap-2 text-xs">
        <span
          className={cn(
            "size-2 rounded-full",
            dirty ? "bg-warning" : savedOnce ? "bg-success" : "bg-muted-foreground",
          )}
        />
        <span className="text-muted-foreground">
          {dirty
            ? "Unsaved changes — save before exporting."
            : savedOnce
              ? "Saved. Ready to export."
              : "New draft — save when you're happy with edits."}
        </span>
      </div>

      <div className="space-y-2.5">
        <button
          onClick={() => saveMut.mutate(false)}
          disabled={saveMut.isPending || (!dirty && savedOnce)}
          className="w-full h-12 rounded-full border border-border text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save className="size-4" />{" "}
          {saveMut.isPending ? "Saving…" : dirty || !savedOnce ? "Step 1 · Save edits" : "Saved"}
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
        Drafted by AI · Always review before sending
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
          <div
            className={cn(
              "size-6 rounded-full grid place-items-center text-[10px] font-semibold shrink-0",
              step >= s.n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {s.n}
          </div>
          <span
            className={cn(
              "text-[11px] font-medium",
              step >= s.n ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className={cn("flex-1 h-px", step > s.n ? "bg-primary" : "bg-border")} />
          )}
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
