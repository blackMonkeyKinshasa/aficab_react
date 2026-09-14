import { useCallback, useRef } from 'react';

import { useFocusEffect, useIsFocused } from 'expo-router/react-navigation';
import {
  Query,
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';

import { isNotFoundError } from '@/api/apiConfig';

export type FocusAwareQueryOptions<TQueryFnData, TData = TQueryFnData> = Omit<
  UseQueryOptions<TQueryFnData, Error, TData>,
  'refetchInterval' | 'refetchIntervalInBackground'
> & {
  pollingInterval?:
    | number
    | false
    | ((query: Query<TQueryFnData, Error, TQueryFnData>) => number | false | undefined);
};

export function useFocusAwareQuery<TQueryFnData, TData = TQueryFnData>(
  options: FocusAwareQueryOptions<TQueryFnData, TData>
): UseQueryResult<TData, Error> {
  const isFocused = useIsFocused();
  const skipNextFocusRefetchRef = useRef(true);
  const { pollingInterval = false, staleTime, ...queryOptions } = options;
  const hasPolling = pollingInterval !== false && pollingInterval !== undefined;

  const query = useQuery({
    ...queryOptions,
    staleTime: hasPolling ? (staleTime ?? 0) : staleTime,
    refetchInterval: (queryState) => {
      if (!isFocused || isNotFoundError(queryState.state.error)) {
        return false;
      }

      if (typeof pollingInterval === 'function') {
        return pollingInterval(queryState) ?? false;
      }

      if (typeof pollingInterval === 'number' && pollingInterval > 0) {
        return pollingInterval;
      }

      return false;
    },
    refetchIntervalInBackground: false,
  });

  useFocusEffect(
    useCallback(() => {
      if (!hasPolling || isNotFoundError(query.error)) {
        return undefined;
      }

      if (skipNextFocusRefetchRef.current) {
        skipNextFocusRefetchRef.current = false;
        return undefined;
      }

      void query.refetch();
      return undefined;
    }, [hasPolling, query.error, query.refetch])
  );

  return query;
}
