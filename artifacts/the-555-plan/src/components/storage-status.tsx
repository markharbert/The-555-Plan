import { useEffect, useState } from 'react';
import { fmtBytes } from '@/lib/recording-support';

export const LIBRARY_NOTE = "Your videos are saved privately in this browser on this computer. They don't sync to other devices. Download any video you want to keep.";

export function StorageStatus({ refreshKey = 0 }: { refreshKey?: number }) {
  const [est, setEst] = useState<{ usage?: number; quota?: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    navigator.storage?.estimate?.().then((e) => alive && setEst(e)).catch(() => undefined);
    navigator.storage?.persisted?.().then((p) => alive && setPersisted(p)).catch(() => undefined);
    return () => { alive = false; };
  }, [refreshKey]);
  return (
    <div data-testid="text-storage-status" className="text-[14px] text-slate-brand">
      <p>{est?.usage != null && est.quota ? `This browser is using ${fmtBytes(est.usage)} of about ${fmtBytes(est.quota)} available.` : 'Storage numbers are not available in this browser.'}</p>
      <p className="mt-1">{persisted === true ? 'Protected storage: granted. The browser will not clear your videos on its own.' : persisted === false ? 'Protected storage: not granted. The browser may clear videos if space runs low.' : 'Protected storage: unknown in this browser.'}</p>
      <p className="mt-1">Clearing your browser data or site data will remove your videos for good. Download the ones you want to keep.</p>
    </div>
  );
}
