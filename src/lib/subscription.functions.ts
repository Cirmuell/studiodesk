import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type BillingInfo = {
  plan: "trial" | "basic" | "premium";
  trial_generations_used: number;
  trial_generations_limit: number;
  subscription_status: "trialing" | "active" | "past_due" | "canceled";
  subscription_ends_at: string | null;
  restricted: boolean;
};

// Fetch current billing & subscription details for the active user
export const getBillingInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BillingInfo> => {
    try {
      const { data: profile, error } = await supabaseAdmin
        .from("profiles")
        .select("plan, trial_generations_used, trial_generations_limit, subscription_status, subscription_ends_at, restricted")
        .eq("id", context.userId)
        .maybeSingle();

      if (error) throw error;

      if (!profile) {
        return {
          plan: "trial",
          trial_generations_used: 0,
          trial_generations_limit: 5,
          subscription_status: "trialing",
          subscription_ends_at: null,
          restricted: false,
        };
      }

      return {
        plan: (profile as any).plan ?? "trial",
        trial_generations_used: (profile as any).trial_generations_used ?? 0,
        trial_generations_limit: (profile as any).trial_generations_limit ?? 5,
        subscription_status: (profile as any).subscription_status ?? "trialing",
        subscription_ends_at: (profile as any).subscription_ends_at ?? null,
        restricted: (profile as any).restricted ?? false,
      };
    } catch (err: any) {
      console.warn("[Subscription Info] Falling back to default mock limits:", err.message);
      return {
        plan: "trial",
        trial_generations_used: 0,
        trial_generations_limit: 5,
        subscription_status: "trialing",
        subscription_ends_at: null,
        restricted: false,
      };
    }
  });

// Simulates checkout and updates the plan in the database
// Swap the simulated block below with a Stripe checkout session or a Paystack payment initialization
export const subscribeToPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      plan: z.enum(["basic", "premium"]),
      paymentMethod: z.string().default("card"),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    // -------------------------------------------------------------
    // INTEGRATION GUIDE FOR PAYMENT PLATFORMS:
    // -------------------------------------------------------------
    //
    // A. PAYSTACK INTEGRATION:
    // 1. Install axios or use fetch.
    // 2. Initialize payment with Paystack API:
    //    const response = await fetch("https://api.paystack.co/transaction/initialize", {
    //      method: "POST",
    //      headers: {
    //        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    //        "Content-Type": "application/json"
    //      },
    //      body: JSON.stringify({
    //        email: context.claims.email, // or query from profiles
    //        amount: data.plan === "basic" ? 1500000 : 3500000, // Amount in kobo (NGN 15,000 / NGN 35,000)
    //        callback_url: `${process.env.APP_URL}/settings?payment=success`
    //      })
    //    });
    //    const result = await response.json();
    //    return { checkoutUrl: result.data.authorization_url };
    //
    // B. STRIPE INTEGRATION:
    // 1. Install stripe dependency.
    // 2. Create a Stripe checkout session:
    //    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    //    const priceId = data.plan === "basic" ? "price_basic_id" : "price_premium_id";
    //    const session = await stripe.checkout.sessions.create({
    //      customer_email: context.claims.email,
    //      payment_method_types: ["card"],
    //      line_items: [{ price: priceId, quantity: 1 }],
    //      mode: "subscription",
    //      success_url: `${process.env.APP_URL}/settings?session_id={CHECKOUT_SESSION_ID}`,
    //      cancel_url: `${process.env.APP_URL}/settings`
    //    });
    //    return { checkoutUrl: session.url };
    // -------------------------------------------------------------

    // Simulated/Mock upgrade flow
    try {
      const endsAt = new Date();
      endsAt.setMonth(endsAt.getMonth() + 1); // 1-month duration

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          plan: data.plan,
          subscription_status: "active",
          subscription_ends_at: endsAt.toISOString(),
          payment_customer_id: `cus_sim_${Math.random().toString(36).substring(7)}`,
          payment_subscription_id: `sub_sim_${Math.random().toString(36).substring(7)}`,
          restricted: false, // Reset restriction on payment
        } as any)
        .eq("id", context.userId);

      if (error) throw error;
      return { status: "success", plan: data.plan };
    } catch (err: any) {
      if (err.message?.includes("does not exist")) {
        throw new Error("Unable to upgrade: Database migration has not been applied yet. Run the SQL script in your Supabase SQL Editor first.");
      }
      throw new Error(`Failed to simulate subscription: ${err.message}`);
    }
  });
