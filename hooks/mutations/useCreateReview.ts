import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createReview } from '@/api/review';
import { CreateReviewInput } from '@/constants/dataInterface';
import { queryKeys } from '@/lib/query/query-keys';

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReviewInput) => createReview(input),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.booking.detail(variables.bookingId) }),
      ]);
    },
  });
}
