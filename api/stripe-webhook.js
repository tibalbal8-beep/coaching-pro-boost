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
    if (session.mode === "subscription" && session.payment_status === "paid") {
      const customerId = session.customer;
      const subId = session.subscription;
      const sub = await stripe.subscriptions.retrieve(subId);
      const premiumUntil = new Date(sub.current_period_end * 1000).toISOString();
      await supabase.from("profiles")
        .update({ is_premium: true, stripe_subscription_id: subId, premium_until: premiumUntil })
        .eq("stripe_customer_id", customerId);
    }
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const sub = event.data.object;
    const isActive = sub.status === "active" || sub.status === "trialing";
    const premiumUntil = new Date(sub.current_period_end * 1000).toISOString();
    await supabase.from("profiles")
      .update({ is_premium: isActive, stripe_subscription_id: sub.id, premium_until: premiumUntil })
      .eq("stripe_customer_id", sub.customer);
  }

  if (event.type === "customer.subscription.deleted" || event.type === "invoice.payment_failed") {
    const obj = event.data.object;
    await supabase.from("profiles")
      .update({ is_premium: false, stripe_subscription_id: null, premium_until: null })
      .eq("stripe_customer_id", obj.customer);
  }

  res.status(200).json({ received: true });
}
