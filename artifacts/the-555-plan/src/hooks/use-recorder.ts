import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/react';
import { keepTake, getPrefs, queueStart, setPrefs, type TakeRow } from '@/lib/take-store';
import { describeCamError, detectSupport, pickMime, type CamError } from '@/lib/recording-support';

export type RecState = 'idle' | 'requesting' | 'ready' | 'countdown' | 'recording' | 'stopping' | 'review' | 'saving';
export type Draft = { blob: Blob; url: string; mime: string; durationSeconds: number; recordedAt: string; thumb: Blob | null };
export type Devices = { cams: MediaDeviceInfo[]; mics: MediaDeviceInfo[] };

export function useRecorder(missionId: number, maxSeconds: number) {
  const { userId } = useAuth();
  const [state, setState] = useState<RecState>('idle');
  const [error, setError] = useState<CamError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<Devices>({ cams: [], mics: [] });
  const [camId, setCamId] = useState('');
  const [micId, setMicId] = useState('');
  const [level, setLevel] = useState(0);
  const [count, setCount] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<TakeRow | null>(null);
  const [persist, setPersist] = useState<'granted' | 'denied' | 'unknown'>('unknown');
  const support = useRef(detectSupport()).current;

  const R = useRef({
    uid: userId ?? null as string | null, stream: null as MediaStream | null, rec: null as MediaRecorder | null, chunks: [] as Blob[],
    mime: '', startedAt: 0, ctx: null as AudioContext | null, raf: 0, tick: 0, cd: 0, thumb: null as Blob | null, thumbTimer: 0,
    draftUrl: null as string | null, state: 'idle' as RecState, gen: 0, camId: '', micId: '', autoStop: 0, wallStart: '',
  });
  R.current.uid = userId ?? null;
  const preview = useRef<HTMLVideoElement | null>(null);
  const set = (s: RecState) => { R.current.state = s; setState(s); };

  const stopMeter = () => {
    const r = R.current;
    cancelAnimationFrame(r.raf);
    r.raf = 0;
    if (r.ctx) { void r.ctx.close().catch(() => undefined); r.ctx = null; }
    setLevel(0);
  };
  const stopTracks = () => {
    const r = R.current;
    r.stream?.getTracks().forEach((t) => { t.onended = null; t.stop(); });
    r.stream = null;
    stopMeter();
    setStream(null);
  };
  const clearTimers = () => {
    const r = R.current;
    clearInterval(r.tick); clearTimeout(r.cd); clearTimeout(r.thumbTimer); clearTimeout(r.autoStop);
    r.tick = 0; r.cd = 0;
  };
  const revokeDraft = () => {
    const r = R.current;
    if (r.draftUrl) { URL.revokeObjectURL(r.draftUrl); r.draftUrl = null; }
  };

  /** Full teardown: tracks, recorder, timers, audio, object URLs. */
  const teardown = useCallback(() => {
    const r = R.current;
    r.gen++;
    clearTimers();
    if (r.rec) { r.rec.ondataavailable = null; r.rec.onstop = null; r.rec.onerror = null; try { if (r.rec.state !== 'inactive') r.rec.stop(); } catch { /* ignore */ } r.rec = null; }
    stopTracks();
    revokeDraft();
    r.chunks = [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startMeter = (s: MediaStream) => {
    const r = R.current;
    try {
      if (!s.getAudioTracks().length) return;
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      void ctx.resume().catch(() => undefined);
      r.ctx = ctx;
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      ctx.createMediaStreamSource(s).connect(an);
      const buf = new Uint8Array(an.fftSize);
      let last = 0;
      const loop = (t: number) => {
        r.raf = requestAnimationFrame(loop);
        if (t - last < 66) return;
        last = t;
        an.getByteTimeDomainData(buf);
        let peak = 0;
        for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
        setLevel(Math.min(1, peak / 80));
      };
      r.raf = requestAnimationFrame(loop);
    } catch { /* meter is optional */ }
  };

  const refreshDevices = async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices({ cams: all.filter((d) => d.kind === 'videoinput'), mics: all.filter((d) => d.kind === 'audioinput') });
    } catch { /* ignore */ }
  };

  const acquire = useCallback(async (cam?: string, mic?: string) => {
    const r = R.current;
    const gen = ++r.gen;
    const uid = r.uid;
    stopTracks();
    setError(null);
    set('requesting');
    const build = (c?: string, m?: string, exact = false): MediaStreamConstraints => ({
      video: c ? { deviceId: { exact: c }, width: { ideal: 1280 }, height: { ideal: 720 } } : { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: m ? { deviceId: { exact: m }, echoCancellation: true, noiseSuppression: true } : { echoCancellation: true, noiseSuppression: true },
    });
    try {
      let s: MediaStream;
      try { s = await navigator.mediaDevices.getUserMedia(build(cam, mic)); }
      catch (e) {
        if ((e as { name?: string }).name === 'OverconstrainedError' && (cam || mic)) s = await navigator.mediaDevices.getUserMedia(build());
        else throw e;
      }
      if (gen !== r.gen || uid !== r.uid) { s.getTracks().forEach((t) => t.stop()); return; }
      r.stream = s;
      setStream(s);
      const vt = s.getVideoTracks()[0];
      const at = s.getAudioTracks()[0];
      const nc = vt?.getSettings().deviceId ?? cam ?? '';
      const nm = at?.getSettings().deviceId ?? mic ?? '';
      r.camId = nc; r.micId = nm;
      setCamId(nc); setMicId(nm);
      if (uid) void setPrefs({ uid, cameraId: nc, micId: nm });
      const lost = () => { if (r.state === 'recording' || r.state === 'countdown') { setNotice('Your camera or microphone was disconnected. Recording stopped safely.'); stopRec(); } else if (r.stream === s) { stopTracks(); setNotice('Your camera or microphone was disconnected.'); set('idle'); } };
      s.getTracks().forEach((t) => { t.onended = lost; });
      startMeter(s);
      await refreshDevices();
      set('ready');
    } catch (e) {
      if (gen !== r.gen) return;
      setError(describeCamError(e, support.embedded));
      stopTracks();
      set('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enable = useCallback(async () => {
    const uid = R.current.uid;
    const p = uid ? await getPrefs(uid) : { uid: '' };
    if (uid !== R.current.uid) return;
    await acquire(p.cameraId, p.micId);
  }, [acquire]);

  const changeDevice = useCallback((cam: string, mic: string) => {
    if (R.current.state !== 'ready') return;
    void acquire(cam, mic);
  }, [acquire]);

  const captureThumb = () => {
    const v = preview.current;
    const r = R.current;
    if (!v || !v.videoWidth) return;
    try {
      const w = 480;
      const h = Math.round((v.videoHeight / v.videoWidth) * w);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d')?.drawImage(v, 0, 0, w, h);
      c.toBlob((b) => { if (b) r.thumb = b; }, 'image/jpeg', 0.7);
    } catch { /* thumbnails are optional */ }
  };

  const finish = (rec: MediaRecorder) => {
    const r = R.current;
    const mime = rec.mimeType || r.mime || 'video/webm';
    const blob = new Blob(r.chunks, { type: mime });
    const dur = (performance.now() - r.startedAt) / 1000;
    r.chunks = [];
    r.rec = null;
    clearTimers();
    stopTracks();
    if (blob.size < 1024 || dur < 0.5) {
      setError({ kind: 'short', title: 'That recording was too short', body: 'Nothing was kept. Press Start Recording and try again.' });
      set('idle');
      return;
    }
    const url = URL.createObjectURL(blob);
    r.draftUrl = url;
    setDraft({ blob, url, mime, durationSeconds: Math.min(dur, maxSeconds), recordedAt: r.wallStart, thumb: r.thumb });
    setSaveError(null); setSaved(null);
    set('review');
  };

  const stopRec = useCallback(() => {
    const r = R.current;
    if (r.state === 'countdown') { clearTimeout(r.cd); stopTracks(); set('idle'); return; }
    if (r.state !== 'recording') return;
    set('stopping');
    clearInterval(r.tick); clearTimeout(r.autoStop);
    const rec = r.rec;
    if (!rec || rec.state === 'inactive') { stopTracks(); set('idle'); return; }
    if (!r.thumb) captureThumb();
    try { rec.stop(); } catch { stopTracks(); set('idle'); setError({ kind: 'other', title: 'The recording could not be finished', body: 'Please try again.' }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const beginRecorder = () => {
    const r = R.current;
    const s = r.stream;
    if (!s) { set('idle'); return; }
    try {
      r.mime = pickMime();
      const rec = r.mime ? new MediaRecorder(s, { mimeType: r.mime }) : new MediaRecorder(s);
      r.chunks = []; r.thumb = null;
      rec.ondataavailable = (e) => { if (e.data && e.data.size) r.chunks.push(e.data); };
      rec.onstop = () => finish(rec);
      rec.onerror = () => {
        rec.onstop = null; rec.ondataavailable = null;
        try { if (rec.state !== 'inactive') rec.stop(); } catch { /* release tracks below */ }
        setError({ kind: 'other', title: 'The recorder hit a problem', body: 'Your camera is off now. Please try again.' });
        clearTimers(); r.rec = null; stopTracks(); r.chunks = []; set('idle');
      };
      rec.start(1000);
      r.rec = rec;
      r.startedAt = performance.now();
      r.wallStart = new Date().toISOString();
      setElapsed(0);
      set('recording');
      r.tick = window.setInterval(() => setElapsed((performance.now() - r.startedAt) / 1000), 200);
      r.autoStop = window.setTimeout(() => stopRec(), maxSeconds * 1000);
      r.thumbTimer = window.setTimeout(captureThumb, 1200);
      if (r.uid) void queueStart(r.uid, missionId);
    } catch (e) {
      stopTracks();
      setError({ kind: 'other', title: 'This browser could not start the recorder', body: (e as Error)?.message ? 'Try a different browser such as the latest Chrome or Edge.' : 'Try again.' });
      set('idle');
    }
  };

  const start = useCallback(() => {
    const r = R.current;
    if (r.state !== 'ready') return;
    setError(null); setNotice(null);
    set('countdown');
    let n = 3;
    setCount(n);
    const step = () => {
      n -= 1;
      if (n <= 0) { beginRecorder(); return; }
      setCount(n);
      r.cd = window.setTimeout(step, 1000);
    };
    r.cd = window.setTimeout(step, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxSeconds, missionId]);

  const discard = useCallback(() => {
    revokeDraft();
    setDraft(null); setSaveError(null); setSaved(null);
    if (R.current.state === 'review' || R.current.state === 'saving') set('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const keep = useCallback(async () => {
    const r = R.current;
    const uid = r.uid;
    const d = draft;
    if (!uid || !d || r.state === 'saving') return;
    setSaveError(null);
    set('saving');
    try {
      const row = await keepTake({ uid, missionId, blob: d.blob, thumb: d.thumb, durationSeconds: d.durationSeconds, recordedAt: d.recordedAt, mime: d.mime });
      if (uid !== R.current.uid) return;
      revokeDraft();
      setDraft(null);
      setSaved(row);
      set('idle');
      try { setPersist(navigator.storage?.persist ? ((await navigator.storage.persist()) ? 'granted' : 'denied') : 'unknown'); } catch { setPersist('unknown'); }
    } catch (e) {
      if (uid !== R.current.uid) return;
      const quota = (e as { name?: string })?.name === 'QuotaExceededError';
      setSaveError(quota ? 'This browser has no room left to keep the video. Download it now so you do not lose it, or make space and try again.' : 'We could not save the video in this browser. It is not saved yet. Download it now so you do not lose it, then try again.');
      set('review');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, missionId]);

  // Account change or unmount: stop everything and clear UI caches. Videos stay in IndexedDB.
  useEffect(() => {
    return () => {
      teardown();
      setDraft(null); setSaved(null); setError(null); setNotice(null); setDevices({ cams: [], mics: [] });
      R.current.state = 'idle';
    };
  }, [userId, teardown]);

  // Leaving the tab hidden while recording keeps going; but pagehide must release devices.
  useEffect(() => {
    const h = () => teardown();
    window.addEventListener('pagehide', h);
    return () => window.removeEventListener('pagehide', h);
  }, [teardown]);

  const dirty = state === 'countdown' || state === 'recording' || state === 'stopping' || state === 'review' || state === 'saving';
  const busy = state === 'countdown' || state === 'recording' || state === 'stopping' || state === 'saving' || state === 'requesting';
  const reset = useCallback(() => { teardown(); setDraft(null); set('idle'); }, [teardown]);

  return { support, state, error, notice, stream, devices, camId, micId, level, count, elapsed, draft, saveError, saved, persist, dirty, busy, preview, maxSeconds,
    enable, changeDevice, start, stop: stopRec, keep, discard, reset, clearSaved: () => setSaved(null), clearError: () => setError(null) };
}
