import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";
import { rentalsTable } from "./rentals";
import { tenantsTable } from "./tenants";

export const rentalAgreementsTable = pgTable("rental_agreements", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  rentalId: integer("rental_id").references(() => rentalsTable.id, { onDelete: "set null" }),
  fileName: text("file_name").notNull(),
  objectPath: text("object_path").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type RentalAgreement = typeof rentalAgreementsTable.$inferSelect;
