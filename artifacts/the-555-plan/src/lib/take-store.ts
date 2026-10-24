import { recordingStarted, saveTake, updateTake } from '@workspace/api-client-react';

/**
 * Per-account IndexedDB storage for private video takes plus a durable metadata outbox.
 * Every row is keyed by Clerk user id. Videos and thumbnails never leave this database.
 */
export type TakeRow = {
  key: string;
  uid: string;
  id: string;
  missionId: number;
  takeNumber: number;
  provisional: boolean;
  durationSeconds: number;
  recordedAt: string;
  favorite: boolean;
  downloadedAt: string | null;
  deletedAt: string | null;
  mime: string;
  size: number;
  hasBlob: boolean;
  thumb: Blob | null;
  saveSynced: boolean;
};

export type OutboxOp = {
  seq?: number;
  uid: string;
  opId: string;
  kind: 'save' | 'patch' | 'start';
  takeId: string;
  missionId: number;
  data: Record<string, unknown>;
  failed?: string;
};

export type Prefs = { uid: string; cameraId?: string; micId?: string };

const DB_NAME = 'the-555-plan-videos';
let dbp: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB is not available'));
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => {
        const db = r.result;
        const takes = db.createObjectStore('takes', { keyPath: 'key' });
        takes.createIndex('byUid', 'uid');
        db.createObjectStore('blobs', { keyPath: 'key' });
        const ob = db.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true });
        ob.createIndex('byUid', 'uid');
        db.createObjectStore('prefs', { keyPath: 'uid' });
      };
      r.onsuccess = () => {
        r.result.onversionchange = () => { r.result.close(); dbp = null; };
        resolve(r.result);
      };
      r.onerror = () => { dbp = null; reject(r.error ?? new Error('Could not open storage')); };
    });
  }
  return dbp;
}

