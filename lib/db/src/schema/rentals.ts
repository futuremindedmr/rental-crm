import { pgTable, text, serial, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";
import { tenantsTable } from "./tenants";

export const rentalsTable = pgTable("rentals", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  unitDescription: text("unit_description"),
  machineCode: text("machine_code"),
  brand: text("brand"),
  startDate: text("start_date").notNull(),
  termMonths: integer("term_months").notNull(),
  endDate: text("end_date"),
  monthlyRate: numeric("monthly_rate", { precision: 10, scale: 2 }).notNull().default("0"),
  costOfMachine: numeric("cost_of_machine", { precision: 10, scale: 2 }),
  paidOff: boolean("paid_off").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Rental = typeof rentalsTable.$inferSelect;
