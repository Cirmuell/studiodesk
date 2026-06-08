import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateObject } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAiProvider } from "./ai-gateway.server";

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
    const { provider, model } = getAiProvider();

    // Pull business context
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("business_name, services, value_prop, day_rate_min, day_rate_max, currency, country")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: rateCards } = await context.supabase
      .from("rate_cards")
      .select("name, unit, rate, currency")
      .limit(20);

    const currency = profile?.currency || "NGN";
    const country = profile?.country || "NG";



    const systemPrompt = `You are a pricing analyst for independent creatives in Nigeria.
Quote in ${currency}. Reflect Nigerian market rates (Lagos/Abuja creative industry benchmarks).
Use the studio's own day rate band when available. Be realistic — not aspirational. Round to clean numbers.
Confidence is "high" when scope is concrete with similar past line items; "low" when scope is vague.`;

    const userPrompt = `STUDIO CONTEXT
- Business: ${profile?.business_name ?? "Independent creative"}
- Services: ${profile?.services ?? "Not specified"}
- Value proposition: ${profile?.value_prop ?? "Not specified"}
- Day rate band: ${profile?.day_rate_min ?? "?"} – ${profile?.day_rate_max ?? "?"} ${currency}/day
- Market: ${country}

RATE CARD
${(rateCards ?? []).map((r) => `- ${r.name}: ${r.rate} ${r.currency}/${r.unit}`).join("\n") || "- (none provided)"}

PROJECT
- Scope: ${data.scope}
- Estimated hours: ${data.hours ?? "unspecified"}
- Client tier: ${data.client_tier}

Produce a pricing recommendation with line items, a range, confidence, and a short rationale (<= 3 sentences). Amounts are in ${currency}.`;

    let result;
    try {
      result = await generateObject({
        model: provider(model),
        schema: PricingSchema,
        system: systemPrompt,
        prompt: userPrompt,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429")) throw new Error("AI rate limit reached — please wait a moment and retry.");
      if (msg.includes("402")) throw new Error("AI credits exhausted — top up to keep generating analyses.");
      throw new Error(`AI pricing failed: ${msg}`);
    }

    const out = result.object;

    const { data: row, error } = await context.supabase
      .from("pricing_runs")
      .insert({
        user_id: context.userId,
        project_id: data.project_id ?? null,
        scope: data.scope,
        hours: data.hours ?? null,
        recommended_total: out.recommended_total,
        range_low: out.range_low,
        range_high: out.range_high,
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
