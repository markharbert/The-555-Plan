import { pgTable, text, serial, integer, jsonb, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const syncQueueTable = pgTable("sync_queue", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  status: text("status", { enum: ["pending", "processing", "synced", "failed"] }).notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("sync_user_kind").on(table.userId, table.kind),
  index("sync_due").on(table.status, table.nextAttemptAt),
]);

export const appSettingsTable = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
});
