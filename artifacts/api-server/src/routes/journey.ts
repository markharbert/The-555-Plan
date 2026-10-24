import { Router, type IRouter } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, usersTable, missionProgressTable, activityEventsTable, type AppUser } from "@workspace/db";
import {
  GetJourneyResponse, GetMissionParams, GetMissionResponse, UpdateMissionBody,
  UpdateMissionParams, UpdateMissionResponse, GetActivityResponse,
} from "@workspace/api-zod";
import { requireMember } from "../middlewares/member";
import { getProgram, buildJourney } from "../lib/journey";
import { event, enqueueSync } from "../lib/events";

const router: IRouter = Router();
router.use(requireMember);

router.get("/journey", async (_req, res): Promise<void> => {
  const user = res.locals.member as AppUser;
  const [progress, program] = await Promise.all([
    db.select().from(missionProgressTable).where(eq(missionProgressTable.userId, user.id)), getProgram(),
  ]);
  res.json(GetJourneyResponse.parse(buildJourney(user, progress, program)));
});

router.get("/missions/:missionId", async (req, res): Promise<void> => {
  const params = GetMissionParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Choose a mission from your journey." }); return; }
  const id = params.data.missionId;
  const program = await getProgram();
  const result = await db.transaction(async tx => {
    const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, res.locals.member.id)).for("update");
    if (!user) return null;
    const progress = await tx.select().from(missionProgressTable).where(eq(missionProgressTable.userId, user.id));
    const journey = buildJourney(user, progress, program);
    const mission = journey.missions.find(m => m.id === id);
    if (!mission?.unlocked) return null;
    await tx.insert(missionProgressTable).values({
      id: `${user.id}:${id}`, userId: user.id, missionId: id,
    }).onConflictDoNothing();
    await event(tx, user.id, "mission_opened", id);
    return mission;
  });
  if (!result) { res.status(403).json({ error: "Finish the previous journey step or mission to unlock this one." }); return; }
  res.json(GetMissionResponse.parse(result));
});

router.patch("/missions/:missionId", async (req, res): Promise<void> => {
  const params = UpdateMissionParams.safeParse(req.params);
  const body = UpdateMissionBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Please check your mission answers and try again." }); return; }
  const id = params.data.missionId;
  const data = body.data;
  const program = await getProgram();
  const result = await db.transaction(async tx => {
    const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, res.locals.member.id)).for("update");
    if (!user) return { error: "Account not found." };
    const progress = await tx.select().from(missionProgressTable).where(eq(missionProgressTable.userId, user.id));
    const journey = buildJourney(user, progress, program);
    const mission = journey.missions.find(m => m.id === id);
    if (!mission?.unlocked) return { error: "Finish the previous journey step or mission first." };
    if (mission.completed === data.completed) return { journey };
    if (data.completed) {
      if (data.feelingScore === undefined) return { error: "Tell us how that felt, from 1 to 10." };
      if (mission.round === 2 && !data.posted) return { error: "Post your video in your private test group, then check the box." };
      if (mission.round === 3 && !data.wentLive) return { error: "Go live in your private test group, then check the box." };
    } else if (!mission.canUndo) {
      return { error: "This round is saved because you already started the next round." };
    }
    const completion = {
      completed: data.completed, feelingScore: data.completed ? data.feelingScore! : null,
      completedAt: data.completed ? new Date() : null,
      posted: data.completed ? !!data.posted : false,
      wentLive: data.completed ? !!data.wentLive : false,
      alternate: id === 10 && !!data.alternate,
    };
    await tx.insert(missionProgressTable).values({
      id: `${user.id}:${id}`, userId: user.id, missionId: id, ...completion,
    }).onConflictDoUpdate({
      target: [missionProgressTable.userId, missionProgressTable.missionId], set: completion,
    });
    await event(tx, user.id, data.completed ? "mission_completed" : "mission_reset", id,
      data.completed ? { feelingScore: data.feelingScore, alternate: completion.alternate } : {});
    if (data.completed && data.posted) await event(tx, user.id, "posted_in_test_group_checked", id);
    if (data.completed && data.wentLive) await event(tx, user.id, "went_live_checked", id);
    const updated = await tx.select().from(missionProgressTable).where(eq(missionProgressTable.userId, user.id));
    const newJourney = buildJourney(user, updated, program);
    const roundDone = newJourney.missions.filter(m => m.round === mission.round).every(m => m.completed);
    if (data.completed && roundDone) {
      await event(tx, user.id, "round_completed", id, { round: mission.round });
      await enqueueSync(tx, user.id, `round${mission.round}`);
    }
    return { journey: newJourney };
  });
  if ("error" in result) { res.status(400).json({ error: result.error }); return; }
  res.json(UpdateMissionResponse.parse(result.journey));
});

router.get("/activity", async (_req, res): Promise<void> => {
  const items = await db.select({
    id: activityEventsTable.id, type: activityEventsTable.type,
    missionId: activityEventsTable.missionId, createdAt: activityEventsTable.createdAt,
  }).from(activityEventsTable).where(eq(activityEventsTable.userId, res.locals.member.id))
    .orderBy(desc(activityEventsTable.createdAt)).limit(30);
  res.json(GetActivityResponse.parse(items.map(item => ({ ...item, createdAt: item.createdAt.toISOString() }))));
});

export default router;
