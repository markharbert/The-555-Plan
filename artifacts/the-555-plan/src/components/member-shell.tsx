import { type ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useClerk } from '@clerk/react';
import { ChevronDown, Lock, LogOut, Menu, Settings, TrendingUp, Video, X } from 'lucide-react';
import type { Journey } from '@workspace/api-client-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { AnimatedCheck, ProgressBar, Skel, Wordmark } from '@/components/brand';
import { useJourney } from '@/hooks/use-journey';
import { basePath } from '@/lib/base';

type StepState = 'done' | 'current' | 'open' | 'locked';

function Badge({ n, state }: { n?: number; state: StepState | 'tool' }) {
  if (state === 'done') return <AnimatedCheck size={24} />;
  if (state === 'locked') {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-white/50">
        <Lock className="h-3 w-3" strokeWidth={2} />
      </span>
    );
  }
  return (
    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${state === 'current' ? 'bg-sky text-navy' : 'border border-white/40 text-white'}`}>
      {n}
    </span>
  );
}

function rowCls(active: boolean, locked: boolean) {
  return `group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] transition-colors duration-200 ${
    active ? 'bg-white/10 text-white font-semibold' : locked ? 'text-white/50 hover:bg-white/5' : 'text-white/85 hover:bg-white/5 hover:text-white'
  }`;
}

function NavRow({ n, label, to, state, active, onLocked, trailing }: { n: number; label: string; to: string; state: StepState; active: boolean; onLocked: () => void; trailing?: ReactNode }) {
  const inner = (
    <>
      {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-sky" />}
      <Badge n={n} state={state} />
      <span className="flex-1">{label}</span>
      {trailing}
    </>
  );
  const id = `nav-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  if (state === 'locked') {
    return (
      <button type="button" className={rowCls(active, true)} onClick={onLocked} data-testid={id} aria-disabled>
        {inner}
      </button>
    );
  }
  return (
    <Link href={to} className={rowCls(active, false)} data-testid={id} aria-current={active ? 'page' : undefined}>
      {inner}
    </Link>
  );
}

