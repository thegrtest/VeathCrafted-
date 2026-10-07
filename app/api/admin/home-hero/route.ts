import { env } from "cloudflare:workers";
import { z } from "zod";
import { getAdmin, isSameOriginWrite } from "@/lib/admin-auth";
import { defaultHomeHero, isHomeHeroImageUrl } from "@/lib/home-hero";

const schema = z.object({
  imageUrl: z.string().refine(isHomeHeroImageUrl),
  alt: z.string().trim().min(3).max(160),
});
const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!await getAdmin()) return Response.json({ error: "Access denied." }, { status: 403, headers: noStore });
  if (!isSameOriginWrite(request)) return Response.json({ error: "Request origin not allowed." }, { status: 403, headers: noStore });
  if (Number(request.headers.get("content-length") || 0) > 1000) return Response.json({ error: "Request is too large." }, { status: 413, headers: noStore });
  const raw = await request.text();
  if (raw.length > 1000) return Response.json({ error: "Request is too large." }, { status: 413, headers: noStore });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return Response.json({ error: "Invalid request." }, { status: 400, headers: noStore }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Choose an uploaded photo and add a short image description." }, { status: 400, headers: noStore });
  if (!env.DB) return Response.json({ error: "Database unavailable." }, { status: 503, headers: noStore });
  const hero = parsed.data;
  if (hero.imageUrl !== defaultHomeHero.imageUrl) {
    if (!env.BUCKET) return Response.json({ error: "Photo storage unavailable." }, { status: 503, headers: noStore });
    const photo = await env.BUCKET.head(`soap-images/${hero.imageUrl.split("/").at(-1)}`);
    if (!photo) return Response.json({ error: "Uploaded photo not found. Please upload it again." }, { status: 400, headers: noStore });
  }
  try {
    await env.DB.prepare("INSERT INTO site_settings (key, value) VALUES ('home_hero', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
      .bind(JSON.stringify(hero)).run();
    return Response.json({ hero }, { headers: noStore });
  } catch (error) {
    console.error("Could not save homepage photo", error);
    return Response.json({ error: "Could not save the homepage photo." }, { status: 503, headers: noStore });
  }
}
