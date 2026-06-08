import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/portal/$token/pdf")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = params.token;
        if (!token || token.length < 8 || token.length > 128) {
          return new Response("Bad request", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { renderDocumentPdf } = await import("@/lib/pdf.server");

        const { data: share } = await supabaseAdmin
          .from("document_shares")
          .select("id, document_id, expires_at, revoked_at, user_id")
          .eq("token", token)
          .maybeSingle();

        if (!share) return new Response("Not found", { status: 404 });
        if (share.revoked_at) return new Response("Link revoked", { status: 410 });
        if (share.expires_at && new Date(share.expires_at) < new Date()) {
          return new Response("Link expired", { status: 410 });
        }

        const [{ data: docRow }, { data: profile }] = await Promise.all([
          supabaseAdmin
            .from("documents")
            .select("*, client:clients(*)")
            .eq("id", share.document_id)
            .maybeSingle(),
          supabaseAdmin
            .from("profiles")
            .select("*")
            .eq("id", share.user_id)
            .maybeSingle(),
        ]);

        if (!docRow) return new Response("Not found", { status: 404 });

        const bytes = await renderDocumentPdf({
          type: docRow.type,
          number: docRow.number,
          title: docRow.title,
          content: (docRow.content ?? {}) as never,
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
            "Content-Disposition": `inline; filename="${filename}"`,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
