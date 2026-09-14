import { getAllBookings, getBookingById } from '@/api/booking';
import { ResStatus } from '@/constants/databaseEnum';
import { Booking } from '@/constants/dataInterface';
import { POLLING } from '@/lib/query/polling';
import { queryKeys } from '@/lib/query/query-keys';
import { useFocusAwareQuery } from '@/lib/query/use-focus-aware-query';

import { normalizeBooking, normalizeBookings } from './normalize-booking';
import { QueryPollingOptions } from './query-options';

const LIVE_BOOKING_STATUSES: ResStatus[] = [
  ResStatus.PENDING,
  ResStatus.PENDINGDRIVER,
  ResStatus.CONFIRMED,
  ResStatus.STARTED,
];

async function fetchBooking(id: string, clientId?: string): Promise<Booking> {
  const data = await getBookingById(id);
  const parsed = normalizeBooking(data);

  if (parsed) {
    return parsed;
  }

  if (clientId) {
    const all = await getAllBookings(clientId);
    const match = normalizeBookings(all).find((booking) => booking.id === id);

    if (match) {
      return match;
    }
  }

  throw new Error('Booking not found');
}

export function useBooking(
  id: string | undefined,
  options?: QueryPollingOptions & { clientId?: string }
) {
  const requestedInterval = options?.pollingInterval ?? POLLING.none;

  return useFocusAwareQuery<Booking>({
    queryKey: queryKeys.booking.detail(id ?? ''),
    queryFn: () => fetchBooking(id!, options?.clientId),
    enabled: Boolean(id) && (options?.enabled ?? true),
    pollingInterval: (query) => {
      if (requestedInterval === false || requestedInterval === undefined) {
        return false;
      }

      const status = query.state.data?.status;
      if (status && !LIVE_BOOKING_STATUSES.includes(status)) {
        return false;
      }

      return requestedInterval;
    },
  });
}
