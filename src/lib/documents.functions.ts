import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, generateObject } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAiProvider } from "./ai-gateway.server";
import { enforceUsageLimits, incrementUsageLimit } from "./security.server";
import { invalidateDashboardStats } from "./dashboard.functions";
import { sendNotification } from "./notifications.functions";

async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const LineItemSchema = z.object({
  label: z.string(),
  quantity: z.number(),
  unit: z.string().default("each"),
  unit_rate: z.number(),
  amount: z.number(),
});

const DocContentSchema = z.object({
  title: z.string(),
  intro: z.string(),
  sections: z.array(z.object({ heading: z.string(), body: z.string() })),
  line_items: z.array(LineItemSchema),
  terms: z.string(),
  payment_instructions: z.string().optional().default(""),
  project_total: z.number().optional(),
  previous_payments: z.number().optional(),
  proposal_objectives: z.array(z.string()).optional(),
  proposal_scope_inclusions: z.array(z.string()).optional(),
  proposal_scope_exclusions: z.array(z.string()).optional(),
  proposal_deliverables: z.array(z.string()).optional(),
  proposal_methodology: z.array(z.object({ step: z.number(), title: z.string(), description: z.string() })).optional(),
  proposal_timeline: z.array(z.object({ phase: z.string(), start_date: z.string(), end_date: z.string(), milestone: z.string() })).optional(),
  proposal_risks: z.array(z.object({ risk: z.string(), likelihood: z.string(), impact: z.string(), mitigation: z.string() })).optional(),
  proposal_stakeholders: z.array(z.object({ team: z.string(), role: z.string() })).optional(),
  proposal_outcomes: z.array(z.string()).optional(),
});

export type DocContent = z.infer<typeof DocContentSchema>;

