import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature, x-paystack-signature",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const bodyText = await req.text();
    let payload;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const stripeSignature = req.headers.get("stripe-signature");
    const paystackSignature = req.headers.get("x-paystack-signature");

    let userId: string | null = null;
    let plan: "basic" | "premium" = "basic";
    let subId: string | null = null;
    let customerId: string | null = null;

    // 1. STRIPE WEBHOOK HANDLER
    if (stripeSignature) {
      console.info("[Webhook] Received Stripe billing event");
      const eventType = payload.type;

      if (eventType === "checkout.session.completed") {
        const session = payload.data.object;
        userId = session.client_reference_id || session.metadata?.userId;
        customerId = session.customer;
        subId = session.subscription;

        // Resolve plan from metadata or line items
        const planName = session.metadata?.plan || "basic";
        plan = planName === "premium" ? "premium" : "basic";
      } else if (eventType === "invoice.paid") {
        const invoice = payload.data.object;
        userId = invoice.subscription_details?.metadata?.userId || invoice.metadata?.userId;
        customerId = invoice.customer;
        subId = invoice.subscription;
      }
    }
    // 2. PAYSTACK WEBHOOK HANDLER
    else if (paystackSignature) {
      console.info("[Webhook] Received Paystack billing event");
      const eventType = payload.event;

      if (eventType === "charge.success") {
        const data = payload.data;
        userId = data.metadata?.userId || data.metadata?.user_id;
        customerId = String(data.customer?.id || "");
        subId = data.reference;

        const amount = data.amount; // in kobo
        // NGN 35,000 = 3500000 kobo (premium)
        plan = amount >= 3500000 ? "premium" : "basic";
      }
    } else {
      return new Response(JSON.stringify({ error: "Unrecognized signature headers" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!userId) {
      console.warn("[Webhook] Event parsed successfully but no userId metadata found.");
      return new Response(
        JSON.stringify({ status: "ignored", message: "Missing userId metadata" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // Update user profile inside public.profiles
    const endsAt = new Date();
    endsAt.setMonth(endsAt.getMonth() + 1); // 1-month subscription

    const { error } = await supabase
      .from("profiles")
      .update({
        plan: plan,
        subscription_status: "active",
        subscription_ends_at: endsAt.toISOString(),
        payment_customer_id: customerId || `cus_webhook_${Date.now()}`,
        payment_subscription_id: subId || `sub_webhook_${Date.now()}`,
        restricted: false, // Clear any suspension on payment
        trial_generations_used: 0, // Reset usage counter on payment
      })
      .eq("id", userId);

    if (error) {
      throw error;
    }

    console.info(`[Webhook] User ${userId} successfully upgraded to ${plan} subscription.`);
    return new Response(JSON.stringify({ status: "success", plan, userId }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Webhook Error]", errorMsg);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
