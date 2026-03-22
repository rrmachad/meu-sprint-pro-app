import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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

    // Check admin or moderator role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "moderator"])
      .maybeSingle();

    if (!roleData) throw new Error("Forbidden: admin or moderator role required");

    const callerRole = roleData.role;
    const isAdmin = callerRole === "admin";

    // Actions restricted to admin only
    const { action, ...params } = await req.json();

    const adminOnlyActions = [
      "create_license", "toggle_license", "delete_license",
      "grant_role", "revoke_role", "find_user_by_email",
    ];

    if (!isAdmin && adminOnlyActions.includes(action)) {
      throw new Error("Forbidden: this action requires admin role");
    }

    switch (action) {
      case "list_users": {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
          page: params.page || 1,
          perPage: params.perPage || 50,
        });
        if (error) throw error;

        // Get subscription info for each user
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
          apiVersion: "2025-08-27.basil",
        });

        // Fetch all roles in one query
        const userIds = users.map((u) => u.id);
        const { data: allRoles } = await supabaseAdmin
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds);
        const roleMap: Record<string, string> = {};
        (allRoles || []).forEach((r: { user_id: string; role: string }) => {
          roleMap[r.user_id] = r.role;
        });

        const enriched = await Promise.all(
          users.map(async (u) => {
            let subscription = null;
            try {
              if (u.email) {
                const customers = await stripe.customers.list({ email: u.email, limit: 1 });
                if (customers.data.length > 0) {
                  const subs = await stripe.subscriptions.list({
                    customer: customers.data[0].id,
                    status: "active",
                    limit: 1,
                  });
                  if (subs.data.length > 0) {
                    const sub = subs.data[0];
                    subscription = {
                      status: sub.status,
                      product_id: sub.items.data[0]?.price?.product,
                      price_id: sub.items.data[0]?.price?.id,
                      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                    };
                  }
                }
              }
            } catch { /* ignore stripe errors per user */ }

            return {
              id: u.id,
              email: u.email,
              full_name: u.user_metadata?.full_name || u.user_metadata?.name || null,
              avatar_url: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
              created_at: u.created_at,
              last_sign_in_at: u.last_sign_in_at,
              provider: u.app_metadata?.provider || "email",
              subscription,
              role: roleMap[u.id] || null,
            };
          })
        );

        return json({ users: enriched, total: users.length });
      }

      case "recent_signups": {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        if (error) throw error;
        const sorted = users
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 20)
          .map((u) => ({
            id: u.id,
            email: u.email,
            full_name: u.user_metadata?.full_name || u.user_metadata?.name || null,
            avatar_url: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
            created_at: u.created_at,
            provider: u.app_metadata?.provider || 'email',
          }));
        return json({ users: sorted });
      }

      case "metrics": {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        if (error) throw error;

        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
          apiVersion: "2025-08-27.basil",
        });

        let activeSubscriptions = 0;
        let totalRevenue = 0;

        const allSubs = await stripe.subscriptions.list({ status: "active", limit: 100 });
        activeSubscriptions = allSubs.data.length;

        for (const sub of allSubs.data) {
          const amount = sub.items.data[0]?.price?.unit_amount || 0;
          totalRevenue += amount / 100;
        }

        const { count: licenseCount } = await supabaseAdmin
          .from("licenses")
          .select("*", { count: "exact", head: true })
          .eq("active", true);

        // Build user growth by day (last 30 days)
        const now = new Date();
        const userGrowth: Record<string, number> = {};
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          userGrowth[d.toISOString().split("T")[0]] = 0;
        }
        for (const u of users) {
          const day = u.created_at.split("T")[0];
          if (day in userGrowth) userGrowth[day]++;
        }
        const userGrowthData = Object.entries(userGrowth).map(([date, count]) => ({ date, count }));

        // Build cumulative user growth
        let cumulative = users.filter(
          (u) => new Date(u.created_at) < new Date(userGrowthData[0]?.date || now)
        ).length;
        const cumulativeData = userGrowthData.map((d) => {
          cumulative += d.count;
          return { date: d.date, total: cumulative };
        });

        // Revenue by subscription tier
        const revenueByTier: Record<string, { count: number; revenue: number }> = {};
        for (const sub of allSubs.data) {
          const productId = String(sub.items.data[0]?.price?.product || "unknown");
          const amount = (sub.items.data[0]?.price?.unit_amount || 0) / 100;
          if (!revenueByTier[productId]) revenueByTier[productId] = { count: 0, revenue: 0 };
          revenueByTier[productId].count++;
          revenueByTier[productId].revenue += amount;
        }

        return json({
          totalUsers: users.length,
          activeSubscriptions,
          estimatedMRR: totalRevenue,
          activeLicenses: licenseCount || 0,
          newUsersLast30Days: users.filter(
            (u) => new Date(u.created_at) > new Date(Date.now() - 30 * 86400000)
          ).length,
          userGrowthData,
          cumulativeData,
          revenueByTier,
        });
      }

      case "list_licenses": {
        const { data, error } = await supabaseAdmin
          .from("licenses")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return json({ licenses: data });
      }

      case "create_license": {
        const code = params.code || generateCode();
        const { data, error } = await supabaseAdmin.from("licenses").insert({
          code,
          tier: params.tier || "premium",
          duration_days: params.duration_days || 30,
          max_uses: params.max_uses || 1,
          created_by: userData.user.id,
          expires_at: params.expires_at || null,
        }).select().single();
        if (error) throw error;
        return json({ license: data });
      }

      case "toggle_license": {
        const { data, error } = await supabaseAdmin
          .from("licenses")
          .update({ active: params.active })
          .eq("id", params.license_id)
          .select()
          .single();
        if (error) throw error;
        return json({ license: data });
      }

      case "delete_license": {
        const { error } = await supabaseAdmin
          .from("licenses")
          .delete()
          .eq("id", params.license_id);
        if (error) throw error;
        return json({ success: true });
      }

      case "grant_role": {
        const { error } = await supabaseAdmin.from("user_roles").insert({
          user_id: params.user_id,
          role: params.role || "moderator",
        });
        if (error) throw error;
        return json({ success: true });
      }

      case "list_roles": {
        const { data, error } = await supabaseAdmin
          .from("user_roles")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;

        // Enrich with user info
        const enriched = await Promise.all(
          (data || []).map(async (r: any) => {
            let email = null;
            let full_name = null;
            try {
              const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
              email = u?.user?.email || null;
              full_name = u?.user?.user_metadata?.full_name || u?.user?.user_metadata?.name || null;
            } catch { /* ignore */ }
            return { ...r, email, full_name };
          })
        );

        return json({ roles: enriched });
      }

      case "revoke_role": {
        const { error } = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("id", params.role_id);
        if (error) throw error;
        return json({ success: true });
      }

      case "find_user_by_email": {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        if (error) throw error;
        const found = users.find(
          (u) => u.email?.toLowerCase() === String(params.email).toLowerCase()
        );
        if (!found) return json({ user: null });
        return json({
          user: {
            id: found.id,
            email: found.email,
            full_name: found.user_metadata?.full_name || found.user_metadata?.name || null,
          },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const status = msg.includes("Unauthorized") ? 401 : msg.includes("Forbidden") ? 403 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "MSP-";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