const req = <T,>(r: IDBRequest<T>) => new Promise<T>((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const done = (tx: IDBTransaction) => {
  const completion = new Promise<void>((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error ?? new Error('Storage failed'));
    tx.onabort = () => rej(tx.error ?? new Error('Storage failed'));
  });
  // A request can reject before its caller reaches `await completion`.
  // Observe the transaction rejection immediately without hiding it from awaiters.
  void completion.catch(() => undefined);
  return completion;
};
export const rowKey = (uid: string, id: string) => `${uid}:${id}`;
const newId = () => crypto.randomUUID();

/* Multi-tab refresh */
const chan = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('the-555-plan-takes') : null;
const subs = new Set<(uid: string) => void>();
chan?.addEventListener('message', (e) => subs.forEach((f) => f(String(e.data))));
export function notifyChange(uid: string) { chan?.postMessage(uid); subs.forEach((f) => f(uid)); }
export function subscribeChanges(f: (uid: string) => void) { subs.add(f); return () => { subs.delete(f); }; }

export async function listRows(uid: string): Promise<TakeRow[]> {
  const db = await openDb();
  return req(db.transaction('takes').objectStore('takes').index('byUid').getAll(uid));
}
export async function getBlob(uid: string, id: string): Promise<Blob | null> {
  const db = await openDb();
  const r = await req<{ blob: Blob } | undefined>(db.transaction('blobs').objectStore('blobs').get(rowKey(uid, id)));
  return r?.blob ?? null;
}
export async function listOutbox(uid: string): Promise<OutboxOp[]> {
  const db = await openDb();
  const all = await req<OutboxOp[]>(db.transaction('outbox').objectStore('outbox').index('byUid').getAll(uid));
  return all.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
}
export async function getPrefs(uid: string): Promise<Prefs> {
  try {
    const db = await openDb();
    return (await req<Prefs | undefined>(db.transaction('prefs').objectStore('prefs').get(uid))) ?? { uid };
  } catch { return { uid }; }
}
export async function setPrefs(p: Prefs) {
  try {
    const db = await openDb();
    const tx = db.transaction('prefs', 'readwrite');
    tx.objectStore('prefs').put(p);
    await done(tx);
  } catch { /* preference only */ }
}

export type NewTake = { uid: string; missionId: number; blob: Blob; thumb: Blob | null; durationSeconds: number; recordedAt: string; mime: string };

/** Atomic: blob + metadata row + outbox save op commit together or not at all. Resolves only after commit. */
export async function keepTake(t: NewTake): Promise<TakeRow> {
  const db = await openDb();
  const id = newId();
  const tx = db.transaction(['takes', 'blobs', 'outbox'], 'readwrite');
  const finished = done(tx);
  const rows = await req<TakeRow[]>(tx.objectStore('takes').index('byUid').getAll(t.uid));
  const n = rows.filter((r) => r.missionId === t.missionId).reduce((m, r) => Math.max(m, r.takeNumber), 0) + 1;
  const row: TakeRow = {
    key: rowKey(t.uid, id), uid: t.uid, id, missionId: t.missionId, takeNumber: n, provisional: true,
    durationSeconds: t.durationSeconds, recordedAt: t.recordedAt, favorite: false, downloadedAt: null, deletedAt: null,
    mime: t.mime, size: t.blob.size, hasBlob: true, thumb: t.thumb, saveSynced: false,
  };
  tx.objectStore('takes').put(row);
  tx.objectStore('blobs').put({ key: row.key, blob: t.blob });
  const op: OutboxOp = { uid: t.uid, opId: newId(), kind: 'save', takeId: id, missionId: t.missionId, data: { durationSeconds: t.durationSeconds, recordedAt: t.recordedAt } };
  tx.objectStore('outbox').put(op);
  await finished;
  notifyChange(t.uid);
  void flushOutbox(t.uid);
  return row;
}

export async function queueStart(uid: string, missionId: number) {
  try {
    const db = await openDb();
    const tx = db.transaction('outbox', 'readwrite');
    tx.objectStore('outbox').put({ uid, opId: newId(), kind: 'start', takeId: '', missionId, data: {} } satisfies OutboxOp);
    await done(tx);
    void flushOutbox(uid);
  } catch { /* start logging is best effort */ }
}

export type TakeAction = 'favorite' | 'unfavorite' | 'download' | 'delete';

/** Atomic local change plus queued metadata op. Delete removes the blob and keeps a tombstone row. */
export async function applyAction(uid: string, id: string, action: TakeAction) {
  const db = await openDb();
  const tx = db.transaction(['takes', 'blobs', 'outbox'], 'readwrite');
  const finished = done(tx);
  const takes = tx.objectStore('takes');
  const row = await req<TakeRow | undefined>(takes.get(rowKey(uid, id)));
  if (!row) { tx.abort(); await finished.catch(() => undefined); return; }
  if (row.deletedAt) { await finished; return; }
  const ops: OutboxOp[] = [];
  const mk = (data: Record<string, unknown>): OutboxOp => ({ uid, opId: newId(), kind: 'patch', takeId: id, missionId: row.missionId, data });
  if (action === 'favorite') {
    const all = await req<TakeRow[]>(takes.index('byUid').getAll(uid));
    for (const o of all) if (o.missionId === row.missionId && o.favorite && o.id !== id) takes.put({ ...o, favorite: false });
    takes.put({ ...row, favorite: true });
    ops.push(mk({ favorite: true }));
  } else if (action === 'unfavorite') {
    takes.put({ ...row, favorite: false });
    ops.push(mk({ favorite: false }));
  } else if (action === 'download') {
    takes.put({ ...row, downloadedAt: new Date().toISOString() });
    ops.push(mk({ downloaded: true }));
  } else {
    takes.put({ ...row, deletedAt: new Date().toISOString(), hasBlob: false, thumb: null, favorite: false });
    tx.objectStore('blobs').delete(row.key);
    ops.push(mk({ deleted: true }));
  }
  for (const o of ops) tx.objectStore('outbox').put(o);
  await finished;
  notifyChange(uid);
  void flushOutbox(uid);
}

/* Outbox replay: ordered, durable, never blocks the recorder. */
const running = new Map<string, Promise<number>>();
let syncOwner: string | null = null;
let syncEpoch = 0;
const controllers = new Set<AbortController>();
export function setSyncOwner(uid: string | null) {
  if (syncOwner === uid) return;
  syncOwner = uid;
  syncEpoch++;
  controllers.forEach(c => c.abort());
  controllers.clear();
}
export async function resetFailedOps(uid: string) {
  const db = await openDb();
  const tx = db.transaction('outbox', 'readwrite');
  const fin = done(tx);
  const ops = await req<OutboxOp[]>(tx.objectStore('outbox').index('byUid').getAll(uid));
  for (const op of ops) if (op.failed) tx.objectStore('outbox').put({ ...op, failed: undefined });
  await fin;
  notifyChange(uid);
}
export function flushOutbox(uid: string): Promise<number> {
  if (syncOwner !== uid) return Promise.resolve(0);
  const cur = running.get(uid);
  if (cur) return cur;
  const p = run(uid).finally(() => running.delete(uid));
  running.set(uid, p);
  return p;
}

async function removeOp(seq: number) {
  const db = await openDb();
  const tx = db.transaction('outbox', 'readwrite');
  tx.objectStore('outbox').delete(seq);
  await done(tx);
}
async function failOp(op: OutboxOp, msg: string) {
  const db = await openDb();
  const tx = db.transaction('outbox', 'readwrite');
  tx.objectStore('outbox').put({ ...op, failed: msg });
  await done(tx);
}

async function run(uid: string): Promise<number> {
  const epoch = syncEpoch;
  let acked = 0;
  let ops: OutboxOp[];
  try { ops = await listOutbox(uid); } catch { return 0; }
  for (const op of ops) {
    if (syncOwner !== uid || epoch !== syncEpoch) break;
    if (op.failed || op.seq == null) continue;
    const controller = new AbortController();
    controllers.add(controller);
    const options = { signal: controller.signal, headers: { 'X-555-Account': uid } };
    try {
      if (op.kind === 'save') {
        const res = await saveTake(op.takeId, { missionId: op.missionId, durationSeconds: Math.min(122, Math.max(0.1, Number(op.data.durationSeconds))), recordedAt: String(op.data.recordedAt) }, options);
        const db = await openDb();
        const tx = db.transaction(['takes', 'outbox'], 'readwrite');
        const fin = done(tx);
        const cur = await req<TakeRow | undefined>(tx.objectStore('takes').get(rowKey(uid, op.takeId)));
        // Merge only the canonical number so newer local edits stay untouched.
        if (cur) tx.objectStore('takes').put({ ...cur, takeNumber: res.takeNumber, provisional: false, saveSynced: true });
        tx.objectStore('outbox').delete(op.seq);
        await fin;
      } else if (op.kind === 'patch') {
        await updateTake(op.takeId, { operationId: op.opId, ...op.data }, options);
        await removeOp(op.seq);
      } else {
        await recordingStarted({ operationId: op.opId, missionId: op.missionId }, options);
        await removeOp(op.seq);
      }
      acked++;
    } catch (e) {
      if (syncOwner !== uid || epoch !== syncEpoch) break;
      const status = (e as { status?: number })?.status;
      if (status && status >= 400 && status < 500 && ![401, 408, 429].includes(status)) {
        try { await failOp(op, `Server said no (${status})`); } catch { /* ignore */ }
        continue;
      }
      break; // transient: stop, keep order, retry later
    } finally {
      controllers.delete(controller);
    }
  }
  if (acked) notifyChange(uid);
  return acked;
}
