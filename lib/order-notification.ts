type OrderNotification = {
  customerName: string;
  customerEmail: string;
  deliveryZip: string;
  scent: string;
  texture: string;
  quantity: number;
  hardness: number | null;
  waterSupplier: string | null;
  waterSource: string;
  notes: string;
  consultationRequested: boolean;
  consultationNotes: string;
};

type MailConfig = {
  apiKey?: string;
  from?: string;
  to?: string;
};

export type NotificationResult = "accepted" | "unavailable";

export function formatOrderNotification(order: OrderNotification, id: string, estimatedTotalCents: number) {
  return [
    `Veath Crafted ${order.consultationRequested ? "consultation and soap request" : "soap request"}`,
    `Reference: ${id}`,
    "",
    `Customer: ${order.customerName}`,
    `Reply to: ${order.customerEmail}`,
    `Delivery ZIP: ${order.deliveryZip}`,
    `Bars: ${order.quantity}`,
    estimatedTotalCents > 0 ? `Starting estimate: $${(estimatedTotalCents / 100).toFixed(2)} (before shipping or custom changes)` : "Price: quote after reviewing the request",
    `Scent: ${order.scent}`,
    `Texture: ${order.texture}`,
    "",
    `Water used when washing: ${order.waterSource}`,
    `Water supplier: ${order.waterSupplier || "not provided"}`,
    `Hardness: ${order.hardness === null ? "not provided" : `${order.hardness} mg/L as CaCO3`}`,
    `Water and ingredient notes: ${order.notes || "none"}`,
    `Consultation requested: ${order.consultationRequested ? "yes" : "no"}`,
    `Consultation topics: ${order.consultationNotes || "none"}`,
    "",
    "This is a request, not a paid order. Reply to the customer to confirm the recipe, timing, shipping, and quote.",
  ].join("\n");
}

export async function sendOrderNotification(
  config: MailConfig,
  order: OrderNotification,
  id: string,
  estimatedTotalCents: number,
  transport: typeof fetch = fetch,
): Promise<NotificationResult> {
  const recipients = (config.to ?? "").split(",").map((address) => address.trim()).filter(Boolean);
  if (!config.apiKey || !config.from || !recipients.length) return "unavailable";

  try {
    const response = await transport("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `veath-order/${id}`,
      },
      body: JSON.stringify({
        from: config.from,
        to: recipients,
        reply_to: order.customerEmail,
        subject: `${order.consultationRequested ? "Consultation + soap request" : "New soap request"} · ${id.slice(0, 8).toUpperCase()}`,
        text: formatOrderNotification(order, id, estimatedTotalCents),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error("Order notification rejected", { orderId: id, status: response.status });
      return "unavailable";
    }
    return "accepted";
  } catch (error) {
    console.error("Order notification failed", { orderId: id, error: error instanceof Error ? error.name : "unknown" });
    return "unavailable";
  }
}
