import { useMutation, useQueryClient } from '@tanstack/react-query';

import { clientCancelBooking } from '@/api/booking';
import { queryKeys } from '@/lib/query/query-keys';

type CancelBookingInput = {
  bookingId: string;
  status: string;
  clientId: string;
};

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookingId, status, clientId }: CancelBookingInput) =>
      clientCancelBooking(bookingId, status, clientId),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.booking.detail(variables.bookingId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.activity.all }),
      ]);
    },
  });
}
