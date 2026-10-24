import { db, activityEventsTable, syncQueueTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function event(tx: Transaction, userId: string, type: string, missionId?: number, details: Record<string, unknown> = {}) {
  await tx.insert(activityEventsTable).values({ userId, type, missionId, details });
}

export async function enqueueSync(tx: Transaction, userId: string, kind: string) {
  const inserted = await tx.insert(syncQueueTable).values({ userId, kind })
    .onConflictDoNothing().returning();
  if (inserted.length) {
    await tx.update(usersTable).set({ syncStatus: "pending" }).where(eq(usersTable.id, userId));
  }
}
