import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateObject } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAiProvider } from "./ai-gateway.server";

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
});

export type DocContent = z.infer<typeof DocContentSchema>;

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
    z.object({
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
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("documents")
      .update(data.patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const draftDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      type: z.enum(["proposal", "invoice", "contract", "receipt"]),
      project_id: z.string().uuid().optional().nullable(),
      client_id: z.string().uuid().optional().nullable(),
      notes: z.string().max(2000).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const [{ data: profile }, projectRes, clientRes] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      data.project_id
        ? context.supabase.from("projects").select("*").eq("id", data.project_id).maybeSingle()
        : Promise.resolve({ data: null }),
      data.client_id
        ? context.supabase.from("clients").select("*").eq("id", data.client_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const project = projectRes.data;
    const client = clientRes.data;
    const currency = profile?.currency || "NGN";

    const { provider, model } = await getAiProvider(context.supabase);

    const sys = `You draft ${data.type}s for independent creatives in Nigeria. Use clear, friendly business English. Amounts in ${currency}. Include realistic line items derived from the project scope.`;
    const prompt = `STUDIO: ${profile?.business_name ?? "Independent studio"} (${profile?.owner_name ?? ""})
CLIENT: ${client?.name ?? "Unknown"} ${client?.company ? "— " + client.company : ""}
PROJECT: ${project?.title ?? "Untitled"}
SCOPE: ${project?.scope ?? "Not specified"}
BUDGET: ${project?.budget ?? "open"} ${currency}
NOTES: ${data.notes ?? "(none)"}

Generate a complete ${data.type} draft.`;

    let result;
    try {
      result = await generateObject({
        model: provider(model),
        schema: DocContentSchema,
        system: sys,
        prompt,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429")) throw new Error("AI rate limit reached — please wait and retry.");
      if (msg.includes("402")) throw new Error("AI credits exhausted — top up to keep drafting.");
      throw new Error(`AI draft failed: ${msg}`);
    }
    const content = result.object;
    const subtotal = content.line_items.reduce((s, li) => s + Number(li.amount || 0), 0);
    const tax = Math.round(subtotal * 0.075); // 7.5% Nigerian VAT
    const total = subtotal + tax;

    const prefix = { proposal: "PRO", invoice: "INV", contract: "CON", receipt: "REC" }[data.type];
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
    return row;
  });
