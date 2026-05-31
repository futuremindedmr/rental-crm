import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";

export const rentalsTable = pgTable("rentals", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  unitDescription: text("unit_description"),
  startDate: text("start_date").notNull(),
  termMonths: integer("term_months").notNull(),
  monthlyRate: numeric("monthly_rate", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Rental = typeof rentalsTable.$inferSelect;
