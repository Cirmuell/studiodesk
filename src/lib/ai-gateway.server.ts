import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function getAiProvider(supabaseClient?: SupabaseClient<Database>) {
  let lovableKey = undefined;
  let geminiKey = undefined;
  let openaiKey = undefined;
  let preferredModel = undefined;

  console.info("[AI GATEWAY] Resolving provider credentials...");

  // 1. Try to load custom keys from the database settings first (highest priority)
  try {
    const { data: settings } = await supabaseAdmin
      .from("admin_settings")
      .select("preferred_model")
      .eq("id", "default")
      .maybeSingle();

    if (settings) {
      preferredModel = settings.preferred_model || undefined;
    }

    const { data: secretsRaw } = await supabaseAdmin
      .from("secrets" as any)
      .select("name, value");

    const secrets = (secretsRaw ?? []) as { name: string; value: string }[];

    if (secrets) {
      lovableKey = secrets.find((s) => s.name === "lovable_api_key")?.value || undefined;
      geminiKey = secrets.find((s) => s.name === "gemini_api_key")?.value || undefined;
      openaiKey = secrets.find((s) => s.name === "openai_api_key")?.value || undefined;
      console.info("[AI GATEWAY] Successfully fetched credentials and preferred model from secrets table.");
    }
  } catch (err) {
    console.warn("[AI GATEWAY] Failed to fetch admin settings or secrets from database:", err);
  }

  // 2. Fall back to environment variables if no database keys are configured
  if (!lovableKey && !geminiKey && !openaiKey) {
    console.info("[AI GATEWAY] No database credentials configured. Falling back to environment variables.");
  }

  lovableKey = lovableKey || process.env.LOVABLE_API_KEY || undefined;
  geminiKey = geminiKey || process.env.GEMINI_API_KEY || undefined;
  openaiKey = openaiKey || process.env.OPENAI_API_KEY || undefined;

  if (lovableKey) {
    console.info("[AI GATEWAY] Selected provider: lovable");
    const provider = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: {
        "Lovable-API-Key": lovableKey,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
    });
    return {
      provider,
      model: preferredModel || "google/gemini-3-flash-preview",
    };
  }

  if (geminiKey) {
    console.info("[AI GATEWAY] Selected provider: gemini (native)");
    const provider = createGoogleGenerativeAI({
      apiKey: geminiKey,
    });
    return {
      provider,
      model: preferredModel || "gemini-2.5-flash",
    };
  }

  if (openaiKey) {
    console.info("[AI GATEWAY] Selected provider: openai");
    const provider = createOpenAICompatible({
      name: "openai",
      baseURL: "https://api.openai.com/v1",
      apiKey: openaiKey,
    });
    return {
      provider,
      model: preferredModel || "gpt-4o-mini",
    };
  }

  console.error("[AI GATEWAY] No credentials found in database or environment variables.");
  throw new Error(
    "AI gateway is not configured. Please set GEMINI_API_KEY, OPENAI_API_KEY, or LOVABLE_API_KEY in your environment variables, or configure them in the Admin Dashboard."
  );
}

