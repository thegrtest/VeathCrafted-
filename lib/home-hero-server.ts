import { env } from "cloudflare:workers";
import { defaultHomeHero, isHomeHeroImageUrl, type HomeHero } from "@/lib/home-hero";

export async function getHomeHero(): Promise<HomeHero> {
  if (!env.DB) return defaultHomeHero;
  try {
    const row = await env.DB.prepare("SELECT value FROM site_settings WHERE key='home_hero'").first<{ value: string }>();
    if (!row) return defaultHomeHero;
    const value = JSON.parse(row.value) as Partial<HomeHero>;
    if (typeof value.imageUrl !== "string" || !isHomeHeroImageUrl(value.imageUrl) ||
      typeof value.alt !== "string" || !value.alt.trim() || value.alt.length > 160) return defaultHomeHero;
    return { imageUrl: value.imageUrl, alt: value.alt };
  } catch (error) {
    console.error("Homepage photo setting unavailable", error);
    return defaultHomeHero;
  }
}
