import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAiProvider } from "./ai-gateway.server";
import { enforceUsageLimits } from "./security.server";

const PricingSchema = z.object({
  recommended_total: z.number(),
  range_low: z.number(),
  range_high: z.number(),
  confidence: z.enum(["low", "medium", "high"]),
  rationale: z.string(),
  line_items: z.array(
    z.object({
      label: z.string(),
      quantity: z.number(),
      unit: z.string(),
      unit_rate: z.number(),
      amount: z.number(),
    }),
  ),
});

export const listPricingRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("pricing_runs")
      .select("*, project:projects(id, title)")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const runPricingAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      project_id: z.string().uuid().optional().nullable(),
      scope: z.string().min(10).max(4000),
      hours: z.number().min(1).max(2000).optional(),
      client_tier: z.enum(["standard", "preferred", "enterprise"]).default("standard"),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    // Pull business context
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("business_name, services, value_prop, currency, country, email")
      .eq("id", context.userId)
      .maybeSingle();

    // Enforce billing limits and security gates
    await enforceUsageLimits(context.userId, profile?.email ?? undefined, context.supabase);

    const { provider, model } = await getAiProvider(context.supabase);
    console.info(`[AI PRICING] Pricing requested. Resolved provider model: ${model}`);

    const currency = profile?.currency || "NGN";
    const country = profile?.country || "NG";

    const systemPrompt = `You are an expert creative pricing consultant and analyst for independent professionals and creative studios.
Your goal is to help creatives price their work fairly, accurately, and profitably, preventing them from undercharging.
Reflect current professional industry standards, market value, project complexity, and the client's corporate tier.
Do NOT base the estimation on low-tier or cheap rates. Use healthy, sustainable industry benchmarks for creative work in the specified country/locality.
Quote all amounts in ${currency}. Round to clean, professional numbers.`;

    const userPrompt = `STUDIO CONTEXT
- Business: ${profile?.business_name ?? "Independent creative"}
- Services: ${profile?.services ?? "Not specified"}
- Value proposition: ${profile?.value_prop ?? "Not specified"}
- Locality/Country: ${country} (use this country's current professional creative industry standard benchmarks for pricing)

PROJECT
- Scope: ${data.scope}
- Estimated hours: ${data.hours ?? "unspecified"}
- Client tier: ${data.client_tier} (standard, preferred, or enterprise)

Analyze the project scope and client tier. Recommend a fair, professional, and sustainable market-rate price in ${currency} that avoids undercharging.
Produce a pricing recommendation with line items (realistic deliverables and task estimations), a recommended total, low-to-high pricing range, confidence, and a clear, short rationale explaining the pricing logic based on standard market value (<= 3 sentences).`;

    const schemaShapeDescription = `{
  "recommended_total": number,
  "range_low": number,
  "range_high": number,
  "confidence": "low" | "medium" | "high",
  "rationale": string,
  "line_items": Array<{
    "label": string,
    "quantity": number,
    "unit": string,
    "unit_rate": number,
    "amount": number
  }>
}`;

    const systemPromptWithFormat = `${systemPrompt}\n\nIMPORTANT: You must return ONLY a valid JSON object matching this schema. Do not output any markdown code blocks, backticks, or extra text. Output only raw, parseable JSON.\nSchema:\n${schemaShapeDescription}`;

    let resultText = "";
    try {
      const res = await generateText({
        model: provider(model),
        system: systemPromptWithFormat,
        prompt: userPrompt,
      });
      resultText = res.text.trim();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429")) throw new Error("AI rate limit reached — please wait a moment and retry.");
      if (msg.includes("402")) throw new Error("AI credits exhausted — top up to keep generating analyses.");
      throw new Error(`AI pricing failed to fetch response: ${msg}`);
    }

    // Clean markdown code blocks if the model ignored the instructions and wrapped it anyway
    if (resultText.startsWith("```")) {
      resultText = resultText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    let out;
    try {
      const parsed = JSON.parse(resultText);
      const validation = PricingSchema.safeParse(parsed);
      if (!validation.success) {
        throw new Error(validation.error.message);
      }
      out = validation.data;
    } catch (parseError: any) {
      console.warn("Initial JSON parse failed. Retrying with error details.", parseError);
      try {
        const res = await generateText({
          model: provider(model),
          system: systemPromptWithFormat,
          prompt: `${userPrompt}\n\nYour previous response failed validation with error: ${parseError.message}.\nYour previous response was:\n${resultText}\n\nPlease output the corrected raw JSON matching the schema precisely.`,
        });
        let retryText = res.text.trim();
        if (retryText.startsWith("```")) {
          retryText = retryText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        }
        const parsed = JSON.parse(retryText);
        out = PricingSchema.parse(parsed);
      } catch (retryError: any) {
        throw new Error(`AI pricing failed to output valid JSON schema: ${retryError.message}`);
      }
    }

    // Validate and clamp pricing parameters to ensure math is logically sound
    let rec = Math.max(0, out.recommended_total);
    let low = Math.max(0, out.range_low);
    let high = Math.max(0, out.range_high);

    if (low > high) {
      const temp = low;
      low = high;
      high = temp;
    }
    if (rec < low) rec = low;
    if (rec > high) rec = high;

    const { data: row, error } = await context.supabase
      .from("pricing_runs")
      .insert({
        user_id: context.userId,
        project_id: data.project_id ?? null,
        scope: data.scope,
        hours: data.hours ?? null,
        recommended_total: rec,
        range_low: low,
        range_high: high,
        currency,
        confidence: out.confidence,
        rationale: out.rationale,
        line_items: out.line_items,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deletePricingRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("pricing_runs")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
