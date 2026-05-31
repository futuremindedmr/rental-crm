import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";

export const leadStageEnum = ["contacted", "agreement_sent", "term_selected", "converted"] as const;

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  stage: text("stage").notNull().default("contacted"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Lead = typeof leadsTable.$inferSelect;
