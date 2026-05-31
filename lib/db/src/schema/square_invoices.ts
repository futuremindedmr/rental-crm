import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";

export const squareInvoicesTable = pgTable("square_invoices", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  squareInvoiceId: text("square_invoice_id").notNull().unique(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull(),
  dueDate: text("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SquareInvoice = typeof squareInvoicesTable.$inferSelect;
