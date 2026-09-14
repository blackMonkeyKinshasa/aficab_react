import { getAllBookings } from '@/api/booking';
import { Booking } from '@/constants/dataInterface';
import { POLLING } from '@/lib/query/polling';
import { queryKeys } from '@/lib/query/query-keys';
import { useFocusAwareQuery } from '@/lib/query/use-focus-aware-query';

import { normalizeBookings } from './normalize-booking';
import { QueryPollingOptions } from './query-options';

async function fetchBookings(clientId: string): Promise<Booking[]> {
  const data = await getAllBookings(clientId);
  return normalizeBookings(data);
}

export function useBookings(clientId: string | undefined, options?: QueryPollingOptions) {
  return useFocusAwareQuery<Booking[]>({
    queryKey: queryKeys.bookings.list(clientId ?? ''),
    queryFn: () => fetchBookings(clientId!),
    enabled: Boolean(clientId) && (options?.enabled ?? true),
    pollingInterval: options?.pollingInterval ?? POLLING.none,
  });
}
