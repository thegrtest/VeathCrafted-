import { ArrowRight } from "lucide-react";
import Experience from "@/components/Experience";
import { shopContent } from "@/lib/shop-content";
import { getPublicCatalog } from "@/lib/catalog";
import { env } from "cloudflare:workers";
import { checkoutIsReady } from "@/lib/stripe-checkout";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { ingredients, soaps } = await getPublicCatalog();
  const baseIngredients = ingredients.filter((item) => item.inBase);
  const checkoutReady = checkoutIsReady({ enabled: env.CHECKOUT_ENABLED, key: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET, shipping: env.SHIPPING_CENTS });
  return <main id="top">
    <header className="site-header">
      <a className="brand" href="#top" aria-label={`${shopContent.name} home`}>
        <span className="brand-mark">V</span><span>{shopContent.name}</span>
      </a>
      <nav aria-label="Main navigation">
        {soaps.length > 0 && <a href="#ready-soaps">Ready-made soaps</a>}
        <a href="#ingredients">Ingredients</a>
        <a href="#request">Request a bar</a>
      </nav>
      <a className="header-cta" href="#request">Request a bar <ArrowRight size={17}/></a>
    </header>

    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">HANDMADE TO ORDER</p>
        <h1>{shopContent.headline}</h1>
        <p className="hero-intro">{shopContent.introduction}</p>
        <a className="button button-light" href={soaps.length > 0 ? "#ready-soaps" : "#ingredients"}>{soaps.length > 0 ? "Shop ready-made" : "See the ingredients"} <ArrowRight size={18}/></a>
      </div>
      <div className="hero-image" role="img" aria-label="Hand-cut handmade soap bars"/>
    </section>
    <div className="ingredient-peek">
      <strong>A starting point, fully explained</strong>
      <span>{baseIngredients.length ? baseIngredients.map((item) => item.name).join(" · ") : "See how we make your bar"}</span>
      <a href="#ingredients">What each one does <ArrowRight size={16}/></a>
    </div>

    <Experience ingredients={ingredients} soaps={soaps} checkoutReady={checkoutReady}/>
  </main>;
}
