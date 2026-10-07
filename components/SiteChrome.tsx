import { ArrowRight } from "lucide-react";
import { shopContent } from "@/lib/shop-content";

type Page = "home" | "shop" | "custom" | "ingredients";

const links: { page: Page; href: string; label: string }[] = [
  { page: "home", href: "/", label: "Home" },
  { page: "shop", href: "/shop", label: "Shop soaps" },
  { page: "custom", href: "/custom", label: "Make it yours" },
  { page: "ingredients", href: "/ingredients", label: "Ingredients" },
];

export function SiteHeader({ active }: { active: Page }) {
  return <header className="site-header">
    <a className="brand" href="/" aria-label={`${shopContent.name} home`}><span className="brand-mark">V</span><span>{shopContent.name}</span></a>
    <nav aria-label="Main navigation">{links.map((link) => <a key={link.page} href={link.href} aria-current={active === link.page ? "page" : undefined}>{link.label}</a>)}</nav>
    <a className="header-cta" href="/custom">Request a bar <ArrowRight size={17}/></a>
  </header>;
}

export function SiteFooter() {
  return <footer className="site-footer"><div><strong>{shopContent.name}</strong><span>Handmade soap, made for you.</span></div><nav aria-label="Footer"><a href="/custom#water">Water check</a><a href={`mailto:${shopContent.contactEmail}`}>Contact</a><a href="/privacy">Privacy</a></nav></footer>;
}
