import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");

    const user = userData.user;
    const { code } = await req.json();

    if (!code || typeof code !== "string" || code.trim().length < 3) {
      return json({ error: "Código inválido" }, 400);
    }

    const normalizedCode = code.trim().toUpperCase();

    // Find the license
    const { data: license, error: licenseError } = await supabaseAdmin
      .from("licenses")
      .select("*")
      .eq("code", normalizedCode)
      .maybeSingle();

    if (licenseError || !license) {
      return json({ error: "Código não encontrado" }, 404);
    }

    if (!license.active) {
      return json({ error: "Este código está desativado" }, 400);
    }

    if (license.current_uses >= license.max_uses) {
      return json({ error: "Este código já atingiu o limite de usos" }, 400);
    }

    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      return json({ error: "Este código expirou" }, 400);
    }

    // Check if user already redeemed this license
    const { data: existing } = await supabaseAdmin
      .from("license_redemptions")
      .select("id")
      .eq("license_id", license.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return json({ error: "Você já resgatou este código" }, 400);
    }

    // Create redemption
    const { error: redemptionError } = await supabaseAdmin
      .from("license_redemptions")
      .insert({
        license_id: license.id,
        user_id: user.id,
      });

    if (redemptionError) throw redemptionError;

    // Increment usage count
    const { error: updateError } = await supabaseAdmin
      .from("licenses")
      .update({ current_uses: license.current_uses + 1 })
      .eq("id", license.id);

    if (updateError) {
      console.error("Failed to update usage count:", updateError);
    }

    return json({
      success: true,
      tier: license.tier,
      duration_days: license.duration_days,
      message: `Código resgatado! Acesso ${license.tier} por ${license.duration_days} dias.`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const status = msg === "Unauthorized" ? 401 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
    status,
  });
}
