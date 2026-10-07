import assert from "node:assert/strict";
import test from "node:test";
import { formatOrderNotification, formatOrderNotificationHtml, sendOrderNotification } from "../lib/order-notification.ts";

const order = {
  customerName: "Sample Customer",
  customerEmail: "customer@example.com",
  deliveryZip: "60614",
  scent: "unscented",
  texture: "smooth",
  quantity: 2,
  hardness: 137,
  waterSupplier: "CHICAGO (EPA IL0316000)",
  waterSource: "public",
  notes: "Soap barely lathers; avoid lavender",
  preferredIngredients: ["Shea butter"],
  avoidedIngredients: ["Coconut oil"],
  consultationRequested: true,
  consultationNotes: "Discuss harder water",
};

test("owner notice includes the request details needed to reply", () => {
  const body = formatOrderNotification(order, "abc-123", 2400);
  for (const expected of ["abc-123", "customer@example.com", "60614", "$24.00", "137 mg/L", "CHICAGO", "avoid lavender", "Discuss harder water", "Shea butter", "Coconut oil"]) {
    assert.ok(body.includes(expected), `missing ${expected}`);
  }
});

test("quote-only requests do not imply an example price", () => {
  const body = formatOrderNotification(order, "abc-123", 0);
  assert.match(body, /Price: quote after reviewing the request/);
  assert.doesNotMatch(body, /\$0\.00/);
});

test("email is sent to both configured inboxes with a stable request key", async () => {
  let call;
  const transport = async (url, options) => {
    call = { url, options };
    return new Response(JSON.stringify({ id: "resend-message-id" }), { status: 200 });
  };
  const result = await sendOrderNotification({
    apiKey: "test-key",
    from: "Veath Crafted <orders@veathcrafted.com>",
    to: "cveath@icloud.com, daughertybrad56@gmail.com",
  }, order, "abc-123", 2400, transport);
  assert.equal(result, "accepted");
  assert.equal(call.url, "https://api.resend.com/emails");
  assert.equal(call.options.headers["Idempotency-Key"], "veath-order/abc-123");
  const payload = JSON.parse(call.options.body);
  assert.deepEqual(payload.to, ["cveath@icloud.com", "daughertybrad56@gmail.com"]);
  assert.equal(payload.reply_to, "customer@example.com");
  assert.match(payload.subject, /Consultation/);
  assert.match(payload.text, /NEXT STEP: Reply to this email/);
  assert.match(payload.html, /A new consultation request/);
  assert.match(payload.html, /Discuss harder water/);
});

test("HTML notification escapes customer supplied content", () => {
  const html = formatOrderNotificationHtml({ ...order, notes: '<img src=x onerror="alert(1)">' }, "abc-123", 0);
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.doesNotMatch(html, /<img src=x/);
});

test("missing configuration and rejected sends are reported without throwing", async () => {
  assert.equal(await sendOrderNotification({}, order, "abc-123", 2400), "unavailable");
  const originalError = console.error;
  console.error = () => {};
  try {
    const result = await sendOrderNotification({ apiKey: "test-key", from: "orders@example.com", to: "cveath@icloud.com" }, order, "abc-123", 2400,
      async () => new Response("rejected", { status: 403 }));
    assert.equal(result, "unavailable");
  } finally {
    console.error = originalError;
  }
});
