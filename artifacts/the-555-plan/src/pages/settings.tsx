import { useEffect, useState } from 'react';
import { useClerk } from '@clerk/react';
import { getGetSettingsQueryKey, useGetSettings, useHealthCheck, getHealthCheckQueryKey, useUpdateProfile } from '@workspace/api-client-react';
import { Btn, Card, ErrorState, PageHeader, PageSkeleton } from '@/components/brand';
import { StorageStatus } from '@/components/storage-status';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInvalidateAll } from '@/hooks/use-journey';
import { basePath } from '@/lib/base';
import { errMsg } from '@/lib/errors';

const sync = { synced: 'Up to date', pending: 'Waiting to sync. This happens in the background.', failed: 'Needs attention. We will keep retrying.' } as const;

export default function SettingsPage() {
  const q = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey() } });
  const update = useUpdateProfile();
  const invalidate = useInvalidateAll();
  const { signOut } = useClerk();
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const p = q.data?.profile;
  useEffect(() => { if (p) { setFirst(p.firstName); setLast(p.lastName); } }, [p?.firstName, p?.lastName]);
  if (q.isLoading) return <PageSkeleton />;
  if (q.isError || !q.data || !p) return <ErrorState onRetry={() => q.refetch()} />;
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    update.mutate({ data: { firstName: first.trim(), lastName: last.trim() } }, { onSuccess: async () => { await invalidate(); setMsg({ ok: true, t: 'Saved.' }); }, onError: (er) => setMsg({ ok: false, t: errMsg(er) }) });
  };
  return (
    <div>
      <PageHeader eyebrow="Settings" title="Your account" />
      <div className="grid gap-6">
        <Card className="p-8">
          <form onSubmit={save} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="fn">First name</Label><Input id="fn" className="h-12" value={first} maxLength={80} onChange={(e) => setFirst(e.target.value)} data-testid="input-settings-first" /></div>
              <div className="space-y-2"><Label htmlFor="ln">Last name</Label><Input id="ln" className="h-12" value={last} maxLength={80} onChange={(e) => setLast(e.target.value)} data-testid="input-settings-last" /></div>
            </div>
            <div className="space-y-2"><Label>Email</Label><p className="rounded-lg border border-coolgray bg-coolwhite px-3 py-3 text-slate-brand" data-testid="text-settings-email">{p.email}</p></div>
            <div className="flex items-center gap-4"><Btn type="submit" disabled={update.isPending || !first.trim() || !last.trim()} data-testid="button-save-settings">Save Changes</Btn>{msg && <span role="status" className="text-[15px]">{msg.t}</span>}</div>
          </form>
        </Card>
        <Card className="grid gap-5 p-8 sm:grid-cols-3">
          <div><p className="eyebrow">Emails from Mark</p><p className="mt-1" data-testid="text-email-consent">{q.data.emailConsent ? 'You agreed to receive them' : 'Not subscribed'}</p></div>
          <div><p className="eyebrow">Account sync</p><p className="mt-1" data-testid="text-sync-status">{sync[p.syncStatus]}</p></div>
          <div><p className="eyebrow">Service</p><p className="mt-1">{health.isError ? 'Having trouble connecting' : health.data ? 'Running normally' : 'Checking'}</p></div>
        </Card>
        <Card className="p-8"><p className="eyebrow mb-2">Video storage on this computer</p><StorageStatus /></Card>
        <div><Btn variant="secondary" onClick={() => signOut({ redirectUrl: basePath || '/' })} data-testid="button-settings-logout">Log out</Btn></div>
      </div>
    </div>
  );
}
