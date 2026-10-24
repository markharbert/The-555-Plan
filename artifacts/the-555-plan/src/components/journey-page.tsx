import { type ReactNode } from 'react';
import type { Journey } from '@workspace/api-client-react';
import { ErrorState, PageSkeleton } from '@/components/brand';
import { useJourney } from '@/hooks/use-journey';
import { isTemporaryApiError } from '@/lib/errors';

export function JourneyPage({ children }: { children: (j: Journey) => ReactNode }) {
  const q = useJourney();
  if (q.isLoading) return <PageSkeleton />;
  if (!q.data || (q.isError && !isTemporaryApiError(q.error))) return <ErrorState onRetry={() => q.refetch()} />;
  return <>{children(q.data)}</>;
}
