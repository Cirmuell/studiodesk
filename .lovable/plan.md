## Diagnosis

Calling the pricing analysis on the live site (`studiodesk.lovable.app`) returns HTTP 500 with this server log:

```
Error: Server function info not found for src_lib_pricing_functions_ts--runPricingAnalysis_createServerFn_handler
POST /_serverFn/src_lib_pricing_functions_ts--runPricingAnalysis_createServerFn_handler → 500
```

Two issues are at play:

1. **Published deploy is out of date.** The currently published Worker bundle does not contain the `runPricingAnalysis` server function. Any client clicking "Run pricing analysis" on the live site hits a stub that 500s before our handler runs.
2. **`generateObject` via `@ai-sdk/openai-compatible` is fragile against Lovable Gateway.** Even after redeploy, `generateObject({ schema: PricingSchema })` sends a strict `response_format: json_schema` payload. Some Gemini variants behind the gateway reject that with a 400, which our code surfaces as a generic "AI pricing failed" toast. We should switch to a JSON-mode prompt + Zod parse, which is reliably supported, and also align the gateway helper with the documented Lovable pattern (custom `Lovable-API-Key` header + `X-Lovable-AIG-SDK` marker, which we already have except the SDK marker).

## Fix plan

### 1. Harden `src/lib/pricing.functions.ts`
- Replace `generateObject` with `generateText` in JSON mode:
  - Append explicit "Return ONLY a JSON object matching this shape: { ... }" guidance to the prompt.
  - Parse the text response with `PricingSchema.safeParse(JSON.parse(...))`.
  - If parsing fails, retry once with a "fix the JSON to match this schema" follow-up using the model's previous output.
- Keep the existing 429 / 402 error handling and add explicit logging of upstream status + body on failure so future regressions are visible in worker logs.
- Validate `recommended_total`, `range_low`, `range_high` are positive numbers and `range_low <= recommended_total <= range_high` before insert (clamp if needed) so a malformed model response doesn't poison `pricing_runs`.

### 2. Tighten `src/lib/ai-gateway.server.ts`
- Add the `X-Lovable-AIG-SDK: vercel-ai-sdk` header on the Lovable provider (recommended by the gateway docs; required for proper telemetry/routing).
- Keep DB-overridden keys, but make the failure mode explicit: when no key is configured, throw a clear, user-facing message instead of a generic one.

### 3. Republish so the fixes (and the existing missing function) actually reach `studiodesk.lovable.app`
- After the code change lands, prompt to publish. Without this, the live site keeps 500-ing regardless of code changes.

### 4. Verify
- Use `invoke-server-function` against `/pricing` flow after publish to confirm a 200 with a structured pricing object.
- Check `server-function-logs` for any residual 4xx from the gateway.

## Technical notes

- AI SDK versions in use: `ai ^6.0.197`, `@ai-sdk/openai-compatible ^2.0.48`. JSON-mode + manual parse is the most compatible path across Gemini models exposed through Lovable Gateway today.
- No DB schema changes required. RLS / GRANTs on `pricing_runs` already match the working `clients`/`projects` tables.
- No new secrets needed — `LOVABLE_API_KEY` is already provisioned.
