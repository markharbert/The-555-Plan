import { Clock, Lock, Smile, Video } from 'lucide-react';
import { getGetActivityQueryKey, useGetActivity } from '@workspace/api-client-react';
import { Card, LockedPanel, PageHeader, Skel } from '@/components/brand';
import { JourneyPage } from '@/components/journey-page';

const label = (t: string) => t.replace(/[_-]/g, ' ').replace(/^./, (c) => c.toUpperCase());

export function ProgressPage() {
  const act = useGetActivity({ query: { queryKey: getGetActivityQueryKey() } });
  return (
    <JourneyPage>
      {(j) => {
        const s = j.stats;
        const items: [React.ReactNode, string, string][] = [
          [<Smile key="a" className="h-5 w-5" strokeWidth={1.75} />, s.baselineComfort != null ? String(s.baselineComfort) : 'Not yet', 'Starting comfort'],
          [<Smile key="b" className="h-5 w-5" strokeWidth={1.75} />, s.latestComfort != null ? String(s.latestComfort) : 'Not yet', 'Latest comfort'],
          [<Video key="c" className="h-5 w-5" strokeWidth={1.75} />, `${s.completed} of 15`, 'Missions done'],
          [<Clock key="d" className="h-5 w-5" strokeWidth={1.75} />, String(Math.round(s.minutesOnCamera)), 'Minutes on camera'],
        ];
        return (
          <div>
            <PageHeader eyebrow="My Progress" title="How far you have come" intro="Your full progress charts arrive in a later release. Here is what we can show today." />
            <div className="grid gap-5 sm:grid-cols-2">
              {items.map(([i, v, l]) => <Card key={l} className="p-6"><span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-coolwhite text-navy">{i}</span><p className="font-display text-[32px] font-extrabold text-navy">{v}</p><p className="text-[14px] text-slate-brand">{l}</p></Card>)}
            </div>
            <Card className="mt-8 p-8">
              <h2 className="font-display text-[18px] font-extrabold uppercase text-navy">Recent activity</h2>
              {act.isLoading && <Skel className="mt-4 h-24" />}
              {act.isError && <p className="mt-4">We could not load your activity. <button type="button" className="text-linkblue underline" onClick={() => act.refetch()}>Try again</button></p>}
              {act.data && act.data.length === 0 && <p className="mt-4 text-slate-brand">Nothing yet. Your first mission will show up here.</p>}
              <ul className="mt-4 divide-y divide-coolgray">
                {act.data?.slice(0, 10).map((a) => (
                  <li key={a.id} className="flex justify-between gap-4 py-3 text-[15px]"><span>{label(a.type)}{a.missionId ? `, mission ${a.missionId}` : ''}</span><span className="text-slate-brand">{new Date(a.createdAt).toLocaleDateString()}</span></li>
                ))}
              </ul>
            </Card>
          </div>
        );
      }}
    </JourneyPage>
  );
}

export function FuturePage({ kind }: { kind: 'first' | 'challenge' }) {
  const first = kind === 'first';
  return (
    <JourneyPage>
      {(j) => (
        <LockedPanel
          title={first ? 'First Public Video' : '30-Day Challenge'}
          message={first ? `This step opens after all 15 missions, and it arrives in a later release. You have finished ${j.stats.completed} so far.` : 'This step follows your First Public Video and arrives in a later release. Keep going with your missions for now.'}
          to={j.nextPath}
          label="Go to my next step"
        />
      )}
    </JourneyPage>
  );
}

export { Lock };
