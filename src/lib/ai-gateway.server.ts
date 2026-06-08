import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function getAiProvider(profile?: {
  gemini_api_key?: string | null;
  openai_api_key?: string | null;
  lovable_api_key?: string | null;
} | null) {
  const lovableKey = profile?.lovable_api_key || process.env.LOVABLE_API_KEY;
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

  const geminiKey = profile?.gemini_api_key || process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const provider = createOpenAICompatible({
      name: "gemini",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      headers: { Authorization: `Bearer ${geminiKey}` },
    });
    return {
      provider,
      model: "gemini-1.5-flash",
    };
  }

  const openaiKey = profile?.openai_api_key || process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const provider = createOpenAICompatible({
      name: "openai",
      baseURL: "https://api.openai.com/v1",
      headers: { Authorization: `Bearer ${openaiKey}` },
    });
    return {
      provider,
      model: "gpt-4o-mini",
    };
  }

  throw new Error(
    "AI gateway is not configured. Please set GEMINI_API_KEY, OPENAI_API_KEY, or LOVABLE_API_KEY in your environment variables, or enter them in Settings."
  );
}
