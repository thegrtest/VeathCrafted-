export type HomeHero = { imageUrl: string; alt: string };

export const defaultHomeHero: HomeHero = {
  imageUrl: "/soap-hero.png",
  alt: "Hand-cut handmade soap bars",
};

export function isHomeHeroImageUrl(value: string): boolean {
  return value === defaultHomeHero.imageUrl || /^\/api\/soap-photo\/[0-9a-f-]{36}\.(?:png|jpg|webp)$/.test(value);
}
