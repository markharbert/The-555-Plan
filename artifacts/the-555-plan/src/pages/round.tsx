import { useState } from 'react';
import { useParams } from 'wouter';
import { ArrowRight, ChevronDown, Lock } from 'lucide-react';
import type { Journey } from '@workspace/api-client-react';
import { AnimatedCheck, Card, LockedPanel, PageHeader, ProgressBar } from '@/components/brand';
import { JourneyPage } from '@/components/journey-page';
import { Link } from 'wouter';

function Body({ j }: { j: Journey }) {
  const { round } = useParams<{ round: string }>();
  const id = Number(round);
  const [help, setHelp] = useState(false);
  const r = j.rounds.find((x) => x.id === id);
  const ms = j.missions.filter((m) => m.round === id).sort((a, b) => a.position - b.position);
  if (!r) return <LockedPanel title="Round not found" message="That round does not exist. Head back to your journey." to="/dashboard" label="My Journey" />;
  if (!ms.some((m) => m.unlocked)) {
    return <LockedPanel message={id === 1 ? 'Finish Mindset first. Then Round 1 opens.' : `Finish Round ${id - 1} first. Round ${id} opens when all five missions are done.`} to={j.nextPath} />;
  }
  const done = ms.filter((m) => m.completed).length;
  return (
    <div>
      <PageHeader eyebrow={`Round ${id}`} title={r.name} intro={r.intro} />
      <Card className="mb-8 p-6"><div className="mb-3 flex justify-between text-[14px] font-semibold"><span>{done} of {ms.length} done</span><span className="text-slate-brand">Up to {r.maxSeconds} seconds each</span></div><ProgressBar value={(done / (ms.length || 1)) * 100} /></Card>
      {id === 2 && (
        <Card className="mb-8">
          <button type="button" onClick={() => setHelp((h) => !h)} aria-expanded={help} className="flex w-full items-center justify-between p-6 text-left font-display text-[16px] font-bold uppercase text-navy" data-testid="button-fb-help">
            How to create your private Facebook test group
            <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${help ? 'rotate-180' : ''}`} />
          </button>
          {help && (
            <div className="rise border-t border-coolgray p-6 pt-5 text-ink">
              <ol className="list-decimal space-y-2 pl-5"><li>On Facebook, go to Groups.</li><li>Click Create New Group.</li><li>Name it something like My Video Practice.</li><li>Set privacy to Private.</li><li>Skip inviting anyone, then create it.</li></ol>
              <p className="mt-4 text-[15px] text-slate-brand">Facebook changes its menus often. If a step looks different, search YouTube for how to create a Facebook group.</p>
            </div>
          )}
        </Card>
      )}
      <ul className="space-y-3">
        {ms.map((m) => {
          const body = (
            <div className="flex items-center gap-5 p-5 sm:p-6">
              {m.completed ? <AnimatedCheck size={36} /> : m.unlocked ? <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-navy font-display font-extrabold text-navy">{m.position}</span> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-coolwhite text-slate-brand"><Lock className="h-4 w-4" strokeWidth={2} /></span>}
              <div className="flex-1"><p className="font-display text-[18px] font-extrabold uppercase text-navy">{m.title}</p><p className="text-[15px] text-slate-brand">{m.prompt}</p>{!m.unlocked && <p className="mt-1 text-[13px] text-slate-brand">Finish the mission before this one first.</p>}{m.completed && m.feelingScore != null && <p className="mt-1 text-[13px] font-medium text-teal-brand">Felt {m.feelingScore} out of 10</p>}</div>
              {m.unlocked && <ArrowRight className="h-5 w-5 text-slate-brand transition-transform group-hover:translate-x-1" strokeWidth={2} />}
            </div>
          );
          return (
            <li key={m.id} data-testid={`card-mission-${m.id}`}>
              {m.unlocked ? <Link href={`/mission/${m.id}`} className="group block rounded-xl border border-coolgray bg-white transition-colors duration-200 hover:border-navy">{body}</Link> : <div className="rounded-xl border border-coolgray bg-white/60">{body}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Round() {
  return <JourneyPage>{(j) => <Body j={j} />}</JourneyPage>;
}
