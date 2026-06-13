import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/documents/$id/pdf")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const urlObj = new URL(request.url);
        let token = urlObj.searchParams.get("token");

        if (!token) {
          const authHeader = request.headers.get("authorization");
          if (authHeader?.startsWith("Bearer ")) {
            token = authHeader.slice(7);
          }
        }

        if (!token) {
          return new Response("Unauthorized", { status: 401 });
        }
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseKey =
          process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !supabaseKey) {
          return new Response("Configuration error: Supabase credentials missing", { status: 500 });
        }
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: user, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !user.user) return new Response("Unauthorized", { status: 401 });

        const { data: docRow, error } = await supabase
          .from("documents")
          .select("*, client:clients(*), project:projects(*)")
          .eq("id", params.id)
          .single();
        if (error || !docRow) return new Response("Not found", { status: 404 });

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.user.id)
          .maybeSingle();

        const { renderDocumentPdf } = await import("@/lib/pdf.server");
        const bytes = await renderDocumentPdf({
          type: docRow.type,
          number: docRow.number,
          title: docRow.title,
          content: docRow.content ?? {},
          subtotal: Number(docRow.subtotal ?? 0),
          tax: Number(docRow.tax ?? 0),
          total: Number(docRow.total ?? 0),
          currency: docRow.currency,
          issued_date: docRow.issued_date,
          due_date: docRow.due_date,
          profile: profile ?? null,
          client: docRow.client ?? null,
        });

        const filename = `${docRow.type}-${docRow.number ?? docRow.id}.pdf`;
        return new Response(new Uint8Array(bytes), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
