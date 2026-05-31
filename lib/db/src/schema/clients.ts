import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const clientStatusEnum = ["lead", "active_renter", "past_customer"] as const;

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  status: text("status").notNull().default("lead"),
  squareCustomerId: text("square_customer_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Client = typeof clientsTable.$inferSelect;
