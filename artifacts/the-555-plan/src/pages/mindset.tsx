import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useUpdateProfile } from '@workspace/api-client-react';
import type { Journey } from '@workspace/api-client-react';
import { errMsg } from '@/lib/errors';
import { Btn, Card, LockedPanel, PageHeader } from '@/components/brand';
import { JourneyPage } from '@/components/journey-page';
import { useInvalidateAll } from '@/hooks/use-journey';

function Body({ j }: { j: Journey }) {
  const p = j.profile;
  const [, go] = useLocation();
  const update = useUpdateProfile();
  const invalidate = useInvalidateAll();
  const matched = j.mindset.filter((c) => c.fears.some((f) => p.fears.includes(f)));
  const deck = matched.length ? matched : j.mindset;
  const [mode, setMode] = useState<'match' | 'all'>(p.mindsetDone ? 'all' : 'match');
  const [i, setI] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  if (!p.planDone) return <LockedPanel message="Finish My Video Plan first. Mindset comes next." to="/video-plan" label="Go to My Video Plan" />;
  const card = deck[i];
  const last = i === deck.length - 1;
  const finish = () => {
    setErr(null);
    update.mutate({ data: { mindsetDone: true } }, { onSuccess: async () => { await invalidate(); go('/round/1'); }, onError: (e) => setErr(errMsg(e)) });
  };
  return (
    <div>
      <PageHeader eyebrow="Mindset" step={4} title="A few reframes for your fears" intro="Short ideas to carry into your first videos. Come back to these any time." />
      <div className="mb-8 inline-flex rounded-lg border border-coolgray bg-white p-1" role="tablist">
        {([['match', 'For your fears'], ['all', 'All cards']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={mode === k} type="button" onClick={() => setMode(k)} data-testid={`tab-mindset-${k}`} className={`rounded-md px-4 py-2 text-[14px] font-semibold transition-colors duration-200 ${mode === k ? 'bg-navy text-white' : 'text-slate-brand hover:text-navy'}`}>{l}</button>
        ))}
      </div>
      {mode === 'match' && card ? (
        <div>
          <Card className="rise p-8 sm:p-12" key={card.id}>
            <p className="eyebrow mb-4">Card {i + 1} of {deck.length}</p>
            <h2 className="h-display text-[28px] sm:text-[38px]" data-testid="text-mindset-title">{card.title}</h2>
            <p className="mt-5 max-w-[560px] text-[18px] text-ink">{card.body}</p>
          </Card>
          <div className="mt-6 flex items-center justify-between gap-4">
            <Btn variant="secondary" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} data-testid="button-mindset-back"><ArrowLeft className="h-5 w-5" strokeWidth={2} /> Back</Btn>
            <div className="flex gap-1.5" aria-hidden>{deck.map((c, k) => <span key={c.id} className={`h-2 rounded-full transition-all duration-200 ${k === i ? 'w-6 bg-navy' : 'w-2 bg-coolgray'}`} />)}</div>
            {!last && <Btn variant="secondary" onClick={() => setI((x) => x + 1)} data-testid="button-mindset-next">Next <ArrowRight className="h-5 w-5" strokeWidth={2} /></Btn>}
            {last && <span className="w-[110px]" />}
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {j.mindset.map((c) => <Card key={c.id} className="p-7" ><h3 className="font-display text-[19px] font-extrabold uppercase text-navy">{c.title}</h3><p className="mt-3 text-[16px] text-slate-brand">{c.body}</p></Card>)}
        </div>
      )}
      {err && <p role="alert" className="mt-6">{err}</p>}
      <div className="mt-10">
        {p.mindsetDone ? <Btn href="/round/1" data-testid="button-to-round-1">Go to Round 1 <ArrowRight className="h-5 w-5" strokeWidth={2} /></Btn>
          : (mode === 'all' || last) && <Btn onClick={finish} disabled={update.isPending} data-testid="button-finish-mindset">Start Round 1 <ArrowRight className="h-5 w-5" strokeWidth={2} /></Btn>}
        {!p.mindsetDone && mode === 'match' && !last && <p className="text-[14px] text-slate-brand">Read through the cards to continue.</p>}
      </div>
    </div>
  );
}

export default function Mindset() {
  return <JourneyPage>{(j) => <Body j={j} />}</JourneyPage>;
}
