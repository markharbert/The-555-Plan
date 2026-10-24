import { eq, sql } from "drizzle-orm";
import { db, videoTakesTable, type VideoTakeRow } from "@workspace/db";
import type { Transaction } from "./events";

export function takeMetadata(take: VideoTakeRow) {
  return {
    id: take.id, missionId: take.missionId, takeNumber: take.takeNumber,
    durationSeconds: take.durationSeconds, recordedAt: take.recordedAt.toISOString(),
    favorite: take.favorite, downloadedAt: take.downloadedAt?.toISOString() ?? null,
    deletedAt: take.deletedAt?.toISOString() ?? null,
  };
}

export async function getRecordingStats(userId: string, client: typeof db | Transaction = db) {
  // Cumulative practice totals include deleted takes, but not unsaved drafts.
  const [totals] = await client.select({
    videosRecorded: sql<number>`count(*)`.mapWith(Number),
    seconds: sql<number>`coalesce(sum(${videoTakesTable.durationSeconds}), 0)`.mapWith(Number),
  }).from(videoTakesTable).where(eq(videoTakesTable.userId, userId));
  return {
    videosRecorded: totals?.videosRecorded ?? 0,
    minutesOnCamera: (totals?.seconds ?? 0) / 60,
  };
}
