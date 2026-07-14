import { createFileRoute } from "@tanstack/react-router";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/cron/follow-ups")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Vercel Cron jobs send a secure header (or we check CRON_SECRET)
        const authHeader = request.headers.get("Authorization");
        const cronSecret = process.env.CRON_SECRET;
        
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
          return new Response("Unauthorized", { status: 401 });
        }

        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const resendApiKey = process.env.RESEND_API_KEY;

        if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
          console.error("Missing infrastructure keys");
          return new Response("Server configuration error", { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const resend = new Resend(resendApiKey);

        // Find documents that are 'sent', need a follow up, haven't exceeded 3 followups
        // last_follow_up_at < 3 days ago OR is NULL
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

        const { data: documents, error } = await supabase
          .from("documents")
          .select("id, type, number, title, client_id, user_id, follow_up_count, client:clients(*)")
          .eq("status", "sent")
          .lt("follow_up_count", 3)
          .or(`last_follow_up_at.is.null,last_follow_up_at.lt.${threeDaysAgo}`);

        if (error) {
          console.error("Database query failed:", error);
          return new Response("Database error", { status: 500 });
        }

        if (!documents || documents.length === 0) {
          return new Response(JSON.stringify({ ok: true, sent: 0, message: "No follow-ups needed" }), { 
            headers: { "Content-Type": "application/json" }
          });
        }

        // Fetch profiles for these documents
        const userIds = [...new Set(documents.map(d => d.user_id))];
        const { data: profiles } = await supabase.from("profiles").select("*").in("id", userIds);
        const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);

        let sentCount = 0;

        for (const doc of documents) {
          const profile = profileMap.get(doc.user_id);
          const client = doc.client as any;
          if (!client?.email || !profile?.email) continue;
          
          const docName = doc.title || `${doc.type} ${doc.number || ""}`.trim() || "document";
          const senderName = profile.owner_name || profile.business_name || "StudioDesk";
          
          let emailSubject = `Reminder: Pending ${docName} from ${profile.business_name || senderName}`;
          
          let actionButton = "";
          
          // Get the active share token
          const { data: share } = await supabase
            .from("document_shares")
            .select("token")
            .eq("document_id", doc.id)
            .is("revoked_at", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (share?.token) {
            const portalUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VITE_SITE_URL || "https://studiodesk.app";
            actionButton = `
              <p style="margin: 25px 0;">
                <a href="${portalUrl}/portal/${share.token}" style="background-color: #d97757; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Document</a>
              </p>
            `;
          }

          let emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <h2 style="color: #d97757;">Friendly Reminder</h2>
              <p>Hi ${client.name},</p>
              <p>This is just a quick automated reminder regarding the <strong>${docName}</strong> we sent you.</p>
              ${actionButton}
              <p>If you have any questions, please reply directly to this email! Otherwise, you can review and accept it at your earliest convenience.</p>
              <br/>
              <p>Thanks,</p>
              <p><strong>${senderName}</strong></p>
            </div>
          `;

          try {
            await resend.emails.send({
              from: `${profile.business_name || senderName} <hello@studiodesk.app>`, // Should ideally be verified domain in Resend
              to: client.email,
              replyTo: profile.email, // Replies go straight back to the creative
              subject: emailSubject,
              html: emailHtml,
            });

            // Update database
            await supabase
              .from("documents")
              .update({
                last_follow_up_at: new Date().toISOString(),
                follow_up_count: (doc.follow_up_count || 0) + 1
              })
              .eq("id", doc.id);
              
            sentCount++;
          } catch (e) {
            console.error("Failed to send email to", client.email, e);
          }
        }

        return new Response(JSON.stringify({ ok: true, sent: sentCount }), { 
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  }
});
