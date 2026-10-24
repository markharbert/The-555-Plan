import { useId, useState } from 'react';

type Props = {
  mobile: boolean;
  live: boolean;
  recording: boolean;
  stopping: boolean;
  clock: string;
  wrap: boolean;
  cues: string[];
  controls?: boolean;
};

/** Preview-only DOM: never drawn into the recorded stream or thumbnail canvas. */
export function RecordingOverlays({ mobile, live, recording, stopping, clock, wrap, cues, controls = false }: Props) {
  const [showCues, setShowCues] = useState(true);
  const cueId = useId();
  return (
    <>
      {(recording || stopping) && (
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-3 rounded-xl border border-white/40 bg-black/90 px-3 py-2 text-white shadow-lg" data-testid="status-recording">
          <span className="relative flex h-5 w-5 shrink-0" aria-hidden="true">
            {recording && <span className="absolute inset-0 rounded-full bg-red-500 opacity-60 motion-safe:animate-ping" />}
            <span className="relative h-5 w-5 rounded-full bg-red-500 ring-4 ring-red-500/25" />
          </span>
          <span className="font-display text-[14px] font-extrabold uppercase tracking-wide">{stopping ? 'Finishing' : 'Recording'}</span>
          <span className="border-l border-white/40 pl-3 font-display text-[16px] font-bold tabular-nums" data-testid="text-recording-timer">{clock}</span>
          <span className="sr-only" role="status">{stopping ? 'Finishing your recording' : 'Recording in progress'}</span>
        </div>
      )}
      {mobile && live && cues.length > 0 && (
        <div className="absolute inset-x-3 flex flex-col rounded-xl border border-white/30 bg-black/85 px-3 text-white shadow-lg backdrop-blur-sm" style={{ bottom: controls ? (wrap ? 144 : 80) : (wrap ? 64 : 12), maxHeight: controls ? (wrap ? '32%' : '42%') : '45%' }} data-testid="overlay-cue-points">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <p className="text-[12px] font-extrabold uppercase tracking-wide">Your cue points</p>
            <button type="button" className="min-h-11 min-w-11 rounded-lg px-2 text-[13px] font-bold text-white underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" onClick={() => setShowCues((value) => !value)} aria-expanded={showCues} aria-controls={cueId} data-testid="button-toggle-overlay-cues">
              {showCues ? 'Hide' : 'Show'}
            </button>
          </div>
          {showCues && (
            <ol id={cueId} className="min-h-0 space-y-2 overflow-y-auto overscroll-contain pb-3 pr-1 text-[14px] font-medium leading-snug touch-pan-y" data-testid="list-overlay-cues">
              {cues.map((cue, index) => (
                <li key={`${index}:${cue}`} className="flex gap-2">
                  <span className="shrink-0 font-bold" aria-hidden="true">{index + 1}.</span>
                  <span>{cue}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </>
  );
}
