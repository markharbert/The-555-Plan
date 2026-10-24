import { useQueryClient } from '@tanstack/react-query';
import { getGetJourneyQueryKey, getGetMeQueryKey, getGetSettingsQueryKey, getGetActivityQueryKey, useGetJourney } from '@workspace/api-client-react';

export function useJourney() {
  return useGetJourney({ query: { queryKey: getGetJourneyQueryKey() } });
}

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: getGetMeQueryKey() }),
      qc.invalidateQueries({ queryKey: getGetJourneyQueryKey() }),
      qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() }),
      qc.invalidateQueries({ queryKey: getGetActivityQueryKey() }),
      qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('/api/missions') }),
    ]);
}
