import { pgTable, text, integer, doublePrecision, boolean, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Metadata only. No recording, thumbnail, Blob, object URL, or file path is stored.
export const videoTakesTable = pgTable("video_takes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  missionId: integer("mission_id").notNull(),
  takeNumber: integer("take_number").notNull(),
  durationSeconds: doublePrecision("duration_seconds").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
  favorite: boolean("favorite").notNull().default(false),
  downloadedAt: timestamp("downloaded_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, table => [
  uniqueIndex("take_user_mission_number").on(table.userId, table.missionId, table.takeNumber),
  index("take_user_recorded").on(table.userId, table.recordedAt),
]);

// Offline clients replay the same operation ID until acknowledged.
export const recordingOperationsTable = pgTable("recording_operations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VideoTakeRow = typeof videoTakesTable.$inferSelect;
