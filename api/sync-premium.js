import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId manquant" });

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Récupère le stripe_customer_id
    const { data: profile } = await supabase.from("profiles")
      .select("stripe_customer_id").eq("id", userId).maybeSingle();

    if (!profile?.stripe_customer_id) {
      return res.status(200).json({ isPremium: false, reason: "no_customer" });
    }

    // Vérifie les abonnements actifs dans Stripe
    const subsRes = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${profile.stripe_customer_id}&status=active&limit=1`,
      { headers: { "Authorization": `Bearer ${process.env.STRIPE_SECRET_KEY}` } }
    );
    const subs = await subsRes.json();
    const activeSub = subs.data?.[0];
    const isActive = !!activeSub;
    const premiumUntil = isActive
      ? new Date(activeSub.current_period_end * 1000).toISOString()
      : null;

    // Met à jour le profil
    await supabase.from("profiles").update({
      is_premium: isActive,
      premium_until: premiumUntil,
      stripe_subscription_id: activeSub?.id ?? null,
    }).eq("id", userId);

    res.status(200).json({ isPremium: isActive, premiumUntil });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
