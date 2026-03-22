import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Map license tier strings to Stripe product IDs so the frontend can resolve them
const LICENSE_TIER_TO_PRODUCT: Record<string, string> = {
  basic: "prod_UCAoMu0A0dTttd",
  premium: "prod_UCAoBOozEsM8nQ",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { email: user.email });

    // 1) Check Stripe subscription first
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      logStep("Found customer", { customerId });

      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
        const productId = subscription.items.data[0].price.product;
        logStep("Active Stripe subscription", { productId, subscriptionEnd });

        return json({ subscribed: true, product_id: productId, subscription_end: subscriptionEnd });
      }
    } else {
      logStep("No Stripe customer found");
    }

    // 2) Fallback: check license redemptions
    logStep("Checking license redemptions");
    const { data: redemptions, error: redemptionError } = await supabaseClient
      .from("license_redemptions")
      .select("redeemed_at, license_id, licenses(tier, duration_days)")
      .eq("user_id", user.id)
      .order("redeemed_at", { ascending: false })
      .limit(1);

    if (!redemptionError && redemptions && redemptions.length > 0) {
      const redemption = redemptions[0] as any;
      const license = redemption.licenses;
      if (license) {
        const redeemedAt = new Date(redemption.redeemed_at);
        const expiresAt = new Date(redeemedAt.getTime() + license.duration_days * 86400000);

        if (expiresAt > new Date()) {
          const tier = license.tier?.toLowerCase() ?? "premium";
          const productId = LICENSE_TIER_TO_PRODUCT[tier] || LICENSE_TIER_TO_PRODUCT.premium;
          logStep("Active license found", { tier, expiresAt: expiresAt.toISOString() });

          return json({
            subscribed: true,
            product_id: productId,
            subscription_end: expiresAt.toISOString(),
            source: "license",
          });
        } else {
          logStep("License expired", { expiresAt: expiresAt.toISOString() });
        }
      }
    }

    logStep("No active subscription or license");
    return json({ subscribed: false });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
