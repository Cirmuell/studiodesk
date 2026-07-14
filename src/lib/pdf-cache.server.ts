import { SupabaseClient } from "@supabase/supabase-js";

async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getOrGeneratePdf(
  docInput: any,
  type: string,
  supabaseAdmin: SupabaseClient
): Promise<Uint8Array> {
  const payloadStr = JSON.stringify({ docInput, type });
  const hashKey = await sha256(payloadStr);

  const { data: cached, error: fetchErr } = await supabaseAdmin
    .from("pdf_render_caches")
    .select("pdf_base64")
    .eq("hash_key", hashKey)
    .maybeSingle();

  if (fetchErr) {
    console.error("[PDF CACHE] Fetch error:", fetchErr.message);
  }

  if (cached?.pdf_base64) {
    console.info("[PDF CACHE] Using cached PDF render for:", hashKey);
    return new Uint8Array(Buffer.from(cached.pdf_base64, "base64"));
  }

  console.info("[PDF CACHE] Generating fresh PDF for:", hashKey);
  let bytes: Uint8Array | ArrayBuffer | Buffer;
  if (type === "proposal") {
    const { renderProposalPdf } = await import("@/lib/proposal.server");
    bytes = await renderProposalPdf(docInput);
  } else {
    const { renderDocumentPdf } = await import("@/lib/pdf.server");
    bytes = await renderDocumentPdf(docInput);
  }

  const u8Bytes = new Uint8Array(bytes);
  const pdf_base64 = Buffer.from(u8Bytes).toString("base64");

  // Fire and forget cache insert
  supabaseAdmin
    .from("pdf_render_caches")
    .insert({ hash_key: hashKey, pdf_base64 })
    .then(({ error }) => {
      if (error) console.error("[PDF CACHE] Failed to save:", error.message);
    });

  return u8Bytes;
}
