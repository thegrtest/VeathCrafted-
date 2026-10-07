export type CheckoutItem = { name: string; description: string; ingredientsText: string; priceCents: number };

export function checkoutShippingCents(value: string | undefined): number | null {
  if (!value || !/^\d{1,5}$/.test(value)) return null;
  const cents = Number(value);
  return cents <= 50000 ? cents : null;
}

export function checkoutIsReady(config: { enabled?: string; key?: string; webhookSecret?: string; shipping?: string }): boolean {
  return config.enabled === "1" && Boolean(config.key && config.webhookSecret) && checkoutShippingCents(config.shipping) !== null;
}

export async function createStripeCheckout(input: {
  key: string; orderId: string; item: CheckoutItem; quantity: number; shippingCents: number;
  expiresAt: number; origin: string;
}, transport: typeof fetch = fetch): Promise<{ id: string; url: string }> {
  const params = new URLSearchParams({
    mode: "payment",
    "payment_method_types[0]": "card",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(input.item.priceCents),
    "line_items[0][price_data][product_data][name]": input.item.name,
    "line_items[0][price_data][product_data][description]": `Ingredients: ${input.item.ingredientsText.replace(/\s+/g, " ").slice(0, 350)}`,
    "line_items[0][quantity]": String(input.quantity),
    "shipping_address_collection[allowed_countries][0]": "US",
    "shipping_options[0][shipping_rate_data][type]": "fixed_amount",
    "shipping_options[0][shipping_rate_data][fixed_amount][amount]": String(input.shippingCents),
    "shipping_options[0][shipping_rate_data][fixed_amount][currency]": "usd",
    "shipping_options[0][shipping_rate_data][display_name]": "Standard US shipping",
    success_url: `${input.origin}/order-complete?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/shop#ready-soaps`,
    client_reference_id: input.orderId,
    "metadata[order_id]": input.orderId,
    expires_at: String(input.expiresAt),
  });
  const response = await transport("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.key}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `veath-checkout/${input.orderId}` },
    body: params,
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Stripe checkout rejected (${response.status}).`);
  const session = await response.json() as { id?: string; url?: string };
  if (!session.id?.startsWith("cs_") || !session.url?.startsWith("https://checkout.stripe.com/")) throw new Error("Stripe did not return a valid checkout session.");
  return { id: session.id, url: session.url };
}

export async function verifyStripeSignature(body: string, header: string | null, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): Promise<boolean> {
  if (!header || !secret) return false;
  const parts = header.split(",").map((part) => part.trim());
  const timestamp = Number(parts.find((part) => part.startsWith("t="))?.slice(2));
  if (!Number.isInteger(timestamp) || Math.abs(nowSeconds - timestamp) > 300) return false;
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3)).filter((value) => /^[0-9a-f]{64}$/i.test(value));
  if (!signatures.length) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const payload = new TextEncoder().encode(`${timestamp}.${body}`);
  for (const hex of signatures) {
    const signature = Uint8Array.from(hex.match(/../g)!, (pair) => parseInt(pair, 16));
    if (await crypto.subtle.verify("HMAC", key, signature, payload)) return true;
  }
  return false;
}
