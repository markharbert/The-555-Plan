import { db, pool, usersTable, syncQueueTable, appSettingsTable } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";
import { logger } from "./logger";
import { defaultTags } from "../content/program";

export function clickfunnelsConfigured() {
  return !!(process.env.CLICKFUNNELS_API_TOKEN && process.env.CLICKFUNNELS_SUBDOMAIN && process.env.CLICKFUNNELS_WORKSPACE_ID);
}

async function cfRequest(path: string, method = "GET", body?: unknown) {
  const subdomain = process.env.CLICKFUNNELS_SUBDOMAIN ?? "";
  if (!/^[a-zA-Z0-9-]+$/.test(subdomain)) throw new Error("ClickFunnels subdomain is not configured correctly.");
  const response = await fetch(`https://${subdomain}.myclickfunnels.com/api/v2${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.CLICKFUNNELS_API_TOKEN}`,
      Accept: "application/json", "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });
  if (!response.ok) throw new Error(`ClickFunnels API returned HTTP ${response.status} ${response.statusText}.`);
  return await response.json() as Record<string, unknown> | Record<string, unknown>[];
}

export async function testClickfunnelsConnection() {
  if (!clickfunnelsConfigured()) throw new Error("Add the ClickFunnels token, subdomain, and workspace ID in project secrets.");
  const workspaceId = encodeURIComponent(process.env.CLICKFUNNELS_WORKSPACE_ID!);
  const workspace = await cfRequest(`/workspaces/${workspaceId}`);
  if (Array.isArray(workspace) || !workspace.id) throw new Error("ClickFunnels returned an unexpected workspace response.");
  return { connected: true, workspaceName: String(workspace.name ?? "") };
}

async function syncContact(userId: string, kind: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return;
  const workspaceId = encodeURIComponent(process.env.CLICKFUNNELS_WORKSPACE_ID!);
  const contact = await cfRequest(`/workspaces/${workspaceId}/contacts/upsert`, "POST", {
    contact: { first_name: user.firstName, last_name: user.lastName, email_address: user.email },
  });
  if (Array.isArray(contact) || !contact.id) throw new Error("ClickFunnels did not return a contact ID.");
  const contactId = String(contact.id);
  await db.update(usersTable).set({ clickfunnelsContactId: contactId }).where(eq(usersTable.id, userId));

  const [tagSettings] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "clickfunnels_tags"));
  const configuredName = tagSettings?.value[kind];
  const tagName = typeof configuredName === "string" ? configuredName : defaultTags[kind];
  if (!tagName) return; // Profile-only updates do not apply tags.
  const tagPath = `/workspaces/${workspaceId}/contacts/tags`;
  const matching = await cfRequest(`${tagPath}?filter[name]=${encodeURIComponent(tagName)}&per_page=100`);
  if (!Array.isArray(matching)) throw new Error("ClickFunnels returned an unexpected tag list.");
  let tag = matching.find(t => t.name === tagName);
  if (!tag) {
    const created = await cfRequest(tagPath, "POST", { contacts_tag: { name: tagName } });
    if (Array.isArray(created) || !created.id) throw new Error("ClickFunnels did not return a tag ID.");
    tag = created;
  }
  // Query only this tag to avoid dropping unrelated tags or relying on a first page.
  const appliedPath = `/contacts/${encodeURIComponent(contactId)}/applied_tags`;
  const existing = await cfRequest(`${appliedPath}?filter[tag_id]=${encodeURIComponent(String(tag.id))}`);
  if (!Array.isArray(existing)) throw new Error("ClickFunnels returned an unexpected applied tag list.");
  if (!existing.some(t => String(t.tag_id) === String(tag.id))) {
    await cfRequest(appliedPath, "POST", { contacts_applied_tag: { tag_id: Number(tag.id) } });
  }
}

let working = false;
const delays = [60, 300, 1800, 7200];

export async function processSyncQueue() {
  if (working) return;
  working = true;
  try {
    // Lease rows atomically. Expired leases recover after a stopped server.
    for (let n = 0; n < 5; n++) {
      const claimed = await pool.query<{ id: number; user_id: string; kind: string; attempts: number }>(`
        UPDATE sync_queue SET status = 'processing', locked_at = NOW()
        WHERE id = (
          SELECT id FROM sync_queue
          WHERE (status = 'pending' AND next_attempt_at <= NOW())
             OR (status = 'processing' AND locked_at < NOW() - INTERVAL '5 minutes')
          ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1
        ) RETURNING id, user_id, kind, attempts
      `);
      const row = claimed.rows[0];
      if (!row) break;
      if (!clickfunnelsConfigured()) {
        await db.update(syncQueueTable).set({
          status: "pending", lockedAt: null,
          lastError: "ClickFunnels connection is not configured.",
          nextAttemptAt: new Date(Date.now() + 60000),
        }).where(eq(syncQueueTable.id, row.id));
        continue;
      }
      try {
        await syncContact(row.user_id, row.kind);
        await db.update(syncQueueTable).set({ status: "synced", lastError: null, lockedAt: null })
          .where(eq(syncQueueTable.id, row.id));
      } catch (error) {
        const attempts = row.attempts + 1;
        await db.update(syncQueueTable).set({
          status: attempts >= 8 ? "failed" : "pending", attempts, lockedAt: null,
          lastError: error instanceof Error ? error.message.slice(0, 500) : "ClickFunnels request failed.",
          nextAttemptAt: new Date(Date.now() + delays[Math.min(attempts - 1, delays.length - 1)]! * 1000),
        }).where(eq(syncQueueTable.id, row.id));
        logger.warn({ syncId: row.id, attempts }, "ClickFunnels sync deferred");
      }
      const remaining = await db.select({ status: syncQueueTable.status }).from(syncQueueTable)
        .where(and(eq(syncQueueTable.userId, row.user_id), ne(syncQueueTable.status, "synced")));
      const status = remaining.some(r => r.status === "failed") ? "failed" : remaining.length ? "pending" : "synced";
      await db.update(usersTable).set({ syncStatus: status }).where(eq(usersTable.id, row.user_id));
    }
  } catch {
    logger.error("ClickFunnels queue worker could not complete its pass");
  } finally {
    working = false;
  }
}

export function startSyncWorker() {
  void processSyncQueue();
  const timer = setInterval(() => { void processSyncQueue(); }, 15000);
  timer.unref();
}
