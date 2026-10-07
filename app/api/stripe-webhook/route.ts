import { env } from "cloudflare:workers";
import { sendPaidOrderNotice, type PaidReadyOrder } from "@/lib/ready-order-notification";
import { verifyStripeSignature } from "@/lib/stripe-checkout";

type StripeSession = {
  id: string; client_reference_id?: string | null; metadata?: { order_id?: string };
  mode?: string; payment_status?: string; amount_subtotal?: number; amount_total?: number;
  customer_details?: { email?: string | null; name?: string | null } | null;
  shipping_details?: { name?: string | null; address?: Record<string, string | null> | null } | null;
  collected_information?: { shipping_details?: { name?: string | null; address?: Record<string, string | null> | null } | null } | null;
};
type StripeEvent = { type?: string; data?: { object?: StripeSession } };
type OrderRow = PaidReadyOrder & { status: string; stripeSessionId: string | null; notificationSentAt: string | null };

export async function POST(request: Request) {
  const db = env.DB;
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!db || !secret) return new Response("Webhook unavailable", { status: 503 });
  if (Number(request.headers.get("content-length") || 0) > 100_000) return new Response("Too large", { status: 413 });
  const body = await request.text();
  if (body.length > 100_000 || !await verifyStripeSignature(body, request.headers.get("stripe-signature"), secret)) {
    return new Response("Invalid signature", { status: 400 });
  }
  let event: StripeEvent;
  try { event = JSON.parse(body) as StripeEvent; } catch { return new Response("Invalid event", { status: 400 }); }
  const session = event.data?.object;
  if (!session?.id?.startsWith("cs_")) return new Response("OK");
  const orderId = session.metadata?.order_id || session.client_reference_id;
  if (!orderId) return new Response("OK");
  try {
    const findOrder = () => db.prepare(`SELECT id, soap_id AS soapId, soap_name AS soapName, quantity,
      unit_price_cents AS unitPriceCents, shipping_cents AS shippingCents, status,
      stripe_session_id AS stripeSessionId, customer_email AS customerEmail,
      shipping_name AS shippingName, shipping_address AS shippingAddress,
      notification_sent_at AS notificationSentAt
      FROM ready_orders WHERE id=? AND stripe_session_id=?`).bind(orderId, session.id)
      .first<OrderRow & { soapId: string }>();
    let row = await findOrder();
    if (!row) {
      const linked = await db.prepare("UPDATE ready_orders SET stripe_session_id=? WHERE id=? AND stripe_session_id IS NULL AND status='pending'")
        .bind(session.id, orderId).run();
      if (linked.meta.changes) row = await findOrder();
    }
    if (!row) return new Response("Unknown session", { status: 400 });
    if (event.type === "checkout.session.expired") {
      await db.batch([
        db.prepare(`UPDATE ready_soaps SET stock=stock+? WHERE id=? AND EXISTS
          (SELECT 1 FROM ready_orders WHERE id=? AND status='pending')`).bind(row.quantity, row.soapId, orderId),
        db.prepare("UPDATE ready_orders SET status='expired' WHERE id=? AND status='pending'").bind(orderId),
      ]);
      return new Response("OK");
    }
    if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") return new Response("OK");
    if (session.mode !== "payment" || session.payment_status !== "paid" ||
      session.amount_subtotal !== row.unitPriceCents * row.quantity ||
      session.amount_total !== row.unitPriceCents * row.quantity + row.shippingCents) {
      console.error("Stripe order mismatch", { orderId });
      return new Response("Order mismatch", { status: 422 });
    }
    const shipping = session.collected_information?.shipping_details || session.shipping_details;
    const email = session.customer_details?.email || null;
    if (row.status === "pending") {
      await db.prepare(`UPDATE ready_orders SET status='paid', customer_email=?, shipping_name=?, shipping_address=?, paid_at=?
        WHERE id=? AND stripe_session_id=? AND status='pending'`)
        .bind(email, shipping?.name || session.customer_details?.name || null,
          shipping?.address ? JSON.stringify(shipping.address) : null, new Date().toISOString(), orderId, session.id).run();
    }
    const paid = await db.prepare(`SELECT id, soap_name AS soapName, quantity, unit_price_cents AS unitPriceCents,
      shipping_cents AS shippingCents, customer_email AS customerEmail, shipping_name AS shippingName,
      shipping_address AS shippingAddress, status, notification_sent_at AS notificationSentAt
      FROM ready_orders WHERE id=?`).bind(orderId).first<OrderRow>();
    if (!paid || paid.status !== "paid") return new Response("Order not payable", { status: 422 });
    if (!paid.notificationSentAt) {
      const sent = await sendPaidOrderNotice({ apiKey: env.RESEND_API_KEY, from: env.ORDER_EMAIL_FROM, to: env.ORDER_EMAIL_TO }, paid);
      if (!sent) return new Response("Notification delayed", { status: 503 });
      await db.prepare("UPDATE ready_orders SET notification_sent_at=? WHERE id=? AND notification_sent_at IS NULL")
        .bind(new Date().toISOString(), orderId).run();
    }
    return new Response("OK");
  } catch (error) {
    console.error("Stripe webhook handling failed", error);
    return new Response("Temporary error", { status: 503 });
  }
}
