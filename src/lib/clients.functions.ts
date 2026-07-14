import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clients")
      .select(`
        *,
        projects (id, status, budget)
      `)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(1).max(120),
        company: z.string().max(200).optional().nullable(),
        email: z.string().email().optional().nullable().or(z.literal("")),
        phone: z.string().max(40).optional().nullable(),
        tier: z.enum(["standard", "preferred", "enterprise"]).default("standard"),
        notes: z.string().max(2000).optional().nullable(),
        status: z.enum(["lead", "active", "past", "archived"]).default("active"),
        website: z.string().url().optional().nullable().or(z.literal("")),
        industry: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        lead_source: z.string().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("clients")
      .insert({ ...data, email: data.email || null, website: data.website || null, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("clients").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getClient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("clients")
      .select(`
        *,
        projects (*),
        client_activities (*)
      `)
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().min(1).max(120).optional(),
        company: z.string().max(200).optional().nullable(),
        email: z.string().email().optional().nullable().or(z.literal("")),
        phone: z.string().max(40).optional().nullable(),
        tier: z.enum(["standard", "preferred", "enterprise"]).optional(),
        notes: z.string().max(2000).optional().nullable(),
        status: z.enum(["lead", "active", "past", "archived"]).optional(),
        website: z.string().url().optional().nullable().or(z.literal("")),
        industry: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        lead_source: z.string().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data: { id, ...updates } }) => {
    const { data: row, error } = await context.supabase
      .from("clients")
      .update({ ...updates, email: updates.email || null, website: updates.website || null })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const addClientActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        client_id: z.string().uuid(),
        type: z.enum(["note", "email", "call", "meeting"]),
        content: z.string().min(1).max(5000),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("client_activities")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
