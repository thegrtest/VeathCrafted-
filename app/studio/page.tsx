import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { env } from "cloudflare:workers";
import { chatGPTSignInPath, getChatGPTUser } from "@/app/chatgpt-auth";
import { isAdminEmail } from "@/lib/admin-auth";
import { getIngredients, getReadySoaps, getRecentPurchases } from "@/lib/catalog";
import { getHomeHero } from "@/lib/home-hero-server";
import { checkoutIsReady } from "@/lib/stripe-checkout";
import CatalogManager from "@/components/CatalogManager";
import HomeImageManager from "@/components/HomeImageManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shop studio | Veath Crafted", robots: { index: false, follow: false } };

export default async function Studio() {
  const user = await getChatGPTUser();
  if (!user) redirect(chatGPTSignInPath("/studio"));
  if (!isAdminEmail(user.email)) return <main className="studio-page"><a href="/">← Veath Crafted</a><h1>Access denied</h1><p>This account is not allowed to manage the shop.</p></main>;

  const checkoutReady = checkoutIsReady({ enabled: env.CHECKOUT_ENABLED, key: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET, shipping: env.SHIPPING_CENTS });
  const [hero, ingredients, soaps, purchases] = await Promise.all([getHomeHero(), getIngredients(true), getReadySoaps(true), getRecentPurchases()]);

  return <main className="studio-page">
    <header className="studio-header"><a href="/">← View storefront</a><span>Signed in as {user.email}</span></header>
    <h1>Shop studio</h1>
    <p className="studio-intro">Manage what customers see on the home page, the finished soaps you offer, and the ingredients they can ask about.</p>
    <nav className="studio-nav" aria-label="Studio sections"><a href="#homepage-photo">Homepage photo</a><a href="#ready-made-editor">Ready-made soaps</a><a href="#ingredient-editor">Ingredients</a><a href="#paid-orders">Paid orders</a></nav>
    <HomeImageManager initialHero={hero}/>
    <div className="studio-catalog-heading"><h2>Products & ingredients</h2><p>Published changes appear on the public site after you save them.</p></div>
    <p className={`studio-checkout-status ${checkoutReady ? "ready" : "pending"}`}>{checkoutReady ? "Stripe Checkout is enabled. Published soaps can be purchased online." : "Stripe Checkout is awaiting setup. Published soaps will show an email inquiry link until payment, webhook, and shipping settings are tested and enabled."}</p>
    <CatalogManager initialIngredients={ingredients} initialSoaps={soaps}/>
    <section className="studio-purchases" id="paid-orders"><div className="studio-section-head"><div><h2>Recent paid orders</h2><p>Check Stripe before shipping. Reload this page to see new orders.</p></div></div>
      {purchases.length ? <div className="purchase-list">{purchases.map((order) => {
        let address = "Address available in Stripe";
        try {
          const value = JSON.parse(order.shippingAddress || "null") as Record<string, string | null> | null;
          if (value) address = [value.line1, value.line2, value.city, value.state, value.postal_code, value.country].filter(Boolean).join(", ");
        } catch {}
        return <div className="purchase-row" key={order.id}><div><strong>{order.soapName} × {order.quantity}</strong><small>{order.paidAt ? new Date(order.paidAt).toLocaleString() : "Paid"} · {order.id.slice(0, 8).toUpperCase()}</small></div><div><strong>{order.shippingName || "Customer"}</strong><small>{order.customerEmail || "Email in Stripe"}</small><small>{address}</small></div></div>;
      })}</div> : <p className="fine-print">No paid orders yet.</p>}
    </section>
  </main>;
}
