import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getPublicCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Know every ingredient | Veath Crafted", description: "Explore the ingredients in our starting soap and the choices available for a custom bar." };

export default async function IngredientsPage() {
  const { ingredients } = await getPublicCatalog();
  const starting = ingredients.filter((item) => item.inBase);
  const additional = ingredients.filter((item) => !item.inBase);
  return <main><SiteHeader active="ingredients"/>
    <section className="page-hero ingredients-page-hero"><div><p className="eyebrow">OPEN ABOUT WHAT GOES IN</p><h1>Know every ingredient.</h1><p>We want you to understand the starting formula, what each ingredient contributes, and where your preferences can shape the final bar.</p></div></section>
    <section className="ingredient-page-content"><div className="ingredient-page-intro"><div><p className="eyebrow">THE STARTING BAR</p><h2>A formula you can read.</h2></div><p>These are the ingredients in our example bar. A custom request can change the formula; we confirm the final ingredients and amounts before production.</p></div>
      <div className="ingredient-card-list" role="list">{starting.map((item, index) => <article className="ingredient-card" role="listitem" key={item.id}><span>{String(index + 1).padStart(2, "0")}</span><h3>{item.name}</h3><p>{item.purpose}</p></article>)}</div>
      <p className="ingredient-page-note">Sodium hydroxide is used during soapmaking. We review ingredient preferences as part of a complete formula rather than automatically adding or removing ingredients.</p>
      {additional.length > 0 && <div className="more-ingredients"><div className="ingredient-page-intro"><div><p className="eyebrow">MORE TO DISCUSS</p><h2>Other ingredient options.</h2></div><p>Ask about these in a custom request. Availability and fit are confirmed before a formula is made.</p></div><div className="ingredient-card-list" role="list">{additional.map((item) => <article className="ingredient-card" role="listitem" key={item.id}><h3>{item.name}</h3><p>{item.purpose}</p></article>)}</div></div>}
    </section>
    <section className="page-crosslink"><div><p className="eyebrow">MAKE THE NEXT BAR YOURS</p><h2>Have an ingredient in mind?</h2><p>Tell us what you would like included or avoided, and what scent and feel you enjoy.</p></div><a className="button button-dark" href="/custom">Start a custom request <ArrowRight size={18}/></a></section>
    <SiteFooter/>
  </main>;
}
