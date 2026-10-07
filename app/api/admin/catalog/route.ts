import { env } from "cloudflare:workers";
import { z } from "zod";
import { getAdmin, isSameOriginWrite } from "@/lib/admin-auth";
import { getIngredients, getReadySoaps, initializeIngredients } from "@/lib/catalog";

const imageUrl = z.string().trim().max(500).refine((value) => {
  if (!value) return true;
  if (/^\/api\/soap-photo\/[0-9a-f-]{36}\.(?:png|jpg|webp)$/.test(value)) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }
  catch { return false; }
}, "Use an HTTPS image URL.");

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("saveIngredient"), id: z.string().max(80).optional(),
    name: z.string().trim().min(2).max(100), purpose: z.string().trim().max(240),
    inBase: z.boolean(), selectable: z.boolean(), active: z.boolean(),
    sortOrder: z.number().int().min(0).max(10000) }),
  z.object({ action: z.literal("archiveIngredient"), id: z.string().min(1).max(80) }),
  z.object({ action: z.literal("saveSoap"), id: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(120), description: z.string().trim().max(600),
    ingredientsText: z.string().trim().min(2).max(2000), imageUrl,
    priceCents: z.number().int().min(0).max(100000), stock: z.number().int().min(0).max(10000),
    active: z.boolean() }),
  z.object({ action: z.literal("archiveSoap"), id: z.string().uuid() }),
]);

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  if (!await getAdmin()) return Response.json({ error: "Access denied." }, { status: 403, headers: noStore });
  try {
    const [ingredients, soaps] = await Promise.all([getIngredients(true), getReadySoaps(true)]);
    return Response.json({ ingredients, soaps }, { headers: noStore });
  } catch {
    return Response.json({ error: "Catalog is unavailable." }, { status: 503, headers: noStore });
  }
}

export async function POST(request: Request) {
  if (!await getAdmin()) return Response.json({ error: "Access denied." }, { status: 403, headers: noStore });
  if (!isSameOriginWrite(request)) return Response.json({ error: "Request origin not allowed." }, { status: 403, headers: noStore });
  if (Number(request.headers.get("content-length") || 0) > 12000) return Response.json({ error: "Request is too large." }, { status: 413, headers: noStore });
  const raw = await request.text();
  if (raw.length > 12000) return Response.json({ error: "Request is too large." }, { status: 413, headers: noStore });
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return Response.json({ error: "Invalid request." }, { status: 400, headers: noStore }); }
  const parsed = actionSchema.safeParse(input);
  if (!parsed.success) return Response.json({ error: "Review the catalog details and try again." }, { status: 400, headers: noStore });
  if (!env.DB) return Response.json({ error: "Database unavailable." }, { status: 503, headers: noStore });
  const data = parsed.data;
  const now = new Date().toISOString();
  try {
    if (data.action === "saveIngredient" || data.action === "archiveIngredient") await initializeIngredients();
    if (data.action === "saveIngredient") {
      const id = data.id || crypto.randomUUID();
      if (data.id) {
        const result = await env.DB.prepare(`UPDATE ingredient_catalog SET name=?, purpose=?, in_base=?, selectable=?, active=?, sort_order=?, updated_at=? WHERE id=?`)
          .bind(data.name, data.purpose, data.inBase ? 1 : 0, data.selectable ? 1 : 0, data.active ? 1 : 0, data.sortOrder, now, id).run();
        if (!result.meta.changes) return Response.json({ error: "Ingredient not found." }, { status: 404, headers: noStore });
      } else {
        await env.DB.prepare(`INSERT INTO ingredient_catalog (id, name, purpose, in_base, selectable, active, sort_order, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(id, data.name, data.purpose, data.inBase ? 1 : 0, data.selectable ? 1 : 0, data.active ? 1 : 0, data.sortOrder, now).run();
      }
    } else if (data.action === "archiveIngredient") {
      const result = await env.DB.prepare("UPDATE ingredient_catalog SET active=0, updated_at=? WHERE id=?").bind(now, data.id).run();
      if (!result.meta.changes) return Response.json({ error: "Ingredient not found." }, { status: 404, headers: noStore });
    } else if (data.action === "saveSoap") {
      if (data.active && (!data.priceCents || !data.stock)) return Response.json({ error: "A published soap needs a price and available bars." }, { status: 400, headers: noStore });
      const id = data.id || crypto.randomUUID();
      if (data.id) {
        const result = await env.DB.prepare(`UPDATE ready_soaps SET name=?, description=?, ingredients_text=?, image_url=?, price_cents=?, stock=?, active=?, updated_at=? WHERE id=?`)
          .bind(data.name, data.description, data.ingredientsText, data.imageUrl || null, data.priceCents, data.stock, data.active ? 1 : 0, now, id).run();
        if (!result.meta.changes) return Response.json({ error: "Soap not found." }, { status: 404, headers: noStore });
      } else {
        await env.DB.prepare(`INSERT INTO ready_soaps (id, name, description, ingredients_text, image_url, price_cents, stock, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(id, data.name, data.description, data.ingredientsText, data.imageUrl || null, data.priceCents, data.stock, data.active ? 1 : 0, now, now).run();
      }
    } else {
      const result = await env.DB.prepare("UPDATE ready_soaps SET active=0, updated_at=? WHERE id=?").bind(now, data.id).run();
      if (!result.meta.changes) return Response.json({ error: "Soap not found." }, { status: 404, headers: noStore });
    }
    const [ingredients, soaps] = await Promise.all([getIngredients(true), getReadySoaps(true)]);
    return Response.json({ ingredients, soaps }, { headers: noStore });
  } catch (error) {
    console.error("Catalog update failed", error);
    return Response.json({ error: "Could not save your changes." }, { status: 503, headers: noStore });
  }
}