function extractJson(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```$/, "")
      .trim();
  }
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    t = t.slice(first, last + 1);
  }
  return t;
}

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("documents")
      .select("*, client:clients(id, name, company, tier), project:projects(id, title)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getDocument = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("documents")
      .select("*, client:clients(*), project:projects(*)")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        patch: z.object({
          title: z.string().optional(),
          content: z.unknown().optional(),
          status: z.enum(["draft", "ready", "sent", "paid", "failed"]).optional(),
          subtotal: z.number().optional(),
          tax: z.number().optional(),
          total: z.number().optional(),
          number: z.string().optional(),
          due_date: z.string().optional().nullable(),
        }),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    // Fetch document title before updating for notification body
    let docTitle: string | undefined;
    if (data.patch.status === "paid" || data.patch.status === "accepted") {
      const { data: existing } = await context.supabase
        .from("documents")
        .select("title, type, number")
        .eq("id", data.id)
        .maybeSingle();
      docTitle = existing?.title || `${existing?.type ?? "Document"} ${existing?.number ?? ""}`.trim();
    }

    const { error } = await context.supabase
      .from("documents")
      .update(data.patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await invalidateDashboardStats(context.userId);

    // Fire notifications for key status transitions
    if (data.patch.status === "paid" && docTitle) {
      sendNotification({
        user_id: context.userId,
        type: "document_paid",
        title: "Payment received 🎉",
        body: `${docTitle} has been marked as paid.`,
        link: `/documents/${data.id}`,
      }).catch(() => {});
    } else if (data.patch.status === "accepted" && docTitle) {
      sendNotification({
        user_id: context.userId,
        type: "document_accepted",
        title: "Document signed ✍️",
        body: `Your client just signed ${docTitle}.`,
        link: `/documents/${data.id}`,
      }).catch(() => {});
    }

    return { ok: true };
  });

export const draftDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        type: z.enum(["proposal", "invoice", "contract", "receipt", "quotation"]),
        project_id: z.string().uuid().optional().nullable(),
        client_id: z.string().uuid().optional().nullable(),
        notes: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    // 0. Deduplicate: if document of this type already exists for the project, return it
    if (data.project_id) {
      const { data: existingDoc } = await context.supabase
        .from("documents")
        .select("id")
        .eq("project_id", data.project_id)
        .eq("type", data.type)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingDoc) {
        return { ok: true, id: existingDoc.id };
      }
    }

    const [{ data: profile }, projectRes, clientRes, pricingRunRes] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      data.project_id
        ? context.supabase.from("projects").select("*").eq("id", data.project_id).maybeSingle()
        : Promise.resolve({ data: null }),
      data.client_id
        ? context.supabase.from("clients").select("*").eq("id", data.client_id).maybeSingle()
        : Promise.resolve({ data: null }),
      data.project_id
        ? context.supabase
            .from("pricing_runs")
            .select("*")
            .eq("project_id", data.project_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    // Enforce billing and safety gates
    await enforceUsageLimits(context.userId, profile?.email ?? undefined, context.supabase);
    const project = projectRes.data;
    const client = clientRes.data;
    const pricingRun = pricingRunRes.data;
    const currency = profile?.currency || "NGN";

    let previousPayments = 0;
    if (data.type === "receipt" && data.project_id) {
      const { data: pastReceipts } = await context.supabase
        .from("documents")
        .select("total")
        .eq("type", "receipt")
        .eq("project_id", data.project_id)
        .in("status", ["ready", "sent", "paid"]); // count confirmed receipts

      previousPayments = pastReceipts?.reduce((sum, r) => sum + Number(r.total || 0), 0) ?? 0;
    }
    const projectBudget = pricingRun ? Number(pricingRun.recommended_total) : Number(project?.budget ?? 0);
    const balanceRemaining = Math.max(0, projectBudget - previousPayments);

    const cachePayload = {
      type: data.type,
      notes: data.notes,
      profile: {
        business_name: profile?.business_name,
        owner_name: profile?.owner_name,
        bank_details: profile?.bank_details,
        currency,
      },
      project: {
        title: project?.title,
        scope: project?.scope,
        budget: projectBudget,
      },
      client: {
        name: client?.name,
        company: client?.company,
      },
      pricingRun: pricingRun ? {
        recommended_total: pricingRun.recommended_total,
        line_items: pricingRun.line_items,
      } : null,
      previousPayments,
    };

    const hashKey = await sha256(JSON.stringify(cachePayload));

    // 1. Check cache
    const { data: cached } = await (context.supabase as any)
      .from("document_draft_caches")
      .select("content")
      .eq("hash_key", hashKey)
      .eq("user_id", context.userId)
      .maybeSingle();

    let content: DocContent;

    if (cached?.content) {
      console.info("[AI DOCUMENT DRAFT] Using cached document draft.");
      content = cached.content as DocContent;
    } else {
      const { provider, model } = await getAiProvider(context.supabase);

      const sys = `You draft ${data.type}s for independent creatives. Use clear, friendly business English. Amounts in ${currency}.
${pricingRun ? "IMPORTANT: You MUST use the exact Recommended Total and the detailed line items (labels, rates, quantities, amounts) from the provided PRICING ANALYSIS. Do not invent fake prices or change the totals." : "Include realistic line items derived from the project scope."}
${profile?.bank_details ? "IMPORTANT: You MUST copy the provided STUDIO BANK DETAILS exactly into the 'payment_instructions' field. Do not invent fake bank accounts or details." : ""}`;

      const pricingContext = pricingRun
        ? `\nPRICING ANALYSIS (YOU MUST USE THIS FOR THE BUDGET AND LINE ITEMS):
- Recommended Total Budget: ${pricingRun.recommended_total} ${currency}
- Price Range: ${pricingRun.range_low} - ${pricingRun.range_high} ${currency}
- Line Items to Include: ${JSON.stringify(pricingRun.line_items)}`
        : "";

      const paymentContext = profile?.bank_details
        ? `\nSTUDIO BANK DETAILS / PAYMENT INSTRUCTIONS:
${profile.bank_details}`
        : "";

      const receiptContext = data.type === "receipt" && projectBudget > 0 
        ? `\nRECEIPT MATH:
- Project Total: ${projectBudget}
- Previously Paid: ${previousPayments}
- Remaining Balance (before this payment): ${balanceRemaining}
Calculate the payment amount based on the NOTES provided. If notes don't specify, assume they are paying the Remaining Balance. The line items MUST total to the amount paid in this receipt.`
        : "";

      const receiptContentDefaults = data.type === "receipt"
        ? `\n\nFor receipts, YOU MUST FOLLOW THESE RULES:
1. DO NOT include a "Project Details" section or "Payment Summary" section in the sections array. The breakdown and totals are already handled by the app's UI and PDF layout.
2. In the "terms" field, include these standard notes (use exact phrasing where possible):
- If the remaining balance after this payment is 0, say "This receipt confirms that payment has been received in full." Otherwise, say "This receipt confirms a partial payment towards the total balance."
- Please keep this document for your records.
- For inquiries, contact us at: ${profile?.email ?? "hello@studio.com"}

3. In the "payment_instructions" field, list the PAYMENT INFORMATION stacked on separate lines using \\n:
Payment Information:
Account Name: (provide name)
Bank Name: (provide bank)
Account Number: (provide number)
Payment Status: "PAID IN FULL" or "PARTIAL PAYMENT"`
        : "";

      const lengthInstructions = data.type === "proposal"
        ? `\nIMPORTANT: For PROPOSALS, generate the content using the specific proposal arrays (proposal_objectives, proposal_timeline, proposal_risks, etc.) instead of the generic sections array. This ensures it maps correctly to the highly structured PDF layout.
Adapt the length and detail of the proposal to the project's size and budget:
- For small projects or tight budgets, keep it concise.
- For large, high-budget projects, be extremely detailed.`
        : "";

      const prompt = `STUDIO: ${profile?.business_name ?? "Independent studio"} (${profile?.owner_name ?? ""})
CLIENT: ${client?.name ?? "Unknown"} ${client?.company ? "— " + client.company : ""}
PROJECT: ${project?.title ?? "Untitled"}
SCOPE: ${project?.scope ?? "Not specified"}
BUDGET: ${pricingRun ? pricingRun.recommended_total : (project?.budget ?? "open")} ${currency}
NOTES: ${data.notes ?? "(none)"}${pricingContext}${paymentContext}${receiptContext}${receiptContentDefaults}${lengthInstructions}

Generate a complete ${data.type} draft as raw JSON.`;

      async function callModel(extra = "") {
        try {
          const res = await generateObject({
            model: provider(model),
            system: sys,
            prompt: prompt + extra,
            schema: DocContentSchema,
          });
          return JSON.stringify(res.object);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("429")) throw new Error("AI rate limit reached — please wait and retry.");
          if (msg.includes("402")) throw new Error("AI credits exhausted — top up to keep drafting.");
          throw new Error(`AI draft failed: ${msg}`);
        }
      }

      let text = await callModel();
      let parsed = DocContentSchema.safeParse(
        (() => {
          try {
            return JSON.parse(extractJson(text));
          } catch {
            return null;
          }
        })(),
      );
      if (!parsed.success) {
        text = await callModel(
          `\n\nYour previous response was invalid. Return ONLY raw JSON matching the schema. Previous output:\n${text.slice(0, 500)}`,
        );
        try {
          parsed = DocContentSchema.safeParse(JSON.parse(extractJson(text)));
        } catch (e) {
          throw new Error(`AI draft failed to return valid JSON: ${(e as Error).message}`);
        }
        if (!parsed.success) {
          throw new Error(`AI draft response did not match schema: ${parsed.error.message}`);
        }
      }

      await incrementUsageLimit(context.userId);
      content = parsed.data;

      // 2. Save cache
      await (context.supabase as any).from("document_draft_caches").insert({
        hash_key: hashKey,
        user_id: context.userId,
        content,
      });
    }
    if (data.type === "receipt" && projectBudget > 0) {
      content.project_total = projectBudget;
      content.previous_payments = previousPayments;
    }
    const subtotal = content.line_items.reduce((s, li) => s + Number(li.amount || 0), 0);

    // Country-specific tax rate mapping (NG: 7.5%, GH/ZA: 15%, KE: 16%, GB: 20%, CA: 5%, others: 0%)
    const country = profile?.country?.toUpperCase() || "";
    const TAX_RATES: Record<string, number> = {
      NG: 0.075,
      GH: 0.15,
      ZA: 0.15,
      KE: 0.16,
      GB: 0.2,
      CA: 0.05,
    };
    const taxRate = TAX_RATES[country] ?? 0;
    const tax = Math.round(subtotal * taxRate);
    const total = subtotal + tax;

    const prefix = { proposal: "PRO", invoice: "INV", contract: "CON", receipt: "REC", quotation: "QUO" }[data.type as "proposal" | "invoice" | "contract" | "receipt" | "quotation"];
    const { count } = await context.supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("type", data.type);
    const number = `${prefix}-${String((count ?? 0) + 1).padStart(4, "0")}`;

    const { data: row, error } = await context.supabase
      .from("documents")
      .insert({
        user_id: context.userId,
        type: data.type,
        status: "draft",
        number,
        title: content.title,
        currency,
        subtotal,
        tax,
        total,
        content,
        project_id: data.project_id ?? null,
        client_id: data.client_id ?? null,
        issued_date: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await invalidateDashboardStats(context.userId);
    return row;
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await invalidateDashboardStats(context.userId);
    return { ok: true };
  });
