import { useMemo, useState } from 'react';
import { Download, Video } from 'lucide-react';
import { Btn, Card, ErrorState, PageHeader, ProgressBar, Skel } from '@/components/brand';
import { StorageStatus, LIBRARY_NOTE } from '@/components/storage-status';
import { TakeCard } from '@/components/take-card';
import { useJourney } from '@/hooks/use-journey';
import { useTakes, type TakeView } from '@/hooks/use-takes';
import { positionOf, roundOf } from '@/lib/recording-support';

export function Videos() {
  const j = useJourney();
  const api = useTakes();
  const [prog, setProg] = useState<{ round: number; done: number; total: number; failed: number } | null>(null);
  const missions = j.data?.missions;
  const metaFor = (id: number) => {
    const m = missions?.find((x) => x.id === id);
    return { id, round: m?.round ?? roundOf(id), position: m?.position ?? positionOf(id), title: m?.title };
  };
  const roundName = (r: number) => j.data?.rounds.find((x) => x.id === r)?.name ?? '';

  const groups = useMemo(() => {
    const byRound = new Map<number, Map<number, TakeView[]>>();
    for (const t of api.items) {
      const r = roundOf(t.missionId);
      const mm = byRound.get(r) ?? new Map<number, TakeView[]>();
      mm.set(t.missionId, [...(mm.get(t.missionId) ?? []), t]);
      byRound.set(r, mm);
    }
    return [...byRound.entries()].sort((a, b) => a[0] - b[0]);
  }, [api.items]);

  const downloadRound = async (r: number, list: TakeView[]) => {
    const files = list.filter((t) => t.local?.hasBlob);
    let failed = 0;
    setProg({ round: r, done: 0, total: files.length, failed });
    for (let i = 0; i < files.length; i++) {
      try { if (!(await api.download(files[i], metaFor(files[i].missionId)))) failed++; } catch { failed++; }
      setProg({ round: r, done: i + 1, total: files.length, failed });
      await new Promise((res) => setTimeout(res, 900));
    }
    setTimeout(() => setProg(null), 4000);
  };

  return (
    <div>
      <PageHeader eyebrow="My Videos" title="Your private video library" intro={LIBRARY_NOTE} />
      {api.storageError && <div className="mb-6"><ErrorState message="This browser would not let us open its video storage. Private browsing can cause this." onRetry={() => window.location.reload()} /></div>}
      {(api.pendingCount > 0 || api.failedCount > 0) && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 p-5" data-testid="status-sync">
          <p className="text-[15px] text-slate-brand">{api.failedCount > 0 ? 'Some details could not sync.' : `${api.pendingCount} update${api.pendingCount === 1 ? '' : 's'} waiting to sync.`} Your videos are safe in this browser either way.</p>
          <Btn variant="small" onClick={() => void api.retrySync()} data-testid="button-retry-sync">Try syncing now</Btn>
        </Card>
      )}
      {!api.ready && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Skel className="h-56" /><Skel className="h-56" /><Skel className="h-56" /></div>}
      {api.ready && groups.length === 0 && (
        <Card className="mx-auto flex max-w-[620px] flex-col items-center p-10 text-center" data-testid="empty-videos">
          <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-coolwhite text-navy"><Video className="h-6 w-6" strokeWidth={1.75} /></span>
          <h2 className="h-display text-[22px]">No videos yet</h2>
          <p className="mt-2 text-slate-brand">Open a mission, turn on your camera and keep a take. It will show up here.</p>
          <div className="mt-6"><Btn variant="secondary" href="/dashboard">Back to My Journey</Btn></div>
        </Card>
      )}
      <div className="space-y-12">
        {groups.map(([r, mm]) => {
          const all = [...mm.values()].flat();
          const local = all.filter((t) => t.local?.hasBlob).length;
          return (
            <section key={r} data-testid={`section-round-${r}`}>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-coolgray pb-3">
                <h2 className="h-display text-[26px]">Round {r}{roundName(r) ? `: ${roundName(r)}` : ''}</h2>
                {local > 0 && <Btn variant="small" onClick={() => void downloadRound(r, all)} disabled={!!prog} data-testid={`button-download-round-${r}`}><Download className="h-4 w-4" /> Download all ({local})</Btn>}
              </div>
              {prog?.round === r && (
                <div className="mb-5" data-testid="status-download-all" role="status">
                  <ProgressBar value={prog.total ? (prog.done / prog.total) * 100 : 100} />
                  <p className="mt-2 text-[13px] text-slate-brand">{prog.done - prog.failed} of {prog.total} download requests sent. Your browser may ask permission to download multiple files. Allow it, and check your downloads folder to confirm.</p>
                  {prog.failed > 0 && <p role="alert" className="mt-2 text-[13px] text-ink">We could not open {prog.failed} video{prog.failed === 1 ? '' : 's'} for download. Try downloading those takes individually.</p>}
                </div>
              )}
              <div className="space-y-8">
                {[...mm.entries()].sort((a, b) => a[0] - b[0]).map(([mid, list]) => {
                  const m = metaFor(mid);
                  return (
                    <div key={mid}>
                      <h3 className="mb-3 font-display text-[15px] font-extrabold uppercase text-navy">Mission {m.position}{m.title ? `: ${m.title}` : ''}</h3>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {list.map((t) => <TakeCard key={t.id} take={t} meta={m} api={api} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <Card className="mt-12 p-6"><h2 className="mb-2 font-display text-[15px] font-extrabold uppercase text-navy">Storage</h2><StorageStatus refreshKey={api.items.length} /></Card>
    </div>
  );
}
