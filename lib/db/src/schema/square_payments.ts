import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";

export const squarePaymentsTable = pgTable("square_payments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  squarePaymentId: text("square_payment_id").notNull().unique(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull(),
  description: text("description"),
  paymentDate: text("payment_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SquarePayment = typeof squarePaymentsTable.$inferSelect;
