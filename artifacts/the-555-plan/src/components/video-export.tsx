import { useEffect, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { Btn } from '@/components/brand';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { canShareVideo, isAppleMobile, videoFile } from '@/lib/video-export';
import { triggerDownload } from '@/lib/recording-support';

type Props = {
  name: string;
  testId: string;
  blob?: Blob;
  loadBlob?: () => Promise<Blob | null>;
  onExport?: () => Promise<unknown>;
  disabled?: boolean;
};

/** Prepare one local file before the final tap, preserving iOS user activation. */
export function VideoExport({ name, testId, blob, loadBlob, onExport, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const apple = isAppleMobile();
  useEffect(() => {
    if (!open) { setFile(null); return; }
    let alive = true;
    setLoading(true); setFile(null); setMessage(null); setError(null);
    void (async () => {
      try {
        const local = blob ?? await loadBlob?.();
        if (!local) throw new Error('missing');
        const prepared = videoFile(local, name);
        if (alive) setFile(prepared);
      } catch {
        if (alive) setError('We could not read this video from this browser. Close this window and try again.');
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
    // Read only the selected take, not every video in the library.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, blob, name]);

  const logExport = async () => {
    try { await onExport?.(); }
    catch { setError('The export was requested, but its status could not be saved. Your video is still here.'); }
  };
  const share = async () => {
    if (!file || busy) return;
    setError(null); setMessage(null);
    // No asynchronous work before this call: iOS requires a fresh user gesture.
    try {
      const shared = navigator.share({ files: [file] });
      setBusy(true);
      await shared;
      setMessage(apple ? 'The share sheet closed. Check Photos or your chosen destination to confirm the video arrived.' : 'The share sheet closed. Check your chosen destination to confirm the video arrived.');
      await logExport();
    } catch (e) {
      if ((e as { name?: string }).name === 'AbortError') setMessage('Sharing canceled. Your video is still here.');
      else setError('The share sheet could not open. Try again, or use Download to Files below. If you are inside another app, open this page in Safari.');
    } finally { setBusy(false); }
  };
  const download = async () => {
    if (!file) return;
    setError(null);
    triggerDownload(file, name);
    setMessage('Download requested. Check Files or your downloads folder to confirm it arrived.');
    await logExport();
  };
  const shareable = !!file && canShareVideo(file);
  return (
    <>
      <Btn variant="secondary" disabled={disabled} onClick={() => setOpen(true)} data-testid={testId}>
        <Share2 className="h-4 w-4" /> {apple ? 'Save to Photos' : 'Save / Share'}
      </Btn>
      <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}>
        <DialogContent className="max-w-[480px]">
          <DialogTitle className="font-display uppercase text-navy">{apple ? 'Save your video to Photos' : 'Save or share your video'}</DialogTitle>
          <DialogDescription>
            {apple ? 'Tap Open Share Sheet, then choose Save Video to add it to Photos. You may need to scroll through the actions. Your iPhone controls which actions are available.' : 'Open the share sheet to choose a destination, or download the video to your device.'}
          </DialogDescription>
          {loading && <p role="status" className="text-[14px] text-slate-brand">Preparing your video on this device…</p>}
          {file && !shareable && <p className="text-[14px] text-slate-brand">This browser cannot share this file. Use Download to Files instead.{apple && file.type === 'video/mp4' ? ' In Files, open the video, tap Share, then choose Save Video if available. For best results, open this app in Safari.' : ''}</p>}
          {file && apple && file.type !== 'video/mp4' && <p className="text-[14px] text-slate-brand">This take is WebM, which Photos may not accept. You can still download it to Files. New recordings use MP4 when the browser supports it.</p>}
          <div className="flex flex-wrap gap-3">
            {shareable && <Btn onClick={() => void share()} disabled={busy} data-testid={`${testId}-share`}>{busy ? 'Sharing…' : 'Open Share Sheet'}</Btn>}
            <Btn variant="secondary" onClick={() => void download()} disabled={!file || busy} data-testid={`${testId}-download`}><Download className="h-4 w-4" /> Download to Files</Btn>
          </div>
          {message && <p role="status" className="text-[14px] text-slate-brand" data-testid={`${testId}-status`}>{message}</p>}
          {error && <p role="alert" className="text-[14px] text-ink" data-testid={`${testId}-error`}>{error}</p>}
          <p className="text-[13px] text-slate-brand">This does not delete your take or upload it to our servers. Opening the share sheet does not confirm a save to Photos.</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