function ToolRow({ to, icon, label, active }: { to: string; icon: ReactNode; label: string; active: boolean }) {
  return (
    <Link href={to} className={rowCls(active, false)} data-testid={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-sky" />}
      <span className="flex h-6 w-6 items-center justify-center text-white/80">{icon}</span>
      {label}
    </Link>
  );
}

function ProgressCard({ j }: { j: Journey }) {
  const { completed, percent } = j.stats;
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 p-4" data-testid="card-sidebar-progress">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="font-display text-[12px] font-bold uppercase tracking-[0.12em] text-white/70">555 Plan</span>
        <span className="font-display text-[22px] font-extrabold text-white">{Math.round(percent)}%</span>
      </div>
      <ProgressBar value={percent} tone="sky" />
      <p className="mt-3 text-[14px] text-white/80">{completed} of 15 missions done</p>
    </div>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { data: j } = useJourney();
  const { signOut } = useClerk();
  const [loc] = useLocation();
  const [notice, setNotice] = useState<string | null>(null);
  const missionMatch = loc.match(/^\/mission\/(\d+)/);
  const activeMission = j?.missions.find((m) => m.id === Number(missionMatch?.[1]));
  const inPlan = loc.startsWith('/round') || !!missionMatch;
  const [open, setOpen] = useState(inPlan);
  useEffect(() => {
    if (inPlan) setOpen(true);
  }, [inPlan]);
  useEffect(() => {
    setNotice(null);
  }, [loc]);

  if (!j) {
    return (
      <div className="space-y-3 p-5">
        <Skel className="h-8 w-40 !bg-white/10" />
        <Skel className="h-28 !bg-white/10" />
        <Skel className="h-64 !bg-white/10" />
      </div>
    );
  }
  const p = j.profile;
  const unlockedPlan = p.mindsetDone && j.missions.some((m) => m.unlocked);
  const allDone = j.stats.completed >= 15;
  const next = j.nextPath;
  const st = (done: boolean, unlocked: boolean, path: string): StepState => (done ? 'done' : !unlocked ? 'locked' : next.startsWith(path) ? 'current' : 'open');
  const initials = `${p.firstName?.[0] ?? ''}${p.lastName?.[0] ?? ''}`.toUpperCase() || 'ME';
  const roundCount = (r: number) => j.missions.filter((m) => m.round === r && m.completed).length;
  const go = onNavigate;

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 py-6 text-white" onClick={(e) => { if ((e.target as HTMLElement).closest('a')) go?.(); }}>
      <Link href="/dashboard" className="mb-6 block px-2" data-testid="link-home">
        <Wordmark light className="text-[20px]" />
      </Link>
      <ProgressCard j={j} />
      <nav className="mt-6 space-y-0.5" aria-label="Your journey">
        <NavRow n={1} label="Welcome" to="/welcome" state={st(p.welcomeDone, true, '/welcome')} active={loc === '/welcome'} onLocked={() => {}} />
        <NavRow n={2} label="Fear Check" to="/fear-check" state={st(p.fearCheckDone, p.welcomeDone, '/fear-check')} active={loc === '/fear-check'} onLocked={() => setNotice('Finish Welcome first. Fear Check opens right after.')} />
        <NavRow n={3} label="My Video Plan" to="/video-plan" state={st(p.planDone, p.fearCheckDone, '/video-plan')} active={loc === '/video-plan'} onLocked={() => setNotice('Finish Fear Check first. Then you can build your video plan.')} />
        <NavRow n={4} label="Mindset" to="/mindset" state={st(p.mindsetDone, p.planDone, '/mindset')} active={loc === '/mindset'} onLocked={() => setNotice('Finish My Video Plan first. Mindset comes next.')} />
        <div>
          <NavRow
            n={5}
            label="The 555 Plan"
            to="/round/1"
            state={st(allDone, unlockedPlan, '/round')}
            active={false}
            onLocked={() => setNotice('Finish Mindset first. Then Round 1 opens.')}
            trailing={
              unlockedPlan ? (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Toggle rounds"
                  className="rounded p-1 text-white/70 hover:text-white"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setOpen((o) => !o); } }}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </span>
              ) : undefined
            }
          />
          {unlockedPlan && open && (
            <div className="rise ml-[22px] mt-1 space-y-0.5 border-l border-white/15 pl-3">
              {j.rounds.map((r) => {
                const rm = j.missions.filter((m) => m.round === r.id);
                const unlocked = rm.some((m) => m.unlocked);
                const active = loc === `/round/${r.id}` || activeMission?.round === r.id;
                const cls = rowCls(active, !unlocked);
                const body = (
                  <>
                    <span className="flex-1">Round {r.id}: {r.name}</span>
                    {unlocked ? <span className="text-[12px] text-white/70">{roundCount(r.id)}/{rm.length || 5}</span> : <Lock className="h-3 w-3" strokeWidth={2} />}
                  </>
                );
                return unlocked ? (
                  <Link key={r.id} href={`/round/${r.id}`} className={cls + ' !text-[14px]'} data-testid={`nav-round-${r.id}`}>{body}</Link>
                ) : (
                  <button key={r.id} type="button" className={cls + ' !text-[14px]'} onClick={() => setNotice(`Finish Round ${r.id - 1} first. Round ${r.id} opens when all five are done.`)} data-testid={`nav-round-${r.id}`}>{body}</button>
                );
              })}
            </div>
          )}
        </div>
        <NavRow n={6} label="First Public Video" to="/first-public-video" state="locked" active={loc === '/first-public-video'} onLocked={() => setNotice('Finish all 15 missions first. Your first public video comes after The 555 Plan.')} />
        <NavRow n={7} label="30-Day Challenge" to="/challenge" state="locked" active={loc === '/challenge'} onLocked={() => setNotice('Finish your First Public Video first. The challenge follows it.')} />
      </nav>
      {notice && (
        <div className="rise mt-3 flex items-start gap-2 rounded-lg border border-sky/50 bg-white/5 p-3 text-[14px] text-white" role="status" data-testid="text-locked-notice">
          <span className="flex-1">{notice}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)} className="text-white/70 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      )}
      <div className="my-5 h-px bg-white/15" />
      <div className="space-y-0.5">
        <ToolRow to="/videos" icon={<Video className="h-[18px] w-[18px]" strokeWidth={1.75} />} label="My Videos" active={loc === '/videos'} />
        <ToolRow to="/progress" icon={<TrendingUp className="h-[18px] w-[18px]" strokeWidth={1.75} />} label="My Progress" active={loc === '/progress'} />
        <ToolRow to="/settings" icon={<Settings className="h-[18px] w-[18px]" strokeWidth={1.75} />} label="Settings" active={loc === '/settings'} />
      </div>
      <div className="mt-auto pt-8">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky font-display text-[14px] font-extrabold text-navy" data-testid="text-initials">{initials}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold" data-testid="text-sidebar-name">{p.firstName} {p.lastName}</p>
            <button type="button" onClick={() => signOut({ redirectUrl: basePath || '/' })} className="inline-flex items-center gap-1 text-[13px] text-sky underline underline-offset-4 hover:opacity-80" data-testid="button-logout">
              <LogOut className="h-3.5 w-3.5" strokeWidth={2} /> Log out
            </button>
          </div>
        </div>
        <p className="mt-4 px-2 text-[12px] text-white/60">
          Brought to you by{' '}
          <a href="https://markharbert.com" target="_blank" rel="noreferrer" className="text-sky underline underline-offset-4">Mark Harbert</a>
        </p>
      </div>
    </div>
  );
}

export function MemberShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loc] = useLocation();
  const { data: j } = useJourney();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [loc]);
  return (
    <div className="min-h-[100dvh] bg-coolwhite lg:pl-[304px]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[304px] bg-navy lg:block" data-testid="sidebar">
        <SidebarNav />
      </aside>
      <header className="sticky top-0 z-30 bg-navy px-4 pb-3 pt-3 text-white lg:hidden">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="-ml-2 rounded-lg p-2 hover:bg-white/10" data-testid="button-open-menu">
            <Menu className="h-6 w-6" strokeWidth={1.75} />
          </button>
          <Wordmark light className="text-[17px]" />
          <span className="w-10 text-right text-[13px] font-semibold">{j ? `${Math.round(j.stats.percent)}%` : ''}</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar value={j?.stats.percent ?? 0} tone="sky" className="h-1.5" />
          <span className="whitespace-nowrap text-[12px] text-white/80">{j?.stats.completed ?? 0}/15</span>
        </div>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[320px] max-w-[88vw] border-0 bg-navy p-0 [&>button]:text-white">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Your journey navigation</SheetDescription>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <main className="mx-auto max-w-[1040px] px-5 py-10 sm:px-10 lg:py-16">{children}</main>
    </div>
  );
}
