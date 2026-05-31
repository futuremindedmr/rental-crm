import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contactsTable } from "./contacts";
import { companiesTable } from "./companies";

export const dealStageEnum = ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"] as const;

export const dealsTable = pgTable("deals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  stage: text("stage").notNull().default("lead"),
  value: numeric("value", { precision: 12, scale: 2 }).notNull().default("0"),
  probability: integer("probability"),
  contactId: integer("contact_id").references(() => contactsTable.id, { onDelete: "set null" }),
  companyId: integer("company_id").references(() => companiesTable.id, { onDelete: "set null" }),
  expectedCloseDate: text("expected_close_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDealSchema = createInsertSchema(dealsTable).omit({ id: true, createdAt: true });
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof dealsTable.$inferSelect;
