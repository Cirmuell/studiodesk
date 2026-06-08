import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function getAiProvider() {
  if (process.env.LOVABLE_API_KEY) {
    const provider = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: { "Lovable-API-Key": process.env.LOVABLE_API_KEY },
    });
    return {
      provider,
      model: "google/gemini-3-flash-preview",
    };
  }

  if (process.env.GEMINI_API_KEY) {
    const provider = createOpenAICompatible({
      name: "gemini",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      headers: { Authorization: `Bearer ${process.env.GEMINI_API_KEY}` },
    });
    return {
      provider,
      model: "gemini-1.5-flash",
    };
  }

  if (process.env.OPENAI_API_KEY) {
    const provider = createOpenAICompatible({
      name: "openai",
      baseURL: "https://api.openai.com/v1",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    });
    return {
      provider,
      model: "gpt-4o-mini",
    };
  }

  throw new Error(
    "AI gateway is not configured. Please set GEMINI_API_KEY, OPENAI_API_KEY, or LOVABLE_API_KEY in your environment variables."
  );
}
