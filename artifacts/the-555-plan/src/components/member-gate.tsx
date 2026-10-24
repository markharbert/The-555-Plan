import { type ReactNode } from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '@clerk/react';
import { getGetMeQueryKey, useGetMe } from '@workspace/api-client-react';
import { ErrorState, PageSkeleton } from '@/components/brand';
import { MemberShell } from '@/components/member-shell';

function Waiting() {
  return (
    <div className="min-h-[100dvh] bg-coolwhite px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <PageSkeleton />
      </div>
    </div>
  );
}

export function MemberGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const me = useGetMe({ query: { enabled: isLoaded && !!isSignedIn, queryKey: getGetMeQueryKey() } });
  if (!isLoaded) return <Waiting />;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  if (me.isLoading) return <Waiting />;
  if (me.isError) {
    return (
      <div className="min-h-[100dvh] bg-coolwhite px-6 py-16">
        <ErrorState onRetry={() => me.refetch()} />
      </div>
    );
  }
  if (!me.data?.enrolled) return <Redirect to="/enroll" />;
  return <MemberShell>{children}</MemberShell>;
}
