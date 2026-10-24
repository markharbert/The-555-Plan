export const MIME_PREFERENCE = ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];

export function pickMime(): string {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return '';
  for (const m of MIME_PREFERENCE) if (MediaRecorder.isTypeSupported(m)) return m;
  return '';
}

export type Support = { ok: boolean; reason: 'secure' | 'api' | 'recorder' | null; embedded: boolean };
export function detectSupport(): Support {
  let embedded = false;
  try { embedded = window.self !== window.top; } catch { embedded = true; }
  if (!window.isSecureContext) return { ok: false, reason: 'secure', embedded };
  if (!navigator.mediaDevices?.getUserMedia) return { ok: false, reason: 'api', embedded };
  if (typeof MediaRecorder === 'undefined') return { ok: false, reason: 'recorder', embedded };
  return { ok: true, reason: null, embedded };
}

export type CamError = { kind: string; title: string; body: string };

export function describeCamError(e: unknown, embedded: boolean): CamError {
  const name = (e as { name?: string })?.name ?? '';
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
    return {
      kind: 'denied',
      title: 'Camera or microphone access is blocked',
      body: embedded
        ? 'This preview window may block camera access. Open The 555 Plan in its own browser tab. Chrome and Edge: use the camera icon in the address bar to allow access. Safari: go to Settings, Websites, Camera and Microphone. Firefox: clear the blocked permission in the address bar and reload.'
        : 'Allow access, then press Enable Camera again. Chrome and Edge: select the camera icon at the right of the address bar and choose Allow. Safari: open Safari menu, Settings, Websites, Camera and Microphone, and set this site to Allow. Firefox: select the permissions icon in the address bar, clear the blocked setting, and reload.',
    };
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return { kind: 'notfound', title: 'We could not find a camera or microphone', body: 'Plug one in or check that it is turned on, then try again. If you chose a device before, pick another one from the lists.' };
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
    return { kind: 'inuse', title: 'Your camera or microphone is busy', body: 'Another app or browser tab may be using it. Close video calls or other tabs using the camera, then try again.' };
  }
  return { kind: 'other', title: 'The camera did not start', body: 'Something unexpected happened. Reload the page and try again. You can always record on your phone and mark the mission done.' };
}

export function supportMessage(s: Support): string {
  if (s.reason === 'secure') return 'Recording needs a secure connection (https). Open the app at its secure address.';
  if (s.reason === 'api') return 'This browser cannot reach your camera. Try the latest Chrome, Edge, Safari or Firefox.';
  return 'This browser cannot record video. Try the latest Chrome, Edge, Safari or Firefox.';
}

export const fmtTime = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};
export const fmtBytes = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);

export const roundOf = (missionId: number) => Math.ceil(missionId / 5);
export const positionOf = (missionId: number) => ((missionId - 1) % 5) + 1;

export function extFor(mime: string) { return mime.includes('mp4') ? 'mp4' : 'webm'; }

export function fileName(m: { id: number; round?: number; position?: number; title?: string }, mime: string, take?: number) {
  const slug = (m.title ?? '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const base = `555-Round${m.round ?? roundOf(m.id)}-Mission${m.position ?? positionOf(m.id)}${slug ? '-' + slug : ''}`;
  return `${base}${take && take > 1 ? `-Take${take}` : ''}.${extFor(mime)}`;
}

export function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
