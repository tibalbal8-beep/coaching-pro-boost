export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { priceId, successUrl, cancelUrl, userId, userEmail, customerId: existingCustomerId, kind } = req.body;
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    let customerId = existingCustomerId;

    // Le client Stripe enregistré côté Supabase peut avoir été supprimé (nettoyage manuel,
    // demande RGPD, test...) — sans vérification, Stripe renvoie "No such customer" et bloque
    // tout abonnement. On vérifie qu'il existe encore avant de le réutiliser.
    if (customerId) {
      const checkRes = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
        headers: { "Authorization": `Bearer ${stripeKey}` },
      });
      if (!checkRes.ok) customerId = null;
      else {
        // Stripe répond 200 pour un client SUPPRIMÉ (objet avec deleted: true) : sans ce test, la création de session échoue ensuite avec « No such customer ».
        const cust = await checkRes.json().catch(() => ({}));
        if (cust.deleted) customerId = null;
      }
    }

    const makeCustomer = async () => {
      const customerRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: { "Authorization": `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email: userEmail, "metadata[supabase_uid]": userId }),
      });
      const customer = await customerRes.json();
      if (customer.error) throw new Error(customer.error.message);
      return customer.id;
    };
    const makeSession = (cust) => fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        customer: cust,
        mode: kind === "pack" ? "payment" : "subscription",
        "payment_method_types[0]": "card",
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        success_url: successUrl,
        cancel_url: cancelUrl,
        locale: "fr",
        allow_promotion_codes: "true",
        "metadata[plan]": kind === "pack" ? "pack" : kind === "analysis" ? "analysis" : "premium",
        ...(kind === "pack" ? {} : { "subscription_data[metadata][plan]": kind === "analysis" ? "analysis" : "premium" }),
      }),
    }).then(r => r.json());

    if (!customerId) customerId = await makeCustomer();
    let session = await makeSession(customerId);
    // Client introuvable malgré le contrôle (autre mode Stripe, suppression récente…) : on en recrée un et on réessaie une fois
    if (session.error && /No such customer/i.test(session.error.message || "")) {
      customerId = await makeCustomer();
      session = await makeSession(customerId);
    }

    if (session.error) throw new Error(session.error.message);

    res.status(200).json({ url: session.url, customerId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
