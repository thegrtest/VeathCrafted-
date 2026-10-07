import { renderOwnerEmailHtml, renderOwnerEmailText, type OwnerEmail } from "./email-template.ts";

export type PaidReadyOrder = {
  id: string; soapName: string; quantity: number; unitPriceCents: number; shippingCents: number;
  customerEmail: string | null; shippingName: string | null; shippingAddress: string | null;
};

function paidOrderEmail(order: PaidReadyOrder): OwnerEmail {
  let address = "Not supplied";
  if (order.shippingAddress) {
    try {
      const parsed = JSON.parse(order.shippingAddress) as Record<string, string | null>;
      address = [parsed.line1, parsed.line2, parsed.city, parsed.state, parsed.postal_code, parsed.country].filter(Boolean).join(", ") || "Not supplied";
    } catch {}
  }
  return {
    category: "Paid ready-made order",
    title: "A soap bar was purchased",
    summary: `Stripe reported payment for ${order.quantity} ${order.quantity === 1 ? "bar" : "bars"} of ${order.soapName}.`,
    reference: order.id,
    sections: [
      { title: "Order summary", rows: [
        { label: "Soap", value: order.soapName },
        { label: "Bars", value: String(order.quantity) },
        { label: "Soap subtotal", value: `$${((order.unitPriceCents * order.quantity) / 100).toFixed(2)}` },
        { label: "Shipping", value: `$${(order.shippingCents / 100).toFixed(2)}` },
        { label: "Total paid", value: `$${((order.unitPriceCents * order.quantity + order.shippingCents) / 100).toFixed(2)}` },
      ] },
      { title: "Customer & delivery", rows: [
        { label: "Customer", value: order.shippingName || "Not supplied" },
        { label: "Email", value: order.customerEmail || "Not supplied" },
        { label: "Ship to", value: address },
      ] },
    ],
    nextStep: "Confirm the payment in Stripe before packing. Ship to the address above and keep the order reference with the batch.",
  };
}

export function formatPaidOrder(order: PaidReadyOrder): string {
  return renderOwnerEmailText(paidOrderEmail(order));
}

export function formatPaidOrderHtml(order: PaidReadyOrder): string {
  return renderOwnerEmailHtml(paidOrderEmail(order));
}

export async function sendPaidOrderNotice(config: { apiKey?: string; from?: string; to?: string }, order: PaidReadyOrder, transport: typeof fetch = fetch): Promise<boolean> {
  const recipients = (config.to ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  if (!config.apiKey || !config.from || !recipients.length) return false;
  try {
    const response = await transport("https://api.resend.com/emails", { method: "POST", headers: {
      Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `veath-ready/${order.id}`,
    }, body: JSON.stringify({ from: config.from, to: recipients,
      ...(order.customerEmail ? { reply_to: order.customerEmail } : {}),
      subject: `Veath Crafted · Paid order #${order.id.slice(0, 8).toUpperCase()}`,
      text: formatPaidOrder(order), html: formatPaidOrderHtml(order) }), signal: AbortSignal.timeout(8000) });
    return response.ok;
  } catch { return false; }
}
