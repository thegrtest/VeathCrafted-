import { ArrowRight } from "lucide-react";
import Experience from "@/components/Experience";
import { shopContent } from "@/lib/shop-content";

export default function Home() {
  return <main id="top">
    <header className="site-header">
      <a className="brand" href="#top" aria-label={`${shopContent.name} home`}>
        <span className="brand-mark">V</span><span>{shopContent.name}</span>
      </a>
      <nav aria-label="Main navigation">
        <a href="#water">Your water</a>
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
        <a className="button button-light" href="#ingredients">See the ingredients <ArrowRight size={18}/></a>
      </div>
      <div className="hero-image" role="img" aria-label="Hand-cut handmade soap bars"/>
    </section>
    <div className="ingredient-peek">
      <strong>In the starting bar</strong>
      <span>{shopContent.product.ingredients.map((item) => item.name).join(" · ")}</span>
      <a href="#ingredients">What each one does <ArrowRight size={16}/></a>
    </div>

    <Experience/>
  </main>;
}
