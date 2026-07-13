import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth utilisateur
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return new Response("Non autorisé", { status: 401, headers: corsHeaders });

    // Récupère le stripe_customer_id
    const { data: profile } = await supabaseUser.from("profiles")
      .select("stripe_customer_id").eq("id", user.id).maybeSingle();

    if (!profile?.stripe_customer_id) {
      return new Response(JSON.stringify({ isPremium: false, reason: "no_customer" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vérifie les abonnements actifs dans Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const subsRes = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${profile.stripe_customer_id}&status=active&limit=1`,
      { headers: { "Authorization": `Bearer ${stripeKey}` } }
    );
    const subs = await subsRes.json();

    const activeSub = subs.data?.[0];
    const isActive = !!activeSub;
    const premiumUntil = isActive
      ? new Date(activeSub.current_period_end * 1000).toISOString()
      : null;

    // Met à jour le profil avec les droits Supabase service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );
    await supabaseAdmin.from("profiles").update({
      is_premium: isActive,
      premium_until: premiumUntil,
      stripe_subscription_id: activeSub?.id ?? null,
    }).eq("id", user.id);

    return new Response(JSON.stringify({ isPremium: isActive, premiumUntil }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
