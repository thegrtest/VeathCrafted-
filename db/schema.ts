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
});
