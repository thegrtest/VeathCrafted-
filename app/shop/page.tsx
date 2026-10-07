import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import ReadyMadeShop from "@/components/ReadyMadeShop";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getPublicCatalog } from "@/lib/catalog";
import { checkoutIsReady } from "@/lib/stripe-checkout";
import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shop finished soaps | Veath Crafted", description: "Browse available small-batch soaps with clear ingredients and prices." };

export default async function ShopPage() {
  const { soaps } = await getPublicCatalog();
  const checkoutReady = checkoutIsReady({ enabled: env.CHECKOUT_ENABLED, key: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET, shipping: env.SHIPPING_CENTS });
  return <main><SiteHeader active="shop"/>
    <section className="page-hero shop-page-hero"><div><p className="eyebrow">THE STOREFRONT</p><h1>Finished soaps, ready when you are.</h1><p>Every available batch shows its exact ingredients, price, and quantity. Choose a finished bar here, or make a request for something personal.</p></div></section>
    {soaps.length ? <ReadyMadeShop soaps={soaps} checkoutReady={checkoutReady}/> : <section className="shop-empty"><div className="shop-empty-mark" aria-hidden="true">V</div><div><p className="eyebrow">NO BATCHES LISTED YET</p><h2>Good things take a little time.</h2><p>There are no finished bars available right now. You can still tell us what you would love in a made-to-order soap.</p><a className="button button-dark" href="/custom">Request a custom bar <ArrowRight size={18}/></a></div></section>}
    <section className="page-crosslink"><div><p className="eyebrow">WANT A DIFFERENT FORMULA?</p><h2>Tell us exactly what you prefer.</h2><p>Our custom request lets you select ingredients to include or avoid. We review the final formula and quote with you.</p></div><a className="inline-link" href="/custom">Make it yours <ArrowRight size={18}/></a></section>
    <SiteFooter/>
  </main>;
}
