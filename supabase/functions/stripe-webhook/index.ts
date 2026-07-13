import Stripe from "https://esm.sh/stripe@11.18.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-04-10" });

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature")!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch {
    return new Response("Webhook signature invalide", { status: 400 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SERVICE_ROLE_KEY")!);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode === "subscription" && session.payment_status === "paid") {
      const customerId = session.customer as string;
      const subId = session.subscription as string;
      const sub = await stripe.subscriptions.retrieve(subId);
      const premiumUntil = new Date(sub.current_period_end * 1000).toISOString();
      await supabase.from("profiles")
        .update({ is_premium: true, stripe_subscription_id: subId, premium_until: premiumUntil })
        .eq("stripe_customer_id", customerId);
    }
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = sub.customer as string;
    const isActive = sub.status === "active" || sub.status === "trialing";
    const premiumUntil = new Date(sub.current_period_end * 1000).toISOString();
    await supabase.from("profiles")
      .update({ is_premium: isActive, stripe_subscription_id: sub.id, premium_until: premiumUntil })
      .eq("stripe_customer_id", customerId);
  }

  if (event.type === "customer.subscription.deleted" || event.type === "invoice.payment_failed") {
    const obj = event.data.object as any;
    const customerId = (obj.customer as string);
    await supabase.from("profiles")
      .update({ is_premium: false, stripe_subscription_id: null, premium_until: null })
      .eq("stripe_customer_id", customerId);
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
