import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contactsTable } from "./contacts";
import { dealsTable } from "./deals";

export const activityTypeEnum = ["call", "email", "meeting", "task", "note"] as const;

export const activitiesTable = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  subject: text("subject").notNull(),
  description: text("description"),
  contactId: integer("contact_id").references(() => contactsTable.id, { onDelete: "set null" }),
  dealId: integer("deal_id").references(() => dealsTable.id, { onDelete: "set null" }),
  completed: boolean("completed").notNull().default(false),
  dueDate: text("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivitySchema = createInsertSchema(activitiesTable).omit({ id: true, createdAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activitiesTable.$inferSelect;
