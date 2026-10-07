export type PaidReadyOrder = {
  id: string; soapName: string; quantity: number; unitPriceCents: number; shippingCents: number;
  customerEmail: string | null; shippingName: string | null; shippingAddress: string | null;
};

export function formatPaidOrder(order: PaidReadyOrder): string {
  let address = "not supplied";
  if (order.shippingAddress) {
    try {
      const parsed = JSON.parse(order.shippingAddress) as Record<string, string | null>;
      address = [parsed.line1, parsed.line2, parsed.city, parsed.state, parsed.postal_code, parsed.country].filter(Boolean).join(", ") || "not supplied";
    } catch {}
  }
  return [
    "Veath Crafted ready-made soap purchase",
    `Reference: ${order.id}`,
    "",
    `Soap: ${order.soapName}`,
    `Bars: ${order.quantity}`,
    `Soap subtotal: $${((order.unitPriceCents * order.quantity) / 100).toFixed(2)}`,
    `Shipping: $${(order.shippingCents / 100).toFixed(2)}`,
    `Total paid: $${((order.unitPriceCents * order.quantity + order.shippingCents) / 100).toFixed(2)}`,
    "",
    `Customer: ${order.shippingName || "not supplied"}`,
    `Email: ${order.customerEmail || "not supplied"}`,
    `Ship to: ${address}`,
    "",
    "Stripe reported this Checkout Session as paid. Verify it in Stripe before shipping.",
  ].join("\n");
}

export async function sendPaidOrderNotice(config: { apiKey?: string; from?: string; to?: string }, order: PaidReadyOrder, transport: typeof fetch = fetch): Promise<boolean> {
  const recipients = (config.to ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  if (!config.apiKey || !config.from || !recipients.length) return false;
  try {
    const response = await transport("https://api.resend.com/emails", { method: "POST", headers: {
      Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `veath-ready/${order.id}`,
    }, body: JSON.stringify({ from: config.from, to: recipients, subject: `Paid soap order · ${order.id.slice(0, 8).toUpperCase()}`, text: formatPaidOrder(order) }), signal: AbortSignal.timeout(8000) });
    return response.ok;
  } catch { return false; }
}
