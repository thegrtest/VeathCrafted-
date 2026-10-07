import { env } from "cloudflare:workers";
import { shopContent } from "@/lib/shop-content";

export type Ingredient = {
  id: string;
  name: string;
  purpose: string;
  inBase: boolean;
  selectable: boolean;
  active: boolean;
  sortOrder: number;
};

export type ReadySoap = {
  id: string;
  name: string;
  description: string;
  ingredientsText: string;
  imageUrl: string | null;
  priceCents: number;
  stock: number;
  active: boolean;
};

export type ReadyPurchase = {
  id: string; soapName: string; quantity: number; customerEmail: string | null;
  shippingName: string | null; shippingAddress: string | null; paidAt: string | null;
};

type IngredientRow = {
  id: string; name: string; purpose: string; in_base: number;
  selectable: number; active: number; sort_order: number;
};
type SoapRow = {
  id: string; name: string; description: string; ingredients_text: string;
  image_url: string | null; price_cents: number; stock: number; active: number;
};

export const starterIngredients: Ingredient[] = shopContent.product.ingredients.map((item, index) => ({
  id: `starter-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  name: item.name,
  purpose: item.purpose,
  inBase: true,
  selectable: item.name !== "Water" && item.name !== "Sodium hydroxide",
  active: true,
  sortOrder: index * 10,
}));

function mapIngredient(row: IngredientRow): Ingredient {
  return { id: row.id, name: row.name, purpose: row.purpose,
    inBase: Boolean(row.in_base), selectable: Boolean(row.selectable),
    active: Boolean(row.active), sortOrder: row.sort_order };
}

function mapSoap(row: SoapRow): ReadySoap {
  return { id: row.id, name: row.name, description: row.description,
    ingredientsText: row.ingredients_text, imageUrl: row.image_url,
    priceCents: row.price_cents, stock: row.stock, active: Boolean(row.active) };
}

export async function getIngredients(includeInactive = false): Promise<Ingredient[]> {
  if (!env.DB) throw new Error("Database unavailable");
  const initialized = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'ingredient_catalog_ready'").first();
  if (!initialized) return starterIngredients;
  const result = await env.DB.prepare(`SELECT id, name, purpose, in_base, selectable, active, sort_order
    FROM ingredient_catalog ${includeInactive ? "" : "WHERE active = 1"}
    ORDER BY sort_order, name`).all<IngredientRow>();
  return result.results.map(mapIngredient);
}

export async function getReadySoaps(includeInactive = false): Promise<ReadySoap[]> {
  if (!env.DB) throw new Error("Database unavailable");
  const result = await env.DB.prepare(`SELECT id, name, description, ingredients_text, image_url, price_cents, stock, active
    FROM ready_soaps ${includeInactive ? "" : "WHERE active = 1 AND stock > 0"}
    ORDER BY updated_at DESC, name`).all<SoapRow>();
  return result.results.map(mapSoap);
}

export async function getRecentPurchases(): Promise<ReadyPurchase[]> {
  if (!env.DB) throw new Error("Database unavailable");
  const result = await env.DB.prepare(`SELECT id, soap_name AS soapName, quantity,
    customer_email AS customerEmail, shipping_name AS shippingName,
    shipping_address AS shippingAddress, paid_at AS paidAt
    FROM ready_orders WHERE status='paid' ORDER BY paid_at DESC LIMIT 50`).all<ReadyPurchase>();
  return result.results;
}

export async function getPublicCatalog(): Promise<{ ingredients: Ingredient[]; soaps: ReadySoap[] }> {
  try {
    const [ingredients, soaps] = await Promise.all([getIngredients(), getReadySoaps()]);
    return { ingredients, soaps };
  } catch (error) {
    console.error("Catalog unavailable", error);
    return { ingredients: starterIngredients, soaps: [] };
  }
}

export async function initializeIngredients() {
  const db = env.DB;
  if (!db) throw new Error("Database unavailable");
  const initialized = await db.prepare("SELECT value FROM site_settings WHERE key = 'ingredient_catalog_ready'").first();
  if (initialized) return;
  const now = new Date().toISOString();
  await db.batch([
    ...starterIngredients.map((item) => db.prepare(`INSERT OR IGNORE INTO ingredient_catalog
      (id, name, purpose, in_base, selectable, active, sort_order, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(item.id, item.name, item.purpose,
      item.inBase ? 1 : 0, item.selectable ? 1 : 0, 1, item.sortOrder, now)),
    db.prepare("INSERT OR IGNORE INTO site_settings (key, value) VALUES ('ingredient_catalog_ready', '1')"),
  ]);
}
