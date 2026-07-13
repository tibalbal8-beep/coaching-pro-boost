import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Non autorisé", { status: 401, headers: corsHeaders });

    const { priceId, successUrl, cancelUrl } = await req.json();
    console.log("priceId:", priceId);
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    console.log("stripeKey present:", !!stripeKey);;

    // Récupère ou crée le customer Stripe
    const { data: profile } = await supabase.from("profiles")
      .select("stripe_customer_id").eq("id", user.id).maybeSingle();

    if (!profile) {
      await supabase.from("profiles").insert({ id: user.id });
    }

    let customerId = profile?.stripe_customer_id;
    console.log("customerId:", customerId);

    if (!customerId) {
      console.log("Creating Stripe customer...");
      const customerRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          email: user.email!,
          "metadata[supabase_uid]": user.id,
        }),
      });
      const customer = await customerRes.json();
      customerId = customer.id;
      await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    const sessionRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: customerId,
        mode: "subscription",
        "payment_method_types[0]": "card",
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        success_url: successUrl,
        cancel_url: cancelUrl,
        locale: "fr",
      }),
    });

    const session = await sessionRes.json();

    if (!session.url) {
      return new Response(JSON.stringify({ error: session.error?.message || "Erreur Stripe" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
