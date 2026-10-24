import { test } from "node:test";
import assert from "node:assert/strict";
import { SaveTakeBody, SaveTakeParams, UpdateTakeBody, RecordingStartedBody } from "@workspace/api-zod";
import type { VideoTakeRow } from "@workspace/db";
import { takeMetadata } from "./takes";

const takeId = "3882b626-7df3-40e9-9f1e-d5827ef2c65e";
const input = { missionId: 1, durationSeconds: 14.25, recordedAt: "2026-10-23T12:00:00Z" };

test("metadata boundary rejects video, thumbnails, owner overrides, and invalid durations", () => {
  const schema = SaveTakeBody.strict();
  assert.ok(schema.safeParse(input).success);
  for (const field of ["blob", "video", "thumbnail", "userId", "dataUrl", "file"]) {
    assert.ok(!schema.safeParse({ ...input, [field]: "not-allowed" }).success);
  }
  for (const durationSeconds of [0, -1, 123, Infinity, NaN]) {
    assert.ok(!schema.safeParse({ ...input, durationSeconds }).success);
  }
  assert.ok(!schema.safeParse({ ...input, missionId: 16 }).success);
  assert.ok(!schema.safeParse({ ...input, recordedAt: "not-a-date" }).success);
});

test("take IDs and operation IDs must be UUIDs for safe offline replay", () => {
  assert.ok(SaveTakeParams.safeParse({ takeId }).success);
  assert.ok(!SaveTakeParams.safeParse({ takeId: "../other-user" }).success);
  assert.ok(UpdateTakeBody.strict().safeParse({ operationId: takeId, favorite: true }).success);
  assert.ok(!UpdateTakeBody.strict().safeParse({ operationId: "not-an-id", deleted: true }).success);
  assert.ok(RecordingStartedBody.strict().safeParse({ operationId: takeId, missionId: 1 }).success);
  assert.ok(!RecordingStartedBody.strict().safeParse({ operationId: takeId, missionId: 1, video: "forbidden" }).success);
});

test("take response is a metadata whitelist and preserves deletion tombstones", () => {
  const row: VideoTakeRow = {
    id: takeId, userId: "not-exposed", missionId: 1, takeNumber: 2, durationSeconds: 14.25,
    recordedAt: new Date(input.recordedAt), favorite: false,
    downloadedAt: new Date("2026-10-23T12:05:00Z"),
    deletedAt: new Date("2026-10-23T12:10:00Z"),
  };
  const result = takeMetadata(row);
  assert.equal(result.takeNumber, 2);
  assert.equal(result.durationSeconds, 14.25);
  assert.equal(result.deletedAt, "2026-10-23T12:10:00.000Z");
  assert.equal(result.downloadedAt, "2026-10-23T12:05:00.000Z");
  assert.ok(!("userId" in result));
  assert.deepEqual(Object.keys(result).sort(), [
    "id", "missionId", "takeNumber", "durationSeconds", "recordedAt", "favorite", "downloadedAt", "deletedAt",
  ].sort());
});
