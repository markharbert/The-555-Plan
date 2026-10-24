import { useEffect, useState } from 'react';
import { CloudOff, Download, Play, Star, Trash2, Video } from 'lucide-react';
import { useAuth } from '@clerk/react';
import { Btn } from '@/components/brand';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { getBlob } from '@/lib/take-store';
import { fmtBytes, fmtTime } from '@/lib/recording-support';
import type { TakeView, useTakes } from '@/hooks/use-takes';

export type MissionMeta = { id: number; round?: number; position?: number; title?: string };
type Api = ReturnType<typeof useTakes>;

function Thumb({ blob }: { blob: Blob | null }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) { setUrl(null); return; }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <Video className="h-7 w-7 text-slate-brand" strokeWidth={1.5} />;
}

function Player({ take, open, onClose }: { take: TakeView; open: boolean; onClose: () => void }) {
  const { userId } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (!open || !userId) return;
    let alive = true;
    let u: string | null = null;
    setMissing(false);
    getBlob(userId, take.id).then((b) => {
      if (!alive) return;
      if (!b) { setMissing(true); return; }
      u = URL.createObjectURL(b);
      setUrl(u);
    }).catch(() => alive && setMissing(true));
    return () => { alive = false; if (u) URL.revokeObjectURL(u); setUrl(null); };
  }, [open, userId, take.id]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[760px]">
        <DialogTitle className="font-display uppercase text-navy">Take {take.takeNumber}</DialogTitle>
        <DialogDescription className="sr-only">Saved video playback</DialogDescription>
        {url && <video src={url} controls playsInline autoPlay className="w-full rounded-lg bg-navy" data-testid="video-saved-player" />}
        {missing && <p className="text-slate-brand">This video could not be read from this browser.</p>}
      </DialogContent>
    </Dialog>
  );
}

export function TakeCard({ take, meta, api }: { take: TakeView; meta: MissionMeta; api: Api }) {
  const [play, setPlay] = useState(false);
  const [del, setDel] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const has = !!take.local?.hasBlob;
  const run = async (f: () => Promise<unknown>) => { setMsg(null); try { await f(); } catch { setMsg('That did not work in this browser. Please try again.'); } };
  const t = take.id;
  return (
    <div className="overflow-hidden rounded-xl border border-coolgray bg-white" data-testid={`card-take-${t}`}>
      <button type="button" disabled={!has} onClick={() => setPlay(true)} className="group relative flex aspect-video w-full items-center justify-center bg-coolwhite" aria-label={`Play take ${take.takeNumber}`} data-testid={`button-play-${t}`}>
        <Thumb blob={take.local?.thumb ?? null} />
        {has && <span className="absolute inset-0 flex items-center justify-center bg-navy/0 transition-colors group-hover:bg-navy/25"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-navy"><Play className="h-5 w-5" fill="currentColor" /></span></span>}
        <span className="absolute bottom-2 right-2 rounded bg-navy/85 px-2 py-0.5 text-[12px] font-medium text-white">{fmtTime(take.durationSeconds)}</span>
        {take.favorite && <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-sky px-2 py-0.5 text-[12px] font-bold text-navy"><Star className="h-3 w-3" fill="currentColor" /> Favorite</span>}
      </button>
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display text-[15px] font-extrabold uppercase text-navy">Take {take.takeNumber}{take.provisional ? ' (provisional)' : ''}</p>
          <p className="text-[13px] text-slate-brand">{new Date(take.recordedAt).toLocaleDateString()}</p>
        </div>
        <p className="mt-1 text-[13px] text-slate-brand" data-testid={`status-take-${t}`}>
          {!has ? 'Recorded on another device or browser. No video file in this browser.' : take.status === 'pending' ? 'Waiting to sync details' : take.status === 'problem' ? 'Details could not sync' : 'Saved in this browser'}
          {has && take.local ? ` · ${fmtBytes(take.local.size)}` : ''}
          {take.downloadedAt ? ' · Download started' : ''}
        </p>
        {take.status !== 'synced' && has && <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-slate-brand"><CloudOff className="h-3 w-3" /> Your video is safe here either way.</p>}
        {has && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border-2 border-coolgray px-3 text-[13px] font-bold uppercase text-navy hover:border-navy" onClick={() => run(() => api.act(t, take.favorite ? 'unfavorite' : 'favorite'))} aria-pressed={take.favorite} data-testid={`button-favorite-${t}`}><Star className="h-4 w-4" fill={take.favorite ? 'currentColor' : 'none'} />{take.favorite ? 'Favorite' : 'Favorite'}</button>
            <button type="button" className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border-2 border-coolgray px-3 text-[13px] font-bold uppercase text-navy hover:border-navy" onClick={() => run(async () => { if (!(await api.download(take, meta))) throw new Error('x'); })} data-testid={`button-download-${t}`}><Download className="h-4 w-4" /> Download</button>
            <button type="button" className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border-2 border-coolgray px-3 text-[13px] font-bold uppercase text-navy hover:border-brand-red" onClick={() => setDel(true)} data-testid={`button-delete-${t}`}><Trash2 className="h-4 w-4" /> Delete</button>
          </div>
        )}
        {msg && <p role="alert" className="mt-2 text-[13px] text-ink">{msg}</p>}
      </div>
      <Player take={take} open={play} onClose={() => setPlay(false)} />
      <AlertDialog open={del} onOpenChange={setDel}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this take?</AlertDialogTitle><AlertDialogDescription>The video is removed from this browser for good. It has not been downloaded unless you see Download started above. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Keep it</AlertDialogCancel><Btn onClick={() => { setDel(false); void run(() => api.act(t, 'delete')); }} data-testid={`button-confirm-delete-${t}`}>Delete video</Btn></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
