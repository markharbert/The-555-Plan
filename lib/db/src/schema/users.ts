import { pgTable, text, boolean, integer, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export interface ProfileAnswers {
  fears: string[];
  business: string;
  audience: string;
  why: string;
  commitment: string;
  pockets: string[];
  delegate: string;
  notifications: string;
  partner: string;
}

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  active: boolean("active").notNull().default(true),
  emailConsent: boolean("email_consent").notNull(),
  consentAt: timestamp("consent_at", { withTimezone: true }).notNull().defaultNow(),
  source: text("source").notNull().default("direct"),
  utm: jsonb("utm").$type<Record<string, string>>().notNull().default({}),
  welcomeDone: boolean("welcome_done").notNull().default(false),
  fearCheckDone: boolean("fear_check_done").notNull().default(false),
  planDone: boolean("plan_done").notNull().default(false),
  mindsetDone: boolean("mindset_done").notNull().default(false),
  baselineComfort: integer("baseline_comfort"),
  answers: jsonb("answers").$type<ProfileAnswers>().notNull().default({
    fears: [], business: "", audience: "", why: "", commitment: "",
    pockets: [], delegate: "", notifications: "", partner: "",
  }),
  clickfunnelsContactId: text("clickfunnels_contact_id"),
  syncStatus: text("sync_status", { enum: ["pending", "synced", "failed"] }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }).notNull().defaultNow(),
});

export const loginSessionsTable = pgTable("login_sessions", {
  sessionId: text("session_id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const missionProgressTable = pgTable("mission_progress", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  missionId: integer("mission_id").notNull(),
  completed: boolean("completed").notNull().default(false),
  feelingScore: integer("feeling_score"),
  posted: boolean("posted").notNull().default(false),
  wentLive: boolean("went_live").notNull().default(false),
  alternate: boolean("alternate").notNull().default(false),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [uniqueIndex("mission_progress_user_mission").on(table.userId, table.missionId)]);

export type AppUser = typeof usersTable.$inferSelect;
export type MissionProgress = typeof missionProgressTable.$inferSelect;
