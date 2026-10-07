import { renderOwnerEmailHtml, renderOwnerEmailText, type OwnerEmail } from "./email-template.ts";
import { shopContent } from "./shop-content.ts";

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
  preferredIngredients: string[];
  avoidedIngredients: string[];
  consultationRequested: boolean;
  consultationNotes: string;
};

type MailConfig = {
  apiKey?: string;
  from?: string;
  to?: string;
};

export type NotificationResult = "accepted" | "unavailable";

function orderEmail(order: OrderNotification, id: string, estimatedTotalCents: number): OwnerEmail {
  const scent = shopContent.scents.find((item) => item.id === order.scent)?.label || order.scent;
  const texture = shopContent.textures.find((item) => item.id === order.texture)?.label || order.texture;
  const waterSource: Record<string, string> = { public: "Public water", "private-well": "Private well", softened: "Softened water", unknown: "Not sure" };
  return {
    category: order.consultationRequested ? "Consultation + custom soap request" : "Custom soap request",
    title: order.consultationRequested ? "A new consultation request" : "A new soap request",
    summary: `${order.customerName} has shared their preferences for a made-to-order soap. This request has not been paid.`,
    reference: id,
    sections: [
      { title: "Customer & request", rows: [
        { label: "Customer", value: order.customerName },
        { label: "Reply to", value: order.customerEmail },
        { label: "Delivery ZIP", value: order.deliveryZip },
        { label: "Bars requested", value: String(order.quantity) },
        estimatedTotalCents > 0
          ? { label: "Starting estimate", value: `$${(estimatedTotalCents / 100).toFixed(2)} before shipping or custom changes` }
          : { label: "Price", value: "quote after reviewing the request" },
      ] },
      { title: "Soap preferences", rows: [
        { label: "Scent", value: scent },
        { label: "Texture", value: texture },
        { label: "Please include", value: order.preferredIngredients.join(", ") || "No preference" },
        { label: "Please avoid", value: order.avoidedIngredients.join(", ") || "None listed" },
      ] },
      { title: "Water & other notes", rows: [
        { label: "Water source", value: waterSource[order.waterSource] || order.waterSource },
        { label: "Supplier", value: order.waterSupplier || "Not provided" },
        { label: "Hardness", value: order.hardness === null ? "Not provided" : `${order.hardness} mg/L as CaCO3` },
        { label: "Notes", value: order.notes || "None" },
      ] },
      ...(order.consultationRequested ? [{ title: "Consultation", rows: [
        { label: "Topics to discuss", value: order.consultationNotes || "No topics provided" },
      ] }] : []),
    ],
    nextStep: "Reply to this email to confirm the formula, timing, shipping, and final quote before making the soap.",
  };
}

export function formatOrderNotification(order: OrderNotification, id: string, estimatedTotalCents: number): string {
  return renderOwnerEmailText(orderEmail(order, id, estimatedTotalCents));
}

export function formatOrderNotificationHtml(order: OrderNotification, id: string, estimatedTotalCents: number): string {
  return renderOwnerEmailHtml(orderEmail(order, id, estimatedTotalCents));
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
        subject: `Veath Crafted · ${order.consultationRequested ? "Consultation request" : "Soap request"} #${id.slice(0, 8).toUpperCase()}`,
        text: formatOrderNotification(order, id, estimatedTotalCents),
        html: formatOrderNotificationHtml(order, id, estimatedTotalCents),
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
