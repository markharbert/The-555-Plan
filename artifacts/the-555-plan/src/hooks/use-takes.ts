import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetJourneyQueryKey, getGetTakesQueryKey, useGetTakes } from '@workspace/api-client-react';
import { applyAction, flushOutbox, getBlob, listOutbox, listRows, resetFailedOps, setSyncOwner, subscribeChanges, type OutboxOp, type TakeAction, type TakeRow } from '@/lib/take-store';
import { fileName, triggerDownload } from '@/lib/recording-support';

export type TakeView = {
  id: string; missionId: number; takeNumber: number; durationSeconds: number; recordedAt: string;
  favorite: boolean; downloadedAt: string | null; local: TakeRow | null; provisional: boolean;
  status: 'synced' | 'pending' | 'problem';
};

/** Mounted once in the member shell: replays the outbox on load, online recovery and a slow retry timer. */
export function useOutboxSync() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    setSyncOwner(userId ?? null);
    if (!userId) return;
    let alive = true;
    const go = async () => {
      const n = await flushOutbox(userId).catch(() => 0);
      if (alive && n > 0) {
        void qc.invalidateQueries({ queryKey: getGetTakesQueryKey() });
        void qc.invalidateQueries({ queryKey: getGetJourneyQueryKey() });
      }
    };
    void go();
    const t = window.setInterval(go, 30_000);
    const off = subscribeChanges((uid) => {
      if (uid !== userId) return;
      void qc.invalidateQueries({ queryKey: getGetTakesQueryKey() });
      void qc.invalidateQueries({ queryKey: getGetJourneyQueryKey() });
      void qc.invalidateQueries({ queryKey: ['/api/activity'] });
      void go();
    });
    window.addEventListener('online', go);
    return () => { alive = false; setSyncOwner(null); off(); clearInterval(t); window.removeEventListener('online', go); };
  }, [userId, qc]);
}

export function useTakes(filterMission?: number) {
  const { userId } = useAuth();
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const qc = useQueryClient();
  const [rows, setRows] = useState<TakeRow[]>([]);
  const [ops, setOps] = useState<OutboxOp[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const server = useGetTakes({ query: { queryKey: [...getGetTakesQueryKey(), userId], enabled: !!userId, retry: 1 } });

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [r, o] = await Promise.all([listRows(userId), listOutbox(userId)]);
      if (currentUser.current !== userId) return;
      setRows(r); setOps(o); setStorageError(false);
    } catch { setStorageError(true); }
    setReady(true);
  }, [userId]);

  // Reset immediately when the account changes so nothing from the previous account stays on screen.
  useEffect(() => {
    setRows([]); setOps([]); setReady(false);
    if (!userId) return;
    let alive = true;
    const run = async () => {
      try {
        const [r, o] = await Promise.all([listRows(userId), listOutbox(userId)]);
        if (!alive) return;
        setRows(r); setOps(o); setStorageError(false);
      } catch { if (alive) setStorageError(true); }
      if (alive) setReady(true);
    };
    void run();
    const off = subscribeChanges((u) => { if (u === userId) void run(); });
    const onFocus = () => { void run(); };
    window.addEventListener('focus', onFocus);
    return () => { alive = false; off(); window.removeEventListener('focus', onFocus); };
  }, [userId]);

  const items = useMemo<TakeView[]>(() => {
    const out: TakeView[] = [];
    const localIds = new Set(rows.map((r) => r.id));
    const byTake = new Map<string, OutboxOp[]>();
    for (const o of ops) byTake.set(o.takeId, [...(byTake.get(o.takeId) ?? []), o]);
    for (const r of rows.filter(r => r.uid === userId)) {
      if (r.deletedAt) continue;
      const mine = byTake.get(r.id) ?? [];
      const status = mine.some((o) => o.failed) ? 'problem' : mine.length ? 'pending' : 'synced';
      out.push({ id: r.id, missionId: r.missionId, takeNumber: r.takeNumber, durationSeconds: r.durationSeconds, recordedAt: r.recordedAt, favorite: r.favorite, downloadedAt: r.downloadedAt, local: r, provisional: r.provisional, status });
    }
    for (const t of server.data ?? []) {
      if (t.deletedAt || localIds.has(t.id)) continue;
      out.push({ id: t.id, missionId: t.missionId, takeNumber: t.takeNumber, durationSeconds: t.durationSeconds, recordedAt: t.recordedAt, favorite: t.favorite, downloadedAt: t.downloadedAt, local: null, provisional: false, status: 'synced' });
    }
    return out.filter((t) => filterMission == null || t.missionId === filterMission).sort((a, b) => a.missionId - b.missionId || a.takeNumber - b.takeNumber);
  }, [rows, ops, server.data, filterMission, userId]);

  const pendingCount = ops.filter((o) => !o.failed).length;
  const failedCount = ops.filter((o) => o.failed).length;

  const act = useCallback(async (id: string, a: TakeAction) => {
    if (!userId) return;
    await applyAction(userId, id, a);
  }, [userId]);

  const retrySync = useCallback(async () => {
    if (!userId) return;
    await resetFailedOps(userId);
    const n = await flushOutbox(userId).catch(() => 0);
    if (n) { void qc.invalidateQueries({ queryKey: getGetTakesQueryKey() }); void qc.invalidateQueries({ queryKey: getGetJourneyQueryKey() }); }
    await load();
  }, [userId, qc, load]);

  /** Reads the blob from this account only, starts a browser download and logs the metadata. */
  const download = useCallback(async (t: TakeView, meta?: { id: number; round?: number; position?: number; title?: string }) => {
    if (!userId || !t.local) return false;
    const blob = await getBlob(userId, t.id);
    if (!blob || currentUser.current !== userId) return false;
    triggerDownload(blob, fileName(meta ?? { id: t.missionId }, t.local.mime, t.takeNumber));
    await applyAction(userId, t.id, 'download');
    return true;
  }, [userId]);

  return { items, ready, storageError, pendingCount, failedCount, serverLoading: server.isLoading, serverError: server.isError, refetchServer: server.refetch, act, retrySync, download, uid: userId ?? null };
}
