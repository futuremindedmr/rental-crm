import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const tenantsTable = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  squareAccessToken: text("square_access_token"),
  squareRefreshToken: text("square_refresh_token"),
  squareMerchantId: text("square_merchant_id"),
  squareLastSyncAt: timestamp("square_last_sync_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Tenant = typeof tenantsTable.$inferSelect;
