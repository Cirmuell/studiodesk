import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function randomToken(bytes = 24): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  // URL-safe base64
  let s = btoa(String.fromCharCode(...arr));
  s = s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return s;
}

class MemoryCache<T> {
  private cache = new Map<string, { value: T; expiresAt: number }>();
  constructor(private ttlMs: number) {}
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }
  set(key: string, value: T): void {
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}

type SharedDocResult =
  | { status: "not_found" }
  | { status: "revoked" }
  | { status: "expired" }
  | { status: "ok"; document: unknown; profile: unknown };

const sharedDocCache = new MemoryCache<SharedDocResult>(60 * 1000); // 60-second TTL

export const listSharesForDocument = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ document_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("document_shares")
      .select("*")
      .eq("document_id", data.document_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        document_id: z.string().uuid(),
        expires_in_days: z.number().int().min(1).max(365).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    // confirm ownership of the doc (RLS will also enforce)
    const { data: doc, error: docErr } = await context.supabase
      .from("documents")
      .select("id, user_id")
      .eq("id", data.document_id)
      .single();
    if (docErr || !doc) throw new Error("Document not found");

    const expires_at = data.expires_in_days
      ? new Date(Date.now() + data.expires_in_days * 86_400_000).toISOString()
      : null;

    const { data: row, error } = await context.supabase
      .from("document_shares")
      .insert({
        document_id: data.document_id,
        user_id: context.userId,
        token: randomToken(),
        expires_at,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const revokeShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("document_shares")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Public lookup by token — no auth. Uses admin client to bypass RLS but only returns safe fields. */
export const getSharedDocument = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(8).max(128) }).parse(d))
  .handler(async ({ data }) => {
    const cached = sharedDocCache.get(data.token);
    if (cached) {
      console.info(`[CACHE HIT] getSharedDocument found cached entry for token: ${data.token}`);
      return cached;
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: share, error } = await supabaseAdmin
      .from("document_shares")
      .select("id, document_id, expires_at, revoked_at, user_id")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!share) return { status: "not_found" as const };
    if (share.revoked_at) return { status: "revoked" as const };
    if (share.expires_at && new Date(share.expires_at) < new Date())
      return { status: "expired" as const };

    const [{ data: doc }, { data: profile }] = await Promise.all([
      supabaseAdmin
        .from("documents")
        .select(
          "id, type, number, title, content, subtotal, tax, total, currency, issued_date, due_date, status, client:clients(id, name, company, email, phone)",
        )
        .eq("id", share.document_id)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("business_name, owner_name, email, phone, address, bank_details, tagline")
        .eq("id", share.user_id)
        .maybeSingle(),
    ]);
    if (!doc) return { status: "not_found" as const };

    // Best-effort: bump view metrics
    await supabaseAdmin
      .from("document_shares")
      .update({
        view_count: ((share as { view_count?: number }).view_count ?? 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq("id", share.id);

    const result = { status: "ok" as const, document: doc, profile };
    sharedDocCache.set(data.token, result);
    return result;
  });
