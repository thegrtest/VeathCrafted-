import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { checkoutIsReady, createStripeCheckout, verifyStripeSignature } from "../lib/stripe-checkout.ts";

test("checkout stays disabled until payment, webhook, shipping, and launch settings are present", () => {
  const config = { enabled: "1", key: "sk_test_example", webhookSecret: "whsec_example", shipping: "500" };
  assert.equal(checkoutIsReady(config), true);
  assert.equal(checkoutIsReady({ ...config, enabled: "0" }), false);
  assert.equal(checkoutIsReady({ ...config, webhookSecret: "" }), false);
  assert.equal(checkoutIsReady({ ...config, shipping: "" }), false);
});

test("Stripe session uses server price and US shipping", async () => {
  let sent;
  const result = await createStripeCheckout({
    key: "sk_test_example", orderId: "order-123",
    item: { name: "Oat bar", description: "Fresh batch", ingredientsText: "Olive oil\nOats", priceCents: 1200 },
    quantity: 2, shippingCents: 450, expiresAt: 1800000000, origin: "https://veathcrafted.com",
  }, async (_url, options) => {
    sent = options;
    return Response.json({ id: "cs_test_123", url: "https://checkout.stripe.com/c/pay/example" });
  });
  assert.equal(result.id, "cs_test_123");
  const body = new URLSearchParams(sent.body);
  assert.equal(body.get("line_items[0][price_data][unit_amount]"), "1200");
  assert.equal(body.get("line_items[0][quantity]"), "2");
  assert.equal(body.get("shipping_options[0][shipping_rate_data][fixed_amount][amount]"), "450");
  assert.equal(body.get("shipping_address_collection[allowed_countries][0]"), "US");
  assert.equal(body.get("client_reference_id"), "order-123");
  assert.equal(body.get("success_url"), "https://veathcrafted.com/order-complete?session_id={CHECKOUT_SESSION_ID}");
});

test("webhook verifier checks raw content, signed timestamp, and secret", async () => {
  const body = '{"type":"checkout.session.completed"}';
  const timestamp = 1700000000;
  const secret = "whsec_test";
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  const header = `t=${timestamp},v1=${signature}`;
  assert.equal(await verifyStripeSignature(body, header, secret, timestamp), true);
  assert.equal(await verifyStripeSignature(body + " ", header, secret, timestamp), false);
  assert.equal(await verifyStripeSignature(body, header, "other-secret", timestamp), false);
  assert.equal(await verifyStripeSignature(body, header, secret, timestamp + 301), false);
});
