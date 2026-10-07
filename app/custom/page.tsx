import type { Metadata } from "next";
import Experience from "@/components/Experience";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getPublicCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Make it yours | Veath Crafted", description: "Request handmade soap tailored to your ingredient, scent, texture, and optional water preferences." };

export default async function CustomPage() {
  const { ingredients } = await getPublicCatalog();
  return <main><SiteHeader active="custom"/>
    <section className="page-hero custom-page-hero"><div><p className="eyebrow">MADE TO ORDER</p><h1>Make it yours.</h1><p>Start with what you like and what you would rather avoid. We will review the details, share a quote, and confirm the final recipe before making your soap.</p></div></section>
    <div className="custom-guidance"><span><strong>01</strong> Choose your preferences</span><span><strong>02</strong> We review the formula</span><span><strong>03</strong> You approve the quote</span></div>
    <Experience ingredients={ingredients}/>
    <SiteFooter/>
  </main>;
}
