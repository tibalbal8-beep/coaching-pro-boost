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

    // Vérifie les abonnements actifs dans Stripe : Premium d'un côté, pack Analyse de l'autre (reconnu à son prix)
    const subsRes = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${profile.stripe_customer_id}&status=active&limit=10`,
      { headers: { "Authorization": `Bearer ${process.env.STRIPE_SECRET_KEY}` } }
    );
    const subs = await subsRes.json();
    const ANALYSIS_PRICE = process.env.STRIPE_PRICE_ANALYSIS_YEARLY;
    const isAn = (s) => !!ANALYSIS_PRICE && (s.items?.data || []).some(i => i.price?.id === ANALYSIS_PRICE);
    const activeSub = (subs.data || []).find(s => !isAn(s));
    const analysisSub = (subs.data || []).find(isAn);
    const isActive = !!activeSub;
    const premiumUntil = isActive
      ? new Date(activeSub.current_period_end * 1000).toISOString()
      : null;

    // Met à jour le profil (Premium)
    await supabase.from("profiles").update({
      is_premium: isActive,
      premium_until: premiumUntil,
      stripe_subscription_id: activeSub?.id ?? null,
    }).eq("id", userId);

    // Pack Analyse : on n'écrase jamais un accès déjà offert (gratuité jusqu'au 30 juin) par une date plus courte
    let hasAnalysis = false, analysisUntil = null;
    if (analysisSub) {
      const { data: cur } = await supabase.from("profiles").select("analysis_until").eq("id", userId).maybeSingle();
      const end = analysisSub.current_period_end * 1000, prev = cur?.analysis_until ? new Date(cur.analysis_until).getTime() : 0;
      analysisUntil = new Date(Math.max(end, prev)).toISOString();
      await supabase.from("profiles").update({ analysis_until: analysisUntil, analysis_subscription_id: analysisSub.id }).eq("id", userId);
      hasAnalysis = true;
    }

    // isPremium = « quelque chose d'actif » : l'appli recharge dès qu'un des deux abonnements est pris en compte
    res.status(200).json({ isPremium: isActive || hasAnalysis, premiumActive: isActive, hasAnalysis, premiumUntil, analysisUntil });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
