import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  status: text("status").notNull().default("requested"),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  deliveryZip: text("delivery_zip").notNull(),
  base: text("base").notNull(),
  scent: text("scent").notNull(),
  texture: text("texture").notNull(),
  quantity: integer("quantity").notNull(),
  hardness: integer("hardness"),
  waterSupplier: text("water_supplier"),
  waterSource: text("water_source").notNull(),
  notes: text("notes").notNull().default(""),
  consultationRequested: integer("consultation_requested", { mode: "boolean" }).notNull().default(false),
  consultationNotes: text("consultation_notes").notNull().default(""),
  estimatedTotalCents: integer("estimated_total_cents").notNull(),
  preferredIngredients: text("preferred_ingredients").notNull().default("[]"),
  avoidedIngredients: text("avoided_ingredients").notNull().default("[]"),
});

export const ingredientCatalog = sqliteTable("ingredient_catalog", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  purpose: text("purpose").notNull().default(""),
  inBase: integer("in_base", { mode: "boolean" }).notNull().default(false),
  selectable: integer("selectable", { mode: "boolean" }).notNull().default(true),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: text("updated_at").notNull(),
});

export const readySoaps = sqliteTable("ready_soaps", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  ingredientsText: text("ingredients_text").notNull(),
  imageUrl: text("image_url"),
  priceCents: integer("price_cents").notNull(),
  stock: integer("stock").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const readyOrders = sqliteTable("ready_orders", {
  id: text("id").primaryKey(),
  soapId: text("soap_id").notNull(),
  soapName: text("soap_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  shippingCents: integer("shipping_cents").notNull(),
  status: text("status").notNull(),
  stripeSessionId: text("stripe_session_id").unique(),
  customerEmail: text("customer_email"),
  shippingName: text("shipping_name"),
  shippingAddress: text("shipping_address"),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
  paidAt: text("paid_at"),
  notificationSentAt: text("notification_sent_at"),
});
