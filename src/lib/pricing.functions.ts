import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
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

type Pricing = z.infer<typeof PricingSchema>;

const SCHEMA_HINT = `{
  "recommended_total": number,
  "range_low": number,
  "range_high": number,
  "confidence": "low" | "medium" | "high",
  "rationale": string,
  "line_items": [
    { "label": string, "quantity": number, "unit": string, "unit_rate": number, "amount": number }
  ]
}`;

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) return candidate.trim();
  return candidate.slice(start, end + 1);
}

function clampPricing(p: Pricing): Pricing {
  const total = Math.max(0, p.recommended_total);
  let low = Math.max(0, p.range_low);
  let high = Math.max(0, p.range_high);
  if (low > high) [low, high] = [high, low];
  const clampedLow = Math.min(low, total);
  const clampedHigh = Math.max(high, total);
  return { ...p, recommended_total: total, range_low: clampedLow, range_high: clampedHigh };
}

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
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("business_name, services, value_prop, day_rate_min, day_rate_max, currency, country")
      .eq("id", context.userId)
      .maybeSingle();

    const { provider, model } = await getAiProvider();

    const { data: rateCards } = await context.supabase
      .from("rate_cards")
      .select("name, unit, rate, currency")
      .limit(20);

    const currency = profile?.currency || "NGN";
    const country = profile?.country || "NG";

    const systemPrompt = `You are a pricing analyst for independent creatives in Nigeria.
Quote in ${currency}. Reflect Nigerian market rates (Lagos/Abuja creative industry benchmarks).
Use the studio's own day rate band when available. Be realistic — not aspirational. Round to clean numbers.
Confidence is "high" when scope is concrete with similar past line items; "low" when scope is vague.
Respond with ONLY a single JSON object — no prose, no markdown fences — matching this exact shape:
${SCHEMA_HINT}`;

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

Produce a pricing recommendation with line items, a range, confidence, and a short rationale (<= 3 sentences). Amounts are in ${currency}. Return ONLY the JSON object.`;

    async function callModel(priorText?: string): Promise<string> {
      const res = await generateText({
        model: provider(model),
        system: systemPrompt,
        prompt: priorText
          ? `${userPrompt}\n\nYour previous response was not valid JSON matching the schema:\n${priorText}\n\nReturn ONLY a corrected JSON object.`
          : userPrompt,
      });
      return res.text;
    }

    function tryParse(text: string) {
      try {
        return PricingSchema.safeParse(JSON.parse(extractJson(text)));
      } catch (e) {
        return { success: false as const, error: e as Error };
      }
    }

    let parsed: Pricing;
    try {
      let text = await callModel();
      let result = tryParse(text);
      if (!result.success) {
        text = await callModel(text);
        result = tryParse(text);
        if (!result.success) {
          console.error("Pricing schema parse failed. Raw:", text.slice(0, 500));
          throw new Error("AI returned an unparseable pricing response. Please retry.");
        }
      }
      parsed = result.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Pricing AI error:", msg);
      if (msg.includes("429")) throw new Error("AI rate limit reached — please wait a moment and retry.");
      if (msg.includes("402")) throw new Error("AI credits exhausted — top up to keep generating analyses.");
      if (msg.startsWith("AI returned")) throw err;
      throw new Error(`AI pricing failed: ${msg}`);
    }

    const out = clampPricing(parsed);

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
