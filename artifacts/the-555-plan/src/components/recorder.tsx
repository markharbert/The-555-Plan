import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Camera, Download, ExternalLink, Mic, Square, VideoOff } from 'lucide-react';
import type { Mission } from '@workspace/api-client-react';
import { Btn, Card, TextLink } from '@/components/brand';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { TakeCard } from '@/components/take-card';
import { RecordingOverlays } from '@/components/recording-overlays';
import { VideoExport } from '@/components/video-export';
import { useRecorder } from '@/hooks/use-recorder';
import { useTakes } from '@/hooks/use-takes';
import { fileName, fmtTime, supportMessage, triggerDownload } from '@/lib/recording-support';

const selectCls = 'h-11 w-full rounded-lg border border-coolgray bg-white px-3 text-[15px] text-ink disabled:opacity-50';

/** Warns before in-app link clicks and tab closes while a recording or unsaved draft exists. */
function useLeaveGuard(dirty: boolean, onLeave: () => void) {
  const [pending, setPending] = useState<{ anchor?: HTMLAnchorElement; history?: { url: string; state: unknown } } | null>(null);
  const bypass = useRef(false);
  const leave = useRef(onLeave);
  leave.current = onLeave;
  useEffect(() => {
    if (!dirty) return;
    const click = (e: MouseEvent) => {
      if (bypass.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download') || a.origin !== window.location.origin) return;
      e.preventDefault(); e.stopPropagation();
      setPending({ anchor: a });
    };
    const currentUrl = window.location.href;
    const currentState: unknown = window.history.state;
    const pop = (e: PopStateEvent) => {
      if (bypass.current) return;
      const target = { url: window.location.href, state: window.history.state as unknown };
      if (target.url === currentUrl) return;
      // Run before the router observes popstate, keeping this draft mounted.
      e.stopImmediatePropagation();
      window.history.replaceState(currentState, '', currentUrl);
      setPending({ history: target });
    };
    const unload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    document.addEventListener('click', click, true);
    window.addEventListener('beforeunload', unload);
    window.addEventListener('popstate', pop, true);
    return () => { document.removeEventListener('click', click, true); window.removeEventListener('beforeunload', unload); window.removeEventListener('popstate', pop, true); };
  }, [dirty]);
  const confirm = () => {
    const a = pending;
    setPending(null);
    leave.current();
    bypass.current = true;
    if (a?.history) window.history.replaceState(a.history.state, '', a.history.url);
    else a?.anchor?.click();
    setTimeout(() => { bypass.current = false; }, 0);
  };
  return { pending: !!pending, stay: () => setPending(null), confirm };
}

export function Recorder({ mission, cues = mission.cues }: { mission: Mission; cues?: string[] }) {
  const rec = useRecorder(mission.id, mission.maxSeconds);
  const takes = useTakes(mission.id);
  const { state, draft, stream } = rec;
  const live = useRef<HTMLVideoElement | null>(null);
  const [again, setAgainRaw] = useState<'again' | 'delete' | null>(null);
  const setAgain = (v: boolean | 'delete') => setAgainRaw(v === 'delete' ? 'delete' : v ? 'again' : null);
  const [dlStarted, setDlStarted] = useState(false);
  const guard = useLeaveGuard(rec.dirty, rec.reset);
  const meta = { id: mission.id, round: mission.round, position: mission.position, title: mission.title };

  useEffect(() => {
    const v = live.current;
    rec.preview.current = v;
    if (v) { v.srcObject = stream; if (stream) void v.play().catch(() => undefined); }
    return () => { if (v) v.srcObject = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream]);
  useEffect(() => { setDlStarted(false); }, [draft]);

  const left = Math.max(0, mission.maxSeconds - rec.elapsed);
  const wrap = state === 'recording' && left <= 10;
  const showLive = !!stream && state !== 'review' && state !== 'saving';
  const showDraft = !!draft && (state === 'review' || state === 'saving');
  const mobile = rec.frame.orientation === 'portrait';
  const showRecordingControls = state === 'idle' || state === 'requesting' || state === 'ready' || state === 'countdown' || state === 'recording' || state === 'stopping';

  if (!rec.support.ok) {
    return (
      <Card className="p-7">
        <h2 className="font-display text-[16px] font-extrabold uppercase text-navy">Recording</h2>
        <p className="mt-2 flex gap-2 text-[15px] text-slate-brand"><VideoOff className="mt-0.5 h-5 w-5 shrink-0" /> {supportMessage(rec.support)}</p>
        <p className="mt-2 text-[15px] text-slate-brand">You can still record on your phone and mark this mission done.</p>
      </Card>
    );
  }

  const dlDraft = () => { if (draft) { triggerDownload(draft.blob, fileName(meta, draft.mime)); setDlStarted(true); } };
  // One set of real controls, rendered inside the preview only on mobile.
  // Keep the same recorder handlers and test IDs in both layouts.
  const controlClass = mobile ? 'w-full !min-h-14 !px-3 !py-3 shadow-lg ring-2 ring-white/90' : '';
  const recordingControls = (
    <>
      {(state === 'idle' || state === 'requesting') && <Btn className={controlClass} onClick={() => void rec.enable()} disabled={state === 'requesting'} data-testid="button-enable-camera"><Camera className="h-5 w-5" /> {state === 'requesting' ? 'Starting' : 'Enable Camera'}</Btn>}
      {state === 'ready' && <Btn className={controlClass} onClick={rec.start} data-testid="button-start-recording">Start Recording</Btn>}
      {state === 'countdown' && <Btn className={controlClass} variant="secondary" onClick={rec.stop} data-testid="button-cancel-countdown">{mobile ? 'Cancel Countdown' : 'Cancel'}</Btn>}
      {(state === 'recording' || state === 'stopping') && <Btn className={controlClass} onClick={rec.stop} disabled={state === 'stopping'} data-testid="button-stop-recording"><Square className="h-4 w-4" fill="currentColor" /> {state === 'stopping' ? 'Finishing…' : mobile ? 'Stop Recording' : 'Stop'}</Btn>}
    </>
  );

  return (
    <Card className="p-7">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-[16px] font-extrabold uppercase text-navy">Recording</h2>
        <span className="text-[13px] text-slate-brand">Up to {mission.maxSeconds >= 120 ? '2 minutes' : '1 minute'}</span>
      </div>

      {rec.support.embedded && (
        <p className="mb-4 flex gap-2 rounded-lg bg-coolwhite p-3 text-[14px] text-slate-brand" data-testid="text-embedded-notice"><ExternalLink className="mt-0.5 h-4 w-4 shrink-0" /> If the camera is blocked here, open The 555 Plan in its own browser tab. Preview windows often block camera access.</p>
      )}

      <p className="mb-3 text-[13px] text-slate-brand" data-testid="text-recording-format">
        {rec.frame.orientation === 'portrait' ? 'Portrait · 9:16 · Optimized for mobile' : 'Landscape · 16:9 · Optimized for desktop'}
      </p>
      <div className="relative mx-auto w-full overflow-hidden rounded-lg bg-navy" style={{ aspectRatio: `${rec.frame.width} / ${rec.frame.height}`, maxWidth: rec.frame.orientation === 'portrait' ? 360 : undefined }} data-testid="panel-recorder">
        <video ref={live} muted playsInline autoPlay className={`h-full w-full object-cover [transform:scaleX(-1)] ${showLive ? '' : 'hidden'}`} data-testid="video-live-preview" />
        {showDraft && draft && <video key={draft.url} src={draft.url} controls playsInline className="h-full w-full bg-navy object-contain" data-testid="video-draft-player" />}
        {!showLive && !showDraft && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white/80">
            <Camera className="h-9 w-9" strokeWidth={1.5} />
            <p className="max-w-[300px] text-[14px]">{state === 'requesting' ? 'Waiting for your browser to ask permission' : 'Your camera is off. Turn it on when you are ready.'}</p>
          </div>
        )}
        {state === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center bg-navy/55" aria-live="assertive"><span key={rec.count} className="rise font-display text-[96px] font-black text-white" data-testid="text-countdown">{rec.count}</span></div>
        )}
        <RecordingOverlays mobile={mobile} live={showLive && state !== 'countdown'} recording={state === 'recording'} stopping={state === 'stopping'} clock={fmtTime(rec.elapsed)} wrap={wrap} cues={cues} controls={mobile && showRecordingControls} />
        {wrap && <div className="absolute inset-x-0 bg-brand-red px-3 py-2 text-center text-[14px] font-bold text-white" style={{ bottom: mobile ? 80 : 0 }} data-testid="text-wrapup">About {Math.ceil(left)} seconds left. Start wrapping up.</div>}
        {mobile && showRecordingControls && <div className="absolute inset-x-3 bottom-3 z-10" data-testid="controls-on-video">{recordingControls}</div>}
      </div>

      {showLive && (
        <div className="mt-3 flex items-center gap-3" aria-label="Microphone level" data-testid="meter-audio">
          <Mic className="h-4 w-4 text-slate-brand" />
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-coolgray"><div className="h-full w-full origin-left rounded-full bg-teal-brand transition-transform duration-75" style={{ transform: `scaleX(${rec.level})` }} /></div>
        </div>
      )}

      {rec.error && (
        <div role="alert" className="mt-4 rounded-lg border border-coolgray bg-coolwhite p-4" data-testid="text-recorder-error">
          <p className="flex items-center gap-2 font-display text-[14px] font-extrabold uppercase text-navy"><AlertTriangle className="h-4 w-4" /> {rec.error.title}</p>
          <p className="mt-1 text-[14px] text-slate-brand">{rec.error.body}</p>
        </div>
      )}
      {rec.notice && <p role="status" className="mt-4 text-[14px] text-slate-brand" data-testid="text-recorder-notice">{rec.notice}</p>}

      {(state === 'ready' || rec.devices.cams.length > 0) && state !== 'review' && state !== 'saving' && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-[13px] font-medium text-slate-brand">Camera
            <select className={`${selectCls} mt-1`} value={rec.camId} disabled={state !== 'ready'} onChange={(e) => rec.changeDevice(e.target.value, rec.micId)} data-testid="select-camera">
              {rec.devices.cams.map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>)}
            </select>
          </label>
          <label className="text-[13px] font-medium text-slate-brand">Microphone
            <select className={`${selectCls} mt-1`} value={rec.micId} disabled={state !== 'ready'} onChange={(e) => rec.changeDevice(rec.camId, e.target.value)} data-testid="select-microphone">
              {rec.devices.mics.map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Microphone ${i + 1}`}</option>)}
            </select>
          </label>
        </div>
      )}

      {(!mobile || showDraft) && <div className="mt-5 flex flex-wrap gap-3">
        {!mobile && recordingControls}
        {showDraft && (
          <>
            <Btn onClick={() => void rec.keep()} disabled={state === 'saving'} data-testid="button-keep-take">{state === 'saving' ? 'Saving' : 'Keep This Take'}</Btn>
            <Btn variant="secondary" onClick={() => setAgain(true)} disabled={state === 'saving'} data-testid="button-record-again">Record Again</Btn>
            <VideoExport blob={draft.blob} name={fileName(meta, draft.mime)} testId="button-save-draft-to-photos" disabled={state === 'saving'} />
            <Btn variant="secondary" onClick={dlDraft} data-testid="button-download-draft"><Download className="h-4 w-4" /> Download</Btn>
            <Btn variant="small" onClick={() => setAgain('delete')} disabled={state === 'saving'} data-testid="button-delete-draft">Delete</Btn>
          </>
        )}
      </div>}
      {dlStarted && <p className="mt-3 text-[13px] text-slate-brand" data-testid="text-draft-download">Your browser has been asked to download this video. Check your downloads to confirm it arrived.</p>}
      {rec.saveError && <p role="alert" className="mt-3 text-[14px] text-ink" data-testid="text-save-error">{rec.saveError}</p>}
      {showDraft && !rec.saveError && <p className="mt-3 text-[13px] text-slate-brand">This take is not saved yet. Keep it to save it privately in this browser.</p>}

      {rec.saved && state === 'idle' && (
        <div className="rise mt-4 rounded-lg bg-coolwhite p-4" role="status" data-testid="text-take-saved">
          <p className="font-bold text-navy">Take {rec.saved.takeNumber} is saved in this browser.</p>
          <p className="mt-1 text-[14px] text-slate-brand">{rec.persist === 'granted' ? 'Your browser agreed to protect this storage.' : rec.persist === 'denied' ? 'Your browser did not promise to protect this storage, so download videos you want to keep.' : 'Download any video you want to keep.'} Clearing your browser data removes saved videos. Saving a take does not mark the mission done.</p>
          <p className="mt-2 text-[14px]"><TextLink href="/videos">Open My Videos</TextLink></p>
        </div>
      )}

      {takes.items.length > 0 && (
        <div className="mt-8">
          <h3 className="font-display text-[14px] font-extrabold uppercase text-navy">Your takes for this mission</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2" data-testid="list-mission-takes">
            {takes.items.map((t) => <TakeCard key={t.id} take={t} meta={meta} api={takes} />)}
          </div>
        </div>
      )}
      <p className="mt-6 text-[13px] text-slate-brand">Your videos are saved privately in this browser on this computer. They don't sync to other devices. Download any video you want to keep.</p>

      <AlertDialog open={again !== null} onOpenChange={(o) => !o && setAgain(false)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Throw this take away?</AlertDialogTitle><AlertDialogDescription>This take has not been saved. If you continue it is gone. Download it first if you want a copy.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Keep looking</AlertDialogCancel><Btn onClick={() => { setAgain(false); rec.discard(); if (again === 'again') void rec.enable(); }} data-testid="button-confirm-discard">{again === 'again' ? 'Discard and record again' : 'Delete this take'}</Btn></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={guard.pending} onOpenChange={(o) => !o && guard.stay()}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Leave without saving?</AlertDialogTitle><AlertDialogDescription>{state === 'review' || state === 'saving' ? 'Your take has not been saved. If you leave, it is gone.' : 'Your recording is not finished. If you leave, it will be stopped and lost.'}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Stay here</AlertDialogCancel><Btn onClick={guard.confirm} data-testid="button-confirm-leave">Leave anyway</Btn></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
