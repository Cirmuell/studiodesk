import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function getAiProvider() {
  let lovableKey = undefined;
  let geminiKey = undefined;
  let openaiKey = undefined;

  // 1. Try to load custom keys from the database settings first (highest priority)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { data } = await supabaseAdmin
        .from("admin_settings")
        .select("*")
        .eq("id", "default")
        .maybeSingle();

      if (data) {
        lovableKey = data.lovable_api_key || undefined;
        geminiKey = data.gemini_api_key || undefined;
        openaiKey = data.openai_api_key || undefined;
      }
    } catch (err) {
      console.warn("Failed to fetch admin settings from database:", err);
    }
  } else {
    console.warn("SUPABASE_SERVICE_ROLE_KEY is missing. Skipping database admin settings check.");
  }

  // 2. Fall back to environment variables if no database keys are configured
  lovableKey = lovableKey || process.env.LOVABLE_API_KEY || undefined;
  geminiKey = geminiKey || process.env.GEMINI_API_KEY || undefined;
  openaiKey = openaiKey || process.env.OPENAI_API_KEY || undefined;

  if (lovableKey) {
    const provider = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: { "Lovable-API-Key": lovableKey },
    });
    return {
      provider,
      model: "google/gemini-3-flash-preview",
    };
  }

  if (geminiKey) {
    const provider = createOpenAICompatible({
      name: "gemini",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey: geminiKey,
    });
    return {
      provider,
      model: "gemini-1.5-flash",
    };
  }

  if (openaiKey) {
    const provider = createOpenAICompatible({
      name: "openai",
      baseURL: "https://api.openai.com/v1",
      apiKey: openaiKey,
    });
    return {
      provider,
      model: "gpt-4o-mini",
    };
  }

  throw new Error(
    "AI gateway is not configured. Please set GEMINI_API_KEY, OPENAI_API_KEY, or LOVABLE_API_KEY in your environment variables, or configure them in the Admin Dashboard."
  );
}
