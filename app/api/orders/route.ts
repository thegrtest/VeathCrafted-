import { env } from "cloudflare:workers";
import { z } from "zod";
import { shopContent } from "@/lib/shop-content";
import { sendOrderNotification } from "@/lib/order-notification";
import { getIngredients } from "@/lib/catalog";

const orderSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().max(254),
  deliveryZip: z.string().regex(/^\d{5}$/),
  base: z.literal(shopContent.product.id),
  scent: z.string().refine((value) => shopContent.scents.some((item) => item.id === value)),
  texture: z.string().refine((value) => shopContent.textures.some((item) => item.id === value)),
  quantity: z.number().int().min(1).max(24),
  hardness: z.number().int().min(0).max(1000).nullable(),
  waterSupplier: z.string().trim().max(200).nullable(),
  waterSource: z.enum(["public", "private-well", "softened", "unknown"]),
  notes: z.string().trim().max(2000),
  preferredIngredientIds: z.array(z.string().max(80)).max(30).default([]),
  avoidedIngredientIds: z.array(z.string().max(80)).max(30).default([]),
  consultationRequested: z.boolean(),
  consultationNotes: z.string().trim().max(600),
  website: z.literal(""),
});

export async function POST(request: Request) {
  const parsed = orderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please review the order details and try again." }, { status: 400 });
  const order = parsed.data;
  const id = crypto.randomUUID();
  const estimatedTotalCents = shopContent.product.startingPriceCents * order.quantity;
  try {
    if (!env.DB) throw new Error("D1 binding unavailable");
    const choices = await getIngredients();
    const selectable = new Map(choices.filter((item) => item.selectable).map((item) => [item.id, item.name]));
    const allIds = [...order.preferredIngredientIds, ...order.avoidedIngredientIds];
    if (new Set(allIds).size !== allIds.length || allIds.some((ingredientId) => !selectable.has(ingredientId))) {
      return Response.json({ error: "Please review your ingredient choices and try again." }, { status: 400 });
    }
    const preferredIngredients = order.preferredIngredientIds.map((ingredientId) => selectable.get(ingredientId)!);
    const avoidedIngredients = order.avoidedIngredientIds.map((ingredientId) => selectable.get(ingredientId)!);
    await env.DB.prepare(`INSERT INTO orders
      (id, created_at, status, customer_name, customer_email, delivery_zip, base, scent, texture, quantity, hardness, water_supplier, water_source, notes, consultation_requested, consultation_notes, estimated_total_cents, preferred_ingredients, avoided_ingredients)
      VALUES (?, ?, 'requested', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, new Date().toISOString(), order.customerName, order.customerEmail, order.deliveryZip,
        order.base, order.scent, order.texture, order.quantity, order.hardness, order.waterSupplier,
        order.waterSource, order.notes, order.consultationRequested ? 1 : 0,
        order.consultationRequested ? order.consultationNotes : "", estimatedTotalCents,
        JSON.stringify(preferredIngredients), JSON.stringify(avoidedIngredients)).run();
    const emailNotification = await sendOrderNotification({
      apiKey: env.RESEND_API_KEY,
      from: env.ORDER_EMAIL_FROM,
      to: env.ORDER_EMAIL_TO,
    }, { ...order, preferredIngredients, avoidedIngredients }, id, estimatedTotalCents);
    return Response.json({ id, estimatedTotalCents, status: "requested", emailNotification }, { status: 201 });
  } catch (error) {
    console.error("Could not save order request", error);
    return Response.json({ error: "We could not save your request. Your details are still in the form; please try again." }, { status: 503 });
  }
}
