import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";
import { tenantsTable } from "./tenants";

export const manualPaymentsTable = pgTable("manual_payments", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id),
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: text("payment_date").notNull(),
  paymentMethod: text("payment_method").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ManualPayment = typeof manualPaymentsTable.$inferSelect;
