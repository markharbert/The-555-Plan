import { ArrowRight, Check, Clock, Lock, Smile, Video } from 'lucide-react';
import { Link } from 'wouter';
import type { Journey } from '@workspace/api-client-react';
import { AnimatedCheck, Btn, Card, PageHeader, ProgressBar, TextLink } from '@/components/brand';
import { JourneyPage } from '@/components/journey-page';

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <Card className="p-6">
      <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-coolwhite text-navy">{icon}</span>
      <p className="font-display text-[32px] font-extrabold leading-none text-navy">{value}</p>
      <p className="mt-2 text-[14px] text-slate-brand">{label}</p>
    </Card>
  );
}

function Body({ j }: { j: Journey }) {
  const { stats, profile: p } = j;
  const done = stats.completed >= 15;
  const latest = stats.latestComfort ?? stats.baselineComfort;
  return (
    <div className="space-y-12">
      <PageHeader eyebrow="My Journey" title={`Welcome back, ${p.firstName}`} intro={done ? 'You finished all fifteen missions. Be proud of that.' : 'One small step today keeps the momentum going.'} />
      <Card className="rise relative overflow-hidden p-8 sm:p-10" >
        <p className="eyebrow mb-3">Your next step</p>
        <h2 className="h-display max-w-[640px] text-[26px] sm:text-[34px]" data-testid="text-next-title">{j.nextTitle}</h2>
        <div className="mt-8"><Btn href={j.nextPath} data-testid="button-next-step">{done ? 'See your progress' : 'Take this step'} <ArrowRight className="h-5 w-5" strokeWidth={2} /></Btn></div>
      </Card>

      <Card className="p-8 sm:p-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div><p className="eyebrow mb-2">The 555 Plan</p><p className="font-display text-[22px] font-extrabold uppercase text-navy" data-testid="text-progress-count">{stats.completed} of 15 missions done</p></div>
          <p className="font-display text-[48px] font-black leading-none text-navy" data-testid="text-progress-percent">{Math.round(stats.percent)}%</p>
        </div>
        <ProgressBar value={stats.percent} className="h-4" />
      </Card>

      <section>
        <h2 className="h-display mb-6 text-[24px]">Your fifteen missions</h2>
        <div className="space-y-6">
          {j.rounds.map((r) => {
            const ms = j.missions.filter((m) => m.round === r.id).sort((a, b) => a.position - b.position);
            const c = ms.filter((m) => m.completed).length;
            return (
              <Card key={r.id} className="p-6 sm:p-8">
                <div className="mb-4 flex items-center justify-between">
                  <div><p className="eyebrow">Round {r.id}</p><h3 className="font-display text-[20px] font-extrabold uppercase text-navy">{r.name}</h3></div>
                  <span className="text-[14px] font-semibold text-slate-brand">{c}/{ms.length}</span>
                </div>
                <ul className="divide-y divide-coolgray">
                  {ms.map((m) => {
                    const row = (
                      <div className="flex items-center gap-4 py-3.5">
                        {m.completed ? <AnimatedCheck size={28} /> : m.unlocked ? <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-navy text-[12px] font-bold text-navy">{m.position}</span> : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-coolwhite text-slate-brand"><Lock className="h-3.5 w-3.5" strokeWidth={2} /></span>}
                        <span className={`flex-1 ${m.unlocked ? 'text-ink font-medium' : 'text-slate-brand'}`}>{m.title}</span>
                        {m.completed && <Check className="hidden" />}
                        {m.unlocked && <ArrowRight className="h-4 w-4 text-slate-brand transition-transform group-hover:translate-x-1" strokeWidth={2} />}
                      </div>
                    );
                    return (
                      <li key={m.id} data-testid={`row-mission-${m.id}`}>
                        {m.unlocked ? <Link href={`/mission/${m.id}`} className="group block rounded-lg transition-colors hover:bg-coolwhite sm:px-2">{row}</Link> : <div className="sm:px-2" title="Finish the earlier missions first">{row}</div>}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-3">
        <Stat icon={<Video className="h-5 w-5" strokeWidth={1.75} />} value={String(stats.videosRecorded)} label="Videos recorded" />
        <Stat icon={<Clock className="h-5 w-5" strokeWidth={1.75} />} value={String(Math.round(stats.minutesOnCamera))} label="Minutes on camera" />
        <Stat icon={<Smile className="h-5 w-5" strokeWidth={1.75} />} value={stats.baselineComfort != null ? `${stats.baselineComfort} to ${latest ?? stats.baselineComfort}` : 'Not yet'} label="Comfort: where you started to now" />
      </section>

      {p.planDone && (
        <Card className="p-8" data-testid="card-video-plan">
          <p className="eyebrow mb-2">My Video Plan</p>
          <dl className="grid gap-5 sm:grid-cols-2">
            {[['I make video', p.business], ['For', p.audience], ['My time', p.commitment], ['My pockets of time', p.pockets.join(', ')], ['Accountability partner', p.partner]].filter(([, v]) => v).map(([k, v]) => (
              <div key={k}><dt className="text-[13px] font-semibold uppercase tracking-wider text-slate-brand">{k}</dt><dd className="mt-1">{v}</dd></div>
            ))}
          </dl>
          <p className="mt-6"><TextLink href="/video-plan">Edit my plan</TextLink></p>
        </Card>
      )}
    </div>
  );
}

export default function Dashboard() {
  return <JourneyPage>{(j) => <Body j={j} />}</JourneyPage>;
}
