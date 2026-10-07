import assert from "node:assert/strict";
import test from "node:test";
import { formatPaidOrder, formatPaidOrderHtml, sendPaidOrderNotice } from "../lib/ready-order-notification.ts";

const order = {
  id: "a1b2c3d4-1111-2222-3333-444444444444",
  soapName: "Oat & olive bar",
  quantity: 2,
  unitPriceCents: 1200,
  shippingCents: 450,
  customerEmail: "customer@example.com",
  shippingName: "Sample Customer",
  shippingAddress: JSON.stringify({ line1: "123 Example St", city: "Chicago", state: "IL", postal_code: "60614", country: "US" }),
};

test("paid order email gives the owner the amount and delivery details", async () => {
  let payload;
  const sent = await sendPaidOrderNotice({ apiKey: "test-key", from: "Veath Crafted <orders@veathcrafted.com>",
    to: "cveath@icloud.com,daughertybrad56@gmail.com" }, order, async (_url, options) => {
    payload = JSON.parse(options.body);
    return Response.json({ id: "test-message" });
  });
  assert.equal(sent, true);
  assert.deepEqual(payload.to, ["cveath@icloud.com", "daughertybrad56@gmail.com"]);
  assert.equal(payload.reply_to, "customer@example.com");
  for (const expected of ["$28.50", "123 Example St", "Oat & olive bar"]) {
    assert.ok(payload.text.includes(expected), `missing ${expected}`);
    assert.ok(payload.html.includes(expected.replace("&", "&amp;")), `missing ${expected} in HTML`);
  }
  assert.match(formatPaidOrder(order), /Verify|Confirm the payment in Stripe/);
  assert.match(formatPaidOrderHtml(order), /Next step/);
});
