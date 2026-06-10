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
    let title = data.title;
    if (data.client_id) {
      const { data: client } = await context.supabase
        .from("clients")
        .select("name, company")
        .eq("id", data.client_id)
        .maybeSingle();
      if (client) {
        const suffix = client.company || client.name;
        if (suffix && !title.toLowerCase().endsWith(suffix.toLowerCase())) {
          title = `${title} — ${suffix}`;
        }
      }
    }
    const { data: row, error } = await context.supabase
      .from("projects")
      .insert({ ...data, title, user_id: context.userId })
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
    const patch = { ...data.patch };
    if (patch.title) {
      const { data: proj } = await context.supabase
        .from("projects")
        .select("client_id")
        .eq("id", data.id)
        .maybeSingle();
      if (proj?.client_id) {
        const { data: client } = await context.supabase
          .from("clients")
          .select("name, company")
          .eq("id", proj.client_id)
          .maybeSingle();
        if (client) {
          const suffix = client.company || client.name;
          if (suffix && !patch.title.toLowerCase().endsWith(suffix.toLowerCase())) {
            patch.title = `${patch.title} — ${suffix}`;
          }
        }
      }
    }
    const { error } = await context.supabase.from("projects").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const [{ data: project, error: pErr }, { data: pricing_runs }, { data: documents }] = await Promise.all([
      context.supabase
        .from("projects")
        .select("*, client:clients(id, name, company, email, phone, tier)")
        .eq("id", data.id)
        .single(),
      context.supabase
        .from("pricing_runs")
        .select("id, recommended_total, range_low, range_high, currency, confidence, rationale, created_at")
        .eq("project_id", data.id)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("documents")
        .select("id, type, number, title, status, total, currency, updated_at")
        .eq("project_id", data.id)
        .order("updated_at", { ascending: false }),
    ]);
    if (pErr || !project) throw new Error(pErr?.message ?? "Project not found");
    const { client, ...rest } = project as typeof project & { client: unknown };
    return {
      project: rest,
      client: client as { id: string; name: string; company: string | null; email: string | null; phone: string | null; tier: string } | null,
      pricing_runs: pricing_runs ?? [],
      documents: documents ?? [],
    };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("projects")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
