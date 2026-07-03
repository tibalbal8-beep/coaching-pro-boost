export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { priceId, successUrl, cancelUrl, userId, userEmail, customerId: existingCustomerId } = req.body;
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    let customerId = existingCustomerId;

    if (!customerId) {
      const customerRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          email: userEmail,
          "metadata[supabase_uid]": userId,
        }),
      });
      const customer = await customerRes.json();
      if (customer.error) throw new Error(customer.error.message);
      customerId = customer.id;
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
    if (session.error) throw new Error(session.error.message);

    res.status(200).json({ url: session.url, customerId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
