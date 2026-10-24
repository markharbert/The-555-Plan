import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, usersTable, videoTakesTable, recordingOperationsTable, missionProgressTable } from "@workspace/db";
import {
  GetTakesResponse, SaveTakeBody, SaveTakeParams, SaveTakeResponse,
  UpdateTakeBody, UpdateTakeParams, UpdateTakeResponse,
  RecordingStartedBody, RecordingStartedResponse,
} from "@workspace/api-zod";
import { requireMember } from "../middlewares/member";
import { event } from "../lib/events";
import { getProgram, buildJourney } from "../lib/journey";
import { takeMetadata } from "../lib/takes";

const router: IRouter = Router();
router.use(requireMember);
router.use((req, res, next) => {
  // This is an account consistency assertion, not an authentication credential.
  // It prevents a stale tab/outbox from writing one account's metadata after sign-in changes.
  const expectedAccount = req.get("X-555-Account");
  if (req.method !== "GET" && expectedAccount && expectedAccount !== res.locals.member.id) {
    res.status(409).json({ error: "The signed-in account changed. Return to the account that recorded this take." }); return;
  }
  next();
});

router.get("/takes", async (_req, res): Promise<void> => {
  const takes = await db.select().from(videoTakesTable)
    .where(eq(videoTakesTable.userId, res.locals.member.id))
    .orderBy(desc(videoTakesTable.recordedAt));
  res.json(GetTakesResponse.parse(takes.map(takeMetadata)));
});

router.put("/takes/:takeId", async (req, res): Promise<void> => {
  const params = SaveTakeParams.safeParse(req.params);
  const body = SaveTakeBody.strict().safeParse(req.body);
  if (!params.success || !body.success || typeof req.body?.recordedAt !== "string") {
    res.status(400).json({ error: "Send recording details only, not the video file." }); return;
  }
  const { takeId } = params.data;
  const data = body.data;
  if (data.recordedAt.getTime() > Date.now() + 300000) {
    res.status(400).json({ error: "The recording date is ahead of the current time. Check your computer clock." }); return;
  }
  const program = await getProgram();
  const result = await db.transaction(async tx => {
    const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, res.locals.member.id)).for("update");
    if (!user) return { error: "Account not found.", status: 404 };
    const [existing] = await tx.select().from(videoTakesTable).where(eq(videoTakesTable.id, takeId));
    if (existing) {
      if (existing.userId !== user.id) return { error: "That recording ID cannot be used. Please try again.", status: 409 };
      return { take: existing }; // Retried creation never revives a deleted take.
    }
    const progress = await tx.select().from(missionProgressTable).where(eq(missionProgressTable.userId, user.id));
    const mission = buildJourney(user, progress, program).missions.find(m => m.id === data.missionId);
    if (!mission?.unlocked) return { error: "Finish the previous journey step before recording this mission.", status: 403 };
    if (data.durationSeconds > mission.maxSeconds + 2) return { error: "This take is longer than the mission recording limit.", status: 400 };
    const [previous] = await tx.select({ number: sql<number>`coalesce(max(${videoTakesTable.takeNumber}), 0)`.mapWith(Number) })
      .from(videoTakesTable).where(and(eq(videoTakesTable.userId, user.id), eq(videoTakesTable.missionId, data.missionId)));
    const [take] = await tx.insert(videoTakesTable).values({
      id: takeId, userId: user.id, missionId: data.missionId,
      takeNumber: (previous?.number ?? 0) + 1,
      durationSeconds: Math.min(data.durationSeconds, mission.maxSeconds), recordedAt: data.recordedAt,
    }).returning();
    if (!take) throw new Error("Take metadata insert failed");
    await event(tx, user.id, "take_saved", take.missionId, {
      takeId, takeNumber: take.takeNumber, durationSeconds: take.durationSeconds,
    });
    return { take };
  });
  if ("error" in result) { res.status(result.status!).json({ error: result.error }); return; }
  res.json(SaveTakeResponse.parse(takeMetadata(result.take)));
});

