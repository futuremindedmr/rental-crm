import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const propertiesTable = pgTable("properties", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id),
  name: text("name").notNull(),
  address: text("address"),
  unitCount: integer("unit_count").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Property = typeof propertiesTable.$inferSelect;
