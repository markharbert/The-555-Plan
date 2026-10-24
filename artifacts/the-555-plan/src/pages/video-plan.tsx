import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useUpdateProfile } from '@workspace/api-client-react';
import type { Journey } from '@workspace/api-client-react';
import { errMsg } from '@/lib/errors';
import { Btn, Card, LockedPanel, PageHeader } from '@/components/brand';
import { JourneyPage } from '@/components/journey-page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useInvalidateAll } from '@/hooks/use-journey';

const pocketsList = ['Morning', 'Lunch break', 'Evening', 'Weekends'];

function Body({ j }: { j: Journey }) {
  const p = j.profile;
  const [, go] = useLocation();
  const update = useUpdateProfile();
  const invalidate = useInvalidateAll();
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ business: p.business, audience: p.audience, why: p.why, commitment: p.commitment, pockets: p.pockets, delegate: p.delegate, notifications: p.notifications, partner: p.partner });
  const [err, setErr] = useState<string | null>(null);
  if (!p.fearCheckDone) return <LockedPanel message="Finish Fear Check first. Then you can build your video plan." to="/fear-check" label="Go to Fear Check" />;
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  const togglePocket = (x: string) => setF((s) => ({ ...s, pockets: s.pockets.some((y) => y.toLowerCase() === x.toLowerCase()) ? s.pockets.filter((y) => y.toLowerCase() !== x.toLowerCase()) : [...s.pockets, x] }));
  const fail = (e: unknown) => setErr(errMsg(e));
  const next = () => {
    setErr(null);
    update.mutate({ data: { business: f.business.trim(), audience: f.audience.trim(), why: f.why.trim() } }, { onSuccess: async () => { await invalidate(); setStep(2); }, onError: fail });
  };
  const finish = () => {
    setErr(null);
    update.mutate({ data: { ...f, pockets: f.pockets.map((x) => x.toLowerCase()), partner: f.partner.trim(), planDone: true } }, { onSuccess: async () => { await invalidate(); go('/mindset'); }, onError: fail });
  };
  const steps = ['About You', 'My Plan'];
  return (
    <div>
      <PageHeader eyebrow="My Video Plan" step={3} title={step === 1 ? 'Tell me about you' : 'Make a plan you will follow'} intro={step === 1 ? 'A little context helps you talk about what matters to you.' : 'Small and realistic beats big and forgotten.'} />
      <ol className="mb-8 flex items-center gap-3" aria-label="Plan steps">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-3">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold ${step > i + 1 ? 'bg-teal-brand text-white' : step === i + 1 ? 'bg-navy text-white' : 'border border-coolgray text-slate-brand'}`}>{step > i + 1 ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}</span>
            <span className={`text-[14px] font-semibold ${step === i + 1 ? 'text-navy' : 'text-slate-brand'}`}>{s}</span>
            {i === 0 && <span className="h-px w-8 bg-coolgray" />}
          </li>
        ))}
      </ol>
      <Card className="rise p-8 sm:p-10" key={step}>
        {step === 1 ? (
          <div className="space-y-6">
            <div className="space-y-2"><Label htmlFor="business">What do you do or sell?</Label><Textarea id="business" rows={3} maxLength={2000} value={f.business} onChange={(e) => set('business', e.target.value)} placeholder="I share essential oils, or I help moms start an online business" data-testid="input-business" /></div>
            <div className="space-y-2"><Label htmlFor="audience">Who do you want to reach?</Label><Textarea id="audience" rows={3} maxLength={2000} value={f.audience} onChange={(e) => set('audience', e.target.value)} data-testid="input-audience" /></div>
            <div className="space-y-2"><Label htmlFor="why">Why did you start? (optional)</Label><Textarea id="why" rows={3} maxLength={2000} value={f.why} onChange={(e) => set('why', e.target.value)} data-testid="input-why" /></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2"><Label htmlFor="commitment">How much time can I commit to video each day or week?</Label><Input id="commitment" className="h-12" maxLength={500} value={f.commitment} onChange={(e) => set('commitment', e.target.value)} placeholder="For example, 10 minutes a day" data-testid="input-commitment" /></div>
            <fieldset><legend className="mb-3 text-[14px] font-medium">When are my pockets of time?</legend>
              <div className="flex flex-wrap gap-3">
                {pocketsList.map((x) => { const on = f.pockets.map((y) => y.toLowerCase()).includes(x.toLowerCase()); return (
                  <button key={x} type="button" aria-pressed={on} onClick={() => togglePocket(x)} data-testid={`button-pocket-${x.toLowerCase().replace(' ', '-')}`} className={`inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 font-medium transition-colors duration-200 ${on ? 'border-navy bg-navy text-white' : 'border-coolgray hover:border-slate-brand'}`}>{on && <Check className="h-4 w-4" strokeWidth={3} />}{x}</button>
                ); })}
              </div>
            </fieldset>
            <div className="space-y-2"><Label htmlFor="delegate">What can I delegate or drop to make more time?</Label><Textarea id="delegate" rows={2} maxLength={2000} value={f.delegate} onChange={(e) => set('delegate', e.target.value)} data-testid="input-delegate" /></div>
            <div className="space-y-2"><Label htmlFor="notif">Which notifications will I turn off while I record?</Label><Textarea id="notif" rows={2} maxLength={2000} value={f.notifications} onChange={(e) => set('notifications', e.target.value)} data-testid="input-notifications" /></div>
            <div className="space-y-2"><Label htmlFor="partner">Who will be my accountability partner? (optional)</Label><Input id="partner" className="h-12" maxLength={120} value={f.partner} onChange={(e) => set('partner', e.target.value)} data-testid="input-partner" /></div>
            <p className="font-display text-[16px] font-bold uppercase text-teal-brand">The best plan is the one you will actually follow.</p>
          </div>
        )}
      </Card>
      {err && <p role="alert" className="mt-6">{err}</p>}
      <div className="mt-10 flex flex-wrap items-center gap-4">
        {step === 2 && <Btn variant="secondary" onClick={() => setStep(1)} data-testid="button-plan-back"><ArrowLeft className="h-5 w-5" strokeWidth={2} /> Back</Btn>}
        {step === 1 ? <Btn onClick={next} disabled={update.isPending || !f.business.trim() || !f.audience.trim()} data-testid="button-plan-next">Continue <ArrowRight className="h-5 w-5" strokeWidth={2} /></Btn>
          : <Btn onClick={finish} disabled={update.isPending || !f.commitment.trim() || f.pockets.length === 0} data-testid="button-plan-save">Save My Plan <ArrowRight className="h-5 w-5" strokeWidth={2} /></Btn>}
      </div>
    </div>
  );
}

export default function VideoPlan() {
  return <JourneyPage>{(j) => <Body j={j} />}</JourneyPage>;
}
