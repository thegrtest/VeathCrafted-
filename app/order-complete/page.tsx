import { env } from "cloudflare:workers";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order status | Veath Crafted", robots: { index: false, follow: false } };

export default async function OrderComplete({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  const order = env.DB && sessionId?.startsWith("cs_")
    ? await env.DB.prepare("SELECT status FROM ready_orders WHERE stripe_session_id=?").bind(sessionId).first<{ status: string }>()
    : null;
  return <main className="completion-page"><a href="/">← Veath Crafted</a><p className="eyebrow">READY-MADE SOAP</p>
    <h1>{order?.status === "paid" ? "Your order is in." : order?.status === "pending" ? "We’re confirming payment." : "Check your order in Stripe."}</h1>
    <p>{order?.status === "paid" ? "Stripe confirmed your payment. We’ll prepare your bars and use the contact information from checkout for shipping updates." : order?.status === "pending" ? "Your checkout has returned to the shop. Payment confirmation may take a moment; Stripe will also send a receipt if enabled on your account." : "We could not find a confirmed order at this link. If you paid, check your Stripe receipt or contact us so we can look it up."}</p>
    <a className="button button-dark" href="/">Return to the shop</a>
  </main>;
}
