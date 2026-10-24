import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, Check, Heart, Layers, Lock as LockIcon } from 'lucide-react';
import { getGetContentQueryKey, useGetContent, useUpdateProfile } from '@workspace/api-client-react';
import type { Journey } from '@workspace/api-client-react';
import { errMsg } from '@/lib/errors';
import { Btn, Card, LockedPanel, PageHeader, Skel } from '@/components/brand';
import { JourneyPage } from '@/components/journey-page';
import { Slider } from '@/components/ui/slider';
import { useInvalidateAll } from '@/hooks/use-journey';

function WelcomeBody({ j }: { j: Journey }) {
  const [, go] = useLocation();
  const update = useUpdateProfile();
  const invalidate = useInvalidateAll();
  const [err, setErr] = useState<string | null>(null);
  const done = j.profile.welcomeDone;
  const start = () => {
    if (done) return go('/fear-check');
    setErr(null);
    update.mutate({ data: { welcomeDone: true } }, { onSuccess: async () => { await invalidate(); go('/fear-check'); }, onError: (e) => setErr(errMsg(e)) });
  };
  const points = [
    { i: Heart, t: 'Small and kind', b: 'Fifteen missions, each about a minute. Nothing here is a test.' },
    { i: Layers, t: 'In three rounds', b: 'First just you. Then a private test group. Then short live videos.' },
    { i: LockIcon, t: 'Private by design', b: 'Your answers and scores are only yours. Nobody is watching.' },
  ];
  return (
    <div>
      <PageHeader eyebrow="Welcome" step={1} title={`Hi ${j.profile.firstName}, I am glad you are here`} intro="You cannot make your 100th video without making your first. This space is built to get you to that first one, calmly, one step at a time. I am Mark, and I will be with you along the way." />
      <div className="grid gap-5 sm:grid-cols-3">
        {points.map((p) => (
          <Card key={p.t} className="p-6"><p.i className="mb-4 h-6 w-6 text-teal-brand" strokeWidth={1.75} /><h3 className="font-display text-[17px] font-extrabold uppercase text-navy">{p.t}</h3><p className="mt-2 text-[15px] text-slate-brand">{p.b}</p></Card>
        ))}
      </div>
      <Card className="mt-8 p-8">
        <p className="eyebrow mb-4">How the next few minutes go</p>
        <ol className="space-y-2 text-ink">
          <li>1. Fear Check: name what holds you back.</li><li>2. My Video Plan: make time that fits your life.</li><li>3. Mindset: a few reframes that help.</li><li>4. The 555 Plan: your fifteen missions.</li>
        </ol>
      </Card>
      {err && <p role="alert" className="mt-6 text-ink">{err}</p>}
      <div className="mt-10"><Btn onClick={start} disabled={update.isPending} data-testid="button-start-fear-check">{done ? 'Continue' : 'Begin Fear Check'} <ArrowRight className="h-5 w-5" strokeWidth={2} /></Btn></div>
    </div>
  );
}

export function Welcome() {
  return <JourneyPage>{(j) => <WelcomeBody j={j} />}</JourneyPage>;
}

const feel = (n: number) => (n <= 3 ? 'Nervous, and that is a fine place to start' : n <= 6 ? 'Somewhere in the middle' : 'Fairly comfortable');

function FearBody({ j }: { j: Journey }) {
  const [, go] = useLocation();
  const content = useGetContent({ query: { queryKey: getGetContentQueryKey() } });
  const update = useUpdateProfile();
  const invalidate = useInvalidateAll();
  const [picked, setPicked] = useState<string[]>(j.profile.fears);
  const [score, setScore] = useState(j.profile.baselineComfort ?? 5);
  const [err, setErr] = useState<string | null>(null);
  const fears = content.data?.fears ?? [];
  if (!j.profile.welcomeDone) return <LockedPanel message="Start with Welcome. Fear Check opens right after." to="/welcome" label="Go to Welcome" />;
  const toggle = (f: string) => setPicked((p) => (p.includes(f) ? p.filter((x) => x !== f) : p.length >= 6 ? p : [...p, f]));
  const save = () => {
    setErr(null);
    const data = j.profile.fearCheckDone ? { fears: picked, fearCheckDone: true } : { fears: picked, baselineComfort: score, fearCheckDone: true };
    update.mutate({ data }, { onSuccess: async () => { await invalidate(); go('/video-plan'); }, onError: (e) => setErr(errMsg(e)) });
  };
  return (
    <div>
      <PageHeader eyebrow="Fear Check" step={2} title="Which of these hold you back?" intro="Choose all that feel true. There are no wrong answers, and naming a fear makes it smaller." />
      <div className="grid gap-3 sm:grid-cols-2">
        {content.isLoading && Array.from({ length: 6 }).map((_, i) => <Skel key={i} className="h-16" />)}
        {fears.map((f) => {
          const on = picked.includes(f);
          return (
            <button key={f} type="button" aria-pressed={on} onClick={() => toggle(f)} data-testid={`button-fear-${f.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              className={`flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-colors duration-200 ${on ? 'border-navy bg-white' : 'border-coolgray bg-white hover:border-slate-brand'}`}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 ${on ? 'border-navy bg-navy text-white' : 'border-coolgray'}`}>{on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
              <span className="font-medium text-ink">{f}</span>
            </button>
          );
        })}
      </div>
      {content.isError && <p className="mt-4">We could not load the list. <button type="button" className="text-linkblue underline" onClick={() => content.refetch()}>Try again</button></p>}
      <Card className="mt-10 p-8">
        <h2 className="font-display text-[20px] font-extrabold uppercase text-navy">How comfortable are you on camera right now?</h2>
        <div className="mt-8 flex items-center gap-5">
          <span className="text-[13px] text-slate-brand">1</span>
          <Slider min={1} max={10} step={1} value={[score]} disabled={j.profile.fearCheckDone} onValueChange={(v) => setScore(v[0])} aria-label="Comfort on camera" data-testid="slider-baseline" />
          <span className="text-[13px] text-slate-brand">10</span>
        </div>
        <p className="mt-6 flex items-baseline gap-3"><span className="font-display text-[44px] font-black leading-none text-navy" data-testid="text-baseline">{score}</span><span className="text-slate-brand">{feel(score)}</span></p>
        {j.profile.fearCheckDone && <p className="mt-3 text-[14px] text-slate-brand">Your starting score stays fixed so you can see how far you grow.</p>}
      </Card>
      {err && <p role="alert" className="mt-6">{err}</p>}
      <div className="mt-10"><Btn onClick={save} disabled={update.isPending} data-testid="button-save-fear-check">Save and Continue <ArrowRight className="h-5 w-5" strokeWidth={2} /></Btn></div>
    </div>
  );
}

export function FearCheck() {
  return <JourneyPage>{(j) => <FearBody j={j} />}</JourneyPage>;
}
