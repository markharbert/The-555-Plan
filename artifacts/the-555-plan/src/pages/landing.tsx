import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, EyeOff, Lock, Users, Video } from 'lucide-react';
import { getGetContentQueryKey, useGetContent } from '@workspace/api-client-react';
import { Btn, Card, ProgressBar, Skel } from '@/components/brand';
import { PublicFrame } from '@/components/public-frame';
import { captureAttribution } from '@/lib/attribution';
import { asset } from '@/lib/base';

const roundMeta = [
  { icon: EyeOff, name: 'Just Me', line: 'Five videos only you will ever see. One minute each. The only goal is to get used to the red light.', tag: 'Private' },
  { icon: Users, name: 'Test Group', line: 'Post five videos in a private group where you are the only member. You practice pressing post.', tag: 'Still private' },
  { icon: Video, name: 'Going Live', line: 'Five short live videos in that same private group. One to two minutes each. Your voice gets steady.', tag: 'Almost there' },
];

function Preview() {
  const rows = ['Welcome', 'Fear Check', 'My Video Plan', 'Mindset', 'The 555 Plan'];
  return (
    <div className="overflow-hidden rounded-xl border border-coolgray bg-coolwhite" aria-label="Preview of the member area">
      <div className="flex min-h-[360px]">
        <div className="hidden w-[210px] shrink-0 bg-navy p-4 text-white sm:block">
          <p className="font-display text-[14px] font-extrabold uppercase">The <span className="text-sky">555</span> Plan</p>
          <div className="mt-4 rounded-lg border border-white/15 bg-white/5 p-3">
            <div className="mb-2 flex justify-between text-[11px] text-white/70"><span>555 PLAN</span><span className="font-bold text-white">40%</span></div>
            <ProgressBar value={40} tone="sky" className="h-1.5" />
            <p className="mt-2 text-[11px] text-white/80">6 of 15 missions done</p>
          </div>
          <div className="mt-4 space-y-1 text-[12px]">
            {rows.map((r, i) => (
              <div key={r} className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${i === 4 ? 'bg-white/10 font-semibold' : 'text-white/80'}`}>
                <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${i < 4 ? 'bg-teal-brand' : 'bg-sky text-navy'}`}>{i < 4 ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : 5}</span>
                {r}
              </div>
            ))}
            <div className="flex items-center gap-2 px-2 py-1.5 text-white/45"><Lock className="h-3 w-3" /> First Public Video</div>
          </div>
        </div>
        <div className="flex-1 p-5 sm:p-7">
          <p className="eyebrow">Your next step</p>
          <p className="mt-1 font-display text-[20px] font-extrabold uppercase leading-tight text-navy">Round 2, Mission 2: A mentor who made a difference</p>
          <div className="mt-3 inline-block rounded-lg bg-brand-red px-4 py-2 font-display text-[12px] font-bold uppercase tracking-wider text-white">Start this mission</div>
          <div className="mt-6 grid grid-cols-5 gap-2">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className={`flex h-8 items-center justify-center rounded-md text-[11px] font-bold ${i < 6 ? 'bg-teal-brand text-white' : 'border border-coolgray bg-white text-slate-brand'}`}>{i < 6 ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}</div>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 text-[11px] text-slate-brand">
            <div className="rounded-lg border border-coolgray bg-white p-3"><b className="block text-[18px] text-navy">6</b>missions done</div>
            <div className="rounded-lg border border-coolgray bg-white p-3"><b className="block text-[18px] text-navy">3 to 7</b>comfort score</div>
            <div className="rounded-lg border border-coolgray bg-white p-3"><b className="block text-[18px] text-navy">4 min</b>on camera</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  useEffect(() => { captureAttribution(); }, []);
  const content = useGetContent({ query: { queryKey: getGetContentQueryKey() } });
  const [imgOk, setImgOk] = useState(true);
  const rounds = content.data?.rounds;
  return (
    <PublicFrame>
      <section className="mx-auto max-w-[1160px] px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-[860px]">
          <p className="eyebrow mb-5">A personal coaching space by Mark Harbert</p>
          <h1 className="h-display text-[44px] sm:text-[72px]">Get over camera fear in fifteen small steps</h1>
          <p className="mt-7 max-w-[620px] text-[19px] text-slate-brand">You cannot make your 100th video without making your first. Fifteen short missions walk you there, one calm step at a time.</p>
          <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Btn href="/sign-up" data-testid="button-setup-hero">Set Up My Account <ArrowRight className="h-5 w-5" strokeWidth={2} /></Btn>
            <p className="text-[15px] text-slate-brand">Set up your no-cost account. It takes about a minute.</p>
          </div>
        </motion.div>
      </section>

      <section className="bg-coolwhite px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-[1160px]">
          <p className="eyebrow mb-3">How it works</p>
          <h2 className="h-display max-w-[680px] text-[32px] sm:text-[44px]">Three rounds. Five missions each.</h2>
          <div className="mt-14 grid gap-5 md:grid-cols-12">
            {roundMeta.map((r, i) => {
              const Icon = r.icon;
              const apiRound = rounds?.find((x) => x.id === i + 1);
              return (
                <Card key={r.name} className={`p-8 transition-colors duration-200 hover:border-navy ${i === 0 ? 'md:col-span-6' : 'md:col-span-3'}`}>
                  <div className="mb-8 flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-coolwhite text-navy"><Icon className="h-5 w-5" strokeWidth={1.75} /></span>
                    <span className="font-display text-[56px] font-black leading-none text-coolgray">{i + 1}</span>
                  </div>
                  <p className="eyebrow">{r.tag}</p>
                  <h3 className="h-display mt-1 text-[26px]">{r.name}</h3>
                  <p className="mt-3 text-slate-brand">{r.line}</p>
                  {content.isLoading ? <Skel className="mt-5 h-4 w-24" /> : apiRound && <p className="mt-5 text-[14px] font-medium text-teal-brand">Up to {apiRound.maxSeconds >= 120 ? '2 minutes' : '1 minute'} each</p>}
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8">
        <div className="mx-auto grid max-w-[1160px] items-center gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow mb-3">Inside your space</p>
            <h2 className="h-display text-[32px] sm:text-[44px]">Always one clear next step</h2>
            <p className="mt-5 max-w-[520px] text-slate-brand">Your journey sits in a quiet left sidebar. Your progress updates the moment you finish a mission, so you always see how far you have come.</p>
            <div className="mt-8"><Btn href="/sign-up" data-testid="button-setup-preview">Set Up My Account</Btn></div>
          </div>
          <Preview />
        </div>
      </section>

      <section className="bg-coolwhite px-5 py-24 sm:px-8">
        <div className="mx-auto grid max-w-[1160px] items-center gap-12 md:grid-cols-[320px_1fr]">
          <div className="aspect-[4/5] overflow-hidden rounded-xl border border-coolgray bg-white">
            {imgOk ? <img src={asset('mark-headshot.png')} alt="Mark Harbert" className="h-full w-full object-cover" onError={() => setImgOk(false)} /> : <div className="flex h-full items-center justify-center font-display text-[64px] font-black text-coolgray">MH</div>}
          </div>
          <div className="max-w-[640px]">
            <p className="eyebrow mb-3">From Mark</p>
            <p className="font-display text-[26px] font-bold leading-snug text-navy sm:text-[32px]">Your first video will not be great. Mine was not either.</p>
            <p className="mt-6 text-slate-brand">I built this space so you can practice where nobody is watching, then grow at your own pace. Fifteen small videos change how you feel about the camera. I will be with you through each of them.</p>
            <p className="mt-5 font-display text-[18px] font-extrabold uppercase text-navy">Mark Harbert</p>
          </div>
        </div>
      </section>

      <section className="bg-navy px-5 py-24 text-center sm:px-8">
        <div className="mx-auto max-w-[760px]">
          <h2 className="h-display !text-white text-[34px] sm:text-[52px]">Your first video starts here</h2>
          <p className="mx-auto mt-5 max-w-[520px] text-white/75">Set up your no-cost account and start your 555 Plan today.</p>
          <div className="mt-10"><Btn href="/sign-up" data-testid="button-setup-bottom">Set Up My Account</Btn></div>
        </div>
      </section>
    </PublicFrame>
  );
}
