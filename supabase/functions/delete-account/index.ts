import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Verify the JWT and get the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Use service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date().toISOString();

    // 1. Soft-delete: stamp deleted_at on the user's profile row.
    //    Data is preserved for legal/compliance retention obligations.
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        deleted_at: now,
        // Anonymise PII fields so the row cannot be linked back to the person
        owner_name: "[deleted]",
        phone: null,
        address: null,
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Failed to soft-delete profile:", profileError);
      throw new Error(profileError.message);
    }

    // 2. Ban the user in Supabase Auth so they cannot log back in,
    //    but the auth.users row (and its UUID foreign keys) are kept intact.
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      ban_duration: "876000h", // ~100 years — effectively permanent
    });

    if (banError) {
      console.error("Failed to ban user:", banError);
      // Non-fatal — profile is already soft-deleted; log and continue.
    }

    // 3. Optionally record the deletion request for audit trail
    if (user.email) {
      await supabaseAdmin
        .from("banned_emails")
        .insert([{ email: user.email }])
        .then(({ error }) => {
          if (error && error.code !== "23505") {
            console.error("Failed to record banned email:", error);
          }
        });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Account deactivated" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error deactivating account:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
