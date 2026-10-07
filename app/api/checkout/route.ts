import { env } from "cloudflare:workers";
import { z } from "zod";
import { isSameOriginWrite } from "@/lib/admin-auth";
import { checkoutIsReady, checkoutShippingCents, createStripeCheckout } from "@/lib/stripe-checkout";

const schema = z.object({ soapId: z.string().uuid(), quantity: z.number().int().min(1).max(6) });
const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!isSameOriginWrite(request)) return Response.json({ error: "Request origin not allowed." }, { status: 403, headers: noStore });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Choose a valid soap and quantity." }, { status: 400, headers: noStore });
  const db = env.DB;
  const shippingCents = checkoutShippingCents(env.SHIPPING_CENTS);
  if (!db || !checkoutIsReady({ enabled: env.CHECKOUT_ENABLED, key: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET, shipping: env.SHIPPING_CENTS }) || shippingCents === null) {
    return Response.json({ error: "Online checkout is not ready yet. Please contact us about this batch." }, { status: 503, headers: noStore });
  }
  const { soapId, quantity } = parsed.data;
  const soap = await db.prepare(`SELECT id, name, description, ingredients_text, price_cents, stock FROM ready_soaps WHERE id=? AND active=1`).bind(soapId)
    .first<{ id: string; name: string; description: string; ingredients_text: string; price_cents: number; stock: number }>();
  if (!soap || soap.stock < quantity || soap.price_cents < 1) return Response.json({ error: "This batch is no longer available in that quantity." }, { status: 409, headers: noStore });
  const reserved = await db.prepare("UPDATE ready_soaps SET stock=stock-? WHERE id=? AND active=1 AND stock>=?").bind(quantity, soapId, quantity).run();
  if (!reserved.meta.changes) return Response.json({ error: "This batch just sold out. Please refresh the page." }, { status: 409, headers: noStore });
  const id = crypto.randomUUID();
  const now = new Date();
  const expiresAt = Math.floor(now.getTime() / 1000) + 31 * 60;
  let inserted = false;
  let sessionId: string | null = null;
  try {
    await db.prepare(`INSERT INTO ready_orders
      (id, soap_id, soap_name, quantity, unit_price_cents, shipping_cents, status, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`)
      .bind(id, soapId, soap.name, quantity, soap.price_cents, shippingCents, now.toISOString(), new Date(expiresAt * 1000).toISOString()).run();
    inserted = true;
    const session = await createStripeCheckout({
      key: env.STRIPE_SECRET_KEY!, orderId: id,
      item: { name: soap.name, description: soap.description, ingredientsText: soap.ingredients_text, priceCents: soap.price_cents },
      quantity, shippingCents, expiresAt, origin: new URL(request.url).origin,
    });
    sessionId = session.id;
    const linked = await db.prepare("UPDATE ready_orders SET stripe_session_id=? WHERE id=? AND status='pending'").bind(session.id, id).run();
    if (!linked.meta.changes) throw new Error("Could not link the checkout session.");
    return Response.json({ url: session.url }, { headers: noStore });
  } catch (error) {
    console.error("Could not start checkout", { orderId: id, error: error instanceof Error ? error.message : "unknown" });
    let safeToRelease = !sessionId;
    if (sessionId) {
      try {
        const expired = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}/expire`, {
          method: "POST", headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }, signal: AbortSignal.timeout(8000),
        });
        safeToRelease = expired.ok;
      } catch {}
    }
    if (safeToRelease) {
      if (inserted) {
        await db.batch([
          db.prepare(`UPDATE ready_soaps SET stock=stock+? WHERE id=? AND EXISTS
            (SELECT 1 FROM ready_orders WHERE id=? AND status='pending')`).bind(quantity, soapId, id),
          db.prepare("UPDATE ready_orders SET status='failed' WHERE id=? AND status='pending'").bind(id),
        ]).catch(() => {});
      } else await db.prepare("UPDATE ready_soaps SET stock=stock+? WHERE id=?").bind(quantity, soapId).run().catch(() => {});
    }
    return Response.json({ error: "Checkout could not start. Please try again." }, { status: 503, headers: noStore });
  }
}
