import { eq } from "drizzle-orm";
import { db, appSettingsTable, type AppUser, type MissionProgress } from "@workspace/db";
import { GetContentResponse } from "@workspace/api-zod";
import { defaultProgram } from "../content/program";

export function publicProfile(user: AppUser) {
  return {
    id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role,
    welcomeDone: user.welcomeDone, fearCheckDone: user.fearCheckDone, planDone: user.planDone,
    mindsetDone: user.mindsetDone, baselineComfort: user.baselineComfort, ...user.answers,
    syncStatus: user.syncStatus, createdAt: user.createdAt.toISOString(),
  };
}

export async function getProgram() {
  const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "program")).limit(1);
  return GetContentResponse.parse(row ? row.value : defaultProgram);
}

export type Program = Awaited<ReturnType<typeof getProgram>>;

export function buildJourney(user: AppUser, progress: MissionProgress[], program: Program) {
  const onboarded = user.welcomeDone && user.fearCheckDone && user.planDone && user.mindsetDone;
  const completedIds = new Set(progress.filter(p => p.completed).map(p => p.missionId));
  const firstIncomplete = program.missions.find(m => !completedIds.has(m.id));
  const missions = program.missions.map(m => {
    const p = progress.find(v => v.missionId === m.id);
    const nextRoundStarted = progress.some(v => v.missionId > Math.ceil(m.id / 5) * 5);
    return {
      ...m,
      completed: p?.completed ?? false,
      unlocked: onboarded && (completedIds.has(m.id) || m.id === firstIncomplete?.id),
      canUndo: !!p?.completed && !nextRoundStarted,
      feelingScore: p?.feelingScore ?? null, completedAt: p?.completedAt?.toISOString() ?? null,
      posted: p?.posted ?? false, wentLive: p?.wentLive ?? false,
    };
  });
  const done = missions.filter(m => m.completed);
  const recentScore = [...progress].filter(p => p.completed && p.feelingScore !== null)
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))[0]?.feelingScore;
  let nextPath = "/welcome";
  let nextTitle = "Welcome to your 555 Plan";
  if (user.welcomeDone) { nextPath = "/fear-check"; nextTitle = "Take your Fear Check"; }
  if (user.welcomeDone && user.fearCheckDone) { nextPath = "/video-plan"; nextTitle = "Create your video plan"; }
  if (user.welcomeDone && user.fearCheckDone && user.planDone) { nextPath = "/mindset"; nextTitle = "Build your camera mindset"; }
  if (onboarded) {
    nextPath = firstIncomplete ? `/mission/${firstIncomplete.id}` : "/progress";
    nextTitle = firstIncomplete
      ? `Round ${firstIncomplete.round}, Mission ${firstIncomplete.position}: ${firstIncomplete.title}`
      : "You completed all 15 missions";
  }
  return {
    profile: publicProfile(user), missions, rounds: program.rounds, mindset: program.mindset,
    stats: {
      completed: done.length, percent: Math.round(done.length / 15 * 100),
      videosRecorded: 0, minutesOnCamera: 0, baselineComfort: user.baselineComfort,
      latestComfort: recentScore ?? user.baselineComfort,
    },
    nextPath, nextTitle,
  };
}