router.patch("/takes/:takeId", async (req, res): Promise<void> => {
  const params = UpdateTakeParams.safeParse(req.params);
  const body = UpdateTakeBody.strict().safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Please check this recording action and try again." }); return;
  }
  const data = body.data;
  const actions = [data.favorite, data.downloaded, data.deleted].filter(v => v !== undefined);
  if (actions.length !== 1 || data.downloaded === false || data.deleted === false) {
    res.status(400).json({ error: "Send one recording action at a time." }); return;
  }
  const result = await db.transaction(async tx => {
    const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, res.locals.member.id)).for("update");
    if (!user) return { error: "Account not found.", status: 404 };
    const [take] = await tx.select().from(videoTakesTable)
      .where(and(eq(videoTakesTable.id, params.data.takeId), eq(videoTakesTable.userId, user.id)));
    if (!take) return { error: "Recording details are not synced yet. Please try again shortly.", status: 404 };
    const [operation] = await tx.select().from(recordingOperationsTable).where(eq(recordingOperationsTable.id, data.operationId));
    if (operation) {
      if (operation.userId !== user.id) return { error: "That recording action cannot be used.", status: 409 };
      return { take };
    }
    if (take.deletedAt && data.favorite !== undefined) {
      // An offline stale favorite must not resurrect a deleted recording.
      await tx.insert(recordingOperationsTable).values({ id: data.operationId, userId: user.id });
      return { take };
    }
    if (data.favorite === true) {
      await tx.update(videoTakesTable).set({ favorite: false })
        .where(and(eq(videoTakesTable.userId, user.id), eq(videoTakesTable.missionId, take.missionId)));
    }
    const [updated] = await tx.update(videoTakesTable).set({
      ...(data.favorite !== undefined ? { favorite: data.favorite } : {}),
      ...(data.downloaded ? { downloadedAt: new Date() } : {}),
      ...(data.deleted ? { deletedAt: take.deletedAt ?? new Date(), favorite: false } : {}),
    }).where(eq(videoTakesTable.id, take.id)).returning();
    if (!updated) throw new Error("Take metadata update failed");
    await tx.insert(recordingOperationsTable).values({ id: data.operationId, userId: user.id });
    if (data.downloaded) await event(tx, user.id, "take_downloaded", take.missionId, { takeId: take.id });
    if (data.deleted && !take.deletedAt) await event(tx, user.id, "take_deleted", take.missionId, { takeId: take.id });
    if (data.favorite !== undefined && data.favorite !== take.favorite) {
      await event(tx, user.id, "take_favorite_changed", take.missionId, { takeId: take.id, favorite: data.favorite });
    }
    return { take: updated };
  });
  if ("error" in result) { res.status(result.status!).json({ error: result.error }); return; }
  res.json(UpdateTakeResponse.parse(takeMetadata(result.take)));
});

router.post("/recording-starts", async (req, res): Promise<void> => {
  const body = RecordingStartedBody.strict().safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Please check the recording details." }); return; }
  const data = body.data;
  const program = await getProgram();
  const result = await db.transaction(async tx => {
    const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, res.locals.member.id)).for("update");
    if (!user) return false;
    const [operation] = await tx.select().from(recordingOperationsTable).where(eq(recordingOperationsTable.id, data.operationId));
    if (operation) return operation.userId === user.id;
    const progress = await tx.select().from(missionProgressTable).where(eq(missionProgressTable.userId, user.id));
    if (!buildJourney(user, progress, program).missions.find(m => m.id === data.missionId)?.unlocked) return false;
    await tx.insert(recordingOperationsTable).values({ id: data.operationId, userId: user.id });
    await event(tx, user.id, "recording_started", data.missionId);
    return true;
  });
  if (!result) { res.status(403).json({ error: "Finish the previous journey step before recording this mission." }); return; }
  res.json(RecordingStartedResponse.parse({ recorded: true }));
});

export default router;
