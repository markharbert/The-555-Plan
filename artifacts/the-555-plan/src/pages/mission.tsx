import { useState } from 'react';
import { useParams } from 'wouter';
import { ArrowRight, RotateCcw, Timer } from 'lucide-react';
import { getGetMissionQueryKey, useGetMission, useUpdateMission } from '@workspace/api-client-react';
import type { Journey, Mission } from '@workspace/api-client-react';
import { AnimatedCheck, Btn, Burst, Card, ErrorState, LockedPanel, PageSkeleton, TextLink } from '@/components/brand';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { useInvalidateAll } from '@/hooks/use-journey';
import { errMsg } from '@/lib/errors';

const praise = (n: number) => (n >= 8 ? 'That felt good, and you earned it.' : n >= 5 ? 'Solid. Every take makes the next one easier.' : 'Honest answer. Showing up is the whole point.');

function Body({ m }: { m: Mission }) {
  const update = useUpdateMission();
  const invalidate = useInvalidateAll();
  const [alt, setAlt] = useState(false);
  const [rating, setRating] = useState(false);
  const [score, setScore] = useState(m.feelingScore ?? 7);
  const [flag, setFlag] = useState(m.round === 2 ? m.posted : m.round === 3 ? m.wentLive : false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Journey | null>(null);
  const [undo, setUndo] = useState(false);
  const hasAlt = !!m.alternateTitle && !!m.alternateCues?.length;
  const title = alt && hasAlt ? m.alternateTitle! : m.title;
  const cues = alt && hasAlt ? m.alternateCues! : m.cues;
  const flagLabel = m.round === 2 ? 'I posted this in my test group' : 'I went live in my test group';
  const needsFlag = m.round >= 2;
  const flagFields = (v: boolean) => (m.round === 2 ? { posted: v } : m.round === 3 ? { wentLive: v } : {});

  const complete = () => {
    setErr(null);
    update.mutate({ missionId: m.id, data: { completed: true, feelingScore: score, alternate: alt && hasAlt, ...flagFields(flag) } }, {
      onSuccess: async (j) => { setResult(j); setRating(false); await invalidate(); },
      onError: (e) => setErr(errMsg(e)),
    });
  };
  const confirmUndo = () => {
    update.mutate({ missionId: m.id, data: { completed: false } }, {
      onSuccess: async () => { setUndo(false); setResult(null); setRating(false); await invalidate(); },
      onError: (e) => { setUndo(false); setErr(errMsg(e)); },
    });
  };

  const nextM = result?.missions.find((x) => x.id === m.id + 1);
  const nextTo = nextM?.unlocked ? `/mission/${nextM.id}` : result?.nextPath ?? '/dashboard';
  const roundDone = result ? result.missions.filter((x) => x.round === m.round).every((x) => x.completed) : false;
  const done = m.completed || !!result;
  const maxLabel = m.maxSeconds >= 120 ? '1 to 2 minutes' : '1 minute or less';

  return (
    <div>
      <p className="eyebrow mb-3">Round {m.round} · Mission {m.position}</p>
      <h1 className="h-display rise text-[32px] sm:text-[44px]" data-testid="text-mission-title">{title}</h1>
      <p className="mt-4 max-w-[640px] text-slate-brand">{m.prompt}</p>
      <p className="mt-3 inline-flex items-center gap-2 text-[14px] font-medium text-teal-brand"><Timer className="h-4 w-4" strokeWidth={2} /> Keep it to {maxLabel}</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-6">
          <Card className="p-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-[16px] font-extrabold uppercase text-navy">Your cue cards</h2>
              {hasAlt && <button type="button" onClick={() => setAlt((a) => !a)} className="text-[14px] font-medium text-linkblue underline underline-offset-4" data-testid="button-toggle-alternate">{alt ? 'Back to the original' : 'Try this option: ' + m.alternateTitle}</button>}
            </div>
            <ul className="space-y-3">
              {cues.map((c, i) => <li key={i} className="flex gap-3 rounded-lg bg-coolwhite p-4"><span className="font-display font-extrabold text-sky">{i + 1}</span><span>{c}</span></li>)}
            </ul>
            <p className="mt-4 text-[14px] text-slate-brand">Glance, do not read. Talk like you are telling a friend.</p>
          </Card>
          <Card className="p-7">
            <h2 className="font-display text-[16px] font-extrabold uppercase text-navy">Recording</h2>
            <p className="mt-2 text-[15px] text-slate-brand">In-browser recording is coming in a later release. For now, record on your phone or computer, then come back and mark this mission done.</p>
          </Card>
        </div>

        <Card className="relative h-fit p-7">
          {result && <Burst />}
          {!done && !rating && (
            <div>
              <h2 className="font-display text-[16px] font-extrabold uppercase text-navy">Finished your take?</h2>
              {needsFlag && (
                <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-coolgray p-4 hover:border-navy">
                  <Checkbox checked={flag} onCheckedChange={(v) => setFlag(v === true)} className="mt-1" data-testid="checkbox-flag" />
                  <span>{flagLabel}</span>
                </label>
              )}
              <div className="mt-6"><Btn className="w-full" onClick={() => setRating(true)} disabled={needsFlag && !flag} data-testid="button-mark-done">Mark as Done</Btn></div>
              {needsFlag && !flag && <p className="mt-3 text-[14px] text-slate-brand">Tick the box above once you have done it.</p>}
            </div>
          )}
          {!done && rating && (
            <div className="rise">
              <h2 className="font-display text-[20px] font-extrabold uppercase text-navy">How did that feel?</h2>
              <div className="mt-8 flex items-center gap-4"><span className="text-[13px] text-slate-brand">1</span><Slider min={1} max={10} step={1} value={[score]} onValueChange={(v) => setScore(v[0])} aria-label="How did that feel" data-testid="slider-feeling" /><span className="text-[13px] text-slate-brand">10</span></div>
              <p className="mt-5 font-display text-[44px] font-black leading-none text-navy" data-testid="text-feeling">{score}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Btn onClick={complete} disabled={update.isPending} data-testid="button-save-feeling">{update.isPending ? 'Saving' : 'Save and Finish'}</Btn>
                <Btn variant="secondary" onClick={() => setRating(false)}>Back</Btn>
              </div>
            </div>
          )}
          {done && (
            <div className="rise text-center">
              <div className="mb-4 flex justify-center"><AnimatedCheck size={56} /></div>
              <h2 className="h-display text-[24px]">{result ? (roundDone ? `Round ${m.round} complete` : 'Mission complete') : 'You did this one'}</h2>
              <p className="mt-2 text-slate-brand">{result ? praise(score) : `It felt like a ${m.feelingScore ?? score} out of 10.`}</p>
              {needsFlag && result === null && (
                <label className="mt-5 flex items-start gap-3 rounded-lg border border-coolgray p-4 text-left"><Checkbox checked={m.round === 2 ? m.posted : m.wentLive} disabled className="mt-1" data-testid="checkbox-flag-done" /><span>{flagLabel}</span></label>
              )}
              <div className="mt-6">
                <Btn className="w-full" href={result ? nextTo : '/dashboard'} data-testid="button-next-mission">{result && m.id < 15 ? 'Next Mission' : 'See Your Journey'} <ArrowRight className="h-5 w-5" strokeWidth={2} /></Btn>
              </div>
              <div className="mt-5 text-[14px]">
                {m.canUndo ? <button type="button" onClick={() => setUndo(true)} className="inline-flex items-center gap-1 text-linkblue underline underline-offset-4" data-testid="button-undo"><RotateCcw className="h-3.5 w-3.5" /> Undo, I marked this by mistake</button> : <span className="text-slate-brand">This mission is locked in because the next round has started.</span>}
              </div>
            </div>
          )}
          {err && <p role="alert" className="mt-4 text-ink" data-testid="text-mission-error">{err}</p>}
        </Card>
      </div>
      <p className="mt-10"><TextLink href={`/round/${m.round}`}>Back to Round {m.round}</TextLink></p>

      <AlertDialog open={undo} onOpenChange={setUndo}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Undo this mission?</AlertDialogTitle><AlertDialogDescription>It will move back to not done. You can mark it done again any time.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Keep it done</AlertDialogCancel><Btn onClick={confirmUndo} disabled={update.isPending} data-testid="button-confirm-undo">Yes, undo</Btn></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function MissionPage() {
  const { id } = useParams<{ id: string }>();
  const mid = Number(id);
  const q = useGetMission(mid, { query: { enabled: Number.isFinite(mid), queryKey: getGetMissionQueryKey(mid) } });
  if (q.isLoading) return <PageSkeleton />;
  if (q.isError) {
    const msg = errMsg(q.error, '');
    return msg ? <LockedPanel message={msg} to="/dashboard" label="My Journey" /> : <ErrorState onRetry={() => q.refetch()} />;
  }
  if (!q.data) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data.unlocked) return <LockedPanel message="Finish the earlier missions first. This one opens in order." to="/dashboard" label="My Journey" />;
  return <Body key={q.data.id} m={q.data} />;
}
