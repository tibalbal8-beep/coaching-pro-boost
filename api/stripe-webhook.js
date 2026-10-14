import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// Pack « Analyse » (Scouting report + Mon équipe) : abonnement annuel distinct du Premium, reconnu à son prix Stripe.
const ANALYSIS_PRICE = process.env.STRIPE_PRICE_ANALYSIS_YEARLY || "price_1UPOYzLH4wEQmwblCEjCGsT5";
const isAnalysisSub = (sub) => !!ANALYSIS_PRICE && (sub.items?.data || []).some(i => i.price?.id === ANALYSIS_PRICE);

// Accorde l'accès jusqu'à `untilISO` sans jamais raccourcir un accès déjà offert (ex. gratuité des abonnés Premium jusqu'au 30 juin).
async function grantAnalysis(supabase, customerId, untilISO, subId) {
  const { data: p } = await supabase.from("profiles").select("analysis_until").eq("stripe_customer_id", customerId).maybeSingle();
  const cur = p?.analysis_until ? new Date(p.analysis_until).getTime() : 0;
  const next = Math.max(cur, new Date(untilISO).getTime());
  await supabase.from("profiles")
    .update({ analysis_until: new Date(next).toISOString(), analysis_subscription_id: subId })
    .eq("stripe_customer_id", customerId);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const rawBody = await getRawBody(req);
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: "Webhook signature invalide: " + err.message });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    // Achat unique du pack « 30 exercices + 15 plays » : accès à vie
    // (« no_payment_required » = total à 0 € grâce à un code promo à 100 %, utile pour tester sans frais)
    if (session.mode === "payment" && (session.payment_status === "paid" || session.payment_status === "no_payment_required") && session.metadata?.plan === "pack") {
      await supabase.from("profiles")
        .update({ has_pack: true, pack_purchased_at: new Date().toISOString() })
        .eq("stripe_customer_id", session.customer);
    }
    if (session.mode === "subscription" && session.payment_status === "paid") {
      const customerId = session.customer;
      const subId = session.subscription;
      const sub = await stripe.subscriptions.retrieve(subId);
      const premiumUntil = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;
      if (isAnalysisSub(sub)) {
        if (premiumUntil) await grantAnalysis(supabase, customerId, premiumUntil, subId);
      } else {
        await supabase.from("profiles")
          .update({ is_premium: true, stripe_subscription_id: subId, stripe_customer_id: customerId, premium_until: premiumUntil })
          .eq("stripe_customer_id", customerId);
      }
    }
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const sub = event.data.object;
    const isActive = sub.status === "active" || sub.status === "trialing";
    const premiumUntil = sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null;
    if (isAnalysisSub(sub)) {
      if (isActive && premiumUntil) await grantAnalysis(supabase, sub.customer, premiumUntil, sub.id);
    } else {
      await supabase.from("profiles")
        .update({ is_premium: isActive, stripe_subscription_id: sub.id, premium_until: premiumUntil })
        .eq("stripe_customer_id", sub.customer);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    const now = Date.now();
    const periodEnd = sub.current_period_end ? sub.current_period_end * 1000 : 0;
    if (isAnalysisSub(sub)) {
      // Résiliation du pack Analyse : l'accès reste ouvert jusqu'à la fin de la période déjà payée.
      if (periodEnd > now) await grantAnalysis(supabase, sub.customer, new Date(periodEnd).toISOString(), null);
      else await supabase.from("profiles").update({ analysis_subscription_id: null }).eq("stripe_customer_id", sub.customer);
    } else if (periodEnd > now) {
      await supabase.from("profiles")
        .update({ is_premium: true, premium_until: new Date(periodEnd).toISOString() })
        .eq("stripe_customer_id", sub.customer);
    } else {
      await supabase.from("profiles")
        .update({ is_premium: false, stripe_subscription_id: null, premium_until: null })
        .eq("stripe_customer_id", sub.customer);
    }
  }

  if (event.type === "invoice.payment_failed") {
    const obj = event.data.object;
    const forAnalysis = !!ANALYSIS_PRICE && (obj.lines?.data || []).some(l => l.price?.id === ANALYSIS_PRICE);
    // Paiement du pack Analyse refusé : l'accès n'est simplement pas prolongé (il s'arrête à la fin de la période payée).
    if (!forAnalysis) await supabase.from("profiles")
      .update({ is_premium: false, stripe_subscription_id: null, premium_until: null })
      .eq("stripe_customer_id", obj.customer);
  }

  res.status(200).json({ received: true });
}
