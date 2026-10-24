import { pgTable, text, serial, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const activityEventsTable = pgTable("activity_events", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("event_type").notNull(),
  missionId: integer("mission_id"),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("activity_user_time").on(table.userId, table.createdAt)]);
