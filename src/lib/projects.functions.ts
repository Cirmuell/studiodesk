import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("*, client:clients(id, name, company, tier)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      title: z.string().min(1).max(200),
      client_id: z.string().uuid().optional().nullable(),
      status: z.enum(["lead", "active", "completed", "archived"]).default("lead"),
      budget: z.number().nonnegative().optional().nullable(),
      currency: z.string().length(3).default("NGN"),
      scope: z.string().max(4000).optional().nullable(),
      deliverables: z.string().max(2000).optional().nullable(),
      deadline: z.string().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("projects")
      .insert({ ...data, user_id: context.userId })
      .select("*, client:clients(id, name, company, tier)")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      patch: z.object({
        title: z.string().optional(),
        status: z.enum(["lead", "active", "completed", "archived"]).optional(),
        budget: z.number().nullable().optional(),
        scope: z.string().nullable().optional(),
        deliverables: z.string().nullable().optional(),
      }),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("projects").update(data.patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
