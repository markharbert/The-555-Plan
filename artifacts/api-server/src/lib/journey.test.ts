import { test } from "node:test";
import assert from "node:assert/strict";
import type { AppUser, MissionProgress } from "@workspace/db";
import { GetContentResponse, GetJourneyResponse } from "@workspace/api-zod";
import { buildJourney, publicProfile } from "./journey";
import { defaultProgram } from "../content/program";

const now = new Date("2026-10-23T12:00:00Z");
const program = GetContentResponse.parse(defaultProgram);
function member(onboarded = true): AppUser {
  return {
    id: "unit-test-member", email: "unit-test@example.invalid", firstName: "Test", lastName: "Member",
    role: "user", active: true, emailConsent: true, consentAt: now, source: "direct", utm: {},
    welcomeDone: onboarded, fearCheckDone: onboarded, planDone: onboarded, mindsetDone: onboarded,
    baselineComfort: 3, answers: {
      fears: [], business: "", audience: "", why: "", commitment: "", pockets: [],
      delegate: "", notifications: "", partner: "",
    },
    clickfunnelsContactId: null, syncStatus: "pending",
    createdAt: now, lastActiveAt: now, lastLoginAt: now,
  };
}
function mission(id: number, completed = true): MissionProgress {
  return {
    id: `unit-test-member:${id}`, userId: "unit-test-member", missionId: id,
    completed, feelingScore: completed ? id % 10 + 1 : null,
    posted: id >= 6 && id <= 10 && completed, wentLive: id >= 11 && completed,
    alternate: false, openedAt: now, completedAt: completed ? new Date(now.getTime() + id * 1000) : null,
  };
}
const completedThrough = (n: number) => Array.from({ length: n }, (_, i) => mission(i + 1));

test("all onboarding steps must finish before any mission opens", () => {
  const user = member(false);
  assert.equal(buildJourney(user, [], program).nextPath, "/welcome");
  user.welcomeDone = true;
  assert.equal(buildJourney(user, [], program).nextPath, "/fear-check");
  user.fearCheckDone = true;
  assert.equal(buildJourney(user, [], program).nextPath, "/video-plan");
  user.planDone = true;
  const journey = buildJourney(user, [], program);
  assert.equal(journey.nextPath, "/mindset");
  assert.ok(journey.missions.every(m => !m.unlocked));
});

test("exactly the first incomplete mission opens and completed ones remain accessible", () => {
  for (let n = 0; n < 15; n++) {
    const journey = GetJourneyResponse.parse(buildJourney(member(), completedThrough(n), program));
    assert.equal(journey.nextPath, `/mission/${n + 1}`);
    assert.equal(journey.stats.completed, n);
    assert.equal(journey.missions.filter(m => m.unlocked && !m.completed).length, 1);
    assert.equal(journey.missions.filter(m => m.unlocked && m.completed).length, n);
    assert.ok(journey.missions.filter(m => m.id > n + 1).every(m => !m.unlocked));
  }
});

test("round transitions and the 15-mission percentage use saved completion only", () => {
  assert.equal(buildJourney(member(), completedThrough(4), program).missions[5]!.unlocked, false);
  assert.equal(buildJourney(member(), completedThrough(5), program).missions[5]!.unlocked, true);
  assert.equal(buildJourney(member(), completedThrough(9), program).missions[10]!.unlocked, false);
  assert.equal(buildJourney(member(), completedThrough(10), program).missions[10]!.unlocked, true);
  const done = buildJourney(member(), completedThrough(15), program);
  assert.equal(done.stats.percent, 100);
  assert.equal(done.nextPath, "/progress");
  assert.equal(done.stats.videosRecorded, 0);
  assert.equal(done.stats.minutesOnCamera, 0);
});

test("opening the next round locks undo even when that mission is not completed", () => {
  const before = buildJourney(member(), completedThrough(5), program);
  assert.ok(before.missions.slice(0, 5).every(m => m.canUndo));
  const after = buildJourney(member(), [...completedThrough(5), mission(6, false)], program);
  assert.ok(after.missions.slice(0, 5).every(m => !m.canUndo));
  const round2 = buildJourney(member(), completedThrough(10), program);
  assert.ok(round2.missions.slice(5, 10).every(m => m.canUndo));
  const round3 = buildJourney(member(), [...completedThrough(10), mission(11, false)], program);
  assert.ok(round3.missions.slice(5, 10).every(m => !m.canUndo));
});

test("undo within a round makes that mission the next step without erasing later completions", () => {
  const progress = completedThrough(4);
  progress[1] = mission(2, false);
  const journey = buildJourney(member(), progress, program);
  assert.equal(journey.nextPath, "/mission/2");
  assert.equal(journey.stats.completed, 3);
  assert.equal(journey.missions[4]!.unlocked, false);
});

test("latest score is chronological and undone scores are excluded", () => {
  const progress = completedThrough(4);
  progress[1]!.completedAt = new Date(now.getTime() + 100000);
  progress[1]!.feelingScore = 9;
  assert.equal(buildJourney(member(), progress, program).stats.latestComfort, 9);
  progress[1] = mission(2, false);
  assert.equal(buildJourney(member(), progress, program).stats.latestComfort, 5);
  assert.equal(buildJourney(member(), [], program).stats.latestComfort, 3);
});

test("public profile omits consent history, attribution, and provider identifiers", () => {
  const profile = publicProfile(member());
  for (const key of ["consentAt", "utm", "source", "clickfunnelsContactId", "lastLoginAt", "active"]) {
    assert.ok(!(key in profile));
  }
});

test("editable program copy respects required language rules", () => {
  assert.equal(program.missions.length, 15);
  assert.equal(program.rounds.length, 3);
  assert.equal(program.mindset.length, 9);
  assert.equal(program.missions[9]!.alternateTitle, "Why building an email list matters");
  const text = JSON.stringify(program);
  assert.ok(!/\bfree\b/i.test(text));
  assert.ok(!text.includes("\u2014"));
});
