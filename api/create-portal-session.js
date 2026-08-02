import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { customerId, userId, returnUrl } = req.body;
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (!customerId) return res.status(400).json({ error: "Aucun abonnement trouvé." });

    const portalRes = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: customerId,
        return_url: returnUrl,
      }),
    });

    const portal = await portalRes.json();
    if (portal.error) {
      // Le client Stripe enregistré n'existe plus (supprimé côté Stripe) — on nettoie la
      // référence en base pour que le prochain clic déclenche un nouvel abonnement au lieu de
      // rebloquer sur la même erreur indéfiniment.
      if (portal.error.code === "resource_missing" && userId) {
        try {
          const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
          await supabase.from("profiles").update({ stripe_customer_id: null }).eq("id", userId);
        } catch {}
        throw new Error("Ton abonnement précédent n'existe plus côté paiement. Clique sur \"S'abonner\" pour en créer un nouveau.");
      }
      throw new Error(portal.error.message);
    }

    res.status(200).json({ url: portal.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
