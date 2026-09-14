import { getDriverByUserId } from '@/api/user';
import { Driver } from '@/constants/dataInterface';
import { POLLING } from '@/lib/query/polling';
import { queryKeys } from '@/lib/query/query-keys';
import { useFocusAwareQuery } from '@/lib/query/use-focus-aware-query';

import { QueryPollingOptions } from './query-options';

export function useDriver(uid: string | undefined, options?: QueryPollingOptions) {
  return useFocusAwareQuery<Driver>({
    queryKey: queryKeys.driver.detail(uid ?? ''),
    queryFn: () => getDriverByUserId(uid!),
    enabled: Boolean(uid) && (options?.enabled ?? true),
    pollingInterval: options?.pollingInterval ?? POLLING.none,
  });
}
