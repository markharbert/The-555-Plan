import { useEffect, useState } from 'react';
import { Redirect, useLocation } from 'wouter';
import { useAuth, useUser } from '@clerk/react';
import { getGetMeQueryKey, useEnroll, useGetMe } from '@workspace/api-client-react';
import { Btn, Card, ErrorState, PageSkeleton, Wordmark } from '@/components/brand';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInvalidateAll } from '@/hooks/use-journey';
import { errMsg } from '@/lib/errors';
import { readAttribution } from '@/lib/attribution';

export default function Enroll() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const me = useGetMe({ query: { enabled: isLoaded && !!isSignedIn, queryKey: getGetMeQueryKey() } });
  const enroll = useEnroll();
  const invalidate = useInvalidateAll();
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (user) {
      setFirst((v) => v || user.firstName || '');
      setLast((v) => v || user.lastName || '');
    }
  }, [user]);

  if (!isLoaded || me.isLoading) return <div className="min-h-[100dvh] bg-coolwhite p-10"><div className="mx-auto max-w-xl"><PageSkeleton /></div></div>;
  if (!isSignedIn) return <Redirect to="/sign-up" />;
  if (me.isError) return <div className="min-h-[100dvh] bg-coolwhite p-10"><ErrorState onRetry={() => me.refetch()} /></div>;
  if (me.data?.enrolled) return <Redirect to="/dashboard" />;

  const ok = first.trim() && last.trim() && consent;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!ok) return;
    const a = readAttribution();
    enroll.mutate(
      { data: { firstName: first.trim(), lastName: last.trim(), emailConsent: true, source: a.source, utm: a.utm } },
      {
        onSuccess: async () => { await invalidate(); setLocation('/welcome'); },
        onError: (e) => setError(errMsg(e, 'We could not finish setting up your account. Please try again.')),
      },
    );
  };
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-coolwhite px-4 py-12">
      <div className="w-full max-w-[520px]">
        <div className="mb-8 text-center"><Wordmark className="text-[24px]" /></div>
        <Card className="rise p-8 sm:p-10">
          <p className="eyebrow">One last thing</p>
          <h1 className="h-display mt-2 text-[28px]">Finish setting up your account</h1>
          <p className="mt-3 text-slate-brand">Confirm your name so Mark can greet you properly.</p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="first">First name</Label><Input id="first" className="h-12" value={first} maxLength={80} onChange={(e) => setFirst(e.target.value)} data-testid="input-first-name" /></div>
              <div className="space-y-2"><Label htmlFor="last">Last name</Label><Input id="last" className="h-12" value={last} maxLength={80} onChange={(e) => setLast(e.target.value)} data-testid="input-last-name" /></div>
            </div>
            <div className="space-y-2"><Label>Email</Label><p className="rounded-lg border border-coolgray bg-coolwhite px-3 py-3 text-[16px] text-slate-brand" data-testid="text-email">{user?.primaryEmailAddress?.emailAddress ?? ''}</p></div>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-coolgray p-4 transition-colors hover:border-navy">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-1" data-testid="checkbox-consent" />
              <span className="text-[15px]">I agree to receive emails from Mark Harbert, including coaching tips and updates about my 555 Plan.</span>
            </label>
            {error && <p role="alert" className="text-[15px] font-medium text-ink">{error}</p>}
            <Btn type="submit" className="w-full" disabled={!ok || enroll.isPending} data-testid="button-finish-setup">{enroll.isPending ? 'Setting up' : 'Start My 555 Plan'}</Btn>
          </form>
        </Card>
      </div>
    </div>
  );
}
