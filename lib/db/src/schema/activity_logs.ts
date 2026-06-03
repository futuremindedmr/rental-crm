import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { clientsTable } from "./clients";

export const activityLogTypeEnum = ["Call", "Text", "Email", "Visit"] as const;
export type ActivityLogType = (typeof activityLogTypeEnum)[number];

export const activityLogsTable = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id),
  clientId: integer("client_id").references(() => clientsTable.id).notNull(),
  type: text("type").notNull(),
  notes: text("notes"),
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLogsTable.$inferSelect;
