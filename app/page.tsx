import { ArrowRight } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getPublicCatalog } from "@/lib/catalog";
import { getHomeHero } from "@/lib/home-hero-server";
import { shopContent } from "@/lib/shop-content";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ ingredients }, hero] = await Promise.all([getPublicCatalog(), getHomeHero()]);
  const startingNames = ingredients.filter((item) => item.inBase).map((item) => item.name);
  return <main id="top">
    <SiteHeader active="home"/>
    <section className="home-hero">
      <div className="home-hero-copy"><p className="eyebrow">SMALL BATCH · MADE WITH CARE</p><h1>{shopContent.headline}</h1><p>{shopContent.introduction}</p><div className="home-hero-actions"><a className="button button-light" href="/custom">Make it yours <ArrowRight size={18}/></a><a className="hero-text-link" href="/shop">Shop finished soaps <ArrowRight size={17}/></a></div></div>
      <div className="home-hero-image"><img src={hero.imageUrl} alt={hero.alt}/></div>
    </section>
    <section className="home-paths" aria-labelledby="paths-heading"><div className="home-section-head"><p className="eyebrow">START HERE</p><h2 id="paths-heading">A simple way to find your soap.</h2><p>Explore a finished batch, shape a bar around your preferences, or look closely at what goes into it.</p></div><div className="path-grid">
      <a className="path-card" id="request" href="/custom"><span className="path-index">01 / CUSTOM SOAP</span><h3>Make it yours.</h3><p>Choose ingredients you prefer or avoid, scent, texture, and quantity. We review the formula with you before making it.</p><span className="path-link">Start a request <ArrowRight size={18}/></span></a>
      <a className="path-card" id="ready-soaps" href="/shop"><span className="path-index">02 / READY-MADE</span><h3>Shop finished soaps.</h3><p>See available small batches with their own full ingredient lists and prices. New bars appear as they are made.</p><span className="path-link">View the storefront <ArrowRight size={18}/></span></a>
      <a className="path-card" id="ingredients" href="/ingredients"><span className="path-index">03 / TRANSPARENCY</span><h3>Know every ingredient.</h3><p>Start with the ingredients in our example bar, learn why each is there, and tell us what matters to you.</p><span className="path-link">Explore ingredients <ArrowRight size={18}/></span></a>
    </div></section>
    <section className="home-ingredient-band"><div><p className="eyebrow">A CLEAR STARTING POINT</p><h2>What goes in matters.</h2><p>Our starting formula is straightforward. A custom bar may change after we review your preferences, and we share the final formula before production.</p><a className="inline-link" href="/ingredients">See what each ingredient does <ArrowRight size={17}/></a></div><div className="home-ingredient-names" aria-label="Starting ingredients">{startingNames.map((name) => <span key={name}>{name}</span>)}</div></section>
    <section className="home-closing"><div><p className="eyebrow">PERSONAL, DOWN TO THE DETAILS</p><h2>Tell us how you want your soap to feel.</h2><p>Ingredients come first. If your water changes lather or rinse feel, the optional water check can add helpful context to your request.</p></div><a className="button button-dark" href="/custom">Make it yours <ArrowRight size={18}/></a></section>
    <SiteFooter/>
  </main>;
}
